import { parseApiDate, isSameDay } from './dateOnly';
import type { Microcycle, TrainingPlan, Workout } from '../api/types';

// Flattening helpers ported from TriCoachAI/Models/TrainingPlan.swift's extension.

export function allMicrocycles(plan: TrainingPlan): Microcycle[] {
  return plan.macrocycles.flatMap((mc) => mc.mesocycles.flatMap((me) => me.microcycles));
}

export function allWorkouts(plan: TrainingPlan): Workout[] {
  return allMicrocycles(plan).flatMap((mic) => mic.workouts);
}

export function workoutsOnDay(plan: TrainingPlan, date: Date): Workout[] {
  return allWorkouts(plan).filter((w) => isSameDay(parseApiDate(w.date), date));
}

/** Finds a workout and the microcycle it belongs to (needed for the reschedule week boundary). */
export function findWorkoutWithMicrocycle(plan: TrainingPlan, workoutId: string): { workout: Workout; microcycle: Microcycle } | undefined {
  for (const microcycle of allMicrocycles(plan)) {
    const workout = microcycle.workouts.find((w) => w.id === workoutId);
    if (workout) return { workout, microcycle };
  }
  return undefined;
}

export function currentMicrocycle(plan: TrainingPlan, now: Date = new Date()): Microcycle | undefined {
  return allMicrocycles(plan).find((mic) => {
    const start = parseApiDate(mic.startDate);
    const end = parseApiDate(mic.endDate);
    return now >= start && now <= end;
  });
}
