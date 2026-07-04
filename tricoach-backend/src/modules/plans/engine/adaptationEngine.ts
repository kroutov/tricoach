import { randomUUID } from 'crypto';
import { AdaptationEvent, CompletedActivity, ConstraintCheckIn, HealthMetric, Microcycle, Workout } from './types';

export interface WorkoutOutcome {
  planned: Workout;
  completed?: CompletedActivity;
}

function completionRatio(outcome: WorkoutOutcome): number | undefined {
  if (!outcome.completed || outcome.planned.plannedDurationMin <= 0) return undefined;
  return outcome.completed.durationS / 60 / outcome.planned.plannedDurationMin;
}

function isMissed(outcome: WorkoutOutcome, now: Date): boolean {
  if (outcome.planned.status === 'skipped') return true;
  return !outcome.completed && outcome.planned.date < now;
}

function isUnderperformed(outcome: WorkoutOutcome): boolean {
  const ratio = completionRatio(outcome);
  return ratio !== undefined && ratio < 0.8;
}

// "Dérive cardiaque" thresholds: how far the latest reading must move from
// the rolling baseline (the trailing days in the same window, excluding the
// latest reading itself) before it counts as a strain signal rather than
// day-to-day noise.
const HRV_DROP_THRESHOLD_PCT = 0.15;
const RESTING_HR_RISE_THRESHOLD_PCT = 0.1;

function average(values: number[]): number | undefined {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : undefined;
}

interface PhysiologicalStrain {
  hrvDrop: boolean;
  restingHrRise: boolean;
}

function detectPhysiologicalStrain(recentHealthMetrics: HealthMetric[]): PhysiologicalStrain {
  const sorted = [...recentHealthMetrics].sort((a, b) => a.date.getTime() - b.date.getTime());
  const latest = sorted[sorted.length - 1];
  if (!latest) return { hrvDrop: false, restingHrRise: false };

  const baseline = sorted.slice(0, -1);
  const hrvBaseline = average(baseline.map((m) => m.hrvMs).filter((v): v is number => v != null));
  const restingHrBaseline = average(baseline.map((m) => m.restingHr).filter((v): v is number => v != null));

  return {
    hrvDrop: latest.hrvMs != null && hrvBaseline != null && latest.hrvMs < hrvBaseline * (1 - HRV_DROP_THRESHOLD_PCT),
    restingHrRise:
      latest.restingHr != null && restingHrBaseline != null && latest.restingHr > restingHrBaseline * (1 + RESTING_HR_RISE_THRESHOLD_PCT),
  };
}

/**
 * Direct port of Core/PlanEngine/AdaptationEngine.swift. Rules (see plan §6):
 * ≥2 failed/missed hard sessions -> cut next week ~18%; low recovery -> -10%;
 * high fatigue -> -10%; objective HRV drop / resting HR rise vs. the rolling
 * baseline ("dérive cardiaque") -> physiologicalStrain -10%; strong
 * completion with no fatigue signal -> +7%; any logged injury short-circuits
 * everything else with a freeze + alert.
 */
