import {
  ActivitySource,
  AdaptationTrigger,
  AthleteLevel,
  GoalPriority,
  GoalStatus,
  GoalType,
  MacrocyclePhase,
  PlanStatus,
  SportType,
  WorkoutIntensity,
  WorkoutStatus,
} from '@prisma/client';

/**
 * Bidirectional maps between Prisma enum members and the exact string raw
 * values the Swift `Codable` enums expect (see TriCoachAI/Models/Enums.swift).
 * This is the single place that translation happens — engine/service code
 * elsewhere works with the API-shaped strings on the left.
 */
function makeMap<Api extends string, Db extends string>(pairs: [Api, Db][]) {
  const apiToDb = new Map(pairs);
  const dbToApi = new Map(pairs.map(([api, db]) => [db, api] as [Db, Api]));
  return {
    toDb: (api: Api): Db => {
      const value = apiToDb.get(api);
      if (!value) throw new Error(`Unknown API enum value: ${api}`);
      return value;
    },
    toApi: (db: Db): Api => {
      const value = dbToApi.get(db);
      if (!value) throw new Error(`Unknown DB enum value: ${db}`);
      return value;
    },
  };
}

export const athleteLevelMap = makeMap<'beginner' | 'intermediate' | 'advanced', AthleteLevel>([
  ['beginner', 'BEGINNER'],
  ['intermediate', 'INTERMEDIATE'],
  ['advanced', 'ADVANCED'],
]);

export const goalTypeMap = makeMap<
  | 'triathlonSprint'
  | 'triathlonOlympic'
  | 'duathlon'
  | 'run10k'
  | 'halfMarathon'
  | 'marathon'
  | 'ironman'
  | 'halfIronman'
  | 'improveVMA'
  | 'weightLoss'
  | 'generalEndurance',
  GoalType
>([
  ['triathlonSprint', 'TRIATHLON_SPRINT'],
  ['triathlonOlympic', 'TRIATHLON_OLYMPIC'],
  ['duathlon', 'DUATHLON'],
  ['run10k', 'RUN_10K'],
  ['halfMarathon', 'HALF_MARATHON'],
  ['marathon', 'MARATHON'],
  ['ironman', 'IRONMAN'],
  ['halfIronman', 'HALF_IRONMAN'],
  ['improveVMA', 'IMPROVE_VMA'],
  ['weightLoss', 'WEIGHT_LOSS'],
  ['generalEndurance', 'GENERAL_ENDURANCE'],
]);

export const goalPriorityMap = makeMap<'a' | 'b' | 'c', GoalPriority>([
  ['a', 'A'],
  ['b', 'B'],
  ['c', 'C'],
]);

export const goalStatusMap = makeMap<'active' | 'achieved' | 'abandoned', GoalStatus>([
  ['active', 'ACTIVE'],
  ['achieved', 'ACHIEVED'],
  ['abandoned', 'ABANDONED'],
]);

export const planStatusMap = makeMap<'draft' | 'active' | 'completed' | 'archived', PlanStatus>([
  ['draft', 'DRAFT'],
  ['active', 'ACTIVE'],
  ['completed', 'COMPLETED'],
  ['archived', 'ARCHIVED'],
]);

export const macrocyclePhaseMap = makeMap<'base' | 'build' | 'peak' | 'taper' | 'transition', MacrocyclePhase>([
  ['base', 'BASE'],
  ['build', 'BUILD'],
  ['peak', 'PEAK'],
  ['taper', 'TAPER'],
  ['transition', 'TRANSITION'],
]);

export const sportTypeMap = makeMap<'run' | 'bike' | 'swim' | 'brick' | 'strength' | 'rest', SportType>([
  ['run', 'RUN'],
  ['bike', 'BIKE'],
  ['swim', 'SWIM'],
  ['brick', 'BRICK'],
  ['strength', 'STRENGTH'],
  ['rest', 'REST'],
]);

export const workoutIntensityMap = makeMap<'easy' | 'moderate' | 'hard', WorkoutIntensity>([
  ['easy', 'EASY'],
  ['moderate', 'MODERATE'],
  ['hard', 'HARD'],
]);

export const workoutStatusMap = makeMap<'planned' | 'completed' | 'skipped' | 'modified', WorkoutStatus>([
  ['planned', 'PLANNED'],
  ['completed', 'COMPLETED'],
  ['skipped', 'SKIPPED'],
  ['modified', 'MODIFIED'],
]);

export const activitySourceMap = makeMap<'healthKit' | 'strava' | 'garmin' | 'manual', ActivitySource>([
  ['healthKit', 'HEALTHKIT'],
  ['strava', 'STRAVA'],
  ['garmin', 'GARMIN'],
  ['manual', 'MANUAL'],
]);

export const adaptationTriggerMap = makeMap<
  | 'missedWorkout'
  | 'overperformance'
  | 'underperformance'
  | 'highFatigue'
  | 'injuryFlag'
  | 'lowRecovery'
  | 'physiologicalStrain',
  AdaptationTrigger
>([
  ['missedWorkout', 'MISSED_WORKOUT'],
  ['overperformance', 'OVERPERFORMANCE'],
  ['underperformance', 'UNDERPERFORMANCE'],
  ['highFatigue', 'HIGH_FATIGUE'],
  ['injuryFlag', 'INJURY_FLAG'],
  ['lowRecovery', 'LOW_RECOVERY'],
  ['physiologicalStrain', 'PHYSIOLOGICAL_STRAIN'],
]);
