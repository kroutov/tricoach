import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRecipes, type Recipe, type RecipeCatalogFilter } from '../../api/nutrition';
import {
  DIETARY_TAG_OPTIONS,
  MEAL_TYPE_OPTIONS,
  RECIPE_CATEGORY_OPTIONS,
  dietaryTagLabel,
  effortProfileColorVar,
  effortProfileLabel,
  mealTypeLabel,
  prepTimeBucketLabel,
  recipeCategoryLabel,
  type DietaryTag,
  type MealType,
  type RecipeCategory,
} from '../../lib/enumLabels';
import { Card } from '../../components/Card';
import { PillBadge } from '../../components/PillBadge';
import { Modal } from '../../components/Modal';

function RecipeDetail({ recipe }: { recipe: Recipe }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        <PillBadge text={effortProfileLabel[recipe.effortProfile]} tint={effortProfileColorVar[recipe.effortProfile]} />
        <PillBadge text={prepTimeBucketLabel[recipe.prepTime]} tint="var(--color-secondary-text)" />
        <PillBadge text={`${recipe.servings} pers.`} tint="var(--color-secondary-text)" />
      </div>
      <div>
        <p className="text-sm font-semibold text-primary-text">Ingrédients</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-secondary-text">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.id}>
              {ingredient.amount != null ? `${ingredient.amount}${ingredient.unit ?? ''} ` : ''}
              {ingredient.name}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-sm font-semibold text-primary-text">Préparation</p>
        <p className="mt-1 whitespace-pre-line text-sm text-secondary-text">{recipe.instructions}</p>
      </div>
    </div>
  );
}

export function RecipeCatalogPage() {
  const [mealType, setMealType] = useState('');
  const [dietaryTag, setDietaryTag] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Recipe | null>(null);

  const filter: RecipeCatalogFilter = {
    mealType: mealType ? (mealType as MealType) : undefined,
    dietaryTag: dietaryTag ? (dietaryTag as DietaryTag) : undefined,
    category: category ? (category as RecipeCategory) : undefined,
    search: search || undefined,
  };

  const { data: recipes, isLoading } = useQuery({ queryKey: ['nutrition', 'recipes', filter], queryFn: () => getRecipes(filter) });

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary-text">Recettes</h1>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une recette…"
          aria-label="Rechercher une recette"
          className="min-w-[10rem] flex-1 rounded-control border border-separator bg-card-background px-3 py-1.5 text-sm text-primary-text"
        />
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value)}
          aria-label="Filtrer par repas"
          className="rounded-control border border-separator bg-card-background px-2 py-1.5 text-sm text-primary-text"
        >
          <option value="">Tous les repas</option>
          {MEAL_TYPE_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {mealTypeLabel[m]}
            </option>
          ))}
        </select>
        <select
          value={dietaryTag}
          onChange={(e) => setDietaryTag(e.target.value)}
          aria-label="Filtrer par régime"
          className="rounded-control border border-separator bg-card-background px-2 py-1.5 text-sm text-primary-text"
        >
          <option value="">Tous les régimes</option>
          {DIETARY_TAG_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {dietaryTagLabel[d]}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filtrer par catégorie"
          className="rounded-control border border-separator bg-card-background px-2 py-1.5 text-sm text-primary-text"
        >
          <option value="">Toutes les catégories</option>
          {RECIPE_CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {recipeCategoryLabel[c]}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-secondary-text">Chargement…</p>
      ) : (recipes ?? []).length === 0 ? (
        <p className="text-center text-secondary-text">Aucune recette ne correspond à ces filtres.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(recipes ?? []).map((recipe) => (
            <button key={recipe.id} type="button" onClick={() => setSelected(recipe)} aria-label={recipe.title} className="text-left">
              <Card className="h-full space-y-2">
                <p className="font-medium text-primary-text">{recipe.title}</p>
                <div className="flex flex-wrap gap-1">
                  <PillBadge text={effortProfileLabel[recipe.effortProfile]} tint={effortProfileColorVar[recipe.effortProfile]} />
                  <PillBadge text={prepTimeBucketLabel[recipe.prepTime]} tint="var(--color-secondary-text)" />
                </div>
                <p className="text-xs text-secondary-text">{recipe.categories.map((c) => recipeCategoryLabel[c]).join(', ')}</p>
              </Card>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <RecipeDetail recipe={selected} />
        </Modal>
      )}
    </div>
  );
}
