import { Prisma } from '@prisma/client';
import { prisma } from '../../db/client';
import {
  athleteLevelMap,
  goalTypeMap,
  macrocyclePhaseMap,
  planStatusMap,
  sportTypeMap,
  workoutIntensityMap,
  workoutStatusMap,
} from '../../lib/enumMapping';
import { toDateOnly } from '../../lib/dateOnly';
import { ApiError } from '../../middleware/errorHandler';
import { PlanGenerationContext, TrainingPlan, Workout } from './engine/types';

export async function buildContextForUser(userId: string, goalId: string, explicitDurationWeeks?: number, startDate?: Date): Promise<PlanGenerationContext> {
  const [goal, profile, availability] = await Promise.all([
    prisma.goal.findFirst({ where: { id: goalId, userId } }),
    prisma.athleteProfile.findUnique({ where: { userId } }),
    prisma.availability.findUnique({ where: { userId } }),
  ]);

  if (!goal) throw new ApiError(404, 'goal_not_found');

  return {
    profile: {
      age: profile?.age ?? undefined,
      sex: (profile?.sex as PlanGenerationContext['profile']['sex']) ?? undefined,
      heightCm: profile?.heightCm ?? undefined,
      weightKg: profile?.weightKg ?? undefined,
      level: profile ? athleteLevelMap.toApi(profile.level) : 'beginner',
      yearsPractice: profile?.yearsPractice ?? undefined,
      weeklyVolumeAvgMin: profile?.weeklyVolumeAvgMin ?? undefined,
      hrMax: profile?.hrMax ?? undefined,
      hrRest: profile?.hrRest ?? undefined,
      ftpWatts: profile?.ftpWatts ?? undefined,
      thresholdPaceSecPerKm: profile?.thresholdPaceSecKm ?? undefined,
      cssPaceSecPer100m: profile?.cssPaceSec100m ?? undefined,
    },
    goal: { id: goal.id, type: goalTypeMap.toApi(goal.type), targetDate: goal.targetDate },
    availability: {
      sessionsPerWeek: availability?.sessionsPerWeek ?? 4,
      maxSessionDurationMin: availability?.maxSessionDurationMin ?? 90,
      availableDays: (availability?.availableDays as number[] | undefined) ?? [2, 3, 5, 7],
      mandatoryRestDays: (availability?.mandatoryRestDays as number[] | undefined) ?? [1],
    },
    startDate: startDate ?? new Date(),
    explicitDurationWeeks,
  };
}

function workoutCreateInput(workout: Workout): Prisma.WorkoutCreateWithoutMicrocycleInput {
  return {
    id: workout.id,
    date: toDateOnly(workout.date),
    sport: sportTypeMap.toDb(workout.sport),
    title: workout.title,
    description: workout.summary,
    structure: workout.structure as unknown as Prisma.InputJsonValue,
    plannedDurationMin: workout.plannedDurationMin,
    plannedDistanceM: workout.plannedDistanceM ?? null,
    estimatedTss: workout.estimatedTSS ?? null,
    estimatedTrimp: workout.estimatedTRIMP ?? null,
    rpeTarget: workout.rpeTarget ?? null,
    intensity: workoutIntensityMap.toDb(workout.intensity),
    status: workoutStatusMap.toDb(workout.status),
  };
}

