-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "DietaryTag" AS ENUM ('VEGETARIAN', 'CHICKEN_ONLY', 'PESCATARIAN', 'OMNIVORE');

-- CreateEnum
CREATE TYPE "EffortProfile" AS ENUM ('CARB_LOAD', 'RECOVERY', 'LIGHT', 'BALANCED');

-- CreateEnum
CREATE TYPE "RecipeCategory" AS ENUM ('PASTA', 'SOUP', 'SALAD', 'BAKED', 'VEGETARIAN', 'DESSERT');

-- CreateEnum
CREATE TYPE "PrepTimeBucket" AS ENUM ('UNDER_15', 'MIN_15_30', 'MIN_30_45', 'MIN_45_60', 'OVER_60');

-- CreateEnum
CREATE TYPE "GroceryAisle" AS ENUM ('BUTCHER', 'BAKERY', 'GROCERY', 'PRODUCE', 'FISHMONGER', 'FRESH', 'FROZEN');

-- AlterTable
ALTER TABLE "athlete_profiles" ADD COLUMN "dietary_preference" "DietaryTag";

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "meal_types" "MealType"[],
    "categories" "RecipeCategory"[],
    "dietary_tags" "DietaryTag"[],
    "effort_profile" "EffortProfile" NOT NULL,
    "prep_time" "PrepTimeBucket" NOT NULL,
    "servings" INTEGER NOT NULL DEFAULT 2,
    "instructions" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "unit" TEXT,
    "aisle" "GroceryAisle",

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_selections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "recipe_id" TEXT NOT NULL,

    CONSTRAINT "menu_selections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients"("recipe_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_selections_user_id_date_meal_type_key" ON "menu_selections"("user_id", "date", "meal_type");

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_selections" ADD CONSTRAINT "menu_selections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_selections" ADD CONSTRAINT "menu_selections_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
