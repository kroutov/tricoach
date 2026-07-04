import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { prisma } from '../../db/client';
import { requireAuth } from '../../middleware/requireAuth';
import { ingestActivities } from './activityIngestion';
import { exchangeCodeForToken, fetchRecentStravaActivities, getValidAccessToken, mapStravaActivity, saveTokens } from './stravaClient';

const router = Router();
const SCOPE = 'read,activity:read_all';

/**
 * The backend (not the client) holds the Strava client secret, so OAuth is
 * driven server-side: iOS opens this URL in an `ASWebAuthenticationSession`,
 * Strava redirects to our `/callback` (no bearer token available there —
 * `state` carries a short-lived JWT identifying the user instead), and the
 * callback redirects back into the app via a custom URL scheme.
 */
router.get('/auth-url', requireAuth, (req, res) => {
  if (!config.strava.clientId) {
    res.status(503).json({ error: 'strava_not_configured' });
    return;
  }
  const state = jwt.sign({ userId: req.userId }, config.jwtSecret, { expiresIn: '10m' });
  const params = new URLSearchParams({
    client_id: config.strava.clientId,
    redirect_uri: config.strava.redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: SCOPE,
    state,
  });
  res.json({ url: `https://www.strava.com/oauth/authorize?${params.toString()}` });
});

router.get('/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const stravaError = typeof req.query.error === 'string' ? req.query.error : undefined;

  // Web is the primary client now (see the migration plan) — redirect to
  // the web app's profile page rather than the iOS app's custom URL scheme.
  const redirectWithError = (message: string) =>
    res.redirect(`${config.webPublicUrl}/profile?strava=error&message=${encodeURIComponent(message)}`);

  if (stravaError) return redirectWithError(stravaError);
  if (!code || !state) return redirectWithError('missing_code_or_state');

  let userId: string;
  try {
    const decoded = jwt.verify(state, config.jwtSecret) as { userId: string };
    userId = decoded.userId;
  } catch {
    return redirectWithError('invalid_or_expired_state');
  }

  try {
    const tokens = await exchangeCodeForToken(code);
    await saveTokens(userId, tokens, SCOPE);
    res.redirect(`${config.webPublicUrl}/profile?strava=success`);
  } catch (err) {
    redirectWithError(err instanceof Error ? err.message : 'token_exchange_failed');
  }
});

router.delete('/', requireAuth, async (req, res, next) => {
  try {
    await prisma.deviceConnection.deleteMany({ where: { userId: req.userId, provider: 'STRAVA' } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const connection = await prisma.deviceConnection.findUnique({ where: { userId_provider: { userId: req.userId!, provider: 'STRAVA' } } });
    res.json({ connected: !!connection, connectedAt: connection?.connectedAt ?? null });
  } catch (err) {
    next(err);
  }
});

/**
 * Manual pull, complementary to the (deployment-only) webhook path — lets
 * "connect Strava → past activities feed the plan" be demonstrated without
 * a publicly reachable callback URL for Strava's push subscription.
 */
router.post('/sync', requireAuth, async (req, res, next) => {
  try {
    const userId = req.userId!;
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      res.status(409).json({ error: 'strava_not_connected' });
      return;
    }
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const activities = await fetchRecentStravaActivities(accessToken, since);
    const result = await ingestActivities(userId, activities.map(mapStravaActivity));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export const stravaRouter = router;
