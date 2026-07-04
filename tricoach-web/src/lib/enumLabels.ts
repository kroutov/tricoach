// French labels ported from TriCoachAI/Models/Enums.swift and Availability.swift —
// kept 1:1 with the Swift `.label` computed properties so the two clients read the same.

export type Sex = 'male' | 'female' | 'other';
export const SEX_OPTIONS: Sex[] = ['male', 'female', 'other'];
export const sexLabel: Record<Sex, string> = { male: 'Homme', female: 'Femme', other: 'Autre' };

export type AthleteLevel = 'beginner' | 'intermediate' | 'advanced';
export const ATHLETE_LEVEL_OPTIONS: AthleteLevel[] = ['beginner', 'intermediate', 'advanced'];
export const athleteLevelLabel: Record<AthleteLevel, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};
export const athleteLevelDescription: Record<AthleteLevel, string> = {
  beginner: 'Vous découvrez ce sport ou reprenez après une longue pause.',
  intermediate: 'Vous vous entraînez régulièrement depuis plus d’un an.',
  advanced: 'Vous avez déjà bouclé des courses et structurez votre entraînement.',
};

export type GoalType =
  | 'triathlonSprint'
  | 'triathlonOlympic'
  | 'duathlon'
  | 'run10k'
  | 'halfMarathon'
  | 'marathon'
  | 'ironman'
  | 'halfIronman'
  | 'improveVMA'
  | 'weightLoss'
  | 'generalEndurance';

export const GOAL_TYPE_OPTIONS: GoalType[] = [
  'triathlonSprint',
  'triathlonOlympic',
  'duathlon',
  'run10k',
  'halfMarathon',
  'marathon',
  'ironman',
  'halfIronman',
  'improveVMA',
  'weightLoss',
  'generalEndurance',
];

export const goalTypeLabel: Record<GoalType, string> = {
  triathlonSprint: 'Triathlon Sprint',
  triathlonOlympic: 'Triathlon Olympique',
  duathlon: 'Duathlon',
  run10k: '10 km',
  halfMarathon: 'Semi-marathon',
  marathon: 'Marathon',
  ironman: 'Ironman',
  halfIronman: 'Semi-Ironman (70.3)',
  improveVMA: 'Améliorer sa VMA',
  weightLoss: 'Perdre du poids',
  generalEndurance: 'Améliorer l’endurance',
};

export type GoalPriority = 'a' | 'b' | 'c';
export const GOAL_PRIORITY_OPTIONS: GoalPriority[] = ['a', 'b', 'c'];
export const goalPriorityLabel: Record<GoalPriority, string> = {
  a: 'Priorité A',
  b: 'Priorité B',
  c: 'Priorité C',
};

/** Calendar-style weekday numbering used throughout the API: Sunday=1 ... Saturday=7. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** Monday-first — more natural for a training week than the API's Sunday-first numbering. */
export const ORDERED_WEEKDAYS: Weekday[] = [2, 3, 4, 5, 6, 7, 1];
export const weekdayLabel: Record<Weekday, string> = {
  2: 'Lundi',
  3: 'Mardi',
  4: 'Mercredi',
  5: 'Jeudi',
  6: 'Vendredi',
  7: 'Samedi',
  1: 'Dimanche',
};

export type TimeSlot = 'earlyMorning' | 'morning' | 'lunch' | 'afternoon' | 'evening';
export const TIME_SLOT_OPTIONS: TimeSlot[] = ['earlyMorning', 'morning', 'lunch', 'afternoon', 'evening'];
export const timeSlotLabel: Record<TimeSlot, string> = {
  earlyMorning: 'Tôt le matin (avant 7h)',
  morning: 'Matin',
  lunch: 'Pause déjeuner',
  afternoon: 'Après-midi',
  evening: 'Soir',
};

export type WorkoutIntensity = 'easy' | 'moderate' | 'hard';
export const workoutIntensityLabel: Record<WorkoutIntensity, string> = {
  easy: 'Facile',
  moderate: 'Modérée',
  hard: 'Difficile',
};
export const workoutIntensityColorVar: Record<WorkoutIntensity, string> = {
  easy: 'var(--color-intensity-easy)',
  moderate: 'var(--color-intensity-moderate)',
  hard: 'var(--color-intensity-hard)',
};

export type SportType = 'run' | 'bike' | 'swim' | 'brick' | 'strength' | 'rest';
export const sportTypeLabel: Record<SportType, string> = {
  run: 'Course à pied',
  bike: 'Vélo',
  swim: 'Natation',
  brick: 'Enchaînement (brick)',
  strength: 'Renforcement',
  rest: 'Repos',
};

export type AdaptationTrigger =
  | 'missedWorkout'
  | 'overperformance'
  | 'underperformance'
  | 'highFatigue'
  | 'injuryFlag'
  | 'lowRecovery'
  | 'physiologicalStrain';

export const adaptationTriggerLabel: Record<AdaptationTrigger, string> = {
  missedWorkout: 'Séance ratée',
  overperformance: 'Surperformance',
  underperformance: 'Sous-performance',
  highFatigue: 'Fatigue élevée',
  injuryFlag: 'Alerte blessure',
  lowRecovery: 'Récupération faible',
  physiologicalStrain: 'Dérive cardiaque',
};

export type MacrocyclePhase = 'base' | 'build' | 'peak' | 'taper' | 'transition';
export const macrocyclePhaseLabel: Record<MacrocyclePhase, string> = {
  base: 'Base',
  build: 'Développement',
  peak: 'Affûtage spécifique',
  taper: 'Affûtage final',
  transition: 'Transition',
};
