import { apiFetch } from './client';
import type { Workout, AdaptationEvent } from './types';

export interface CompleteWorkoutInput {
  status?: 'completed' | 'skipped';
  actualDurationMin?: number;
  rpe?: number;
}

export interface WorkoutCompletionResponse {
  workout: Workout;
  adaptationEvents: AdaptationEvent[];
}

export function completeWorkout(id: string, input: CompleteWorkoutInput): Promise<WorkoutCompletionResponse> {
  return apiFetch(`/workouts/${id}/complete`, { method: 'POST', body: input });
}

export interface RescheduleResponse {
  workout: Workout;
  conflicts: string[];
}

/** `date` must be `yyyy-MM-dd` (see src/lib/dateOnly.ts's `toDayString`) — never a full ISO instant. */
export function rescheduleWorkout(id: string, date: string): Promise<RescheduleResponse> {
  return apiFetch(`/workouts/${id}`, { method: 'PATCH', body: { date } });
}
