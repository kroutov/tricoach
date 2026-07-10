import { MealType, Prisma, Recipe, RecipeIngredient } from '@prisma/client';
import { prisma } from '../../db/client';
import { toDateOnly } from '../../lib/dateOnly';
import {
  dietaryTagMap,
  effortProfileMap,
  groceryAisleMap,
  mealTypeMap,
  menuSelectionStatusMap,
  prepTimeBucketMap,
  recipeCategoryMap,
} from '../../lib/enumMapping';
import { computeLoadForm } from '../dashboard/analytics';
import { effortProfileForDay, EffortProfileApi } from './engine/effortProfileForDay';
import { CandidateRecipe, proposeWeeklyMenu, WeeklySlotInput } from './engine/proposeWeeklyMenu';

type RecipeWithIngredients = Recipe & { ingredients: RecipeIngredient[] };

export function serializeIngredient(ingredient: RecipeIngredient) {
  return {
    id: ingredient.id,
    name: ingredient.name,
    amount: ingredient.amount,
    unit: ingredient.unit,
    aisle: ingredient.aisle ? groceryAisleMap.toApi(ingredient.aisle) : null,
  };
}

export function serializeRecipe(recipe: RecipeWithIngredients) {
  return {
    id: recipe.id,
    title: recipe.title,
    mealTypes: recipe.mealTypes.map((m) => mealTypeMap.toApi(m)),
    categories: recipe.categories.map((c) => recipeCategoryMap.toApi(c)),
    dietaryTags: recipe.dietaryTags.map((t) => dietaryTagMap.toApi(t)),
    effortProfile: effortProfileMap.toApi(recipe.effortProfile),
    prepTime: prepTimeBucketMap.toApi(recipe.prepTime),
    servings: recipe.servings,
    instructions: recipe.instructions,
    ingredients: recipe.ingredients.map(serializeIngredient),
  };
}

export interface RecipeFilters {
  mealType?: string;
  dietaryTag?: string;
  category?: string;
  search?: string;
}

export async function findRecipes(filters: RecipeFilters): Promise<RecipeWithIngredients[]> {
  const where: Prisma.RecipeWhereInput = { isActive: true };
  if (filters.mealType) where.mealTypes = { has: mealTypeMap.toDb(filters.mealType as Parameters<typeof mealTypeMap.toDb>[0]) };
  if (filters.dietaryTag) where.dietaryTags = { has: dietaryTagMap.toDb(filters.dietaryTag as Parameters<typeof dietaryTagMap.toDb>[0]) };
  if (filters.category) where.categories = { has: recipeCategoryMap.toDb(filters.category as Parameters<typeof recipeCategoryMap.toDb>[0]) };
  if (filters.search) where.title = { contains: filters.search, mode: 'insensitive' };

  return prisma.recipe.findMany({ where, include: { ingredients: true }, orderBy: { title: 'asc' } });
}

export async function findRecipeById(id: string): Promise<RecipeWithIngredients | null> {
  return prisma.recipe.findUnique({ where: { id }, include: { ingredients: true } });
}

/**
 * Effort profile for `date`, from the athlete's active plan and completed
 * load history — reuses computeLoadForm (dashboard analytics.ts) rather than
 * recomputing training stress. Returns 'balanced' when there's no active
 * plan to reason about.
 */
export async function computeEffortProfileForUserDate(userId: string, date: Date): Promise<EffortProfileApi> {
  const plan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: { macrocycles: { include: { mesocycles: { include: { microcycles: { include: { workouts: true } } } } } } },
  });
  if (!plan) return effortProfileForDay({ workoutsToday: [], workoutsTomorrow: [], tsb: null });

  const allWorkouts = plan.macrocycles.flatMap((mc) => mc.mesocycles.flatMap((me) => me.microcycles.flatMap((mic) => mic.workouts)));

  const targetDate = toDateOnly(date);
  const nextDate = toDateOnly(new Date(targetDate.getTime() + 86_400_000));
  const sameDay = (a: Date, b: Date) => a.getTime() === b.getTime();

  const workoutsToday = allWorkouts.filter((w) => sameDay(toDateOnly(w.date), targetDate));
  const workoutsTomorrow = allWorkouts.filter((w) => sameDay(toDateOnly(w.date), nextDate));

  const dailyLoads = new Map<string, number>();
  for (const w of allWorkouts) {
    if (w.status !== 'COMPLETED') continue;
    const key = w.date.toISOString().slice(0, 10);
    dailyLoads.set(key, (dailyLoads.get(key) ?? 0) + (w.estimatedTss ?? 0));
  }

  let tsb: number | null = null;
  const loadTo = targetDate < plan.endDate ? targetDate : plan.endDate;
  if (plan.startDate <= loadTo) {
    const points = computeLoadForm(dailyLoads, plan.startDate, loadTo);
    tsb = points[points.length - 1]?.tsb ?? null;
  }

  return effortProfileForDay({
    workoutsToday: workoutsToday.map((w) => ({ status: w.status, intensity: w.intensity, estimatedTss: w.estimatedTss })),
    workoutsTomorrow: workoutsTomorrow.map((w) => ({ status: w.status, intensity: w.intensity, estimatedTss: w.estimatedTss })),
    tsb,
  });
}

