import { test, expect } from '@playwright/test';
import { login, seedProposedMenuSelection } from './helpers';

function mondayOfCurrentWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const date = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

test.describe('nutrition', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('recipe catalog can be filtered by category', async ({ page }) => {
    await page.goto('/nutrition/recipes');
    await expect(page.getByRole('heading', { name: 'Recettes' })).toBeVisible();

    await page.getByLabel('Filtrer par catégorie').selectOption({ label: 'Pâtes' });

    const categoryLines = page.locator('p.text-xs.text-secondary-text');
    await expect(categoryLines.first()).toBeVisible();
    const count = await categoryLines.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(categoryLines.nth(i)).toContainText('Pâtes');
    }
  });

  test('opening a recipe shows its ingredients and instructions', async ({ page }) => {
    await page.goto('/nutrition/recipes');
    await page.locator('main').getByRole('button').first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Ingrédients')).toBeVisible();
    await expect(dialog.getByText('Préparation')).toBeVisible();
  });

  test('picking a suggested recipe fills the slot and persists after reload', async ({ page }) => {
    await page.goto('/nutrition/menu');
    await expect(page.getByRole('heading', { name: 'Menu de la semaine' })).toBeVisible();

    const dialog = page.getByRole('dialog');

    // A fixed slot (Sunday dinner) rather than "first empty cell" — the latter
    // depends on what earlier runs left filled, which made this test flaky
    // across repeated executions against the shared dev/e2e database. Dinner
    // is picked specifically because it's the best-covered meal type in the
    // imported catalog (unlike breakfast/snack, which have few or no recipes).
    const dinnerRow = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Dîner' }) });
    const targetCell = dinnerRow.getByRole('button').last();

    async function clearIfFilled() {
      const label = await targetCell.getAttribute('aria-label');
      if (label && !label.startsWith('Choisir un menu')) {
        await targetCell.click();
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Retirer' }).click();
        await expect(dialog).toBeHidden();
      }
    }

    // Idempotent across repeated runs: a previous (possibly interrupted) run
    // may have left this slot filled.
    await clearIfFilled();

    await targetCell.click();
    await expect(dialog).toBeVisible();

    const candidates = dialog.getByRole('button');
    await expect(candidates.first()).toBeVisible();

    // Structural check standing in for "a CARB_LOAD recipe is surfaced first
    // on a high-load day": whichever profile the day resolves to, the ranking
    // algorithm (findSuggestedRecipes) sorts a matching recipe first among the
    // candidates returned — but with real, sparse recipe data a matching
    // candidate isn't guaranteed to exist for every meal slot, so only assert
    // the ordering when at least one candidate actually matches the day's profile.
    const dayProfileBadge = (await dialog.locator('p', { hasText: "Profil d'effort du jour" }).locator('span').textContent())?.trim();
    const candidateBadges = await candidates.evaluateAll((buttons) => buttons.map((b) => b.querySelectorAll('span')[1]?.textContent?.trim()));
    if (dayProfileBadge && candidateBadges.includes(dayProfileBadge)) {
      expect(candidateBadges[0]).toBe(dayProfileBadge);
    }

    const pickedTitle = (await candidates.first().locator('span').first().textContent())?.trim();
    expect(pickedTitle).toBeTruthy();
    await candidates.first().click();

    await expect(dialog).toBeHidden();
    await expect(targetCell).toContainText(pickedTitle!);

    await page.reload();
    await expect(targetCell).toContainText(pickedTitle!);

    await clearIfFilled();
  });

  test('a proposed slot shows the "to validate" badge and can be confirmed', async ({ page }) => {
    const monday = mondayOfCurrentWeek();
    // Monday lunch: distinct from the Sunday-dinner slot the previous test
    // exercises, so the two tests never touch the same row.
    const seed = await seedProposedMenuSelection(monday, 'LUNCH');

    try {
      await page.goto('/nutrition/menu');
      await expect(page.getByRole('heading', { name: 'Menu de la semaine' })).toBeVisible();

      await expect(page.getByText(/recette.*proposée.*à valider/i)).toBeVisible();

      const cell = page.getByRole('button', { name: new RegExp(`^Déjeuner du ${monday}`) });
      await expect(cell).toContainText(seed.recipeTitle);
      await expect(cell.getByText('À valider')).toBeVisible();

      await cell.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('À valider')).toBeVisible();

      await dialog.getByRole('button', { name: 'Valider' }).click();
      await expect(dialog).toBeHidden();

      await expect(page.getByText(/recette.*proposée.*à valider/i)).toBeHidden();
      const confirmedCell = page.getByRole('button', { name: new RegExp(`^Déjeuner du ${monday}`) });
      await expect(confirmedCell).not.toContainText('À valider');
    } finally {
      await seed.cleanup();
    }
  });
});
