import { proposeWeeklyMenu, WeeklySlotInput } from '../../src/modules/nutrition/engine/proposeWeeklyMenu';

const noJitter = () => 0;

function slot(overrides: Partial<WeeklySlotInput> & { date: Date }): WeeklySlotInput {
  return { mealType: 'DINNER', effortProfile: 'BALANCED', candidates: [], ...overrides };
}

describe('proposeWeeklyMenu', () => {
  it('prefers the recipe matching the day effort profile', () => {
    const picks = proposeWeeklyMenu(
      [
        slot({
          date: new Date('2026-07-13'),
          effortProfile: 'CARB_LOAD',
          candidates: [
            { id: 'balanced-recipe', effortProfile: 'BALANCED', ingredientNames: [] },
            { id: 'carb-load-recipe', effortProfile: 'CARB_LOAD', ingredientNames: [] },
          ],
        }),
      ],
      new Set(),
      noJitter
    );
    expect(picks).toEqual([{ date: new Date('2026-07-13'), mealType: 'DINNER', recipeId: 'carb-load-recipe' }]);
  });

  it('deprioritizes a recently-used recipe in favor of an equally-matching alternative', () => {
    const picks = proposeWeeklyMenu(
      [
        slot({
          date: new Date('2026-07-13'),
          effortProfile: 'BALANCED',
          candidates: [
            { id: 'recent', effortProfile: 'BALANCED', ingredientNames: [] },
            { id: 'fresh', effortProfile: 'BALANCED', ingredientNames: [] },
          ],
        }),
      ],
      new Set(['recent']),
      noJitter
    );
    expect(picks[0]!.recipeId).toBe('fresh');
  });

  it('never picks the same recipe twice within the same week', () => {
    const candidates = [
      { id: 'recipe-a', effortProfile: 'BALANCED' as const, ingredientNames: [] },
      { id: 'recipe-b', effortProfile: 'BALANCED' as const, ingredientNames: [] },
    ];
    const picks = proposeWeeklyMenu(
      [
        slot({ date: new Date('2026-07-13'), mealType: 'LUNCH', effortProfile: 'BALANCED', candidates }),
        slot({ date: new Date('2026-07-13'), mealType: 'DINNER', effortProfile: 'BALANCED', candidates }),
      ],
      new Set(),
      noJitter
    );
    // Both candidates match the day's effort profile equally — the first
    // slot picks "recipe-a" (first in array, ties break by declaration
    // order), and the same-week penalty then pushes the second slot to
    // "recipe-b" instead of repeating "recipe-a".
    expect(picks[0]!.recipeId).toBe('recipe-a');
    expect(picks[1]!.recipeId).toBe('recipe-b');
  });

  it('rewards recipes sharing ingredients with ones already picked this week (homogenization)', () => {
    const picks = proposeWeeklyMenu(
      [
        slot({
          date: new Date('2026-07-13'),
          mealType: 'LUNCH',
          effortProfile: 'BALANCED',
          candidates: [{ id: 'rice-dish', effortProfile: 'BALANCED', ingredientNames: ['riz', 'poulet'] }],
        }),
        slot({
          date: new Date('2026-07-13'),
          mealType: 'DINNER',
          effortProfile: 'BALANCED',
          candidates: [
            { id: 'shares-rice', effortProfile: 'BALANCED', ingredientNames: ['riz', 'oignon'] },
            { id: 'shares-nothing', effortProfile: 'BALANCED', ingredientNames: ['pâtes', 'crème'] },
          ],
        }),
      ],
      new Set(),
      noJitter
    );
    expect(picks[0]!.recipeId).toBe('rice-dish');
    expect(picks[1]!.recipeId).toBe('shares-rice');
  });

  it('skips a slot with no candidates instead of throwing', () => {
    const picks = proposeWeeklyMenu(
      [slot({ date: new Date('2026-07-13'), mealType: 'BREAKFAST', effortProfile: 'LIGHT', candidates: [] })],
      new Set(),
      noJitter
    );
    expect(picks).toEqual([]);
  });

  it('prefers the candidate whose category matches the expected weather, among equal effort matches', () => {
    const picks = proposeWeeklyMenu(
      [
        slot({
          date: new Date('2026-07-13'),
          effortProfile: 'BALANCED',
          expectedWeather: 'hot',
          candidates: [
            { id: 'stew', effortProfile: 'BALANCED', ingredientNames: [], categories: ['STEW'] },
            { id: 'salad', effortProfile: 'BALANCED', ingredientNames: [], categories: ['SALAD'] },
          ],
        }),
      ],
      new Set(),
      noJitter
    );
    expect(picks[0]!.recipeId).toBe('salad');
  });

  it('ignores expectedWeather when it is neutral', () => {
    const picks = proposeWeeklyMenu(
      [
        slot({
          date: new Date('2026-07-13'),
          effortProfile: 'BALANCED',
          expectedWeather: 'neutral',
          candidates: [
            { id: 'first', effortProfile: 'BALANCED', ingredientNames: [], categories: ['STEW'] },
            { id: 'second', effortProfile: 'BALANCED', ingredientNames: [], categories: ['SALAD'] },
          ],
        }),
      ],
      new Set(),
      noJitter
    );
    // No weather signal applied — first candidate wins on declaration-order tie-break, same as before this feature existed.
    expect(picks[0]!.recipeId).toBe('first');
  });

  it('behaves exactly as before when expectedWeather is absent (no location set)', () => {
    const picks = proposeWeeklyMenu(
      [
        slot({
          date: new Date('2026-07-13'),
          effortProfile: 'BALANCED',
          candidates: [
            { id: 'first', effortProfile: 'BALANCED', ingredientNames: [], categories: ['STEW'] },
            { id: 'second', effortProfile: 'BALANCED', ingredientNames: [], categories: ['SALAD'] },
          ],
        }),
      ],
      new Set(),
      noJitter
    );
    expect(picks[0]!.recipeId).toBe('first');
  });
});
