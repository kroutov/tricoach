import { effortProfileForDay } from '../../src/modules/nutrition/engine/effortProfileForDay';

describe('effortProfileForDay', () => {
  it('returns carbLoad when a hard session is planned today', () => {
    const result = effortProfileForDay({
      workoutsToday: [{ status: 'PLANNED', intensity: 'HARD', estimatedTss: 90 }],
      workoutsTomorrow: [],
      tsb: 5,
    });
    expect(result).toBe('carbLoad');
  });

  it('returns carbLoad when a big-TSS session is planned tomorrow, even if today is empty', () => {
    const result = effortProfileForDay({
      workoutsToday: [],
      workoutsTomorrow: [{ status: 'PLANNED', intensity: 'MODERATE', estimatedTss: 120 }],
      tsb: 5,
    });
    expect(result).toBe('carbLoad');
  });

  it('ignores a hard session that was skipped, treating the day as a rest day', () => {
    const result = effortProfileForDay({
      workoutsToday: [{ status: 'SKIPPED', intensity: 'HARD', estimatedTss: 90 }],
      workoutsTomorrow: [],
      tsb: 5,
    });
    expect(result).toBe('light');
  });

  it('returns recovery when TSB is low and no big session is imminent', () => {
    const result = effortProfileForDay({
      workoutsToday: [{ status: 'PLANNED', intensity: 'EASY', estimatedTss: 20 }],
      workoutsTomorrow: [],
      tsb: -15,
    });
    expect(result).toBe('recovery');
  });

  it('returns light on a rest day with no fatigue', () => {
    const result = effortProfileForDay({ workoutsToday: [], workoutsTomorrow: [], tsb: 2 });
    expect(result).toBe('light');
  });

  it('returns balanced for an ordinary training day', () => {
    const result = effortProfileForDay({
      workoutsToday: [{ status: 'PLANNED', intensity: 'EASY', estimatedTss: 30 }],
      workoutsTomorrow: [],
      tsb: 0,
    });
    expect(result).toBe('balanced');
  });

  it('treats a missing TSB as not-low rather than crashing', () => {
    const result = effortProfileForDay({
      workoutsToday: [{ status: 'PLANNED', intensity: 'EASY', estimatedTss: 30 }],
      workoutsTomorrow: [],
      tsb: null,
    });
    expect(result).toBe('balanced');
  });

  it('handles multiple sessions the same day, prioritizing the hardest one', () => {
    const result = effortProfileForDay({
      workoutsToday: [
        { status: 'PLANNED', intensity: 'EASY', estimatedTss: 20 },
        { status: 'PLANNED', intensity: 'HARD', estimatedTss: 95 },
      ],
      workoutsTomorrow: [],
      tsb: 0,
    });
    expect(result).toBe('carbLoad');
  });
});
