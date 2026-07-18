import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { toDateOnly } from '../../lib/dateOnly';
import { ingestActivities } from './activityIngestion';

const router = Router();

const activitySchema = z.object({
  source: z.enum(['healthKit', 'strava', 'manual', 'healthConnect']),
  externalId: z.string().nullable().optional(),
  startTime: z.coerce.date(),
  durationS: z.number().int().min(0),
  distanceM: z.number().nullable().optional(),
  avgHr: z.number().int().nullable().optional(),
  maxHr: z.number().int().nullable().optional(),
  avgPowerWatts: z.number().int().nullable().optional(),
  avgPaceSecPerKm: z.number().int().nullable().optional(),
  elevationGainM: z.number().nullable().optional(),
  sport: z.enum(['run', 'bike', 'swim', 'brick', 'strength', 'rest']),
});

const healthMetricSchema = z.object({
  date: z.coerce.date(),
  restingHr: z.number().int().nullable().optional(),
  hrvMs: z.number().nullable().optional(),
  vo2max: z.number().nullable().optional(),
  sleepDurationMin: z.number().int().nullable().optional(),
  sleepQuality: z.number().int().nullable().optional(),
});

const syncSchema = z.object({
  activities: z.array(activitySchema).default([]),
  healthMetrics: z.array(healthMetricSchema).default([]),
});

/**
 * Batch ingestion pushed by the iOS client after a `HealthKitProvider`
 * fetch (see `Core/HealthKit/HealthKitProvider.swift`). Matching a
 * planned workout marks it completed and re-runs the adaptation engine —
 * see `ingestActivities` — which is what makes "log a run on the watch →
 * next week's plan adjusts" (plan §3 demonstrability bar) work. Health
 * metrics (HRV, resting HR, ...) are persisted before that re-evaluation so
 * an HRV drop / resting HR rise ("dérive cardiaque") can trigger a
 * `physiologicalStrain` adaptation even when no activity was synced.
 */
router.post('/sync', async (req, res, next) => {
  try {
    const body = syncSchema.parse(req.body);
    const userId = req.userId!;

    for (const metric of body.healthMetrics) {
      const date = toDateOnly(metric.date);
      const data = {
        restingHr: metric.restingHr ?? null,
        hrvMs: metric.hrvMs ?? null,
        vo2max: metric.vo2max ?? null,
        sleepDurationMin: metric.sleepDurationMin ?? null,
        sleepQuality: metric.sleepQuality ?? null,
      };
      await prisma.healthMetricDaily.upsert({
        where: { userId_date: { userId, date } },
        update: data,
        create: { userId, date, ...data },
      });
    }

    const extraPlanIds: string[] = [];
    if (body.healthMetrics.length > 0) {
      const activePlan = await prisma.trainingPlan.findFirst({ where: { userId, status: 'ACTIVE' } });
      if (activePlan) extraPlanIds.push(activePlan.id);
    }

    const result = await ingestActivities(userId, body.activities, extraPlanIds);

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

export const healthkitRouter = router;
