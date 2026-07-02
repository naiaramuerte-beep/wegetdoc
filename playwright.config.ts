import { defineConfig, devices } from "@playwright/test";

// E2E smoke tests. By default they run against PRODUCTION (www.editorpdf.net)
// so you don't need a local dev server (DB/R2/env). Override with:
//   E2E_BASE_URL=http://localhost:5173 pnpm test:e2e
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  retries: 1,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "https://www.editorpdf.net",
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
});
