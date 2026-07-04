import { GoalType, SportType } from './types';

/** Mirrors `GoalType.sports` / `GoalType.recommendedWeeks` in Swift's Models/Enums.swift. */
const SPORTS_BY_GOAL: Record<GoalType, SportType[]> = {
  triathlonSprint: ['swim', 'bike', 'run', 'brick'],
  triathlonOlympic: ['swim', 'bike', 'run', 'brick'],
  ironman: ['swim', 'bike', 'run', 'brick'],
  halfIronman: ['swim', 'bike', 'run', 'brick'],
  duathlon: ['run', 'bike', 'brick'],
  run10k: ['run'],
  halfMarathon: ['run'],
  marathon: ['run'],
  improveVMA: ['run'],
  weightLoss: ['run', 'bike', 'swim'],
  generalEndurance: ['run', 'bike', 'swim'],
};

const RECOMMENDED_WEEKS_BY_GOAL: Record<GoalType, number> = {
  run10k: 8,
  improveVMA: 8,
  halfMarathon: 12,
  duathlon: 12,
  triathlonSprint: 12,
  marathon: 16,
  triathlonOlympic: 16,
  halfIronman: 16,
  ironman: 24,
  weightLoss: 12,
  generalEndurance: 12,
};

export function sportsForGoal(type: GoalType): SportType[] {
  return SPORTS_BY_GOAL[type];
}

export function recommendedWeeksForGoal(type: GoalType): number {
  return RECOMMENDED_WEEKS_BY_GOAL[type];
}

/** Mirrors `Goal.weeksUntilTarget` in Swift. */
export function weeksUntilTarget(targetDate: Date, goalType: GoalType, now: Date = new Date()): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeks = Math.round((targetDate.getTime() - now.getTime()) / msPerWeek);
  return Math.max(1, weeks || recommendedWeeksForGoal(goalType));
}
