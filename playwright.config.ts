import { defineConfig, devices } from "@playwright/test";

const remoteBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const deployedSpec = /deployed-auth\.spec\.ts/;

export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: remoteBaseUrl ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  // A remote target is already running; booting the local dev server would
  // shadow it and make the results meaningless.
  webServer: remoteBaseUrl
    ? undefined
    : {
        // Must run from the app directory: postcss/tailwind resolve their config
        // relative to the process cwd, not to the directory passed to next.
        command: "node node_modules/next/dist/bin/next dev",
        cwd: "apps/frontend",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "chromium",
      testIgnore: deployedSpec,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Hits the real deployed frontend and backend, so it is opt-in only.
      name: "deployed",
      testMatch: deployedSpec,
      // Cold starts on free hosting tiers outlast the default budget.
      timeout: 300_000,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      testMatch: /cross-browser\.spec\.ts/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testMatch: /cross-browser\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
  ],
});
