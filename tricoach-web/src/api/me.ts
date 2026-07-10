import { apiFetch } from './client';
import type { AthleteProfile, Availability, Goal, CheckIn, CompletedActivity } from './types';
import type { User } from './auth';

export function getProfile(): Promise<AthleteProfile> {
  return apiFetch('/me/profile');
}

export interface ProfileInput {
  age?: number | null;
  sex?: AthleteProfile['sex'];
  heightCm?: number | null;
  weightKg?: number | null;
  level: AthleteProfile['level'];
  yearsPractice?: number | null;
  weeklyVolumeAvgMin?: number | null;
  hrMax?: number | null;
  hrRest?: number | null;
  ftpWatts?: number | null;
  thresholdPaceSecPerKm?: number | null;
  cssPaceSecPer100m?: number | null;
}

export function updateProfile(input: ProfileInput): Promise<AthleteProfile> {
  return apiFetch('/me/profile', { method: 'PUT', body: input });
}

export function getAvailability(): Promise<Availability> {
  return apiFetch('/me/availability');
}

export interface AvailabilityInput {
  sessionsPerWeek: number;
  maxSessionDurationMin: number;
  availableDays: number[];
  preferredTimeSlots: string[];
  mandatoryRestDays: number[];
}

export function updateAvailability(input: AvailabilityInput): Promise<Availability> {
  return apiFetch('/me/availability', { method: 'PUT', body: input });
}

export function getGoals(): Promise<Goal[]> {
  return apiFetch('/me/goals');
}

export interface GoalInput {
  type: Goal['type'];
  targetDate: string;
  priority: Goal['priority'];
  targetTimeSeconds?: number | null;
  status?: Goal['status'];
}

export function createGoal(input: GoalInput): Promise<Goal> {
  return apiFetch('/me/goals', { method: 'POST', body: input });
}

export function updateGoal(id: string, input: GoalInput): Promise<Goal> {
  return apiFetch(`/me/goals/${id}`, { method: 'PUT', body: input });
}

export function deleteGoal(id: string): Promise<void> {
  return apiFetch(`/me/goals/${id}`, { method: 'DELETE' });
}

export interface CheckInInput {
  date?: string;
  injuries?: string[];
  fatigueLevel: number;
  stressLevel: number;
  sleepHours: number;
}

export function createCheckIn(input: CheckInInput): Promise<CheckIn> {
  return apiFetch('/me/constraints', { method: 'POST', body: input });
}

export function updateUser(input: { fullName?: string; hasCompletedOnboarding?: boolean; location?: string | null }): Promise<User> {
  return apiFetch('/me', { method: 'PUT', body: input });
}

export interface CalendarTokenResponse {
  token: string;
  url: string;
}

export function getCalendarToken(): Promise<CalendarTokenResponse> {
  return apiFetch('/me/calendar-token');
}

export function rotateCalendarToken(): Promise<CalendarTokenResponse> {
  return apiFetch('/me/calendar-token/rotate', { method: 'POST' });
}

export function getActivities(): Promise<CompletedActivity[]> {
  return apiFetch('/me/activities');
}
