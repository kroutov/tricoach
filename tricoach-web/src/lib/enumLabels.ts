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
export const sportTypeColorVar: Record<SportType, string> = {
  run: 'var(--color-sport-run)',
  bike: 'var(--color-sport-bike)',
  swim: 'var(--color-sport-swim)',
  brick: 'var(--color-sport-brick)',
  strength: 'var(--color-sport-strength)',
  rest: 'var(--color-sport-rest)',
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

export type ActivitySource = 'healthKit' | 'strava' | 'garmin' | 'manual';
export const activitySourceLabel: Record<ActivitySource, string> = {
  healthKit: 'Apple Santé',
  strava: 'Strava',
  garmin: 'Garmin',
  manual: 'Manuel',
};

export type MacrocyclePhase = 'base' | 'build' | 'peak' | 'taper' | 'transition';
export const macrocyclePhaseLabel: Record<MacrocyclePhase, string> = {
  base: 'Base',
  build: 'Développement',
  peak: 'Affûtage spécifique',
  taper: 'Affûtage final',
  transition: 'Transition',
};

// Nutrition (plan §2/§3) — mirrors tricoach-backend/src/lib/enumMapping.ts and Prisma's Recipe/MenuSelection models.

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEAL_TYPE_OPTIONS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
export const mealTypeLabel: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Snack',
};

export type DietaryTag = 'vegetarian' | 'chickenOnly' | 'pescatarian' | 'omnivore';
export const DIETARY_TAG_OPTIONS: DietaryTag[] = ['vegetarian', 'chickenOnly', 'pescatarian', 'omnivore'];
export const dietaryTagLabel: Record<DietaryTag, string> = {
  vegetarian: 'Végétarien',
  chickenOnly: 'Poulet uniquement',
  pescatarian: 'Pescétarien',
  omnivore: 'Tout type d’ingrédient',
};

export type EffortProfile = 'carbLoad' | 'recovery' | 'light' | 'balanced';
export const effortProfileLabel: Record<EffortProfile, string> = {
  carbLoad: 'Riche en glucides',
  recovery: 'Récupération',
  light: 'Léger',
  balanced: 'Équilibré',
};
export const effortProfileColorVar: Record<EffortProfile, string> = {
  carbLoad: 'var(--color-intensity-hard)',
  recovery: 'var(--color-intensity-easy)',
  light: 'var(--color-sport-swim)',
  balanced: 'var(--color-brand)',
};

export type RecipeCategory =
  | 'dips'
  | 'cookies'
  | 'ovenBaked'
  | 'stew'
  | 'sandwich'
  | 'dessert'
  | 'toast'
  | 'salad'
  | 'pie'
  | 'vegetarian'
  | 'cake'
  | 'pasta'
  | 'soup';

export const RECIPE_CATEGORY_OPTIONS: RecipeCategory[] = [
  'dips',
  'cookies',
  'ovenBaked',
  'stew',
  'sandwich',
  'dessert',
  'toast',
  'salad',
  'pie',
  'vegetarian',
  'cake',
  'pasta',
  'soup',
];

export const recipeCategoryLabel: Record<RecipeCategory, string> = {
  dips: 'Dips',
  cookies: 'Biscuits',
  ovenBaked: 'Plats au four',
  stew: 'Plats mijotés',
  sandwich: 'Sandwich',
  dessert: 'Desserts',
  toast: 'Tartines',
  salad: 'Salades',
  pie: 'Tartes',
  vegetarian: 'Végétarien',
  cake: 'Gâteaux',
  pasta: 'Pâtes',
  soup: 'Soupe',
};

export type PrepTimeBucket = 'under15' | 'min15to30' | 'min30to45' | 'min45to60' | 'over60';
export const prepTimeBucketLabel: Record<PrepTimeBucket, string> = {
  under15: '< 15 min',
  min15to30: '15 - 30 min',
  min30to45: '30 - 45 min',
  min45to60: '45 - 60 min',
  over60: '> 1 h',
};

export type GroceryAisle = 'butcher' | 'bakery' | 'grocery' | 'produce' | 'fishmonger' | 'fresh' | 'frozen';
export const groceryAisleLabel: Record<GroceryAisle, string> = {
  butcher: 'Boucherie',
  bakery: 'Boulangerie',
  grocery: 'Épicerie',
  produce: 'Fruits et légumes',
  fishmonger: 'Poissonnerie',
  fresh: 'Rayon frais',
  frozen: 'Surgelé',
};
