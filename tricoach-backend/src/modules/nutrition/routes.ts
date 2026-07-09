import { Router } from 'express';
import { z } from 'zod';
import {
  deleteMenuSelection,
  findRecipeById,
  findRecipes,
  findSuggestedRecipes,
  getDietaryPreference,
  listMenuSelections,
  serializeRecipe,
  setDietaryPreference,
  upsertMenuSelection,
} from './persistence';
import { ApiError } from '../../middleware/errorHandler';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const DIETARY_TAGS = ['vegetarian', 'chickenOnly', 'pescatarian', 'omnivore'] as const;
const CATEGORIES = ['dips', 'cookies', 'ovenBaked', 'stew', 'sandwich', 'dessert', 'toast', 'salad', 'pie', 'vegetarian', 'cake', 'pasta', 'soup'] as const;

// ---- Catalog (GET /nutrition/recipes, GET /nutrition/recipes/suggested) ----

const catalogRouter = Router();

const catalogQuerySchema = z.object({
  mealType: z.enum(MEAL_TYPES).optional(),
  dietaryTag: z.enum(DIETARY_TAGS).optional(),
  category: z.enum(CATEGORIES).optional(),
  search: z.string().optional(),
});

catalogRouter.get('/recipes', async (req, res, next) => {
  try {
    const query = catalogQuerySchema.parse(req.query);
    const recipes = await findRecipes(query);
    res.json(recipes.map(serializeRecipe));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

const suggestedQuerySchema = z.object({
  date: z.coerce.date(),
  mealType: z.enum(MEAL_TYPES),
});

catalogRouter.get('/recipes/suggested', async (req, res, next) => {
  try {
    const query = suggestedQuerySchema.parse(req.query);
    const dietaryPreference = (await getDietaryPreference(req.userId!)) ?? undefined;
    const result = await findSuggestedRecipes(req.userId!, query.date, query.mealType, dietaryPreference);
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

catalogRouter.get('/recipes/:id', async (req, res, next) => {
  try {
    const recipe = await findRecipeById(req.params.id.toLowerCase());
    if (!recipe) throw new ApiError(404, 'recipe_not_found');
    res.json(serializeRecipe(recipe));
  } catch (err) {
    next(err);
  }
});

export const nutritionRouter = catalogRouter;

// ---- Preference + menu selection (mounted at /me/nutrition) ----

const meRouter = Router();

meRouter.get('/preference', async (req, res, next) => {
  try {
    const dietaryPreference = await getDietaryPreference(req.userId!);
    res.json({ dietaryPreference });
  } catch (err) {
    next(err);
  }
});

const preferenceSchema = z.object({ dietaryPreference: z.enum(DIETARY_TAGS).nullable() });

meRouter.put('/preference', async (req, res, next) => {
  try {
    const body = preferenceSchema.parse(req.body);
    const dietaryPreference = await setDietaryPreference(req.userId!, body.dietaryPreference);
    res.json({ dietaryPreference });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

const menuRangeSchema = z.object({ from: z.coerce.date(), to: z.coerce.date() });

meRouter.get('/menu', async (req, res, next) => {
  try {
    const query = menuRangeSchema.parse(req.query);
    const selections = await listMenuSelections(req.userId!, query.from, query.to);
    res.json(selections);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

const menuParamsSchema = z.object({ date: z.coerce.date(), mealType: z.enum(MEAL_TYPES) });
const menuBodySchema = z.object({ recipeId: z.string().uuid() });

meRouter.put('/menu/:date/:mealType', async (req, res, next) => {
  try {
    const params = menuParamsSchema.parse(req.params);
    const body = menuBodySchema.parse(req.body);
    const recipe = await findRecipeById(body.recipeId.toLowerCase());
    if (!recipe) throw new ApiError(404, 'recipe_not_found');
    const selection = await upsertMenuSelection(req.userId!, params.date, params.mealType, recipe.id);
    res.json(selection);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

meRouter.delete('/menu/:date/:mealType', async (req, res, next) => {
  try {
    const params = menuParamsSchema.parse(req.params);
    const deleted = await deleteMenuSelection(req.userId!, params.date, params.mealType);
    if (!deleted) throw new ApiError(404, 'menu_selection_not_found');
    res.status(204).send();
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'invalid_request', details: err.issues });
      return;
    }
    next(err);
  }
});

export const nutritionMeRouter = meRouter;
