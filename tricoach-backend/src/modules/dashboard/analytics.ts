import { workoutIntensityMap } from '../../lib/enumMapping';

export interface WeeklyLoadPoint {
  weekNumber: number;
  startDate: Date;
  plannedLoad: number;
  completedLoad: number;
}

export interface LoadFormPoint {
  date: Date;
  ctl: number;
  atl: number;
  tsb: number;
}

export type ApiIntensity = 'easy' | 'moderate' | 'hard';

export interface ZoneDistributionPoint {
  intensity: ApiIntensity;
  count: number;
  totalLoad: number;
}

interface MicrocycleLoadInput {
  weekNumber: number;
  startDate: Date;
  workouts: { status: string; estimatedTss: number | null }[];
}

interface WorkoutZoneInput {
  status: string;
  intensity: 'EASY' | 'MODERATE' | 'HARD';
  estimatedTss: number | null;
}

/** Charge planifiée vs. réalisée par microcycle (plan §9 Phase 4 "charge hebdo"). */
export function computeWeeklyLoad(microcycles: MicrocycleLoadInput[]): WeeklyLoadPoint[] {
  return microcycles
    .map((mc) => ({
      weekNumber: mc.weekNumber,
      startDate: mc.startDate,
      plannedLoad: mc.workouts.reduce((sum, w) => sum + (w.estimatedTss ?? 0), 0),
      completedLoad: mc.workouts.filter((w) => w.status === 'COMPLETED').reduce((sum, w) => sum + (w.estimatedTss ?? 0), 0),
    }))
    .sort((a, b) => a.weekNumber - b.weekNumber);
}

/** Minutes/count/charge par zone d'intensité, séances réalisées uniquement (plan §9 Phase 4 "distribution zones"). */
export function computeZoneDistribution(workouts: WorkoutZoneInput[]): ZoneDistributionPoint[] {
  const order: ApiIntensity[] = ['easy', 'moderate', 'hard'];
  const totals = new Map<ApiIntensity, { count: number; totalLoad: number }>(order.map((i) => [i, { count: 0, totalLoad: 0 }]));

  for (const w of workouts) {
    if (w.status !== 'COMPLETED') continue;
    const intensity = workoutIntensityMap.toApi(w.intensity);
    const bucket = totals.get(intensity)!;
    bucket.count += 1;
    bucket.totalLoad += w.estimatedTss ?? 0;
  }

  return order.map((intensity) => ({ intensity, ...totals.get(intensity)! }));
}

const CTL_DAYS = 42;
const ATL_DAYS = 7;
const MS_PER_DAY = 86_400_000;

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Chronic/Acute Training Load + form ("CTL/ATL/forme", TrainingPeaks-style
 * exponentially-weighted moving averages of daily completed TSS) over
 * `[from, to]` inclusive. `dailyLoads` keys are `yyyy-mm-dd`.
 */
export function computeLoadForm(dailyLoads: Map<string, number>, from: Date, to: Date): LoadFormPoint[] {
  const ctlAlpha = 1 - Math.exp(-1 / CTL_DAYS);
  const atlAlpha = 1 - Math.exp(-1 / ATL_DAYS);

  const points: LoadFormPoint[] = [];
  let ctl = 0;
  let atl = 0;

  const totalDays = Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
  for (let offset = 0; offset <= totalDays; offset++) {
    const date = new Date(from.getTime() + offset * MS_PER_DAY);
    const load = dailyLoads.get(dayKey(date)) ?? 0;
    ctl += (load - ctl) * ctlAlpha;
    atl += (load - atl) * atlAlpha;
    points.push({ date, ctl, atl, tsb: ctl - atl });
  }

  return points;
}
