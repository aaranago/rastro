import { defineConfig, devices } from "@playwright/test";

const port = 3201;
const baseURL = `http://127.0.0.1:${port}`;
const mediaBaseURL =
  process.env.RASTRO_E2E_MEDIA_BASE_URL ?? `${baseURL}/e2e-media`;
const e2eAdminEmail =
  process.env.RASTRO_E2E_ADMIN_EMAIL ?? "rastro-e2e-admin@example.invalid";
const e2eAdminEmailList = [e2eAdminEmail, process.env.RASTRO_ADMIN_EMAILS ?? ""]
  .join(" ")
  .trim();
const shouldStartWebServer = process.env.RASTRO_E2E_SKIP_WEBSERVER !== "1";

process.env.BETTER_AUTH_URL = baseURL;
process.env.RASTRO_ADMIN_EMAILS = e2eAdminEmailList;
process.env.RASTRO_E2E_MEDIA_BASE_URL = mediaBaseURL;

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
  webServer: shouldStartWebServer
    ? {
        command: `BETTER_AUTH_URL=${baseURL} RASTRO_ADMIN_EMAILS="${e2eAdminEmailList}" RASTRO_E2E_MEDIA_BASE_URL=${mediaBaseURL} pnpm with-env next dev -p ${port}`,
        reuseExistingServer: true,
        timeout: 120_000,
        url: baseURL,
      }
    : undefined,
  workers: 1,
});
