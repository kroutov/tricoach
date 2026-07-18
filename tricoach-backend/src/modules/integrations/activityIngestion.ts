import { prisma } from '../../db/client';
import { toDateOnly } from '../../lib/dateOnly';
import { activitySourceMap, sportTypeMap } from '../../lib/enumMapping';
import { runAdaptation } from '../plans/adaptationRunner';
import { AdaptationEvent } from '../plans/engine/types';

export interface ActivityInput {
  source: 'healthKit' | 'strava' | 'garmin' | 'manual' | 'healthConnect';
  externalId?: string | null;
  startTime: Date;
  durationS: number;
  distanceM?: number | null;
  avgHr?: number | null;
  maxHr?: number | null;
  avgPowerWatts?: number | null;
  avgPaceSecPerKm?: number | null;
  elevationGainM?: number | null;
  sport: 'run' | 'bike' | 'swim' | 'brick' | 'strength' | 'rest';
}

export interface IngestionResult {
  activitiesIngested: number;
  adaptationEvents: AdaptationEvent[];
}

/** Same session synced from two different providers rarely shares a timestamp exactly. */
const CROSS_SOURCE_DEDUP_WINDOW_MS = 5 * 60 * 1000;

/**
 * Shared by HealthKit sync, Strava manual sync and Strava webhooks: skips
 * activities already ingested (by source+externalId) or already covered by
 * a different source (same sport within a 5-minute window — see
 * `CROSS_SOURCE_DEDUP_WINDOW_MS` above), matches each new one to a
 * same-day/same-sport planned workout (marking it completed), and re-runs
 * the adaptation engine for every plan touched by a match plus any
 * `extraPlanIds` the caller wants re-evaluated (e.g. the active plan after a
 * HealthKit wellness-only sync with no matching activity).
 */
export async function ingestActivities(
  userId: string,
  activities: ActivityInput[],
  extraPlanIds: string[] = []
): Promise<IngestionResult> {
  let ingestedCount = 0;
  const affectedPlanIds = new Set<string>(extraPlanIds);

  for (const activity of activities) {
    if (activity.externalId) {
      const existing = await prisma.completedActivity.findFirst({
        where: { userId, source: activitySourceMap.toDb(activity.source), externalId: activity.externalId },
      });
      if (existing) continue;
    }

    const crossSourceDuplicate = await prisma.completedActivity.findFirst({
      where: {
        userId,
        sport: sportTypeMap.toDb(activity.sport),
        startTime: {
          gte: new Date(activity.startTime.getTime() - CROSS_SOURCE_DEDUP_WINDOW_MS),
          lte: new Date(activity.startTime.getTime() + CROSS_SOURCE_DEDUP_WINDOW_MS),
        },
      },
    });
    if (crossSourceDuplicate) continue;

    const matchedWorkout = await prisma.workout.findFirst({
      where: {
        date: toDateOnly(activity.startTime),
        sport: sportTypeMap.toDb(activity.sport),
        status: { not: 'COMPLETED' },
        microcycle: { mesocycle: { macrocycle: { plan: { userId, status: 'ACTIVE' } } } },
      },
      include: { microcycle: { include: { mesocycle: { include: { macrocycle: { select: { planId: true } } } } } } },
    });

    await prisma.completedActivity.create({
      data: {
        userId,
        workoutId: matchedWorkout?.id ?? null,
        source: activitySourceMap.toDb(activity.source),
        externalId: activity.externalId ?? null,
        sport: sportTypeMap.toDb(activity.sport),
        startTime: activity.startTime,
        durationS: activity.durationS,
        distanceM: activity.distanceM ?? null,
        avgHr: activity.avgHr ?? null,
        maxHr: activity.maxHr ?? null,
        avgPower: activity.avgPowerWatts ?? null,
        avgPaceSecKm: activity.avgPaceSecPerKm ?? null,
        elevationGainM: activity.elevationGainM ?? null,
      },
    });
    ingestedCount += 1;

    if (matchedWorkout) {
      await prisma.workout.update({ where: { id: matchedWorkout.id }, data: { status: 'COMPLETED' } });
      affectedPlanIds.add(matchedWorkout.microcycle.mesocycle.macrocycle.planId);
    }
  }

  const adaptationEvents: AdaptationEvent[] = [];
  for (const planId of affectedPlanIds) {
    adaptationEvents.push(...(await runAdaptation(planId, userId)));
  }

  return { activitiesIngested: ingestedCount, adaptationEvents };
}
