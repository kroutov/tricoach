import { config } from '../../config';
import { prisma } from '../../db/client';
import { decryptToken, encryptToken } from '../../lib/crypto';

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete?: { id: number };
}

export async function exchangeCodeForToken(code: string): Promise<StravaTokenResponse> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.strava.clientId,
      client_secret: config.strava.clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as StravaTokenResponse;
}

async function refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.strava.clientId,
      client_secret: config.strava.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as StravaTokenResponse;
}

export async function saveTokens(userId: string, tokens: StravaTokenResponse, scope: string): Promise<void> {
  const data = {
    accessTokenEncrypted: encryptToken(tokens.access_token),
    refreshTokenEncrypted: encryptToken(tokens.refresh_token),
    expiresAt: new Date(tokens.expires_at * 1000),
    scope,
    ...(tokens.athlete ? { providerUserId: String(tokens.athlete.id) } : {}),
  };
  await prisma.deviceConnection.upsert({
    where: { userId_provider: { userId, provider: 'STRAVA' } },
    update: data,
    create: { userId, provider: 'STRAVA', ...data },
  });
}

/** Returns a valid access token, transparently refreshing (and persisting the refresh) if expired. */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const connection = await prisma.deviceConnection.findUnique({ where: { userId_provider: { userId, provider: 'STRAVA' } } });
  if (!connection?.accessTokenEncrypted || !connection.refreshTokenEncrypted) return null;

  const isExpired = !connection.expiresAt || connection.expiresAt.getTime() < Date.now() + 60_000;
  if (!isExpired) return decryptToken(connection.accessTokenEncrypted);

  const refreshed = await refreshAccessToken(decryptToken(connection.refreshTokenEncrypted));
  await saveTokens(userId, refreshed, connection.scope ?? 'read,activity:read_all');
  return refreshed.access_token;
}

export interface StravaActivity {
  id: number;
  type: string;
  start_date: string;
  elapsed_time: number;
  distance: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_watts?: number;
  total_elevation_gain?: number;
}

export async function fetchStravaActivity(accessToken: string, activityId: number): Promise<StravaActivity> {
  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava activity fetch failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as StravaActivity;
}

export async function fetchRecentStravaActivities(accessToken: string, after: Date): Promise<StravaActivity[]> {
  const params = new URLSearchParams({ after: String(Math.floor(after.getTime() / 1000)), per_page: '50' });
  const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava activities fetch failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as StravaActivity[];
}

const SPORT_BY_STRAVA_TYPE: Record<string, 'run' | 'bike' | 'swim' | 'strength'> = {
  Run: 'run',
  TrailRun: 'run',
  Walk: 'run',
  Ride: 'bike',
  VirtualRide: 'bike',
  MountainBikeRide: 'bike',
  Swim: 'swim',
  WeightTraining: 'strength',
  Workout: 'strength',
};

export function mapStravaActivity(activity: StravaActivity) {
  return {
    source: 'strava' as const,
    externalId: String(activity.id),
    startTime: new Date(activity.start_date),
    durationS: activity.elapsed_time,
    distanceM: activity.distance,
    avgHr: activity.average_heartrate != null ? Math.round(activity.average_heartrate) : null,
    maxHr: activity.max_heartrate != null ? Math.round(activity.max_heartrate) : null,
    avgPowerWatts: activity.average_watts != null ? Math.round(activity.average_watts) : null,
    avgPaceSecPerKm: null,
    elevationGainM: activity.total_elevation_gain ?? null,
    sport: SPORT_BY_STRAVA_TYPE[activity.type] ?? 'run',
  };
}
