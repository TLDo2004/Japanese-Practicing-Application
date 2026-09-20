import { defineConfig, devices } from "@playwright/test";

/**
 * Production-PWA e2e only. Functional flows stay on playwright.config.ts (Vite dev, no SW).
 * Serve the built apps/web/dist on :4174 (not legacy :4173).
 */
export default defineConfig({
  testDir: "apps/web/e2e",
  testMatch: /pwa\.spec\.ts/,
  fullyParallel: false,
  retries: 0,
  timeout: 90_000,
  use: {
    baseURL: "http://127.0.0.1:4174",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run preview -w @jpa/web -- --host 127.0.0.1 --port 4174",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
