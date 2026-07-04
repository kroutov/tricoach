import { randomUUID } from 'crypto';
import { heartRateZone } from './athleteProfileHelpers';
import { sportsForGoal } from './goalTypeInfo';
import { LoadCalculator } from './loadCalculator';
import {
  AthleteProfile,
  GoalType,
  IntervalBlock,
  MacrocyclePhase,
  ORDERED_WEEKDAYS,
  Range,
  SportType,
  TargetZone,
  Workout,
  WorkoutIntensity,
  WorkoutSection,
  WorkoutStructure,
} from './types';

export interface SessionSlot {
  day: number;
  sport: SportType;
  intensity: WorkoutIntensity;
  isKeySession: boolean;
}

const SPORT_LABELS: Record<SportType, string> = {
  run: 'Course à pied',
  bike: 'Vélo',
  swim: 'Natation',
  brick: 'Enchaînement (brick)',
  strength: 'Renforcement',
  rest: 'Repos',
};

const INTENSITY_LABELS: Record<WorkoutIntensity, string> = { easy: 'Facile', moderate: 'Modérée', hard: 'Difficile' };

function rawWeekOrder(day: number): number {
  return ORDERED_WEEKDAYS.indexOf(day);
}

/** Direct port of Core/PlanEngine/WorkoutFactory.swift. */
export const WorkoutFactory = {
  sessionSlots(
    sessionsPerWeek: number,
    availableDays: number[],
    goalType: GoalType,
    phase: MacrocyclePhase,
    isRecoveryWeek: boolean,
    weekIndexInPlan: number
  ): SessionSlot[] {
    if (sessionsPerWeek <= 0 || availableDays.length === 0) return [];

    const days = [...availableDays].sort((a, b) => rawWeekOrder(a) - rawWeekOrder(b)).slice(0, sessionsPerWeek);
    const count = days.length;
    const intensities = intensityPattern(count, phase, isRecoveryWeek);
    const sports = sportsForGoal(goalType).filter((s) => s !== 'brick');
    const includeBrick =
      sportsForGoal(goalType).includes('brick') &&
      !isRecoveryWeek &&
      (phase === 'build' || phase === 'peak') &&
      count >= 4 &&
      weekIndexInPlan % 2 === 0;

    const slots: SessionSlot[] = [];
    let sportCursor = weekIndexInPlan % Math.max(sports.length, 1);

    for (let index = 0; index < count; index++) {
      const intensity = intensities[index]!;
      const isKey = intensity === 'hard' || (intensity === 'moderate' && index === count - 1);

      let sport: SportType;
      if (includeBrick && index === count - 1) {
        sport = 'brick';
      } else if (sports.length === 0) {
        sport = 'run';
      } else {
        sport = sports[sportCursor % sports.length]!;
        sportCursor += 1;
      }

      slots.push({ day: days[index]!, sport, intensity, isKeySession: isKey });
    }
    return slots;
  },

  makeWorkout(slot: SessionSlot, date: Date, profile: AthleteProfile, maxDurationMin: number, loadMultiplier: number): Workout {
    const baseDuration = duration(slot, maxDurationMin);
    const durationMin = Math.max(15, Math.round(baseDuration * loadMultiplier));
    const structure = buildStructure(slot.sport, slot.intensity, durationMin, profile);

    return {
      id: randomUUID(),
      date,
      sport: slot.sport,
      title: title(slot),
      summary: summary(slot, durationMin),
      structure,
      plannedDurationMin: durationMin,
      estimatedTSS: LoadCalculator.estimatedTSS(durationMin, slot.intensity),
      estimatedTRIMP: LoadCalculator.estimatedTRIMP(durationMin, slot.intensity, profile.sex),
      rpeTarget: LoadCalculator.rpeTarget(slot.intensity),
      intensity: slot.intensity,
      status: 'planned',
      isRecoveryWeek: false,
    };
  },
};

function intensityPattern(count: number, phase: MacrocyclePhase, isRecoveryWeek: boolean): WorkoutIntensity[] {
  if (count <= 0) return [];
  if (isRecoveryWeek || phase === 'taper') {
    const pattern: WorkoutIntensity[] = new Array(count).fill('easy');
    if (count >= 2) pattern[Math.floor(count / 2)] = 'moderate';
    return pattern;
  }

  const pattern: WorkoutIntensity[] = new Array(count).fill('easy');
  switch (phase) {
    case 'base':
      if (count >= 3) pattern[count - 1] = 'moderate';
      break;
    case 'build':
      if (count >= 2) pattern[1] = 'hard';
      if (count >= 4) pattern[count - 1] = 'moderate';
      break;
    case 'peak':
      if (count >= 2) pattern[1] = 'hard';
      if (count >= 3) pattern[count - 1] = 'moderate';
      break;
    case 'transition':
      break;
  }
  return pattern;
}

function duration(slot: SessionSlot, maxDurationMin: number): number {
  if (slot.isKeySession && slot.intensity === 'hard') return maxDurationMin;
  if (slot.isKeySession && slot.intensity === 'moderate') return Math.round(maxDurationMin * 0.9);
  if (slot.intensity === 'easy') return Math.round(maxDurationMin * 0.6);
  if (slot.intensity === 'moderate') return Math.round(maxDurationMin * 0.75);
  return Math.round(maxDurationMin * 0.85); // hard, non-key
}

