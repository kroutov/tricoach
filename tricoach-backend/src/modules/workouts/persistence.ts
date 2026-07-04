import { Prisma } from '@prisma/client';
import { sportTypeMap, workoutIntensityMap, workoutStatusMap } from '../../lib/enumMapping';
import { Microcycle, Workout, WorkoutStructure } from '../plans/engine/types';

type DbWorkout = Prisma.WorkoutGetPayload<Record<string, never>>;
type DbMicrocycleWithWorkouts = Prisma.MicrocycleGetPayload<{ include: { workouts: true } }>;

export function dbWorkoutToEngine(w: DbWorkout): Workout {
  return {
    id: w.id,
    date: w.date,
    sport: sportTypeMap.toApi(w.sport),
    title: w.title,
    summary: w.description,
    structure: w.structure as unknown as WorkoutStructure,
    plannedDurationMin: w.plannedDurationMin,
    plannedDistanceM: w.plannedDistanceM ?? undefined,
    estimatedTSS: w.estimatedTss ?? undefined,
    estimatedTRIMP: w.estimatedTrimp ?? undefined,
    rpeTarget: w.rpeTarget ?? undefined,
    intensity: workoutIntensityMap.toApi(w.intensity),
    status: workoutStatusMap.toApi(w.status),
    calendarEventId: w.calendarEventId ?? undefined,
    isRecoveryWeek: false,
  };
}

export function dbMicrocycleToEngine(mc: DbMicrocycleWithWorkouts): Microcycle {
  return {
    id: mc.id,
    weekNumber: mc.weekNumber,
    startDate: mc.startDate,
    endDate: mc.endDate,
    isRecoveryWeek: mc.isRecoveryWeek,
    plannedLoad: mc.plannedLoad ?? 0,
    workouts: mc.workouts.map(dbWorkoutToEngine),
  };
}
