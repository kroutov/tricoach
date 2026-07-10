export type EffortProfileDb = 'CARB_LOAD' | 'RECOVERY' | 'LIGHT' | 'BALANCED';

export interface CandidateRecipe {
  id: string;
  effortProfile: EffortProfileDb;
  /** Ingredient names, compared by exact string match — no normalization/stemming (see plan §2). */
  ingredientNames: string[];
}

export interface WeeklySlotInput {
  date: Date;
  mealType: string;
  effortProfile: EffortProfileDb;
  candidates: CandidateRecipe[];
}

export interface WeeklyMenuPick {
  date: Date;
  mealType: string;
  recipeId: string;
}

const EFFORT_MATCH_BONUS = 1000;
const RECENT_USE_PENALTY = 500;
const SAME_WEEK_PENALTY = 1000;
const INGREDIENT_OVERLAP_BONUS = 10;

/**
 * Greedy, day-by-day (Monday→Sunday, as ordered in `slots`) recipe picker
 * for the Saturday auto-proposal (plan §2). Each slot is scored independently
 * given state accumulated from slots processed earlier in the same call:
 * - effort-profile match dominates (matches `findSuggestedRecipes`' ranking).
 * - `recentlyUsedRecipeIds` (the athlete's last ~4 weeks) is a soft penalty,
 *   not a hard exclusion — with a small/growing catalog, excluding outright
 *   could leave a slot unfillable; the penalty self-adjusts as the catalog grows.
 * - a stronger penalty avoids picking the exact same recipe twice within
 *   this same week's proposal.
 * - shared ingredients with recipes already picked earlier this week are
 *   rewarded — the homogenization signal, so a week's shopping list trends
 *   toward fewer distinct ingredients.
 * - a small random jitter breaks ties instead of always favoring the same
 *   recipe among equally-scored candidates.
 *
 * Callers (persistence.ts) are responsible for excluding slots that already
 * have a CONFIRMED selection — this function has no concept of "confirmed."
 */
export function proposeWeeklyMenu(
  slots: WeeklySlotInput[],
  recentlyUsedRecipeIds: ReadonlySet<string>,
  random: () => number = Math.random
): WeeklyMenuPick[] {
  const picks: WeeklyMenuPick[] = [];
  const pickedThisWeek = new Set<string>();
  const usedIngredients = new Set<string>();

  for (const slot of slots) {
    let best: CandidateRecipe | null = null;
    let bestScore = -Infinity;

    for (const candidate of slot.candidates) {
      let score = 0;
      if (candidate.effortProfile === slot.effortProfile) score += EFFORT_MATCH_BONUS;
      if (recentlyUsedRecipeIds.has(candidate.id)) score -= RECENT_USE_PENALTY;
      if (pickedThisWeek.has(candidate.id)) score -= SAME_WEEK_PENALTY;
      const overlap = candidate.ingredientNames.filter((name) => usedIngredients.has(name)).length;
      score += overlap * INGREDIENT_OVERLAP_BONUS;
      score += random();

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (!best) continue;
    picks.push({ date: slot.date, mealType: slot.mealType, recipeId: best.id });
    pickedThisWeek.add(best.id);
    for (const name of best.ingredientNames) usedIngredients.add(name);
  }

  return picks;
}