export function evaluateAdaptation(
  planId: string,
  recentOutcomes: WorkoutOutcome[],
  recentCheckIns: ConstraintCheckIn[],
  recentHealthMetrics: HealthMetric[] = [],
  now: Date = new Date()
): AdaptationEvent[] {
  const injured = recentCheckIns.find((c) => c.injuries.length > 0);
  if (injured) {
    return [
      {
        id: randomUUID(),
        planId,
        triggeredBy: 'injuryFlag',
        actionTaken: `Progression gelée : douleur/blessure signalée (${injured.injuries.join(', ')}). Consultez un professionnel de santé avant de reprendre les séances difficiles.`,
        deltaLoadPercent: 0,
        createdAt: now,
      },
    ];
  }

  const events: AdaptationEvent[] = [];

  const failedHardSessions = recentOutcomes.filter(
    (o) => o.planned.intensity === 'hard' && (isMissed(o, now) || isUnderperformed(o))
  );
  if (failedHardSessions.length >= 2) {
    events.push({
      id: randomUUID(),
      planId,
      triggeredBy: failedHardSessions.some((o) => isMissed(o, now)) ? 'missedWorkout' : 'underperformance',
      actionTaken: `${failedHardSessions.length} séances difficiles ratées ou incomplètes récemment : réduction de la charge de la semaine suivante de 18%.`,
      deltaLoadPercent: -18,
      createdAt: now,
    });
  }

  const mostRecentCheckIn = [...recentCheckIns].sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  if (mostRecentCheckIn) {
    const isLowRecovery = mostRecentCheckIn.sleepHours < 6 || mostRecentCheckIn.fatigueLevel >= 4;
    const isHighFatigue = mostRecentCheckIn.fatigueLevel >= 4 || mostRecentCheckIn.stressLevel >= 4;
    if (isLowRecovery) {
      events.push({
        id: randomUUID(),
        planId,
        triggeredBy: 'lowRecovery',
        actionTaken: 'Sommeil/fatigue indiquent une récupération faible : ajout d\'une séance de récupération et conversion de la prochaine séance difficile en séance facile.',
        deltaLoadPercent: -10,
        createdAt: now,
      });
    } else if (isHighFatigue) {
      events.push({
        id: randomUUID(),
        planId,
        triggeredBy: 'highFatigue',
        actionTaken: 'Fatigue/stress déclarés élevés : réduction de l\'intensité de la semaine suivante.',
        deltaLoadPercent: -10,
        createdAt: now,
      });
    }
  }

  const strain = detectPhysiologicalStrain(recentHealthMetrics);
  if (strain.hrvDrop || strain.restingHrRise) {
    const signals = [
      ...(strain.hrvDrop ? ['VFC en baisse'] : []),
      ...(strain.restingHrRise ? ['fréquence cardiaque au repos élevée'] : []),
    ];
    events.push({
      id: randomUUID(),
      planId,
      triggeredBy: 'physiologicalStrain',
      actionTaken: `Dérive cardiaque détectée (${signals.join(' et ')}) par rapport à la moyenne des 7 derniers jours : réduction de l'intensité de la semaine suivante.`,
      deltaLoadPercent: -10,
      createdAt: now,
    });
  }

  if (events.length === 0 && recentOutcomes.length > 0) {
    const ratios = recentOutcomes.map((o) => completionRatio(o)).filter((r): r is number => r !== undefined);
    const completionRate = ratios.filter((r) => r >= 0.95).length / recentOutcomes.length;
    if (completionRate >= 0.9) {
      events.push({
        id: randomUUID(),
        planId,
        triggeredBy: 'overperformance',
        actionTaken: `Séances complétées avec succès (${Math.round(completionRate * 100)}%) : augmentation progressive de la charge de +7%.`,
        deltaLoadPercent: 7,
        createdAt: now,
      });
    }
  }

  return events;
}

export function applyDeltaLoad(events: AdaptationEvent[], microcycle: Microcycle): Microcycle {
  if (events.length === 0) return microcycle;
  const totalDeltaPercent = events.reduce((sum, e) => sum + (e.deltaLoadPercent ?? 0), 0);
  const multiplier = Math.max(0.4, 1.0 + totalDeltaPercent / 100);

  return {
    ...microcycle,
    plannedLoad: microcycle.plannedLoad * multiplier,
    workouts: microcycle.workouts.map((w) => ({
      ...w,
      estimatedTSS: w.estimatedTSS != null ? w.estimatedTSS * multiplier : w.estimatedTSS,
      estimatedTRIMP: w.estimatedTRIMP != null ? w.estimatedTRIMP * multiplier : w.estimatedTRIMP,
      plannedDurationMin: Math.max(10, Math.round(w.plannedDurationMin * multiplier)),
    })),
  };
}
