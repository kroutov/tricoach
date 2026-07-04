import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { authRateLimit } from '../../middleware/rateLimit';
import { ingestActivities } from './activityIngestion';
import { connectGarmin, fetchRecentGarminActivities, GarminLoginError, getAuthenticatedGarminClient, mapGarminActivity } from './garminClient';

const router = Router();

const connectSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/**
 * Unlike Strava's redirect-based OAuth, Garmin has no authorization flow to
 * send the athlete through — this takes their Garmin username/password
 * directly (see `garminClient.ts` for the tradeoffs of that).
 */
router.post('/connect', authRateLimit, async (req, res, next) => {
  try {
    const body = connectSchema.parse(req.body);
    await connectGarmin(req.userId!, body.username, body.password);
    res.status(201).json({ connected: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    if (err instanceof GarminLoginError) {
      res.status(401).json({ error: 'garmin_invalid_credentials' });
      return;
    }
    next(err);
  }
});

router.delete('/', async (req, res, next) => {
  try {
    await prisma.deviceConnection.deleteMany({ where: { userId: req.userId, provider: 'GARMIN' } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get('/status', async (req, res, next) => {
  try {
    const connection = await prisma.deviceConnection.findUnique({ where: { userId_provider: { userId: req.userId!, provider: 'GARMIN' } } });
    res.json({ connected: !!connection, connectedAt: connection?.connectedAt ?? null });
  } catch (err) {
    next(err);
  }
});

router.post('/sync', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const client = await getAuthenticatedGarminClient(userId);
    if (!client) {
      res.status(409).json({ error: 'garmin_not_connected' });
      return;
    }

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const activities = await fetchRecentGarminActivities(client, since);
    const result = await ingestActivities(userId, activities.map(mapGarminActivity));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export const garminRouter = router;
