import { execFile } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { AutomationFactory } from "../node_modules/expo-mcp/dist/automation/AutomationFactory.js";
import { findDevServerUrlAsync } from "../node_modules/expo-mcp/dist/develop/devtools.js";

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const workspaceRoot = resolve(appRoot, "../..");
const defaultManifestPath = join(
  workspaceRoot,
  ".scratch/e2e/rastro-functional/latest-fixture.json",
);
const artifactRoot = join(
  workspaceRoot,
  ".scratch/mobile-qa",
  new Date().toISOString().replace(/[:.]/g, "-"),
  "mcp-e2e",
);

const manifestPath =
  process.env.RASTRO_E2E_FIXTURE_MANIFEST ?? defaultManifestPath;
const mobileNextBaseUrl = trimTrailingSlash(
  process.env.RASTRO_E2E_MOBILE_NEXT_BASE_URL ?? "http://10.0.2.2:3000",
);
const mobileMediaBaseUrl = `${mobileNextBaseUrl}/e2e-media`;
const checks = [];

if (process.env.RASTRO_E2E_MOBILE_SEED !== "0") {
  await seedFixtureForMobile();
}

if (!existsSync(manifestPath)) {
  throw new Error(`Missing Rastro fixture manifest at ${manifestPath}.`);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

mkdirSync(artifactRoot, { recursive: true });

const platform = "android";
const deviceId = await AutomationFactory.getBootedDeviceIdAsync(platform);
const appId = await AutomationFactory.getAppIdAsync({
  deviceId,
  platform,
  projectRoot: appRoot,
});
const automation = AutomationFactory.create(platform, {
  appId,
  deviceId,
  verbose: process.env.RASTRO_E2E_MOBILE_VERBOSE === "1",
});

await openDevelopmentBuild();
await verifyResourcesDirectory();
await verifyProviderProfile();
await verifyReportDetails();
await verifyChatWorkflow();

const summary = {
  appId,
  artifactRoot,
  checks,
  deviceId,
  manifestPath,
  platform,
};

writeFileSync(
  join(artifactRoot, "mobile-mcp-summary.json"),
  JSON.stringify(summary, null, 2),
);

console.log(JSON.stringify(summary, null, 2));

async function verifyResourcesDirectory() {
  await openDeepLinkUntilVisible(
    [
      "rastro://recursos",
      "rastro:///recursos",
      "rastro://(tabs)/(resources)",
      "rastro:///(tabs)/(resources)",
    ],
    "resources-screen",
  );
  await waitForTestID("resources-search-input");
  await tapAndText("resources-search-input", "Sopocachi");
  await maybeTap("resources-location-sopocachi-la-paz");
  await tapRequired("resources-category-veterinary");
  await tapRequired("resources-category-shelter");
  await tapRequired("resources-category-groomer");
  await tapRequired("resources-category-all");
  await tapRequired("resources-mode-map");
  await waitForTestID("resources-map-panel");
  await screenshot("resources-map.png");
  await tapRequired("resources-mode-list");

  const directoryProvider = manifest.providers.find(
    (provider) => provider.resourcesDirectoryPromotion,
  );

  if (directoryProvider) {
    await scrollUntilTestID(`resource-provider-card-${directoryProvider.id}`);
    await scrollUntilTestID(
      `resource-provider-card-sponsor-media-${directoryProvider.id}`,
      { maxSwipes: 3 },
    );
  }

  await screenshot("resources-list.png");
  await assertNoBrokenMediaFallbacks("resources-list");
}

async function verifyProviderProfile() {
  const provider =
    manifest.providers.find((item) => item.providerDetailsPromotion) ??
    manifest.providers[0];

  if (!provider) {
    throw new Error("Fixture manifest has no providers.");
  }

  await openDeepLinkUntilVisible(
    [
      `rastro:///proveedores/${provider.id}`,
      `rastro://proveedores/${provider.id}`,
    ],
    "resource-provider-profile-screen",
  );
  await waitForTestID("resource-provider-summary");
  await waitForTestID("resource-provider-media");
  await waitForTestID("resource-provider-contact-whatsapp");
  await scrollUntilTestID("resource-provider-sponsor-media", { maxSwipes: 4 });
  await screenshot("provider-profile.png");
  await assertNoBrokenMediaFallbacks("provider-profile");

  await scrollUntilTestID("resource-provider-report-button", { maxSwipes: 5 });
  await tapByAutomationRequired("resource-provider-report-button");
  await waitForTestID("resource-provider-report-modal");
  await delay(500);
  await tapRequired("resource-provider-report-reason-scam");
  await delay(500);
  await screenshot("provider-report-modal.png");
  await tapAndText("resource-provider-report-detail", "RastroE2Edetalle");
  await adb(["shell", "input", "keyevent", "KEYCODE_BACK"]);
  checks.push({ id: "dismiss:provider-report-modal", ok: true });
}

async function verifyReportDetails() {
  for (const report of manifest.reports) {
    await openDeepLinkUntilVisible(
      [
        reportDeepLink(report),
        reportDeepLink(report).replace("rastro:///", "rastro://"),
      ],
      "public-report-detail-screen",
    );
    await waitForTestID("public-report-media-gallery");

    if (report.contactPreference === "in_app_chat") {
      await waitForTestID("public-report-contact-in-app-chat-0");
    } else if (report.contactPreference === "whatsapp") {
      await waitForTestID("public-report-contact-whatsapp-0");
    } else {
      await waitForTestID("public-report-contact-in-app-chat-0");
      await waitForTestID("public-report-contact-whatsapp-1");
    }

    await waitForTestID("public-report-location-action");
    await screenshot(`report-${report.type}.png`);
    await assertNoBrokenMediaFallbacks(`report-${report.type}`);
  }
}

async function verifyChatWorkflow() {
  await openDeepLinkUntilVisible(
    [
      `rastro:///chats/${manifest.chat.sampleConversationId}`,
      `rastro://chats/${manifest.chat.sampleConversationId}`,
    ],
    "chat-screen",
  );
  await waitForTestID("chat-message-list");
  await tapAndText("chat-message-input", "RastroE2Echat");
  await tapRequired("chat-send-button");
  await screenshot("chat-workflow.png");

  checks.push({
    detail:
      "Chat screen accepts a message in the in-memory route. Backend persistence is not implemented.",
    id: "chat-backend-persistence-gap",
    ok: manifest.chat.backendPersisted === false,
  });
}

async function openDeepLinkUntilVisible(urls, testID) {
  let lastError;

  for (const url of urls) {
    await adb([
      "shell",
      "am",
      "start",
      "-W",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      url,
      appId,
    ]);

    try {
      await waitForTestID(testID, { timeoutMs: 12000 });
      checks.push({ id: `open:${url}`, ok: true, testID });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Could not open route for ${testID}`);
}

async function openDevelopmentBuild() {
  const devServerUrl =
    process.env.RASTRO_E2E_EXPO_DEV_SERVER_URL ??
    (await findDevServerUrlAsync(appRoot))?.toString() ??
    "http://localhost:8081";
  const deviceReachableUrl = toDeviceReachableUrl(devServerUrl);

  await adb([
    "shell",
    "am",
    "start",
    "-W",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    `exp+rastro://expo-development-client/?url=${encodeURIComponent(
      deviceReachableUrl,
    )}`,
    appId,
  ]);
  await delay(4000);
  checks.push({
    devServerUrl,
    deviceReachableUrl,
    id: "open:development-build",
    ok: true,
  });
}

async function seedFixtureForMobile() {
  const args = [
    "-F",
    "@acme/nextjs",
    "test:e2e:admin",
    "e2e/admin-rastro-functional.spec.playwright.ts",
    "--grep",
    "fixture creates every provider",
  ];

  try {
    await execFileAsync("pnpm", args, {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        RASTRO_E2E_CLEANUP: "0",
        RASTRO_E2E_MEDIA_BASE_URL: mobileMediaBaseUrl,
        RASTRO_E2E_SKIP_WEBSERVER: "1",
      },
      maxBuffer: 24 * 1024 * 1024,
      timeout: 240000,
    });
  } catch (error) {
    throw new Error(
      `Could not seed Rastro mobile fixture with media URL ${mobileMediaBaseUrl}.\n${formatExecError(error)}`,
    );
  }

  checks.push({
    id: "seed:mobile-fixture",
    mediaBaseUrl: mobileMediaBaseUrl,
    ok: true,
  });
}

async function waitForTestID(testID, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15000;
  const startedAt = Date.now();
  let lastResult;

  while (Date.now() - startedAt < timeoutMs) {
    const result = await automation.findViewByTestIDAsync(testID);
    lastResult = result;

    if (result.success && hasUsableBounds(result.data)) {
      checks.push({ id: `find:${testID}`, ok: true });
      return result.data;
    }

    await delay(500);
  }

  throw new Error(
    `Timed out waiting for ${testID}: ${JSON.stringify(lastResult)}`,
  );
}

async function scrollUntilTestID(testID, options = {}) {
  const maxSwipes = options.maxSwipes ?? 8;

  for (let attempt = 0; attempt <= maxSwipes; attempt += 1) {
    const result = await automation.findViewByTestIDAsync(testID);

    if (result.success && hasUsableBounds(result.data)) {
      checks.push({ id: `find:${testID}`, ok: true, scrolled: attempt > 0 });
      return result.data;
    }

    if (attempt === maxSwipes) {
      throw new Error(
        `Could not scroll to ${testID}: ${JSON.stringify(result)}`,
      );
    }

    await adb(["shell", "input", "swipe", "540", "1980", "540", "900", "350"]);
    await delay(750);
  }
}

async function tapRequired(testID) {
  const element = await waitForTestID(testID, { timeoutMs: 6000 });
  const centerX = Math.round(element.bounds.x + element.bounds.width / 2);
  const centerY = Math.round(element.bounds.y + element.bounds.height / 2);

  await adb(["shell", "input", "tap", String(centerX), String(centerY)]);
  checks.push({ id: `tap:${testID}`, ok: true });
}

async function tapByAutomationRequired(testID) {
  const result = await automation.tapByTestIDAsync(testID);

  if (!result.success) {
    throw new Error(`Could not tap ${testID}: ${JSON.stringify(result)}`);
  }

  checks.push({ id: `tap:${testID}`, ok: true, strategy: "automation" });
}

async function maybeTap(testID) {
  const result = await automation.tapByTestIDAsync(testID);

  checks.push({
    id: `tap-optional:${testID}`,
    ok: result.success,
    skipped: !result.success,
  });
}

async function tapAndText(testID, value) {
  const element = await waitForTestID(testID);
  const centerX = Math.round(element.bounds.x + element.bounds.width / 2);
  const centerY = Math.round(element.bounds.y + element.bounds.height / 2);

  await adb(["shell", "input", "tap", String(centerX), String(centerY)]);
  await adb(["shell", "input", "keyevent", "KEYCODE_MOVE_END"]);
  await adb(["shell", "input", "text", toAdbText(value)]);
  checks.push({ id: `type:${testID}`, ok: true });
}

async function screenshot(fileName) {
  const outputPath = join(artifactRoot, fileName);

  await automation.takeFullScreenshotAsync({ outputPath });

  const size = statSync(outputPath).size;

  if (size < 50000) {
    throw new Error(`Screenshot looks empty: ${outputPath} (${size} bytes)`);
  }

  checks.push({ id: `screenshot:${fileName}`, ok: true, outputPath, size });
}

async function assertNoBrokenMediaFallbacks(context) {
  const { stdout } = await adb([
    "exec-out",
    "uiautomator",
    "dump",
    "--compressed",
    "/dev/tty",
  ]);
  const brokenFallbacks = [
    "No pudimos cargar esta foto",
    "Sin foto del proveedor",
  ].filter((text) => stdout.includes(text));

  if (brokenFallbacks.length > 0) {
    throw new Error(
      `Broken media fallback visible on ${context}: ${brokenFallbacks.join(", ")}`,
    );
  }

  checks.push({ id: `media-loaded:${context}`, ok: true });
}

function reportDeepLink(report) {
  switch (report.type) {
    case "lost_pet":
      return `rastro:///reportes/perdidos/${report.id}`;
    case "found_pet":
      return `rastro:///reportes/encontrados/${report.id}`;
    case "sighting":
      return `rastro:///reportes/avistamientos/${report.id}`;
    case "adoption":
      return `rastro:///adopciones/${report.id}`;
    default:
      throw new Error(`Unsupported report type: ${report.type}`);
  }
}

