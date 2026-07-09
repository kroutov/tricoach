export type EffortProfileApi = 'carbLoad' | 'recovery' | 'light' | 'balanced';

export interface EffortDayWorkout {
  status: string;
  intensity: 'EASY' | 'MODERATE' | 'HARD';
  estimatedTss: number | null;
}

export interface EffortProfileInput {
  /** Workouts (any status) scheduled on the day being classified. */
  workoutsToday: EffortDayWorkout[];
  /** Workouts scheduled the following day — carb-loading is about tomorrow's effort too. */
  workoutsTomorrow: EffortDayWorkout[];
  /** Training stress balance (CTL - ATL) on the day being classified, from computeLoadForm — null if no load history yet. */
  tsb: number | null;
}

// A "big" session worth carb-loading for: either explicitly tagged HARD, or
// a planned TSS load high enough to matter regardless of tag (e.g. a long
// easy-paced brick day).
const HARD_TSS_THRESHOLD = 80;
// Below this TSB, the athlete is carrying enough accumulated fatigue that
// recovery-oriented meals take priority over carb-loading for a single session.
const LOW_TSB_THRESHOLD = -10;

function isBigSession(w: EffortDayWorkout): boolean {
  if (w.status === 'SKIPPED') return false;
  return w.intensity === 'HARD' || (w.estimatedTss ?? 0) >= HARD_TSS_THRESHOLD;
}

/**
 * Classifies a day's nutritional need from the athlete's training load —
 * qualitative only (plan §3), no calorie/macro computation. Reuses the same
 * TSS/TSB data the dashboard already computes (analytics.ts), just adds a
 * classification layer on top.
 */
export function effortProfileForDay(input: EffortProfileInput): EffortProfileApi {
  const hasBigSessionSoon = input.workoutsToday.some(isBigSession) || input.workoutsTomorrow.some(isBigSession);
  if (hasBigSessionSoon) return 'carbLoad';

  if (input.tsb !== null && input.tsb < LOW_TSB_THRESHOLD) return 'recovery';

  const hasAnyWorkoutToday = input.workoutsToday.some((w) => w.status !== 'SKIPPED');
  if (!hasAnyWorkoutToday) return 'light';

  return 'balanced';
}
