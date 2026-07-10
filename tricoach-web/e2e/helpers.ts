import type { Page } from '@playwright/test';
import { Client } from 'pg';

export const TEST_ACCOUNT = { email: 'onboarding-test@example.com', password: 'TestPassword123!' };

/** Logs in via the real login form against the real backend — this account already has a generated plan. */
export async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_ACCOUNT.email);
  await page.getByLabel('Mot de passe').fill(TEST_ACCOUNT.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('/');
}

// Same local Postgres the backend itself points at in dev — overridable via
// DATABASE_URL for a differently-configured machine or CI (this repo's own
// local setup uses peer auth under the current OS user, not the
// tricoach/tricoach role from tricoach-backend/.env.example).
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/tricoach';

async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/**
 * Seeds a PROPOSED menu selection directly in the DB, bypassing the API — the
 * weekly-proposal job itself (diversification/homogenization scoring) is
 * covered by backend unit/integration tests; this only needs *a* PROPOSED
 * row to exist so the web UI (badge/banner/"Valider" button) can be
 * exercised against a real render. Returns the picked recipe's title and a
 * cleanup function that removes the row afterwards.
 */
export async function seedProposedMenuSelection(date: string, mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'): Promise<{ recipeTitle: string; cleanup: () => Promise<void> }> {
  return withDb(async (client) => {
    const { rows: userRows } = await client.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [TEST_ACCOUNT.email]);
    const userId = userRows[0]?.id;
    if (!userId) throw new Error(`Test account ${TEST_ACCOUNT.email} not found`);

    const { rows: recipeRows } = await client.query<{ id: string; title: string }>(
      'SELECT id, title FROM recipes WHERE $1 = ANY(meal_types) AND is_active = true LIMIT 1',
      [mealType]
    );
    const recipe = recipeRows[0];
    if (!recipe) throw new Error(`No active recipe found for meal type ${mealType}`);

    await client.query(
      `INSERT INTO menu_selections (id, user_id, date, meal_type, recipe_id, status)
       VALUES (gen_random_uuid(), $1, $2::date, $3, $4, 'PROPOSED')
       ON CONFLICT (user_id, date, meal_type) DO UPDATE SET recipe_id = $4, status = 'PROPOSED'`,
      [userId, date, mealType, recipe.id]
    );

    return {
      recipeTitle: recipe.title,
      cleanup: () =>
        withDb((c) => c.query('DELETE FROM menu_selections WHERE user_id = $1 AND date = $2::date AND meal_type = $3', [userId, date, mealType])).then(() => undefined),
    };
  });
}
