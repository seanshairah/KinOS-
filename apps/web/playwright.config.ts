import { defineConfig } from "@playwright/test";

/**
 * E2E: marketing pages always; the signed-in activation flow when
 * E2E_DATABASE_URL points at a migrated Postgres (CI provides one).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3211",
    // Use a preinstalled Chromium when the environment provides one
    // (PLAYWRIGHT_CHROMIUM_PATH); otherwise Playwright's own download.
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
      : {}),
  },
  webServer: {
    command: "pnpm start -p 3211",
    url: "http://localhost:3211",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...(process.env.E2E_DATABASE_URL
        ? { DATABASE_URL: process.env.E2E_DATABASE_URL }
        : {}),
      AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret",
      NEXT_PUBLIC_APP_URL: "http://localhost:3211",
    },
  },
});