async function adb(args) {
  try {
    return await execFileAsync(
      "adb",
      ["-s", deviceId, ...quoteShellArgs(args)],
      {
        cwd: appRoot,
        timeout: 30000,
      },
    );
  } catch (error) {
    throw new Error(
      `ADB command failed: adb -s ${deviceId} ${args.join(" ")}\n${error}`,
    );
  }
}

function toAdbText(value) {
  return value.replace(/\s/g, "%s");
}

function toDeviceReachableUrl(value) {
  const url = new URL(value);

  if (
    platform === "android" &&
    ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname)
  ) {
    url.hostname = "10.0.2.2";
  }

  return url.toString();
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function formatExecError(error) {
  if (!error || typeof error !== "object") {
    return String(error);
  }

  return [
    error.message,
    "stdout" in error ? error.stdout : undefined,
    "stderr" in error ? error.stderr : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}

function hasUsableBounds(data) {
  const bounds = data?.bounds;

  return (
    typeof bounds?.x === "number" &&
    typeof bounds?.y === "number" &&
    typeof bounds?.width === "number" &&
    typeof bounds?.height === "number" &&
    bounds.width > 0 &&
    bounds.height > 0
  );
}

function quoteShellArgs(args) {
  if (args[0] !== "shell") {
    return args;
  }

  return [
    args[0],
    ...args
      .slice(1)
      .map((arg) =>
        /[()\s'"\\$&;<>|*?[\]{}]/.test(arg)
          ? `'${arg.replace(/'/g, "'\\''")}'`
          : arg,
      ),
  ];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
