export type WeatherAffinity = 'hot' | 'cold' | 'neutral';

export type RecipeCategoryDb =
  | 'DIPS'
  | 'COOKIES'
  | 'BAKED'
  | 'STEW'
  | 'SANDWICH'
  | 'DESSERT'
  | 'TOAST'
  | 'SALAD'
  | 'PIE'
  | 'VEGETARIAN'
  | 'CAKE'
  | 'PASTA'
  | 'SOUP';

const COLD_CATEGORIES = new Set<RecipeCategoryDb>(['STEW', 'SOUP', 'BAKED', 'PIE']);
const HOT_CATEGORIES = new Set<RecipeCategoryDb>(['SALAD', 'SANDWICH', 'TOAST', 'DIPS']);

/** A recipe with mixed categories (e.g. SALAD + PASTA) or none recognized stays neutral — no strong signal either way. */
export function recipeWeatherAffinity(categories: RecipeCategoryDb[]): WeatherAffinity {
  const isHot = categories.some((c) => HOT_CATEGORIES.has(c));
  const isCold = categories.some((c) => COLD_CATEGORIES.has(c));
  if (isHot && !isCold) return 'hot';
  if (isCold && !isHot) return 'cold';
  return 'neutral';
}

const HOT_THRESHOLD_C = 25;
const COLD_THRESHOLD_C = 10;

export function classifyDailyWeather(maxTempC: number): WeatherAffinity {
  if (maxTempC >= HOT_THRESHOLD_C) return 'hot';
  if (maxTempC <= COLD_THRESHOLD_C) return 'cold';
  return 'neutral';
}
