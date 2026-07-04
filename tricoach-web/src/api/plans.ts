import { apiFetch } from './client';
import type { TrainingPlan, AdaptationEvent } from './types';

export interface GeneratePlanInput {
  goalId: string;
  durationWeeks?: number;
}

export function generatePlan(input: GeneratePlanInput): Promise<TrainingPlan> {
  return apiFetch('/plans/generate', { method: 'POST', body: input });
}

export function listPlans(): Promise<TrainingPlan[]> {
  return apiFetch('/plans');
}

export function getPlan(id: string): Promise<TrainingPlan> {
  return apiFetch(`/plans/${id}`);
}

export function getAdaptationEvents(planId: string): Promise<AdaptationEvent[]> {
  return apiFetch(`/plans/${planId}/adaptation-events`);
}

export async function getActivePlan(): Promise<TrainingPlan | null> {
  const plans = await listPlans();
  return plans.find((p) => p.status === 'active') ?? null;
}
