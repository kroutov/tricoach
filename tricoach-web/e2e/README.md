# E2E accessibility tests

`npm run test:e2e` — runs axe-core against every key screen in a real browser (Chromium), against the real backend, not a mock. The backend must already be running on `:3000` with `onboarding-test@example.com` / `TestPassword123!` seeded with a generated plan (see `e2e/helpers.ts`); Playwright only starts the Vite dev server itself.

`color-contrast` is intentionally excluded from the axe scan — that's covered separately and more precisely by the WCAG-ratio script that produced the color tokens in `src/index.css` (axe's contrast check doesn't reliably see through `color-mix()` badge backgrounds).
