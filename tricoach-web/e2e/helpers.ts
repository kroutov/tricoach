import type { Page } from '@playwright/test';

export const TEST_ACCOUNT = { email: 'onboarding-test@example.com', password: 'TestPassword123!' };

/** Logs in via the real login form against the real backend — this account already has a generated plan. */
export async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_ACCOUNT.email);
  await page.getByLabel('Mot de passe').fill(TEST_ACCOUNT.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL('/');
}
