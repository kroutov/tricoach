import { Sex, WorkoutIntensity, Workout } from './types';

/** Direct port of Core/PlanEngine/LoadCalculator.swift. */
export const LoadCalculator = {
  intensityFactor(intensity: WorkoutIntensity): number {
    switch (intensity) {
      case 'easy': return 0.55;
      case 'moderate': return 0.75;
      case 'hard': return 0.95;
    }
  },

  rpeTarget(intensity: WorkoutIntensity): number {
    switch (intensity) {
      case 'easy': return 3;
      case 'moderate': return 6;
      case 'hard': return 9;
    }
  },

  estimatedTSS(durationMin: number, intensity: WorkoutIntensity): number {
    const hours = durationMin / 60;
    const factor = LoadCalculator.intensityFactor(intensity);
    return hours * factor * factor * 100;
  },

  estimatedTRIMP(durationMin: number, intensity: WorkoutIntensity, sex: Sex | undefined): number {
    const factor = LoadCalculator.intensityFactor(intensity);
    const genderConstant = sex === 'female' ? 1.67 : 1.92;
    return durationMin * factor * (0.64 * Math.exp(genderConstant * factor));
  },

  totalLoad(workouts: Workout[]): number {
    return workouts.reduce((sum, w) => sum + (w.estimatedTSS ?? 0), 0);
  },
};
