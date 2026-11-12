import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests drive a real browser against a production build of the
 * app, connected to a separate test database (campustrace_test), so they
 * never touch your development data.
 *
 *   npx playwright install chromium   (once)
 *   npm run test:e2e
 */

const PORT = 3100;
export const BASE_URL = `http://localhost:${PORT}`;
export const TEST_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://campustrace:campustrace@localhost:5432/campustrace_test?schema=public";

export default defineConfig({
  testDir: "./e2e",
  // Resets and seeds the test database before the first test.
  globalSetup: "./e2e/global-setup.ts",
  // The tests share one database and build on each other, so run them in order.
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Set PW_CHANNEL=chrome to use an installed Google Chrome instead of
        // Playwright's downloaded Chromium.
        channel: process.env.PW_CHANNEL || undefined,
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    // Wait for the port, not for a page: pages need the database, and the
    // database is only migrated and seeded in globalSetup, which Playwright
    // runs after the server is up.
    port: PORT,
    timeout: 240_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NEXTAUTH_URL: BASE_URL,
      NEXTAUTH_SECRET: "e2e-only-secret-not-used-anywhere-else",
      UPLOAD_DIR: "./storage/e2e-uploads",
      ALLOWED_EMAIL_DOMAINS: "stu.ucc.edu.gh,ucc.edu.gh",
    },
  },
});
