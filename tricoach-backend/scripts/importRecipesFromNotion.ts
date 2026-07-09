/**
 * Commits the reviewed recipe JSON (scripts/data/notionRecipesImport.json)
 * into the database. That JSON is produced by hand/agent-assisted extraction
 * from the user's Notion "Recettes" database (see plan §5) — freetext
 * ingredient lists there don't carry structured quantities, so there is no
 * live Notion API call here, just a one-time commit of the already-reviewed
 * file. Re-run after re-generating and re-reviewing the JSON to pick up
 * Notion edits; existing recipes are matched and replaced by title so this
 * is safe to run more than once.
 *
 * Usage: npx ts-node scripts/importRecipesFromNotion.ts
 */
import { readFileSync } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  dietaryTagMap,
  effortProfileMap,
  groceryAisleMap,
  mealTypeMap,
  prepTimeBucketMap,
  recipeCategoryMap,
} from '../src/lib/enumMapping';

const prisma = new PrismaClient();

interface ImportIngredient {
  name: string;
  amount: number | null;
  unit: string | null;
  aisle: string | null;
}

interface ImportRecipe {
  title: string;
  mealTypes: string[];
  categories: string[];
  dietaryTags: string[];
  effortProfile: string;
  prepTime: string;
  servings: number;
  instructions: string;
  ingredients: ImportIngredient[];
}

async function main() {
  const jsonPath = path.join(__dirname, 'data', 'notionRecipesImport.json');
  const recipes: ImportRecipe[] = JSON.parse(readFileSync(jsonPath, 'utf-8'));

  let created = 0;
  let updated = 0;

  for (const recipe of recipes) {
    const data = {
      title: recipe.title,
      mealTypes: recipe.mealTypes.map((m) => mealTypeMap.toDb(m as Parameters<typeof mealTypeMap.toDb>[0])),
      categories: recipe.categories.map((c) => recipeCategoryMap.toDb(c as Parameters<typeof recipeCategoryMap.toDb>[0])),
      dietaryTags: recipe.dietaryTags.map((d) => dietaryTagMap.toDb(d as Parameters<typeof dietaryTagMap.toDb>[0])),
      effortProfile: effortProfileMap.toDb(recipe.effortProfile as Parameters<typeof effortProfileMap.toDb>[0]),
      prepTime: prepTimeBucketMap.toDb(recipe.prepTime as Parameters<typeof prepTimeBucketMap.toDb>[0]),
      servings: recipe.servings,
      instructions: recipe.instructions,
    };

    const existing = await prisma.recipe.findFirst({ where: { title: recipe.title } });
    const ingredientsCreate = recipe.ingredients.map((ing) => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      aisle: ing.aisle ? groceryAisleMap.toDb(ing.aisle as Parameters<typeof groceryAisleMap.toDb>[0]) : null,
    }));

    if (existing) {
      await prisma.recipeIngredient.deleteMany({ where: { recipeId: existing.id } });
      await prisma.recipe.update({
        where: { id: existing.id },
        data: { ...data, ingredients: { create: ingredientsCreate } },
      });
      updated++;
    } else {
      await prisma.recipe.create({ data: { ...data, ingredients: { create: ingredientsCreate } } });
      created++;
    }
  }

  console.log(`Recipes imported: ${created} created, ${updated} updated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
