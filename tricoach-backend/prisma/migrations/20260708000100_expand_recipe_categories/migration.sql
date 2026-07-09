-- AlterEnum
-- Expands RecipeCategory to match the full category taxonomy of the user's
-- Notion "Recettes" database (see plan §1/§2) — the first migration only
-- covered a subset. Purely additive: existing values (PASTA, SOUP, SALAD,
-- BAKED, VEGETARIAN, DESSERT) are untouched.
ALTER TYPE "RecipeCategory" ADD VALUE 'DIPS';
ALTER TYPE "RecipeCategory" ADD VALUE 'COOKIES';
ALTER TYPE "RecipeCategory" ADD VALUE 'STEW';
ALTER TYPE "RecipeCategory" ADD VALUE 'SANDWICH';
ALTER TYPE "RecipeCategory" ADD VALUE 'TOAST';
ALTER TYPE "RecipeCategory" ADD VALUE 'PIE';
ALTER TYPE "RecipeCategory" ADD VALUE 'CAKE';
