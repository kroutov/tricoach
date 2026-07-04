import { defineConfig, devices } from '@playwright/test';

/**
 * Exercises the real app against a real backend (see e2e/README.md) rather
 * than a mocked API — the same "test against the real thing" discipline
 * used for the backend's own integration tests. Only starts the Vite dev
 * server itself; the backend (with the shared test/dev Postgres database)
 * is expected to already be running on :3000, exactly as for every manual
 * browser verification pass done throughout this project.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
