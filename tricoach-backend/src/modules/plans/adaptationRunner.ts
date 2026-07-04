import { prisma } from '../../db/client';
import { adaptationTriggerMap } from '../../lib/enumMapping';
import { applyDeltaLoad, evaluateAdaptation, WorkoutOutcome } from './engine/adaptationEngine';
import { AdaptationEvent, HealthMetric } from './engine/types';
import { dbMicrocycleToEngine, dbWorkoutToEngine } from '../workouts/persistence';

/**
 * Closes the "planned vs. realized" loop for a plan (mirrors
 * Core/PlanEngine/AdaptationEngine.swift + WorkoutDetailViewModel): compares
 * the trailing 10 days against what actually happened plus recent subjective
 * check-ins and objective HealthMetricDaily readings (HRV/resting HR), then
 * nudges the next not-yet-started microcycle. Shared by manual workout
 * completion (POST /workouts/:id/complete) and automatic ingestion
 * (POST /integrations/healthkit/sync, Strava webhooks) — any new activity or
 * wellness data should re-evaluate the plan the same way.
 */
export async function runAdaptation(planId: string, userId: string, now: Date = new Date()): Promise<AdaptationEvent[]> {
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 10);
  // Mirrors windowStart so an athlete who logs a workout a few days ahead of
  // its scheduled date (e.g. pre-emptively skipping tomorrow's session) is
  // weighed immediately rather than waiting for its date to lapse into the
  // trailing window on its own.
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 10);

  const recentWorkouts = await prisma.workout.findMany({
    where: {
      microcycle: { mesocycle: { macrocycle: { planId } } },
      OR: [
        { date: { gte: windowStart, lte: now } },
        { status: { in: ['COMPLETED', 'SKIPPED'] }, date: { gte: windowStart, lte: windowEnd } },
      ],
    },
    include: { completedActivities: true },
  });

  const outcomes: WorkoutOutcome[] = recentWorkouts.map((w) => {
    const planned = dbWorkoutToEngine(w);
    const activity = w.completedActivities[0];
    return {
      planned,
      completed: activity
        ? { id: activity.id, workoutId: activity.workoutId ?? undefined, source: 'manual', startTime: activity.startTime, durationS: activity.durationS, sport: planned.sport }
        : undefined,
    };
  });

  const recentCheckInsWindowStart = new Date(now);
  recentCheckInsWindowStart.setDate(recentCheckInsWindowStart.getDate() - 7);
  const checkIns = await prisma.constraintLog.findMany({
    where: { userId, date: { gte: recentCheckInsWindowStart } },
    orderBy: { date: 'desc' },
  });
  const engineCheckIns = checkIns.map((c) => ({
    date: c.date,
    injuries: (c.injuries as string[] | null) ?? [],
    fatigueLevel: c.fatigueLevel ?? 2,
    stressLevel: c.stressLevel ?? 2,
    sleepHours: c.sleepHours ?? 7.5,
  }));

  const recentHealthMetricsWindowStart = new Date(now);
  recentHealthMetricsWindowStart.setDate(recentHealthMetricsWindowStart.getDate() - 7);
  const healthMetrics = await prisma.healthMetricDaily.findMany({
    where: { userId, date: { gte: recentHealthMetricsWindowStart } },
    orderBy: { date: 'desc' },
  });
  const engineHealthMetrics: HealthMetric[] = healthMetrics.map((m) => ({
    date: m.date,
    restingHr: m.restingHr ?? undefined,
    hrvMs: m.hrvMs ?? undefined,
  }));

  const events = evaluateAdaptation(planId, outcomes, engineCheckIns, engineHealthMetrics, now);
  if (events.length === 0) return [];

  await prisma.adaptationEvent.createMany({
    data: events.map((e) => ({
      id: e.id,
      userId,
      planId,
      triggeredBy: adaptationTriggerMap.toDb(e.triggeredBy),
      actionTaken: e.actionTaken,
      deltaLoad: e.deltaLoadPercent ?? null,
      createdAt: e.createdAt,
    })),
  });

  const nextMicrocycleDb = await prisma.microcycle.findFirst({
    where: { startDate: { gt: now }, mesocycle: { macrocycle: { planId } } },
    orderBy: { startDate: 'asc' },
    include: { workouts: true },
  });

  if (nextMicrocycleDb) {
    const updated = applyDeltaLoad(events, dbMicrocycleToEngine(nextMicrocycleDb));
    await prisma.$transaction([
      prisma.microcycle.update({ where: { id: updated.id }, data: { plannedLoad: updated.plannedLoad } }),
      ...updated.workouts.map((w) =>
        prisma.workout.update({
          where: { id: w.id },
          data: { plannedDurationMin: w.plannedDurationMin, estimatedTss: w.estimatedTSS ?? null, estimatedTrimp: w.estimatedTRIMP ?? null },
        })
      ),
    ]);
  }

  return events;
}
