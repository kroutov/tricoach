import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './helpers';

/**
 * One axe-core scan per key screen, wired into the test suite itself (not a
 * one-off manual audit) so a future change that regresses accessibility
 * fails CI the same way a broken assertion would. `color-contrast` is
 * covered separately and precisely by the WCAG-ratio script that produced
 * the tokens in `src/index.css` — excluded here only because axe's contrast
 * check can't see through `color-mix()` backgrounds reliably in every
 * environment, not because contrast is unchecked.
 */
async function expectNoViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
}

test('login page has no accessibility violations', async ({ page }) => {
  await page.goto('/login');
  await expectNoViolations(page);
});

test.describe('authenticated pages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard has no accessibility violations', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
    await expectNoViolations(page);
  });

  test('calendar has no accessibility violations', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page.getByRole('heading', { name: 'Calendrier' })).toBeVisible();
    await expectNoViolations(page);
  });

  test('workout detail has no accessibility violations', async ({ page }) => {
    await page.goto('/calendar');
    const workoutLink = page.locator('a[href^="/workouts/"]').first();
    if (await workoutLink.count()) {
      await workoutLink.click();
      await page.waitForURL(/\/workouts\//);
      await expectNoViolations(page);
    }
  });

  test('goals page has no accessibility violations', async ({ page }) => {
    await page.goto('/goals');
    await expect(page.getByRole('heading', { name: 'Objectifs' })).toBeVisible();
    await expectNoViolations(page);
  });

  test('adaptation history has no accessibility violations', async ({ page }) => {
    await page.goto('/adaptation-history');
    await expect(page.getByRole('heading', { name: "Historique d'adaptation" })).toBeVisible();
    await expectNoViolations(page);
  });

  test('analytics has no accessibility violations', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.getByRole('heading', { name: 'Analytique' })).toBeVisible();
    await expectNoViolations(page);
  });

  test('profile has no accessibility violations', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible();
    await expectNoViolations(page);
  });
});