const SUGGESTION_COUNT = 6;

/**
 * Several ranked candidates for `date`/`mealType` (never a single pick — the
 * athlete chooses, plan §4). Recipes matching the day's effort profile sort
 * first; the catalog still fills out the list if too few match exactly, so
 * the response is never empty as long as any recipe fits mealType/diet.
 */
export async function findSuggestedRecipes(userId: string, date: Date, mealType: string, dietaryPreference?: string) {
  const [effortProfile, candidates] = await Promise.all([
    computeEffortProfileForUserDate(userId, date),
    findRecipes({ mealType, dietaryTag: dietaryPreference }),
  ]);

  const targetDbProfile = effortProfileMap.toDb(effortProfile);
  const ranked = [...candidates].sort((a, b) => {
    const aMatch = a.effortProfile === targetDbProfile ? 0 : 1;
    const bMatch = b.effortProfile === targetDbProfile ? 0 : 1;
    return aMatch - bMatch;
  });

  return { effortProfile, recipes: ranked.slice(0, SUGGESTION_COUNT).map(serializeRecipe) };
}

export async function getDietaryPreference(userId: string): Promise<string | null> {
  const profile = await prisma.athleteProfile.findUnique({ where: { userId } });
  return profile?.dietaryPreference ? dietaryTagMap.toApi(profile.dietaryPreference) : null;
}

export async function setDietaryPreference(userId: string, preference: string | null) {
  const data = { dietaryPreference: preference ? dietaryTagMap.toDb(preference as Parameters<typeof dietaryTagMap.toDb>[0]) : null };
  const profile = await prisma.athleteProfile.upsert({
    where: { userId },
    update: data,
    create: { ...data, userId, level: 'BEGINNER' },
  });
  return profile.dietaryPreference ? dietaryTagMap.toApi(profile.dietaryPreference) : null;
}

export function serializeMenuSelection(selection: {
  id: string;
  date: Date;
  mealType: string;
  recipeId: string;
  status: string;
  recipe: RecipeWithIngredients;
}) {
  return {
    id: selection.id,
    date: selection.date,
    mealType: mealTypeMap.toApi(selection.mealType as Parameters<typeof mealTypeMap.toApi>[0]),
    status: menuSelectionStatusMap.toApi(selection.status as Parameters<typeof menuSelectionStatusMap.toApi>[0]),
    recipe: serializeRecipe(selection.recipe),
  };
}

export async function listMenuSelections(userId: string, from: Date, to: Date) {
  const selections = await prisma.menuSelection.findMany({
    where: { userId, date: { gte: toDateOnly(from), lte: toDateOnly(to) } },
    include: { recipe: { include: { ingredients: true } } },
    orderBy: { date: 'asc' },
  });
  return selections.map(serializeMenuSelection);
}

/**
 * Any explicit write from the user — picking a recipe for an empty slot,
 * changing one, or hitting "Valider" on an auto-proposed one (same call,
 * same `recipeId`) — always lands as CONFIRMED. Only `proposeWeekForUser`
 * ever writes PROPOSED, so this is the one place that distinction matters.
 */
export async function upsertMenuSelection(userId: string, date: Date, mealType: string, recipeId: string) {
  const dbMealType = mealTypeMap.toDb(mealType as Parameters<typeof mealTypeMap.toDb>[0]);
  const selection = await prisma.menuSelection.upsert({
    where: { userId_date_mealType: { userId, date: toDateOnly(date), mealType: dbMealType } },
    update: { recipeId, status: 'CONFIRMED' },
    create: { userId, date: toDateOnly(date), mealType: dbMealType, recipeId, status: 'CONFIRMED' },
    include: { recipe: { include: { ingredients: true } } },
  });
  return serializeMenuSelection(selection);
}