function title(slot: SessionSlot): string {
  if (slot.sport === 'brick') return 'Enchaînement vélo + course';
  switch (slot.intensity) {
    case 'easy': return `${SPORT_LABELS[slot.sport]} — Endurance fondamentale`;
    case 'moderate': return `${SPORT_LABELS[slot.sport]} — Tempo / allure course`;
    case 'hard': return `${SPORT_LABELS[slot.sport]} — Fractionné VO2max / seuil`;
  }
}

function summary(slot: SessionSlot, durationMin: number): string {
  return `${SPORT_LABELS[slot.sport]}, ${durationMin} min, intensité ${INTENSITY_LABELS[slot.intensity].toLowerCase()}.`;
}

function buildStructure(sport: SportType, intensity: WorkoutIntensity, durationMin: number, profile: AthleteProfile): WorkoutStructure {
  const warmupMin = sport === 'swim' ? 10 : 12;
  const cooldownMin = 8;
  const mainSetMin = Math.max(10, durationMin - warmupMin - cooldownMin);

  const warmup: WorkoutSection = {
    durationMin: warmupMin,
    description: `Échauffement progressif, montée en allure jusqu'à ${sport === 'swim' ? 'aisance technique' : 'Z2'}.`,
    target: targetZone(sport, 'easy', profile),
  };
  const cooldown: WorkoutSection = {
    durationMin: cooldownMin,
    description: 'Retour au calme, allure très facile, étirements légers.',
    target: targetZone(sport, 'easy', profile),
  };
  const mainSet = mainSetBlocks(sport, intensity, mainSetMin, profile);

  return { warmup, mainSet, cooldown };
}

function mainSetBlocks(sport: SportType, intensity: WorkoutIntensity, mainSetMin: number, profile: AthleteProfile): IntervalBlock[] {
  const target = targetZone(sport, intensity, profile);

  if (intensity === 'easy') {
    return [{ id: randomUUID(), repetitions: 1, workDurationSec: mainSetMin * 60, recoveryDurationSec: 0, target, note: 'Continu, allure conversationnelle.' }];
  }
  if (intensity === 'moderate') {
    return [{ id: randomUUID(), repetitions: 1, workDurationSec: mainSetMin * 60, recoveryDurationSec: 0, target, note: 'Tempo soutenu et régulier.' }];
  }

  // hard
  if (sport === 'swim') {
    const reps = Math.max(4, Math.floor(mainSetMin / 3));
    return [{ id: randomUUID(), repetitions: reps, workDurationSec: 100, recoveryDurationSec: 20, target, note: '100m soutenu, départ toutes les ~2 min.' }];
  }
  if (sport === 'bike') {
    const reps = Math.max(3, Math.floor(mainSetMin / 8));
    return [{ id: randomUUID(), repetitions: reps, workDurationSec: 4 * 60, recoveryDurationSec: 3 * 60, target, note: 'Bloc à haute puissance, récupération active.' }];
  }
  const reps = Math.max(4, Math.floor(mainSetMin / 6));
  return [{ id: randomUUID(), repetitions: reps, workDurationSec: 3 * 60, recoveryDurationSec: 2 * 60, target, note: 'Fractionné VO2max, récupération trottinée.' }];
}

function targetZone(sport: SportType, intensity: WorkoutIntensity, profile: AthleteProfile): TargetZone {
  const zoneNumber = intensity === 'easy' ? 2 : intensity === 'moderate' ? 3 : sport === 'swim' ? 4 : 5;

  const zone: TargetZone = { hrZone: zoneNumber };
  const hrRange = heartRateZone(profile, zoneNumber);
  if (hrRange) zone.hrRangeBpm = hrRange;

  if (sport === 'run' || sport === 'brick') {
    if (profile.thresholdPaceSecPerKm != null) {
      const factor = intensity === 'easy' ? 1.2 : intensity === 'moderate' ? 1.05 : 0.92;
      const center = Math.round(profile.thresholdPaceSecPerKm * factor);
      zone.paceSecPerKm = range(center - 8, center + 8);
    }
  } else if (sport === 'bike') {
    if (profile.ftpWatts != null) {
      const factor = intensity === 'easy' ? 0.6 : intensity === 'moderate' ? 0.8 : 1.05;
      const center = Math.round(profile.ftpWatts * factor);
      zone.powerWatts = range(Math.max(0, center - 15), center + 15);
    }
  } else if (sport === 'swim') {
    if (profile.cssPaceSecPer100m != null) {
      const factor = intensity === 'easy' ? 1.2 : intensity === 'moderate' ? 1.08 : 0.98;
      const center = Math.round(profile.cssPaceSecPer100m * factor);
      zone.paceSecPer100m = range(center - 3, center + 3);
    }
  }
  return zone;
}

function range(lowerBound: number, upperBound: number): Range<number> {
  return { lowerBound, upperBound };
}
