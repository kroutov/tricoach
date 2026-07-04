import { randomUUID } from 'crypto';
import { GoalType, Macrocycle, MacrocyclePhase } from './types';

export interface PhaseAllocation {
  phase: MacrocyclePhase;
  weeks: number;
}

const PHASE_LABELS: Record<MacrocyclePhase, string> = {
  base: 'Base',
  build: 'Développement',
  peak: 'Affûtage spécifique',
  taper: 'Affûtage final',
  transition: 'Transition',
};

/** Direct port of Core/PlanEngine/PeriodizationEngine.swift. */
export const PeriodizationEngine = {
  taperWeeks(goalType: GoalType, totalWeeks: number): number {
    let base: number;
    switch (goalType) {
      case 'run10k':
      case 'improveVMA':
      case 'weightLoss':
      case 'generalEndurance':
      case 'duathlon':
      case 'triathlonSprint':
      case 'halfMarathon':
        base = 1;
        break;
      case 'triathlonOlympic':
      case 'marathon':
      case 'halfIronman':
        base = 2;
        break;
      case 'ironman':
        base = 3;
        break;
    }
    return Math.max(1, Math.min(base, Math.floor(totalWeeks / 4)));
  },

  allocatePhases(totalWeeks: number, goalType: GoalType): PhaseAllocation[] {
    if (totalWeeks <= 0) return [];

    if (totalWeeks <= 3) {
      return [{ phase: 'peak', weeks: totalWeeks }];
    }

    const taper = PeriodizationEngine.taperWeeks(goalType, totalWeeks);
    const remaining = totalWeeks - taper;

    if (remaining <= 3) {
      const allocations: PhaseAllocation[] = [
        { phase: 'build', weeks: remaining },
        { phase: 'taper', weeks: taper },
      ];
      return allocations.filter((a) => a.weeks > 0);
    }

    const peak = Math.max(1, Math.round(remaining * 0.2));
    const build = Math.max(1, Math.round(remaining * 0.35));
    const base = Math.max(1, remaining - peak - build);

    const allocations: PhaseAllocation[] = [
      { phase: 'base', weeks: base },
      { phase: 'build', weeks: build },
      { phase: 'peak', weeks: peak },
      { phase: 'taper', weeks: taper },
    ];
    return allocations.filter((a) => a.weeks > 0);
  },

  buildMacrocycles(totalWeeks: number, goalType: GoalType, startDate: Date): Macrocycle[] {
    const allocations = PeriodizationEngine.allocatePhases(totalWeeks, goalType);
    const macrocycles: Macrocycle[] = [];
    let cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);

    for (const allocation of allocations) {
      const phaseStart = new Date(cursor);
      const phaseEnd = addDays(phaseStart, allocation.weeks * 7 - 1);
      macrocycles.push({
        id: randomUUID(),
        name: PHASE_LABELS[allocation.phase],
        phase: allocation.phase,
        startDate: phaseStart,
        endDate: phaseEnd,
        mesocycles: [],
      });
      cursor = addDays(cursor, allocation.weeks * 7);
    }
    return macrocycles;
  },
};

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
