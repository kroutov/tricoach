import { computeLoadForm, computeWeeklyLoad, computeZoneDistribution } from '../../src/modules/dashboard/analytics';

describe('computeWeeklyLoad', () => {
  it('sums planned load from all workouts and completed load from completed ones only, sorted by week', () => {
    const result = computeWeeklyLoad([
      {
        weekNumber: 2,
        startDate: new Date('2026-01-08'),
        workouts: [
          { status: 'COMPLETED', estimatedTss: 50 },
          { status: 'PLANNED', estimatedTss: 40 },
        ],
      },
      {
        weekNumber: 1,
        startDate: new Date('2026-01-01'),
        workouts: [
          { status: 'COMPLETED', estimatedTss: 30 },
          { status: 'SKIPPED', estimatedTss: 20 },
        ],
      },
    ]);

    expect(result).toEqual([
      { weekNumber: 1, startDate: new Date('2026-01-01'), plannedLoad: 50, completedLoad: 30 },
      { weekNumber: 2, startDate: new Date('2026-01-08'), plannedLoad: 90, completedLoad: 50 },
    ]);
  });

  it('treats missing estimatedTss as zero', () => {
    const result = computeWeeklyLoad([
      { weekNumber: 1, startDate: new Date('2026-01-01'), workouts: [{ status: 'COMPLETED', estimatedTss: null }] },
    ]);
    expect(result[0]).toEqual({ weekNumber: 1, startDate: new Date('2026-01-01'), plannedLoad: 0, completedLoad: 0 });
  });
});

describe('computeZoneDistribution', () => {
  it('buckets completed workouts by intensity and ignores non-completed ones', () => {
    const result = computeZoneDistribution([
      { status: 'COMPLETED', intensity: 'EASY', estimatedTss: 20 },
      { status: 'COMPLETED', intensity: 'EASY', estimatedTss: 25 },
      { status: 'COMPLETED', intensity: 'HARD', estimatedTss: 60 },
      { status: 'PLANNED', intensity: 'HARD', estimatedTss: 60 },
      { status: 'SKIPPED', intensity: 'MODERATE', estimatedTss: 40 },
    ]);

    expect(result).toEqual([
      { intensity: 'easy', count: 2, totalLoad: 45 },
      { intensity: 'moderate', count: 0, totalLoad: 0 },
      { intensity: 'hard', count: 1, totalLoad: 60 },
    ]);
  });

  it('returns all three zones with zero counts when nothing was completed', () => {
    const result = computeZoneDistribution([]);
    expect(result.map((r) => r.intensity)).toEqual(['easy', 'moderate', 'hard']);
    expect(result.every((r) => r.count === 0 && r.totalLoad === 0)).toBe(true);
  });
});

describe('computeLoadForm', () => {
  it('ramps CTL/ATL up under a sustained daily load and keeps form (TSB) negative while loading', () => {
    const dailyLoads = new Map<string, number>();
    const from = new Date('2026-01-01');
    const to = new Date(from.getTime() + 42 * 86_400_000);
    for (let i = 0; i <= 42; i++) {
      const d = new Date(from.getTime() + i * 86_400_000);
      dailyLoads.set(d.toISOString().slice(0, 10), 50);
    }

    const points = computeLoadForm(dailyLoads, from, to);
    expect(points).toHaveLength(43);
    expect(points[0]!.ctl).toBeGreaterThan(0);
    expect(points[points.length - 1]!.ctl).toBeGreaterThan(points[0]!.ctl);
    // Chronic load lags acute load while ramping up, so form (ctl - atl) is negative.
    expect(points[points.length - 1]!.tsb).toBeLessThan(0);
  });

  it('decays CTL/ATL toward zero on days with no logged load', () => {
    const from = new Date('2026-01-01');
    const to = new Date('2026-01-03');
    const dailyLoads = new Map<string, number>([[from.toISOString().slice(0, 10), 100]]);

    const points = computeLoadForm(dailyLoads, from, to);
    expect(points).toHaveLength(3);
    expect(points[0]!.ctl).toBeGreaterThan(0);
    expect(points[2]!.ctl).toBeLessThan(points[0]!.ctl);
    expect(points[2]!.atl).toBeLessThan(points[0]!.atl);
  });

  it('returns a single point when from equals to', () => {
    const from = new Date('2026-01-01');
    const points = computeLoadForm(new Map(), from, from);
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual({ date: from, ctl: 0, atl: 0, tsb: 0 });
  });
});
