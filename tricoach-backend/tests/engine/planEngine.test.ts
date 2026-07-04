import { evaluateAdaptation, applyDeltaLoad, WorkoutOutcome } from '../../src/modules/plans/engine/adaptationEngine';
import { PeriodizationEngine } from '../../src/modules/plans/engine/periodizationEngine';
import { generatePlan } from '../../src/modules/plans/engine/ruleBasedPlanStrategy';
import { GoalType, HealthMetric, PlanGenerationContext, Workout } from '../../src/modules/plans/engine/types';
import { WorkoutFactory } from '../../src/modules/plans/engine/workoutFactory';

const ALL_GOAL_TYPES: GoalType[] = [
  'triathlonSprint', 'triathlonOlympic', 'duathlon', 'run10k', 'halfMarathon',
  'marathon', 'ironman', 'halfIronman', 'improveVMA', 'weightLoss', 'generalEndurance',
];

describe('PeriodizationEngine', () => {
  it('allocates every week across phases for every goal type', () => {
    for (const goal of ALL_GOAL_TYPES) {
      for (const totalWeeks of [4, 8, 12, 16, 24]) {
        const phases = PeriodizationEngine.allocatePhases(totalWeeks, goal);
        const sum = phases.reduce((s, p) => s + p.weeks, 0);
        expect(sum).toBe(totalWeeks);
      }
    }
  });

  it('gives Ironman a longer taper than a 10K', () => {
    expect(PeriodizationEngine.taperWeeks('ironman', 24)).toBeGreaterThan(PeriodizationEngine.taperWeeks('run10k', 8));
  });

  it('collapses very short plans into a single peak phase', () => {
    const phases = PeriodizationEngine.allocatePhases(3, 'run10k');
    expect(phases).toEqual([{ phase: 'peak', weeks: 3 }]);
  });
});

describe('WorkoutFactory.sessionSlots', () => {
  const mondayToSaturday = [2, 3, 4, 5, 6, 7];

  it('matches the requested session count', () => {
    const slots = WorkoutFactory.sessionSlots(5, mondayToSaturday, 'triathlonOlympic', 'build', false, 3);
    expect(slots).toHaveLength(5);
  });

  it('never schedules a hard session during a recovery week', () => {
    const slots = WorkoutFactory.sessionSlots(5, mondayToSaturday, 'marathon', 'build', true, 4);
    expect(slots.some((s) => s.intensity === 'hard')).toBe(false);
  });

  it('includes a brick session in triathlon build weeks with enough sessions', () => {
    const slots = WorkoutFactory.sessionSlots(5, mondayToSaturday, 'triathlonOlympic', 'build', false, 2);
    expect(slots.some((s) => s.sport === 'brick')).toBe(true);
  });

  it('keeps marathon plans running-only', () => {
    const slots = WorkoutFactory.sessionSlots(6, mondayToSaturday, 'marathon', 'build', false, 5);
    expect(slots.every((s) => s.sport === 'run')).toBe(true);
  });
});

function makeContext(goalType: GoalType, durationWeeks: number, sessionsPerWeek = 5): PlanGenerationContext {
  return {
    profile: {
      level: 'intermediate',
      hrMax: 188,
      hrRest: 52,
      ftpWatts: 230,
      thresholdPaceSecPerKm: 270,
      cssPaceSecPer100m: 95,
    },
    goal: { id: 'goal-1', type: goalType, targetDate: new Date('2099-01-01') },
    availability: {
      sessionsPerWeek,
      maxSessionDurationMin: 75,
      availableDays: [2, 3, 4, 5, 6, 7],
      mandatoryRestDays: [1],
    },
    startDate: new Date('2026-01-05'), // a Monday
    explicitDurationWeeks: durationWeeks,
  };
}

describe('generatePlan (RuleBasedPlanStrategy port)', () => {
  it('spans exactly the requested number of weeks for a triathlon plan and includes every discipline', () => {
    const plan = generatePlan(makeContext('triathlonOlympic', 12));
    const microcycles = plan.macrocycles.flatMap((m) => m.mesocycles.flatMap((me) => me.microcycles));
    const workouts = microcycles.flatMap((mc) => mc.workouts);

    expect(plan.durationWeeks).toBe(12);
    expect(microcycles).toHaveLength(12);
    expect(workouts.some((w) => w.sport === 'swim')).toBe(true);
    expect(workouts.some((w) => w.sport === 'bike')).toBe(true);
    expect(workouts.some((w) => w.sport === 'run')).toBe(true);
    expect(workouts.some((w) => w.sport === 'brick')).toBe(true);
  });

  it('keeps a marathon plan running-only', () => {
    const plan = generatePlan(makeContext('marathon', 16));
    const workouts = plan.macrocycles.flatMap((m) => m.mesocycles.flatMap((me) => me.microcycles.flatMap((mc) => mc.workouts)));
    expect(workouts.every((w) => w.sport === 'run')).toBe(true);
  });

  it('never schedules a workout on the mandatory rest day (Sunday)', () => {
    const plan = generatePlan(makeContext('halfMarathon', 8));
    const workouts = plan.macrocycles.flatMap((m) => m.mesocycles.flatMap((me) => me.microcycles.flatMap((mc) => mc.workouts)));
    expect(workouts.every((w) => w.date.getDay() !== 0)).toBe(true); // JS Sunday = 0
  });

  it('gives an Ironman plan a longer taper phase than an Olympic triathlon', () => {
    const ironman = generatePlan(makeContext('ironman', 24));
    const olympic = generatePlan(makeContext('triathlonOlympic', 12));
    const taperWeeks = (plan: typeof ironman) =>
      plan.macrocycles.find((m) => m.phase === 'taper')?.mesocycles.flatMap((me) => me.microcycles).length ?? 0;
    expect(taperWeeks(ironman)).toBeGreaterThan(taperWeeks(olympic));
  });

  it('makes recovery weeks lighter than surrounding load weeks', () => {
    const plan = generatePlan(makeContext('triathlonOlympic', 12));
    const microcycles = plan.macrocycles.flatMap((m) => m.mesocycles.flatMap((me) => me.microcycles));
    const recovery = microcycles.filter((mc) => mc.isRecoveryWeek);
    const load = microcycles.filter((mc) => !mc.isRecoveryWeek);
    expect(recovery.length).toBeGreaterThan(0);
    const avg = (arr: typeof recovery) => arr.reduce((s, mc) => s + mc.plannedLoad, 0) / arr.length;
    expect(avg(recovery)).toBeLessThan(avg(load));
  });
});

