import { GarminConnect } from 'garmin-connect';
import { prisma } from '../../db/client';
import { decryptToken, encryptToken } from '../../lib/crypto';

/**
 * Garmin has no public OAuth flow for third-party apps like the official
 * Strava integration — this uses the same reverse-engineered Garmin Connect
 * API as the `python-garminconnect` library (here via its Node.js
 * equivalent), authenticating with the athlete's own Garmin username and
 * password. That's a deliberate, user-approved tradeoff versus Strava's
 * OAuth: Garmin can (and has, per Garmin Connect's anti-bot hardening in
 * March 2026) break or block this without notice, and this stores the
 * athlete's real Garmin password (encrypted at rest, same as Strava's
 * tokens) rather than a revocable, scoped token.
 */

export class GarminLoginError extends Error {}

async function loginAndPersist(userId: string, username: string, password: string): Promise<void> {
  const client = new GarminConnect({ username, password });
  try {
    await client.login();
  } catch (err) {
    throw new GarminLoginError(err instanceof Error ? err.message : 'garmin_login_failed');
  }

  const tokens = client.exportToken();
  const profile = await client.getUserProfile();

  const data = {
    providerUserId: String(profile.id),
    accessTokenEncrypted: encryptToken(JSON.stringify(tokens)),
    refreshTokenEncrypted: encryptToken(JSON.stringify({ username, password })),
    expiresAt: new Date(tokens.oauth2.expires_at * 1000),
    scope: 'garmin-connect-unofficial',
  };

  await prisma.deviceConnection.upsert({
    where: { userId_provider: { userId, provider: 'GARMIN' } },
    update: data,
    create: { userId, provider: 'GARMIN', ...data },
  });
}

export async function connectGarmin(userId: string, username: string, password: string): Promise<void> {
  await loginAndPersist(userId, username, password);
}

/**
 * Restores the last known session first (avoids re-authenticating on every
 * sync, which is also what tends to trip Garmin's bot detection); falls
 * back to a fresh username/password login — using the same encrypted
 * credentials from connect — if the stored session has expired or Garmin
 * has invalidated it.
 */
export async function getAuthenticatedGarminClient(userId: string): Promise<GarminConnect | null> {
  const connection = await prisma.deviceConnection.findUnique({ where: { userId_provider: { userId, provider: 'GARMIN' } } });
  if (!connection?.accessTokenEncrypted || !connection.refreshTokenEncrypted) return null;

  const { username, password } = JSON.parse(decryptToken(connection.refreshTokenEncrypted)) as { username: string; password: string };
  const tokens = JSON.parse(decryptToken(connection.accessTokenEncrypted));

  const client = new GarminConnect({ username, password });
  try {
    client.loadToken(tokens.oauth1, tokens.oauth2);
    await client.getUserSettings();
    return client;
  } catch {
    try {
      await loginAndPersist(userId, username, password);
      return getAuthenticatedGarminClient(userId);
    } catch {
      return null;
    }
  }
}

const SPORT_BY_GARMIN_TYPE: Record<string, 'run' | 'bike' | 'swim' | 'strength'> = {
  running: 'run',
  street_running: 'run',
  trail_running: 'run',
  track_running: 'run',
  indoor_running: 'run',
  treadmill_running: 'run',
  cycling: 'bike',
  road_biking: 'bike',
  mountain_biking: 'bike',
  indoor_cycling: 'bike',
  virtual_ride: 'bike',
  gravel_cycling: 'bike',
  lap_swimming: 'swim',
  open_water_swimming: 'swim',
  swimming: 'swim',
  strength_training: 'strength',
  fitness_equipment: 'strength',
};

export interface GarminActivity {
  activityId: number;
  startTimeGMT: string;
  duration: number;
  distance?: number;
  averageHR?: number;
  maxHR?: number;
  avgPower?: unknown;
  elevationGain?: number;
  activityType?: { typeKey?: string };
}

export function mapGarminActivity(activity: GarminActivity) {
  return {
    source: 'garmin' as const,
    externalId: String(activity.activityId),
    startTime: new Date(`${activity.startTimeGMT.replace(' ', 'T')}Z`),
    durationS: Math.round(activity.duration),
    distanceM: activity.distance ?? null,
    avgHr: activity.averageHR != null ? Math.round(activity.averageHR) : null,
    maxHr: activity.maxHR != null ? Math.round(activity.maxHR) : null,
    avgPowerWatts: typeof activity.avgPower === 'number' ? Math.round(activity.avgPower) : null,
    avgPaceSecPerKm: null,
    elevationGainM: activity.elevationGain ?? null,
    sport: SPORT_BY_GARMIN_TYPE[activity.activityType?.typeKey ?? ''] ?? 'run',
  };
}

export async function fetchRecentGarminActivities(client: GarminConnect, since: Date): Promise<GarminActivity[]> {
  const activities = (await client.getActivities(0, 50)) as unknown as GarminActivity[];
  return activities.filter((activity) => new Date(`${activity.startTimeGMT.replace(' ', 'T')}Z`) >= since);
}
