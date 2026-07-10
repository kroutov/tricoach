import { apiFetch } from './client';
import type { DietaryTag, EffortProfile, GroceryAisle, MealType, MenuSelectionStatus, PrepTimeBucket, RecipeCategory } from '../lib/enumLabels';

export interface RecipeIngredient {
  id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  aisle: GroceryAisle | null;
}

export interface Recipe {
  id: string;
  title: string;
  mealTypes: MealType[];
  categories: RecipeCategory[];
  dietaryTags: DietaryTag[];
  effortProfile: EffortProfile;
  prepTime: PrepTimeBucket;
  servings: number;
  instructions: string;
  ingredients: RecipeIngredient[];
}

export interface RecipeCatalogFilter {
  mealType?: MealType;
  dietaryTag?: DietaryTag;
  category?: RecipeCategory;
  search?: string;
}

export function getRecipes(filter: RecipeCatalogFilter = {}): Promise<Recipe[]> {
  const params = new URLSearchParams();
  if (filter.mealType) params.set('mealType', filter.mealType);
  if (filter.dietaryTag) params.set('dietaryTag', filter.dietaryTag);
  if (filter.category) params.set('category', filter.category);
  if (filter.search) params.set('search', filter.search);
  const query = params.toString();
  return apiFetch(`/nutrition/recipes${query ? `?${query}` : ''}`);
}

export interface SuggestedRecipes {
  effortProfile: EffortProfile;
  recipes: Recipe[];
}

export function getSuggestedRecipes(date: string, mealType: MealType): Promise<SuggestedRecipes> {
  return apiFetch(`/nutrition/recipes/suggested?date=${date}&mealType=${mealType}`);
}

export interface DietaryPreference {
  dietaryPreference: DietaryTag | null;
}

export function getDietaryPreference(): Promise<DietaryPreference> {
  return apiFetch('/me/nutrition/preference');
}

export function updateDietaryPreference(dietaryPreference: DietaryTag | null): Promise<DietaryPreference> {
  return apiFetch('/me/nutrition/preference', { method: 'PUT', body: { dietaryPreference } });
}

export interface MenuSelection {
  id: string;
  date: string;
  mealType: MealType;
  status: MenuSelectionStatus;
  recipe: Recipe;
}

export function getMenuSelections(from: string, to: string): Promise<MenuSelection[]> {
  return apiFetch(`/me/nutrition/menu?from=${from}&to=${to}`);
}

export function setMenuSelection(date: string, mealType: MealType, recipeId: string): Promise<MenuSelection> {
  return apiFetch(`/me/nutrition/menu/${date}/${mealType}`, { method: 'PUT', body: { recipeId } });
}

export function deleteMenuSelection(date: string, mealType: MealType): Promise<void> {
  return apiFetch(`/me/nutrition/menu/${date}/${mealType}`, { method: 'DELETE' });
}

/** Bulk "Tout valider" — flips every PROPOSED slot in the given week (Monday `weekStart`) to CONFIRMED. */
export function confirmWeek(weekStart: string): Promise<{ confirmed: number }> {
  return apiFetch('/me/nutrition/menu/confirm-week', { method: 'POST', body: { weekStart } });
}
