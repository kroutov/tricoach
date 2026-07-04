import { randomUUID } from 'crypto';
import { addDays } from './periodizationEngine';
import { Macrocycle, MacrocyclePhase, Mesocycle } from './types';

const FOCUS_OPTIONS: Record<MacrocyclePhase, string[]> = {
  base: ['Endurance aérobie', 'Endurance aérobie + technique'],
  build: ['Seuil', 'VO2max'],
  peak: ['Spécifique course & enchaînements', 'Allure course'],
  taper: ['Affûtage'],
  transition: ['Récupération active'],
};

/** Direct port of Core/PlanEngine/MesocycleBuilder.swift. */
export const MesocycleBuilder = {
  build(macrocycle: Macrocycle): Mesocycle[] {
    const totalDays = Math.round((macrocycle.endDate.getTime() - macrocycle.startDate.getTime()) / 86400000) + 1;
    const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
    const blockSizeWeeks = 4;
    const blockCount = Math.max(1, Math.ceil(totalWeeks / blockSizeWeeks));
    const focusOptions = FOCUS_OPTIONS[macrocycle.phase];

    const mesocycles: Mesocycle[] = [];
    let cursor = new Date(macrocycle.startDate);
    let weeksRemaining = totalWeeks;

    for (let blockIndex = 0; blockIndex < blockCount; blockIndex++) {
      const weeksInBlock = Math.min(blockSizeWeeks, weeksRemaining);
      if (weeksInBlock <= 0) break;
      const blockEnd = addDays(cursor, weeksInBlock * 7 - 1);
      const focus = focusOptions[blockIndex % focusOptions.length]!;

      mesocycles.push({
        id: randomUUID(),
        name: `${macrocycle.name} — bloc ${blockIndex + 1}`,
        focus,
        startDate: cursor,
        endDate: blockEnd < macrocycle.endDate ? blockEnd : macrocycle.endDate,
        microcycles: [],
      });
      cursor = addDays(cursor, weeksInBlock * 7);
      weeksRemaining -= weeksInBlock;
    }
    return mesocycles;
  },
};
