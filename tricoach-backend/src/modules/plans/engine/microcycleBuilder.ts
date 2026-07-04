import { randomUUID } from 'crypto';
import { LoadCalculator } from './loadCalculator';
import { addDays } from './periodizationEngine';
import { MacrocyclePhase, Mesocycle, Microcycle, ORDERED_WEEKDAYS, PlanGenerationContext } from './types';
import { WorkoutFactory } from './workoutFactory';

function rawWeekOrder(day: number): number {
  return ORDERED_WEEKDAYS.indexOf(day);
}

function weekdayDates(weekStart: Date): Map<number, Date> {
  const result = new Map<number, Date>();
  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(weekStart, offset);
    result.set(date.getDay() + 1, date); // JS getDay(): Sun=0..Sat=6 -> Calendar-style Sun=1..Sat=7
  }
  return result;
}

/** Progressive overload within a 4-week block (weeks 1-3 build, week 4 unloads), tapering near the race. */
function loadMultiplier(globalWeekIndex: number, isRecoveryWeek: boolean, phase: MacrocyclePhase, totalPlanWeeks: number): number {
  if (phase === 'taper') {
    const weeksToGo = totalPlanWeeks - globalWeekIndex;
    return weeksToGo <= 0 ? 0.4 : 0.65;
  }
  if (isRecoveryWeek) return 0.65;
  const positionInBlock = (globalWeekIndex - 1) % 4;
  return Math.min(1.24, 1.0 + 0.08 * positionInBlock);
}

/** Direct port of Core/PlanEngine/MicrocycleBuilder.swift. */
export const MicrocycleBuilder = {
  build(mesocycle: Mesocycle, phase: MacrocyclePhase, startingGlobalWeekIndex: number, totalPlanWeeks: number, context: PlanGenerationContext): Microcycle[] {
    const totalDays = Math.round((mesocycle.endDate.getTime() - mesocycle.startDate.getTime()) / 86400000) + 1;
    const weekCount = Math.max(1, Math.round(totalDays / 7));

    const restDays = new Set(context.availability.mandatoryRestDays);
    const availableDays = context.availability.availableDays
      .filter((d) => !restDays.has(d))
      .sort((a, b) => rawWeekOrder(a) - rawWeekOrder(b));
    const sessionsPerWeek = Math.min(context.availability.sessionsPerWeek, Math.max(availableDays.length, 1));

    const microcycles: Microcycle[] = [];
    let weekStart = new Date(mesocycle.startDate);

    for (let offset = 0; offset < weekCount; offset++) {
      const globalIndex = startingGlobalWeekIndex + offset;
      const weekEnd = addDays(weekStart, 6);
      const isRecoveryWeek = phase !== 'taper' && phase !== 'transition' && globalIndex % 4 === 0;
      const multiplier = loadMultiplier(globalIndex, isRecoveryWeek, phase, totalPlanWeeks);

      const slots = WorkoutFactory.sessionSlots(sessionsPerWeek, availableDays, context.goal.type, phase, isRecoveryWeek, globalIndex);
      const datesByWeekday = weekdayDates(weekStart);

      const workouts = slots
        .map((slot) =>
          WorkoutFactory.makeWorkout(slot, datesByWeekday.get(slot.day) ?? weekStart, context.profile, context.availability.maxSessionDurationMin, multiplier)
        )
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      microcycles.push({
        id: randomUUID(),
        weekNumber: globalIndex,
        startDate: weekStart,
        endDate: weekEnd,
        isRecoveryWeek,
        plannedLoad: LoadCalculator.totalLoad(workouts),
        workouts,
      });
      weekStart = addDays(weekStart, 7);
    }
    return microcycles;
  },
};
