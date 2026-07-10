export type GroceryAisleDb = 'BUTCHER' | 'BAKERY' | 'GROCERY' | 'PRODUCE' | 'FISHMONGER' | 'FRESH' | 'FROZEN';

export interface ShoppingListIngredientInput {
  name: string;
  amount: number | null;
  unit: string | null;
  aisle: GroceryAisleDb | null;
}

export interface ShoppingListItem {
  name: string;
  amount: number | null;
  unit: string | null;
}

export interface ShoppingListAisleGroup {
  aisle: GroceryAisleDb | null;
  items: ShoppingListItem[];
}

// Typical store-walking order — nothing in the Prisma enum implies this (it's declared
// alphabetically-ish), so it's defined explicitly here.
const AISLE_ORDER: GroceryAisleDb[] = ['PRODUCE', 'BAKERY', 'FRESH', 'BUTCHER', 'FISHMONGER', 'GROCERY', 'FROZEN'];

interface Accumulated {
  name: string;
  amount: number | null;
  unit: string | null;
  aisle: GroceryAisleDb | null;
}

/**
 * Aggregates ingredients from every recipe in a week's menu selections into a
 * shopping list grouped by aisle. Same convention as menu homogenization
 * (proposeWeeklyMenu.ts): grouping key is an exact "name|unit" string match,
 * no normalization/stemming — a known v1 simplification.
 */
export function buildShoppingList(ingredients: ShoppingListIngredientInput[]): ShoppingListAisleGroup[] {
  const byKey = new Map<string, Accumulated>();

  for (const ingredient of ingredients) {
    const key = `${ingredient.name}|${ingredient.unit ?? ''}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { name: ingredient.name, amount: ingredient.amount, unit: ingredient.unit, aisle: ingredient.aisle });
      continue;
    }
    // If either occurrence has no quantity, the merged total stays null rather than
    // showing a misleading partial sum (e.g. "salt to taste" + "salt 5g").
    existing.amount = existing.amount !== null && ingredient.amount !== null ? existing.amount + ingredient.amount : null;
  }

  const byAisle = new Map<GroceryAisleDb | null, ShoppingListItem[]>();
  for (const { name, amount, unit, aisle } of byKey.values()) {
    const items = byAisle.get(aisle) ?? [];
    items.push({ name, amount, unit });
    byAisle.set(aisle, items);
  }

  const groups: ShoppingListAisleGroup[] = [];
  for (const aisle of AISLE_ORDER) {
    const items = byAisle.get(aisle);
    if (items) groups.push({ aisle, items: items.sort((a, b) => a.name.localeCompare(b.name)) });
  }
  const unassigned = byAisle.get(null);
  if (unassigned) groups.push({ aisle: null, items: unassigned.sort((a, b) => a.name.localeCompare(b.name)) });

  return groups;
}
