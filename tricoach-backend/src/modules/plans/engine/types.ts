/**
 * Domain types mirroring TriCoachAI/Models/*.swift exactly (field names and
 * string enum raw values) so JSON produced here decodes directly into the
 * Swift `Codable` structs on the client. See src/lib/enumMapping.ts for the
 * Prisma <-> API translation at the persistence boundary.
 */

export type SportType = 'run' | 'bike' | 'swim' | 'brick' | 'strength' | 'rest';
export type WorkoutIntensity = 'easy' | 'moderate' | 'hard';
export type WorkoutStatus = 'planned' | 'completed' | 'skipped' | 'modified';
export type MacrocyclePhase = 'base' | 'build' | 'peak' | 'taper' | 'transition';
export type AthleteLevel = 'beginner' | 'intermediate' | 'advanced';
export type Sex = 'male' | 'female' | 'other';
export type GoalType =
  | 'triathlonSprint' | 'triathlonOlympic' | 'duathlon' | 'run10k' | 'halfMarathon'
  | 'marathon' | 'ironman' | 'halfIronman' | 'improveVMA' | 'weightLoss' | 'generalEndurance';
export type AdaptationTrigger =
  | 'missedWorkout' | 'overperformance' | 'underperformance' | 'highFatigue' | 'injuryFlag' | 'lowRecovery'
  | 'physiologicalStrain';

/** Monday-first order, matching Swift's `Weekday.orderedWeek`. Calendar convention: Sunday=1...Saturday=7. */
export const ORDERED_WEEKDAYS = [2, 3, 4, 5, 6, 7, 1];

export interface Range<T> {
  lowerBound: T;
  upperBound: T;
}

export interface TargetZone {
  hrZone?: number;
  hrRangeBpm?: Range<number>;
  paceSecPerKm?: Range<number>;
  paceSecPer100m?: Range<number>;
  powerWatts?: Range<number>;
  cadence?: number;
}

export interface IntervalBlock {
  id: string;
  repetitions: number;
  workDurationSec: number;
  recoveryDurationSec: number;
  target: TargetZone;
  note?: string;
}

export interface WorkoutSection {
  durationMin: number;
  description: string;
  target: TargetZone;
}

export interface WorkoutStructure {
  warmup: WorkoutSection;
  mainSet: IntervalBlock[];
  cooldown: WorkoutSection;
}

export interface Workout {
  id: string;
  date: Date;
  sport: SportType;
  title: string;
  summary: string;
  structure: WorkoutStructure;
  plannedDurationMin: number;
  plannedDistanceM?: number;
  estimatedTSS?: number;
  estimatedTRIMP?: number;
  rpeTarget?: number;
  intensity: WorkoutIntensity;
  status: WorkoutStatus;
  calendarEventId?: string;
  isRecoveryWeek: boolean;
}

export interface Microcycle {
  id: string;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  isRecoveryWeek: boolean;
  plannedLoad: number;
  workouts: Workout[];
}

export interface Mesocycle {
  id: string;
  name: string;
  focus: string;
  loadTarget?: number;
  startDate: Date;
  endDate: Date;
  microcycles: Microcycle[];
}

export interface Macrocycle {
  id: string;
  name: string;
  phase: MacrocyclePhase;
  startDate: Date;
  endDate: Date;
  mesocycles: Mesocycle[];
}

export interface TrainingPlan {
  id: string;
  goalId: string;
  startDate: Date;
  endDate: Date;
  durationWeeks: number;
  status: 'draft' | 'active' | 'completed' | 'archived';
  generationVersion: string;
  createdAt: Date;
  macrocycles: Macrocycle[];
}

export interface AthleteProfile {
  age?: number;
  sex?: Sex;
  heightCm?: number;
  weightKg?: number;
  level: AthleteLevel;
  yearsPractice?: number;
  weeklyVolumeAvgMin?: number;
  hrMax?: number;
  hrRest?: number;
  ftpWatts?: number;
  thresholdPaceSecPerKm?: number;
  cssPaceSecPer100m?: number;
}

export interface Goal {
  id: string;
  type: GoalType;
  targetDate: Date;
}

export interface Availability {
  sessionsPerWeek: number;
  maxSessionDurationMin: number;
  availableDays: number[];
  mandatoryRestDays: number[];
}

export interface ConstraintCheckIn {
  date: Date;
  injuries: string[];
  fatigueLevel: number;
  stressLevel: number;
  sleepHours: number;
}

/** Objective wellness reading for a single day (subset of HealthMetricDaily/HealthMetricsDaily.swift relevant to adaptation). */
export interface HealthMetric {
  date: Date;
  restingHr?: number;
  hrvMs?: number;
}

export interface PlanGenerationContext {
  profile: AthleteProfile;
  goal: Goal;
  availability: Availability;
  startDate: Date;
  explicitDurationWeeks?: number;
}

export interface CompletedActivity {
  id: string;
  workoutId?: string;
  source: 'healthKit' | 'strava' | 'manual';
  startTime: Date;
  durationS: number;
  sport: SportType;
}

export interface AdaptationEvent {
  id: string;
  planId: string;
  triggeredBy: AdaptationTrigger;
  actionTaken: string;
  deltaLoadPercent?: number;
  createdAt: Date;
}