/** Bulk "Tout valider" for a week — one query instead of N sequential upserts. Idempotent. */
export async function confirmWeek(userId: string, weekStart: Date, weekEnd: Date): Promise<number> {
  const result = await prisma.menuSelection.updateMany({
    where: { userId, date: { gte: toDateOnly(weekStart), lte: toDateOnly(weekEnd) }, status: 'PROPOSED' },
    data: { status: 'CONFIRMED' },
  });
  return result.count;
}

/** Users considered "using" nutrition — proven engagement, not just an unused profile default. */
export async function listUserIdsWithMenuHistory(): Promise<string[]> {
  const rows = await prisma.menuSelection.findMany({ distinct: ['userId'], select: { userId: true } });
  return rows.map((r) => r.userId);
}

const RECENT_USE_LOOKBACK_DAYS = 28;
const PROPOSAL_MEAL_TYPES: Array<Parameters<typeof mealTypeMap.toDb>[0]> = ['lunch', 'dinner'];

/**
 * Generates and persists next week's lunch/dinner proposals for one user
 * (called per-user by the scheduled trigger, plan §3/§4). Skips any slot
 * that already has a CONFIRMED selection; overwrites a stale PROPOSED one.
 */
export async function proposeWeekForUser(userId: string, weekStart: Date): Promise<number> {
  const start = toDateOnly(weekStart);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86_400_000));
  const weekEnd = days[days.length - 1]!;
  const slotKey = (date: Date, mealType: string) => `${date.toISOString().slice(0, 10)}-${mealType}`;

  const existing = await prisma.menuSelection.findMany({
    where: { userId, date: { gte: start, lte: weekEnd } },
    select: { date: true, mealType: true, status: true },
  });
  const confirmedSlots = new Set(existing.filter((s) => s.status === 'CONFIRMED').map((s) => slotKey(s.date, s.mealType)));

  const preference = await getDietaryPreference(userId);

  const lookbackStart = new Date(start.getTime() - RECENT_USE_LOOKBACK_DAYS * 86_400_000);
  const recentSelections = await prisma.menuSelection.findMany({
    where: { userId, date: { gte: lookbackStart, lt: start } },
    select: { recipeId: true },
  });
  const recentlyUsedRecipeIds = new Set(recentSelections.map((s) => s.recipeId));

  const candidatesByMealType = new Map<string, CandidateRecipe[]>();
  for (const mealType of PROPOSAL_MEAL_TYPES) {
    const recipes = await findRecipes({ mealType, dietaryTag: preference ?? undefined });
    candidatesByMealType.set(
      mealType,
      recipes.map((r) => ({ id: r.id, effortProfile: r.effortProfile, ingredientNames: r.ingredients.map((i) => i.name) }))
    );
  }

  const slots: WeeklySlotInput[] = [];
  for (const day of days) {
    const effortProfile = effortProfileMap.toDb(await computeEffortProfileForUserDate(userId, day));
    for (const mealType of PROPOSAL_MEAL_TYPES) {
      const dbMealType = mealTypeMap.toDb(mealType);
      if (confirmedSlots.has(slotKey(day, dbMealType))) continue;
      slots.push({ date: day, mealType: dbMealType, effortProfile, candidates: candidatesByMealType.get(mealType) ?? [] });
    }
  }

  const picks = proposeWeeklyMenu(slots, recentlyUsedRecipeIds);

  await Promise.all(
    picks.map((pick) => {
      const mealType = pick.mealType as MealType;
      return prisma.menuSelection.upsert({
        where: { userId_date_mealType: { userId, date: pick.date, mealType } },
        update: { recipeId: pick.recipeId, status: 'PROPOSED' },
        create: { userId, date: pick.date, mealType, recipeId: pick.recipeId, status: 'PROPOSED' },
      });
    })
  );

  return picks.length;
}

export async function deleteMenuSelection(userId: string, date: Date, mealType: string): Promise<boolean> {
  const dbMealType = mealTypeMap.toDb(mealType as Parameters<typeof mealTypeMap.toDb>[0]);
  const existing = await prisma.menuSelection.findUnique({
    where: { userId_date_mealType: { userId, date: toDateOnly(date), mealType: dbMealType } },
  });
  if (!existing) return false;
  await prisma.menuSelection.delete({ where: { id: existing.id } });
  return true;
}
