import { Router } from 'express';
import { config } from '../../config';
import { prisma } from '../../db/client';
import { ingestActivities } from '../integrations/activityIngestion';
import { fetchStravaActivity, getValidAccessToken, mapStravaActivity } from '../integrations/stravaClient';

const router = Router();

/**
 * Subscription validation handshake — Strava calls this once when a push
 * subscription is created (`POST https://www.strava.com/api/v3/push_subscriptions`,
 * a one-time, deployment-time step requiring a *publicly reachable*
 * callback_url, so it can't be exercised against `localhost` in dev).
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.strava.webhookVerifyToken && typeof challenge === 'string') {
    res.json({ 'hub.challenge': challenge });
    return;
  }
  res.status(403).json({ error: 'invalid_verify_token' });
});

/**
 * Event receipt. Strava expects a fast 200 — this does a single activity
 * fetch + ingest synchronously, which is fine at hobby-project volume but
 * would move to a queue under real load.
 */
router.post('/', async (req, res) => {
  // Ack immediately; Strava retries on non-2xx or timeout, not on best-effort processing errors.
  res.status(200).end();

  const { object_type: objectType, aspect_type: aspectType, object_id: objectId, owner_id: ownerId } = req.body ?? {};
  if (objectType !== 'activity' || (aspectType !== 'create' && aspectType !== 'update')) return;

  try {
    const connection = await prisma.deviceConnection.findUnique({
      where: { provider_providerUserId: { provider: 'STRAVA', providerUserId: String(ownerId) } },
    });
    if (!connection) return;

    const accessToken = await getValidAccessToken(connection.userId);
    if (!accessToken) return;

    const activity = await fetchStravaActivity(accessToken, Number(objectId));
    await ingestActivities(connection.userId, [mapStravaActivity(activity)]);
  } catch (err) {
    console.error('Strava webhook processing failed', err);
  }
});

export const stravaWebhookRouter = router;