describe('AdaptationEngine port', () => {
  function hardWorkout(daysAgo: number): Workout {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return {
      id: 'w1',
      date,
      sport: 'run',
      title: 'Fractionné',
      summary: '',
      structure: { warmup: { durationMin: 10, description: '', target: {} }, mainSet: [], cooldown: { durationMin: 10, description: '', target: {} } },
      plannedDurationMin: 60,
      intensity: 'hard',
      status: 'planned',
      isRecoveryWeek: false,
    };
  }

  it('short-circuits on an injury flag', () => {
    const events = evaluateAdaptation('plan-1', [], [{ date: new Date(), injuries: ['genou'], fatigueLevel: 2, stressLevel: 2, sleepHours: 8 }]);
    expect(events).toHaveLength(1);
    expect(events[0]!.triggeredBy).toBe('injuryFlag');
  });

  it('reduces load after two failed hard sessions', () => {
    const outcomes: WorkoutOutcome[] = [{ planned: hardWorkout(2) }, { planned: hardWorkout(5) }];
    const events = evaluateAdaptation('plan-1', outcomes, []);
    expect(events.some((e) => e.triggeredBy === 'missedWorkout')).toBe(true);
    expect(events.some((e) => (e.deltaLoadPercent ?? 0) < 0)).toBe(true);
  });

  it('rewards a high completion rate with a load increase', () => {
    const workout = hardWorkout(3);
    const outcomes: WorkoutOutcome[] = [
      { planned: workout, completed: { id: 'a1', source: 'manual', startTime: workout.date, durationS: workout.plannedDurationMin * 60, sport: 'run' } },
    ];
    const events = evaluateAdaptation('plan-1', outcomes, []);
    expect(events.some((e) => e.triggeredBy === 'overperformance')).toBe(true);
  });

  function metricsWithBaseline(baselineValue: number, latestValue: number, field: 'hrvMs' | 'restingHr'): HealthMetric[] {
    const baseline: HealthMetric[] = [6, 5, 4, 3, 2, 1].map((daysAgo) => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      return { date, [field]: baselineValue };
    });
    return [...baseline, { date: new Date(), [field]: latestValue }];
  }

  it('flags physiologicalStrain when HRV drops more than 15% below the 7-day baseline', () => {
    const recentHealthMetrics = metricsWithBaseline(60, 40, 'hrvMs'); // -33%
    const events = evaluateAdaptation('plan-1', [], [], recentHealthMetrics);
    expect(events.some((e) => e.triggeredBy === 'physiologicalStrain')).toBe(true);
    expect(events.some((e) => (e.deltaLoadPercent ?? 0) < 0)).toBe(true);
  });

  it('flags physiologicalStrain when resting HR rises more than 10% above the 7-day baseline', () => {
    const recentHealthMetrics = metricsWithBaseline(50, 60, 'restingHr'); // +20%
    const events = evaluateAdaptation('plan-1', [], [], recentHealthMetrics);
    expect(events.some((e) => e.triggeredBy === 'physiologicalStrain')).toBe(true);
  });

  it('does not flag physiologicalStrain for a minor HRV dip within normal noise', () => {
    const recentHealthMetrics = metricsWithBaseline(60, 57, 'hrvMs'); // -5%
    const events = evaluateAdaptation('plan-1', [], [], recentHealthMetrics);
    expect(events.some((e) => e.triggeredBy === 'physiologicalStrain')).toBe(false);
  });

  it('does not flag physiologicalStrain without a baseline to compare against', () => {
    const events = evaluateAdaptation('plan-1', [], [], [{ date: new Date(), hrvMs: 30 }]);
    expect(events.some((e) => e.triggeredBy === 'physiologicalStrain')).toBe(false);
  });

  it('applyDeltaLoad scales planned load and workout durations down', () => {
    const microcycle = {
      id: 'mc1', weekNumber: 3, startDate: new Date(), endDate: new Date(), isRecoveryWeek: false,
      plannedLoad: 300, workouts: [hardWorkout(0)],
    };
    const updated = applyDeltaLoad([{ id: 'e1', planId: 'plan-1', triggeredBy: 'missedWorkout', actionTaken: 'x', deltaLoadPercent: -20, createdAt: new Date() }], microcycle);
    expect(updated.plannedLoad).toBeCloseTo(240, 1);
    expect(updated.workouts[0]!.plannedDurationMin).toBeLessThan(microcycle.workouts[0]!.plannedDurationMin);
  });
});
