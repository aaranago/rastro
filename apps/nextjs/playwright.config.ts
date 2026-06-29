import { defineConfig, devices } from "@playwright/test";

const port = 3201;
const baseURL = `http://127.0.0.1:${port}`;

const adminViewportProjects = [
  { height: 900, name: "1440x900", width: 1440 },
  { height: 900, name: "1280x900", width: 1280 },
  { height: 844, name: "390x844", width: 390 },
  { height: 568, name: "320x568", width: 320 },
] as const;

const adminThemeProjects = ["light", "dark"] as const;

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  outputDir: "test-results/admin-e2e",
  projects: adminViewportProjects.flatMap((viewport) =>
    adminThemeProjects.map((theme) => ({
      name: `chromium-${viewport.name}-${theme}`,
      metadata: {
        theme,
      },
      use: {
        ...devices["Desktop Chrome"],
        colorScheme: theme,
        viewport: {
          height: viewport.height,
          width: viewport.width,
        },
      },
    })),
  ),
  reporter: [["list"]],
  testDir: "./e2e",
  testMatch: /admin-.*\.spec\.playwright\.ts/,
  timeout: 60_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm with-env next dev -p ${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
    url: baseURL,
  },
  workers: 1,
});
