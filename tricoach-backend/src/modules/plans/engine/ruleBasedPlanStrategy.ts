import { randomUUID } from 'crypto';
import { MesocycleBuilder } from './mesocycleBuilder';
import { MicrocycleBuilder } from './microcycleBuilder';
import { addDays, PeriodizationEngine } from './periodizationEngine';
import { PlanGenerationContext, TrainingPlan } from './types';
import { weeksUntilTarget } from './goalTypeInfo';

/** Direct port of Core/PlanEngine/RuleBasedPlanStrategy.swift. */
export function generatePlan(context: PlanGenerationContext): TrainingPlan {
  const totalWeeks = Math.min(
    Math.max(context.explicitDurationWeeks ?? weeksUntilTarget(context.goal.targetDate, context.goal.type, context.startDate), 4),
    52
  );
  const startDate = new Date(context.startDate);
  startDate.setHours(0, 0, 0, 0);
  const endDate = addDays(startDate, totalWeeks * 7 - 1);

  const macrocycles = PeriodizationEngine.buildMacrocycles(totalWeeks, context.goal.type, startDate);

  let globalWeekIndex = 1;
  for (const macrocycle of macrocycles) {
    const mesocycles = MesocycleBuilder.build(macrocycle);
    for (const mesocycle of mesocycles) {
      const microcycles = MicrocycleBuilder.build(mesocycle, macrocycle.phase, globalWeekIndex, totalWeeks, context);
      mesocycle.microcycles = microcycles;
      globalWeekIndex += microcycles.length;
    }
    macrocycle.mesocycles = mesocycles;
  }

  return {
    id: randomUUID(),
    goalId: context.goal.id,
    startDate,
    endDate,
    durationWeeks: totalWeeks,
    status: 'active',
    generationVersion: 'rule-based-v1',
    createdAt: new Date(),
    macrocycles,
  };
}
