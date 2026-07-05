import type {
  AthleteLevel,
  Sex,
  GoalType,
  GoalPriority,
  TimeSlot,
  Weekday,
  WorkoutIntensity,
  SportType,
  AdaptationTrigger,
  MacrocyclePhase,
  ActivitySource,
} from '../lib/enumLabels';

// Shapes mirror tricoach-backend/src/modules/*/serializers.ts and persistence.ts exactly.

export interface AthleteProfile {
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
  updatedAt: string;
}

export interface Availability {
  sessionsPerWeek: number;
  maxSessionDurationMin: number;
  availableDays: Weekday[];
  preferredTimeSlots: TimeSlot[];
  mandatoryRestDays: Weekday[];
  updatedAt: string;
}

export interface Goal {
  id: string;
  type: GoalType;
  targetDate: string;
  priority: GoalPriority;
  targetTimeSeconds: number | null;
  status: 'active' | 'achieved' | 'abandoned';
  createdAt: string;
}

export interface CheckIn {
  id: string;
  date: string;
  injuries: string[];
  fatigueLevel: number;
  stressLevel: number;
  sleepHours: number;
}

export interface Range {
  lowerBound: number;
  upperBound: number;
}

export interface TargetZone {
  hrZone?: number;
  hrRangeBpm?: Range;
  paceSecPerKm?: Range;
  paceSecPer100m?: Range;
  powerWatts?: Range;
}

export interface WorkoutSection {
  durationMin: number;
  description: string;
  target: TargetZone;
}

export interface IntervalBlock {
  id: string;
  repetitions: number;
  workDurationSec: number;
  recoveryDurationSec: number;
  note?: string | null;
  target: TargetZone;
}

export interface WorkoutStructure {
  warmup: WorkoutSection;
  mainSet: IntervalBlock[];
  cooldown: WorkoutSection;
}

export type WorkoutStatus = 'planned' | 'completed' | 'skipped' | 'modified';

export interface Workout {
  id: string;
  date: string;
  sport: SportType;
  title: string;
  summary: string;
  structure: WorkoutStructure;
  plannedDurationMin: number;
  plannedDistanceM: number | null;
  estimatedTSS: number | null;
  estimatedTRIMP: number | null;
  rpeTarget: number | null;
  intensity: WorkoutIntensity;
  status: WorkoutStatus;
  calendarEventId: string | null;
}

export interface Microcycle {
  id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  isRecoveryWeek: boolean;
  plannedLoad: number | null;
  workouts: Workout[];
}

export interface Mesocycle {
  id: string;
  name: string;
  focus: string;
  loadTarget: number | null;
  startDate: string;
  endDate: string;
  microcycles: Microcycle[];
}

export interface Macrocycle {
  id: string;
  name: string;
  phase: MacrocyclePhase;
  startDate: string;
  endDate: string;
  mesocycles: Mesocycle[];
}

export interface TrainingPlan {
  id: string;
  goalId: string;
  startDate: string;
  endDate: string;
  durationWeeks: number;
  status: 'draft' | 'active' | 'completed' | 'archived';
  generationVersion: string;
  createdAt: string;
  macrocycles: Macrocycle[];
}

export interface AdaptationEvent {
  id: string;
  planId: string;
  triggeredBy: AdaptationTrigger;
  actionTaken: string;
  deltaLoadPercent: number | null;
  createdAt: string;
}

export interface CompletedActivity {
  id: string;
  workoutId: string | null;
  source: ActivitySource;
  sport: SportType | null;
  startTime: string;
  durationS: number;
  distanceM: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgPowerWatts: number | null;
  avgPaceSecPerKm: number | null;
  elevationGainM: number | null;
}

export interface DashboardSummary {
  hasActivePlan: boolean;
  planId?: string;
  weekNumber?: number | null;
  durationWeeks?: number;
  isRecoveryWeek?: boolean;
  currentPhase?: MacrocyclePhase | null;
  weekCompletedLoad?: number;
  weekPlannedLoad?: number;
  upcomingWorkouts?: Workout[];
}

export interface WeeklyLoadPoint {
  weekNumber: number;
  startDate: string;
  plannedLoad: number;
  completedLoad: number;
}

export interface LoadFormPoint {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

export interface ZoneDistributionPoint {
  intensity: WorkoutIntensity;
  count: number;
  totalLoad: number;
}

export interface Vo2maxPoint {
  date: string;
  vo2max: number;
}

export interface DashboardAnalytics {
  hasActivePlan: boolean;
  weeklyLoad?: WeeklyLoadPoint[];
  loadForm?: LoadFormPoint[];
  zoneDistribution?: ZoneDistributionPoint[];
  vo2maxTrend?: Vo2maxPoint[];
}