export async function persistPlan(userId: string, plan: TrainingPlan): Promise<void> {
  await prisma.trainingPlan.create({
    data: {
      id: plan.id,
      userId,
      goalId: plan.goalId,
      startDate: toDateOnly(plan.startDate),
      endDate: toDateOnly(plan.endDate),
      durationWeeks: plan.durationWeeks,
      status: planStatusMap.toDb(plan.status),
      generationVersion: plan.generationVersion,
      createdAt: plan.createdAt,
      macrocycles: {
        create: plan.macrocycles.map((mc) => ({
          id: mc.id,
          name: mc.name,
          phase: macrocyclePhaseMap.toDb(mc.phase),
          startDate: toDateOnly(mc.startDate),
          endDate: toDateOnly(mc.endDate),
          mesocycles: {
            create: mc.mesocycles.map((me) => ({
              id: me.id,
              name: me.name,
              focus: me.focus,
              loadTarget: me.loadTarget ?? null,
              startDate: toDateOnly(me.startDate),
              endDate: toDateOnly(me.endDate),
              microcycles: {
                create: me.microcycles.map((mic) => ({
                  id: mic.id,
                  weekNumber: mic.weekNumber,
                  startDate: toDateOnly(mic.startDate),
                  endDate: toDateOnly(mic.endDate),
                  isRecoveryWeek: mic.isRecoveryWeek,
                  plannedLoad: mic.plannedLoad,
                  workouts: { create: mic.workouts.map(workoutCreateInput) },
                })),
              },
            })),
          },
        })),
      },
    },
  });
}

const planWithTreeInclude = {
  macrocycles: {
    orderBy: { startDate: Prisma.SortOrder.asc },
    include: {
      mesocycles: {
        orderBy: { startDate: Prisma.SortOrder.asc },
        include: {
          microcycles: {
            orderBy: { weekNumber: Prisma.SortOrder.asc },
            include: { workouts: { orderBy: { date: Prisma.SortOrder.asc } } },
          },
        },
      },
    },
  },
} satisfies Prisma.TrainingPlanInclude;

type PlanWithTree = Prisma.TrainingPlanGetPayload<{ include: typeof planWithTreeInclude }>;

export async function findPlanWithTree(planId: string, userId: string): Promise<PlanWithTree | null> {
  return prisma.trainingPlan.findFirst({ where: { id: planId, userId }, include: planWithTreeInclude });
}

export async function listPlansForUser(userId: string): Promise<PlanWithTree[]> {
  return prisma.trainingPlan.findMany({ where: { userId }, include: planWithTreeInclude, orderBy: { startDate: 'desc' } });
}

export function serializeWorkout(w: PlanWithTree['macrocycles'][number]['mesocycles'][number]['microcycles'][number]['workouts'][number]) {
  return {
    id: w.id,
    date: w.date,
    sport: sportTypeMap.toApi(w.sport),
    title: w.title,
    summary: w.description,
    structure: w.structure,
    plannedDurationMin: w.plannedDurationMin,
    plannedDistanceM: w.plannedDistanceM,
    estimatedTSS: w.estimatedTss,
    estimatedTRIMP: w.estimatedTrimp,
    rpeTarget: w.rpeTarget,
    intensity: workoutIntensityMap.toApi(w.intensity),
    status: workoutStatusMap.toApi(w.status),
    calendarEventId: w.calendarEventId,
    isRecoveryWeek: false,
  };
}

export function serializePlan(plan: PlanWithTree) {
  return {
    id: plan.id,
    goalId: plan.goalId,
    startDate: plan.startDate,
    endDate: plan.endDate,
    durationWeeks: plan.durationWeeks,
    status: planStatusMap.toApi(plan.status),
    generationVersion: plan.generationVersion,
    createdAt: plan.createdAt,
    macrocycles: plan.macrocycles.map((mc) => ({
      id: mc.id,
      name: mc.name,
      phase: macrocyclePhaseMap.toApi(mc.phase),
      startDate: mc.startDate,
      endDate: mc.endDate,
      mesocycles: mc.mesocycles.map((me) => ({
        id: me.id,
        name: me.name,
        focus: me.focus,
        loadTarget: me.loadTarget,
        startDate: me.startDate,
        endDate: me.endDate,
        microcycles: me.microcycles.map((mic) => ({
          id: mic.id,
          weekNumber: mic.weekNumber,
          startDate: mic.startDate,
          endDate: mic.endDate,
          isRecoveryWeek: mic.isRecoveryWeek,
          plannedLoad: mic.plannedLoad,
          workouts: mic.workouts.map(serializeWorkout),
        })),
      })),
    })),
  };
}
