import type { AthleteLevel, GoalPriority, GoalType, Sex, TimeSlot, Weekday } from '../../lib/enumLabels';
import { toDayString } from '../../lib/dateOnly';

export interface DraftProfile {
  age: number | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  level: AthleteLevel;
  yearsPractice: number | null;
  weeklyVolumeAvgMin: number | null;
  hrMax: number | null;
  hrRest: number | null;
  ftpWatts: number | null;
  thresholdPaceSecPerKm: number | null;
  cssPaceSecPer100m: number | null;
}

export const emptyProfile: DraftProfile = {
  age: null,
  sex: null,
  heightCm: null,
  weightKg: null,
  level: 'beginner',
  yearsPractice: null,
  weeklyVolumeAvgMin: null,
  hrMax: null,
  hrRest: null,
  ftpWatts: null,
  thresholdPaceSecPerKm: null,
  cssPaceSecPer100m: null,
};

export interface DraftGoal {
  localId: string;
  type: GoalType;
  /** yyyy-MM-dd, matches an `<input type="date">` value directly. */
  targetDate: string;
  priority: GoalPriority;
  targetTimeSeconds: number | null;
}

function weeksFromNow(weeks: number): string {
  const date = new Date();
  date.setDate(date.getDate() + weeks * 7);
  return toDayString(date);
}

export function newDraftGoal(type: GoalType = 'run10k', weeks = 8, priority: GoalPriority = 'b'): DraftGoal {
  return { localId: crypto.randomUUID(), type, targetDate: weeksFromNow(weeks), priority, targetTimeSeconds: null };
}

export const defaultGoals: DraftGoal[] = [newDraftGoal('triathlonOlympic', 12, 'a')];

export interface DraftAvailability {
  sessionsPerWeek: number;
  maxSessionDurationMin: number;
  availableDays: Weekday[];
  preferredTimeSlots: TimeSlot[];
  mandatoryRestDays: Weekday[];
}

export const defaultAvailability: DraftAvailability = {
  sessionsPerWeek: 4,
  maxSessionDurationMin: 90,
  availableDays: [2, 3, 5, 7],
  preferredTimeSlots: ['evening'],
  mandatoryRestDays: [1],
};

export interface DraftCheckIn {
  injuries: string[];
  fatigueLevel: number;
  stressLevel: number;
  sleepHours: number;
}

export const defaultCheckIn: DraftCheckIn = {
  injuries: [],
  fatigueLevel: 2,
  stressLevel: 2,
  sleepHours: 7.5,
};

export const ONBOARDING_STEPS = ['personalInfo', 'sportLevel', 'history', 'goals', 'availability', 'constraints', 'summary'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const onboardingStepTitle: Record<OnboardingStep, string> = {
  personalInfo: 'Vous',
  sportLevel: 'Niveau',
  history: 'Historique',
  goals: 'Objectifs',
  availability: 'Disponibilités',
  constraints: 'Contraintes',
  summary: 'Résumé',
};
