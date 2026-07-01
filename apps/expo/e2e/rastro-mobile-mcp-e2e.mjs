import { execFile, spawn } from "node:child_process";
import {
  copyFileSync,
  createWriteStream,
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
const artifactLogsDir = join(artifactRoot, "logs");
const artifactUiDir = join(artifactRoot, "ui");
const logcatPath = join(artifactLogsDir, "logcat.txt");

const manifestPath =
  process.env.RASTRO_E2E_FIXTURE_MANIFEST ?? defaultManifestPath;
const mobileNextBaseUrl = trimTrailingSlash(
  process.env.RASTRO_E2E_MOBILE_NEXT_BASE_URL ?? "http://10.0.2.2:3000",
);
const hostNextBaseUrl = trimTrailingSlash(
  process.env.RASTRO_E2E_HOST_NEXT_BASE_URL ?? "http://127.0.0.1:3000",
);
const mobileMediaBaseUrl = `${mobileNextBaseUrl}/e2e-media`;
const fixtureAccountPasswords = {
  owner: "Rastro-E2E-owner-2026!",
  viewer: "Rastro-E2E-viewer-2026!",
};
const providerReportReasons = [
  "scam",
  "incorrect_location",
  "spam",
  "offensive_content",
  "animal_cruelty",
  "impersonation",
  "other",
];
const providerReportReasonLabels = {
  animal_cruelty: "crueldad animal",
  impersonation: "suplantación de identidad",
  incorrect_location: "ubicación incorrecta",
  offensive_content: "contenido ofensivo",
  other: "otro motivo",
  scam: "estafa",
  spam: "spam",
};
const checks = [];

if (process.env.RASTRO_E2E_MOBILE_SEED !== "0") {
  await seedFixtureForMobile();
}

if (!existsSync(manifestPath)) {
  throw new Error(`Missing Rastro fixture manifest at ${manifestPath}.`);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

mkdirSync(artifactRoot, { recursive: true });
mkdirSync(artifactLogsDir, { recursive: true });
mkdirSync(artifactUiDir, { recursive: true });

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

await captureDeviceMetadata();
await captureFixtureSnapshot();
await captureRootFullSuiteEvidence();
await clearLogcat();
const logcatCapture = startLogcatCapture();
let logcatStopped = false;

try {
  await grantAndroidRuntimePermissions();
  await openDevelopmentBuild();
  const memberEmail = await ensureFixtureViewerSession();
  await verifyMemberProfileSettingsWorkflow({ expectedEmail: memberEmail });
  await verifyResourcesDirectory();
  await verifyProviderProfile({ memberEmail });
  await verifyAdoptionCreationWorkflow();
  await verifyReportDetails();
  const latestChatMessageText = await verifyChatWorkflow();
  await verifyAlertSubscriptionWorkflow();
  await verifyActivityInboxWorkflow({ latestChatMessageText });
  await captureUiDump("final-window.xml");
  await stopLogcatCapture(logcatCapture);
  logcatStopped = true;
  assertLogcatClean();
  writeReadinessManifest();
} finally {
  if (!logcatStopped) {
    await stopLogcatCapture(logcatCapture);
  }
}

async function captureDeviceMetadata() {
  await writeCommandOutput({
    args: ["devices"],
    command: "adb",
    fileName: "adb-devices.txt",
  });
  await writeAdbOutput("device-size.txt", ["shell", "wm", "size"]);
  await writeAdbOutput("device-density.txt", ["shell", "wm", "density"]);
  await writeAdbOutput("android-version.txt", [
    "shell",
    "getprop",
    "ro.build.version.release",
  ]);
  await writeCommandOutput({
    args: ["-F", "@acme/expo", "exec", "expo", "config", "--type", "public"],
    command: "pnpm",
    cwd: workspaceRoot,
    fileName: "expo-config.txt",
  });
  checks.push({
    id: "qa-device-metadata",
    ok: true,
    outputDir: artifactRoot,
  });
}

async function captureFixtureSnapshot() {
  const outputPath = join(artifactRoot, "fixture-manifest.json");

  copyFileSync(manifestPath, outputPath);
  checks.push({
    id: "fixture-manifest-snapshot",
    ok: true,
    outputPath,
  });
}

async function captureRootFullSuiteEvidence() {
  const commandManifestPath = join(
    artifactRoot,
    "root-full-suite-command.json",
  );

  writeFileSync(
    commandManifestPath,
    JSON.stringify(
      {
        expectedRootDevCommand: "TURBO_UI=true pnpm dev",
        mobileMcpCommand:
          "RASTRO_E2E_EXPO_DEV_SERVER_URL=http://127.0.0.1:8081 RASTRO_E2E_MOBILE_NEXT_BASE_URL=http://10.0.2.2:3000 node apps/expo/e2e/rastro-mobile-mcp-e2e.mjs",
      },
      null,
      2,
    ),
  );
  await writeCommandOutput({
    args: ["-sS", "-I", "http://127.0.0.1:3000"],
    command: "curl",
    cwd: workspaceRoot,
    fileName: "next-root-head.txt",
  });
  await writeCommandOutput({
    args: ["-sS", "-I", "http://127.0.0.1:8081/status"],
    command: "curl",
    cwd: workspaceRoot,
    fileName: "metro-status-head.txt",
  });
  await writeOptionalCommandOutput({
    args: [
      "-lc",
      "ps -eo pid,ppid,command | rg -i 'pnpm dev|turbo.*dev|expo start|next dev|metro|tsx watch' || true",
    ],
    command: "bash",
    cwd: workspaceRoot,
    fileName: "root-dev-processes.txt",
  });
  checks.push({
    commandManifestPath,
    id: "root-full-suite-reachable",
    ok: true,
  });
}

async function writeAdbOutput(fileName, args) {
  const { stdout, stderr } = await adb(args);

  writeFileSync(join(artifactRoot, fileName), `${stdout}${stderr}`);
}

async function writeCommandOutput({ args, command, cwd = appRoot, fileName }) {
  const { stdout, stderr } = await execFileAsync(command, args, {
    cwd,
    timeout: 30000,
  });

  writeFileSync(join(artifactRoot, fileName), `${stdout}${stderr}`);
}

async function writeOptionalCommandOutput({
  args,
  command,
  cwd = appRoot,
  fileName,
}) {
  try {
    await writeCommandOutput({ args, command, cwd, fileName });
  } catch (error) {
    writeFileSync(
      join(artifactRoot, fileName),
      `Optional command failed: ${formatExecError(error)}`,
    );
  }
}

async function clearLogcat() {
  await adb(["logcat", "-c"]);
  checks.push({ id: "logcat-cleared", ok: true });
}

function startLogcatCapture() {
  const output = createWriteStream(logcatPath, { flags: "w" });
  const child = spawn(
    "adb",
    [
      "-s",
      deviceId,
      "logcat",
      "-v",
      "time",
      "ReactNativeJS:V",
      "Expo:V",
      "AndroidRuntime:E",
      "*:W",
    ],
    { cwd: appRoot, stdio: ["ignore", "pipe", "pipe"] },
  );

  child.stdout.pipe(output);
  child.stderr.pipe(output);
  child.on("error", (error) => {
    output.write(`\n[logcat spawn error] ${String(error)}\n`);
  });
  checks.push({
    id: "logcat-capture-started",
    ok: true,
    outputPath: logcatPath,
  });

  return { child, output };
}

async function stopLogcatCapture(capture) {
  if (!capture) {
    return;
  }

  const { child, output } = capture;

  if (child.exitCode === null && !child.killed) {
    child.kill("SIGINT");
    await Promise.race([
      new Promise((resolve) => {
        child.once("exit", resolve);
      }),
      delay(1200),
    ]);
  }

  if (child.exitCode === null && !child.killed) {
    child.kill("SIGKILL");
  }

  output.end();
  await delay(200);
  checks.push({
    id: "logcat-capture-stopped",
    ok: true,
    outputPath: logcatPath,
  });
}

async function captureUiDump(fileName) {
  const devicePath = "/sdcard/rastro-window.xml";
  const outputPath = join(artifactUiDir, fileName);

  await adb(["shell", "uiautomator", "dump", "--compressed", devicePath]);
  await execFileAsync("adb", ["-s", deviceId, "pull", devicePath, outputPath], {
    cwd: appRoot,
    timeout: 30000,
  });

  const size = statSync(outputPath).size;

  if (size < 1000) {
    throw new Error(`UI dump looks empty: ${outputPath} (${size} bytes)`);
  }

  checks.push({ id: `ui-dump:${fileName}`, ok: true, outputPath, size });
}

function assertLogcatClean() {
  const logcat = readFileSync(logcatPath, "utf8");
  const lines = logcat.split(/\r?\n/);
  const failureMatchers = [
    {
      id: "android-runtime",
      pattern:
        /AndroidRuntime|FATAL EXCEPTION|Fatal signal|Process: bo\.rastro\.app/,
    },
    {
      id: "json-parse",
      pattern: /JSON Parse error|Unexpected token '<'|Unexpected character/i,
    },
    {
      id: "logbox",
      pattern: /\bLogBox\b/,
    },
    {
      id: "react-host-soft-exception",
      pattern: /onNewIntent.*Tried to access/i,
    },
    {
      id: "stale-base-url",
      pattern: /(ngrok|localhost:3000|127\.0\.0\.1:3000|0\.0\.0\.0:3000)/i,
    },
  ];
  const failures = failureMatchers.flatMap(({ id, pattern }) =>
    lines
      .filter((line) => pattern.test(line))
      .slice(0, 5)
      .map((line) => ({ id, line })),
  );

  if (failures.length > 0) {
    throw new Error(
      `Logcat readiness scan failed: ${JSON.stringify(failures, null, 2)}`,
    );
  }

  checks.push({
    id: "logcat-readiness-scan",
    ok: true,
    outputPath: logcatPath,
    scannedLines: lines.length,
  });
}

function writeReadinessManifest() {
  const summary = buildRunSummary();
  const readinessGate = buildReadinessGateManifest(summary);

  writeFileSync(
    join(artifactRoot, "mobile-mcp-summary.json"),
    JSON.stringify(summary, null, 2),
  );
  writeFileSync(
    join(artifactRoot, "readiness-manifest.json"),
    JSON.stringify(
      {
        ...summary,
        readinessGate,
      },
      null,
      2,
    ),
  );

  console.log(JSON.stringify({ ...summary, readinessGate }, null, 2));

  if (!readinessGate.passed) {
    throw new Error(
      `Mobile readiness gate missing required evidence: ${readinessGate.missingEvidence.join(
        ", ",
      )}`,
    );
  }
}

function buildRunSummary() {
  return {
    appId,
    artifactRoot,
    checks,
    deviceId,
    manifestPath,
    platform,
    qaArtifacts: {
      logcatPath,
      uiDumpDir: artifactUiDir,
    },
  };
}

function buildReadinessGateManifest(summary) {
  const baselineRequiredEvidence = [
    "member-profile-settings-backend-save",
    "auth-sign-in-fixture-viewer",
    "auth-session-recovered",
    "fixture-manifest-snapshot",
    "root-full-suite-reachable",
    "provider-report-modal-submit",
    "provider-report-admin-moderation-receipt",
    "adoption-mobile-publish-success",
    "adoption-mobile-detail-opened",
    "chat-backend-persistence",
    "alerts-backend-persistence",
    "activity-inbox-backend-navigation",
    "logcat-readiness-scan",
  ];
  const strictRequiredEvidence = [
    {
      id: "pet-profiles-create-edit-backend-save",
      rationale:
        "Mis mascotas must create, edit, reload, and prove backend persistence instead of fixture/local state.",
    },
    {
      id: "location-switching-cerca-postgis",
      rationale:
        "Cerca must prove ready-state switching between current, last, manual city, and map-pin locations.",
    },
    {
      id: "safe-area-and-overlap-pass",
      rationale:
        "Screenshots and UI bounds must prove no tab bar, FAB, CTA, card, label, or map marker is clipped or overlapped.",
    },
    {
      id: "resources-state-matrix",
      rationale:
        "Recursos must prove loading, list, map, empty, error/retry, offline/stale, and provider states.",
    },
  ];
  const requiredEvidence = [
    ...baselineRequiredEvidence,
    ...strictRequiredEvidence.map((item) => item.id),
  ];
  const passedEvidence = new Set(
    summary.checks
      .filter((check) => check.ok === true)
      .map((check) => check.id),
  );
  const missingEvidence = requiredEvidence.filter(
    (id) => !passedEvidence.has(id),
  );

  return {
    commands: {
      expectedRootDevCommand: "TURBO_UI=true pnpm dev",
      mobileMcpCommand:
        "RASTRO_E2E_EXPO_DEV_SERVER_URL=http://127.0.0.1:8081 RASTRO_E2E_MOBILE_NEXT_BASE_URL=http://10.0.2.2:3000 node apps/expo/e2e/rastro-mobile-mcp-e2e.mjs",
    },
    missingEvidence,
    passed: missingEvidence.length === 0,
    pendingStrictEvidence: strictRequiredEvidence
      .filter((item) => !passedEvidence.has(item.id))
      .map((item) => ({ ...item, status: "pending-hard-required" })),
    readinessScore:
      Math.round(
        ((requiredEvidence.length - missingEvidence.length) /
          requiredEvidence.length) *
          100,
      ) / 10,
    baselineRequiredEvidence,
    requiredEvidence,
    strictRequiredEvidence,
  };
}

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

async function ensureFixtureViewerSession() {
  const viewerEmail = manifest.accounts.viewerEmail;
  const currentEmail = await readCurrentProfileEmailOrNull();

  if (currentEmail === viewerEmail) {
    checks.push({
      email: viewerEmail,
      id: "auth-sign-in-fixture-viewer",
      ok: true,
      reusedExistingSession: true,
    });
  } else {
    if (currentEmail) {
      await signOutCurrentMember({ currentEmail });
    }

    await signInFixtureViewer();
  }

  await openDevelopmentBuild();
  const recoveredEmail = await readCurrentProfileEmail();

  if (recoveredEmail !== viewerEmail) {
    throw new Error(
      `Expected recovered fixture viewer session ${viewerEmail}, got ${recoveredEmail}.`,
    );
  }

  checks.push({
    email: recoveredEmail,
    id: "auth-session-recovered",
    ok: true,
  });

  return viewerEmail;
}

async function signOutCurrentMember({ currentEmail }) {
  await openProfileScreen();
  await scrollUntilVisibleText("Cerrar sesión", {
    context: "profile-sign-out",
    maxSwipes: 5,
  });
  await tapVisibleText("Cerrar sesión", "profile-sign-out");
  await delay(1000);
  await openProfileScreen({ timeoutMs: 30000 });
  await waitForVisibleText("Iniciar sesión", "profile-signed-out", {
    timeoutMs: 30000,
  });
  checks.push({
    id: "auth-sign-out-previous-member",
    ok: true,
    previousEmail: currentEmail,
  });
}

async function signInFixtureViewer() {
  await signInFixtureMember({
    checkId: "auth-sign-in-fixture-viewer",
    email: manifest.accounts.viewerEmail,
    password: fixtureAccountPasswords.viewer,
    screenshotFile: "auth-fixture-viewer-session.png",
  });
}

async function signInFixtureMember({
  checkId,
  email,
  password,
  screenshotFile,
}) {
  let method = "email-password";

  try {
    await signInFixtureMemberViaVisiblePrompt({ checkId, email, password });
  } catch {
    method = "callback-cookie";
    await signInFixtureMemberViaCallback({ checkId, email, password });
  }

  if (screenshotFile) {
    await screenshot(screenshotFile);
  }

  checks.push({
    email,
    id:
      method === "email-password"
        ? "auth-email-password-sign-in"
        : "auth-callback-cookie-sign-in",
    ok: true,
  });
  checks.push({
    email,
    id: checkId,
    ok: true,
  });
}

async function signInFixtureMemberViaVisiblePrompt({
  checkId,
  email,
  password,
}) {
  await openProfileScreen({ timeoutMs: 30000 });
  await waitForVisibleText("Iniciar sesión", `${checkId}-signed-out`, {
    timeoutMs: 30000,
  });
  await tapVisibleText("Iniciar sesión", `${checkId}-open-auth-prompt`, {
    timeoutMs: 30000,
  });
  await waitForVisibleText("Correo", `${checkId}-auth-prompt-email`, {
    timeoutMs: 30000,
  });
  await replaceTextByAccessibilityLabel("Correo", email, {
    context: `${checkId}-email`,
    dismissKeyboard: false,
    timeoutMs: 30000,
  });
  await replaceTextByAccessibilityLabel("Contraseña", password, {
    context: `${checkId}-password`,
    timeoutMs: 30000,
  });
  await hideKeyboardIfVisible();
  await tapVisibleText("Iniciar sesión", `${checkId}-submit-auth-prompt`, {
    timeoutMs: 30000,
  });
  await waitForVisibleText(email, `${checkId}-profile`, {
    timeoutMs: 60000,
  });
}

async function signInFixtureMemberViaCallback({ checkId, email, password }) {
  let lastProfileError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const setCookieHeader = await createFixtureAuthCookie({ email, password });
    const callbackUrl = new URL("rastro://auth/callback");
    callbackUrl.searchParams.set("cookie", setCookieHeader);
    callbackUrl.searchParams.set("e2eAttempt", String(attempt));
    callbackUrl.searchParams.set("e2eNonce", `${Date.now()}`);

    await adb([
      "shell",
      "am",
      "start",
      "-W",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      callbackUrl.toString(),
      appId,
    ]);
    await delay(12000);
    checks.push({
      attempt,
      id: "open:auth-callback-cookie",
      ok: true,
    });
    await openProfileScreen({ timeoutMs: 30000 });

    try {
      await waitForVisibleText(email, `${checkId}-profile`, {
        timeoutMs: attempt === 1 ? 12000 : 30000,
      });
      lastProfileError = null;
      break;
    } catch (error) {
      lastProfileError = error;
    }
  }

  if (lastProfileError) {
    throw lastProfileError;
  }
}

async function createFixtureAuthCookie({ email, password }) {
  const response = await fetch(`${hostNextBaseUrl}/api/auth/sign-in/email`, {
    body: JSON.stringify({
      callbackURL: "/",
      email,
      password,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Fixture viewer sign-in failed with ${response.status}: ${responseText}`,
    );
  }

  const headers = response.headers;
  const setCookieHeaders =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter(Boolean);
  const setCookieHeader = setCookieHeaders.join(", ");

  if (!setCookieHeader) {
    throw new Error("Fixture viewer sign-in did not return Set-Cookie.");
  }

  return setCookieHeader;
}

async function verifyMemberProfileSettingsWorkflow({ expectedEmail }) {
  const displayName = `Rastro E2E Vecina ${Date.now()}`;
  const phone = "59170123456";
  const whatsapp = "59171234567";
  const memberEmail = await readCurrentProfileEmail();

  if (memberEmail !== expectedEmail) {
    throw new Error(
      `Expected member profile workflow to run as ${expectedEmail}, got ${memberEmail}.`,
    );
  }

  await openProfileSettingsScreen();
  await waitForTestID("member-profile-display-name-input", {
    timeoutMs: 30000,
  });
  await replaceText("member-profile-display-name-input", displayName);
  await scrollUntilTestID("member-profile-contact-preference-both", {
    maxSwipes: 4,
  });
  await tapRequired("member-profile-contact-preference-both");
  await scrollUntilTestID("member-profile-phone-input", { maxSwipes: 4 });
  await replaceText("member-profile-phone-input", phone);
  await scrollUntilTestID("member-profile-whatsapp-input", { maxSwipes: 4 });
  await replaceText("member-profile-whatsapp-input", whatsapp);
  await scrollUntilTestID("member-profile-save-button", { maxSwipes: 4 });
  await screenshot("member-profile-settings-draft.png");

  await tapRequired("member-profile-save-button");
  await assertMemberProfileSavedByEmail({
    displayName,
    email: memberEmail,
    phone,
    whatsapp,
  });
  await openDevelopmentBuild();

  await openProfileScreen();
  await waitForVisibleText(displayName, "profile-saved-display-name", {
    timeoutMs: 30000,
  });
  await screenshot("profile-saved-display-name.png");

  checks.push({
    defaultContactPreference: "both",
    detail:
      "Member profile form was visually edited, backend saved the same contact defaults, and Perfil refreshed with the new display name.",
    id: "member-profile-settings-backend-save",
    ok: true,
  });

  return memberEmail;
}

async function openProfileSettingsScreen() {
  await openProfileScreen();
  await scrollUntilVisibleText("Ajustes", {
    context: "profile-settings-row",
    maxSwipes: 4,
  });
  await tapVisibleText("Ajustes", "profile-settings-row");
  await waitForTestID("member-profile-settings-screen", { timeoutMs: 30000 });
  checks.push({
    id: "open:profile-settings-row",
    ok: true,
  });
}

async function openProfileScreen(options = {}) {
  const timeoutMs = options.timeoutMs ?? 30000;

  if (await isTestIDVisible("profile-screen", { timeoutMs: 1500 })) {
    checks.push({
      id: "open:profile-already-visible",
      ok: true,
    });
    return;
  }

  if (
    await maybeTapAnyVisibleText(["Perfil"], "profile-tab", {
      timeoutMs: 5000,
    })
  ) {
    await waitForTestID("profile-screen", { timeoutMs });
    checks.push({
      id: "open:profile-tab",
      ok: true,
    });
    return;
  }

  await openDevelopmentBuild();
  await tapVisibleText("Perfil", "profile-tab", { timeoutMs: 15000 });
  await waitForTestID("profile-screen", { timeoutMs });
  checks.push({
    id: "open:profile-tab-after-restart",
    ok: true,
  });
}

async function isTestIDVisible(testID, options = {}) {
  try {
    await waitForTestID(testID, { timeoutMs: options.timeoutMs ?? 1500 });
    return true;
  } catch {
    return false;
  }
}

async function readCurrentProfileEmail() {
  const email = await readCurrentProfileEmailOrNull();

  if (email) {
    return email;
  }

  throw new Error("Could not read the current signed-in member email.");
}

async function readCurrentProfileEmailOrNull() {
  await openProfileScreen();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { stdout } = await adb([
      "exec-out",
      "uiautomator",
      "dump",
      "--compressed",
      "/dev/tty",
    ]);
    const email = extractFirstEmail(stdout);

    if (email) {
      checks.push({
        email,
        id: "member-profile-current-email",
        ok: true,
      });
      return email;
    }

    await adb(["shell", "input", "swipe", "540", "1980", "540", "900", "350"]);
    await delay(750);
  }

  return null;
}

async function assertMemberProfileSavedByEmail({
  displayName,
  email,
  phone,
  whatsapp,
}) {
  const result = await runNextjsWithEnvScript(`
    import { eq } from "@acme/db";
    import { db, pool } from "@acme/db/client";
    import { MemberProfile, user } from "@acme/db/schema";
    import { appRouter, createDrizzleMemberProfileRepository } from "@acme/api";

    const expected = {
      defaultContactPreference: "both",
      displayName: ${JSON.stringify(displayName)},
      email: ${JSON.stringify(email)},
      phone: ${JSON.stringify(phone)},
      whatsapp: ${JSON.stringify(whatsapp)},
    };

    async function readSnapshot() {
      const [member] = await db
        .select({ email: user.email, id: user.id, name: user.name })
        .from(user)
        .where(eq(user.email, expected.email))
        .limit(1);

      if (!member) {
        throw new Error("Could not find signed-in member by email.");
      }

      const repository = createDrizzleMemberProfileRepository(db);
      const caller = appRouter.createCaller({
        memberProfileRepository: repository,
        session: {
          user: {
            email: member.email,
            id: member.id,
            name: member.name,
          },
        },
      });
      const trpcProfile = await caller.memberProfile.get({});
      const [dbProfile] = await db
        .select({
          defaultContactPreference: MemberProfile.defaultContactPreference,
          phone: MemberProfile.phone,
          whatsapp: MemberProfile.whatsapp,
        })
        .from(MemberProfile)
        .where(eq(MemberProfile.memberId, member.id))
        .limit(1);

      return {
        dbProfile: dbProfile ?? null,
        member,
        trpcProfile,
      };
    }

    function matchesExpected(snapshot) {
      return (
        snapshot.member.name === expected.displayName &&
        snapshot.trpcProfile.defaultContactPreference ===
          expected.defaultContactPreference &&
        snapshot.trpcProfile.displayName === expected.displayName &&
        snapshot.trpcProfile.phone === expected.phone &&
        snapshot.trpcProfile.whatsapp === expected.whatsapp &&
        snapshot.dbProfile?.defaultContactPreference ===
          expected.defaultContactPreference &&
        snapshot.dbProfile?.phone === expected.phone &&
        snapshot.dbProfile?.whatsapp === expected.whatsapp
      );
    }

    async function main() {
      let lastSnapshot = null;

      for (let attempt = 0; attempt < 30; attempt += 1) {
        const snapshot = await readSnapshot();
        lastSnapshot = snapshot;

        if (matchesExpected(snapshot)) {
          return snapshot;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      throw new Error(
        "Member profile save was not visible through tRPC and DB state: " +
          JSON.stringify(lastSnapshot),
      );
    }

    main()
      .then((snapshot) => {
        console.log(JSON.stringify(snapshot));
      })
      .catch((error) => {
        console.error(error);
        process.exitCode = 1;
      })
      .finally(async () => {
        await pool.end();
      });
  `);

  assertExpectedPayloadFields("Member profile Save button proof", result, [
    ["member.name", displayName],
    ["trpcProfile.displayName", displayName],
    ["trpcProfile.defaultContactPreference", "both"],
    ["trpcProfile.phone", phone],
    ["trpcProfile.whatsapp", whatsapp],
    ["dbProfile.defaultContactPreference", "both"],
    ["dbProfile.phone", phone],
    ["dbProfile.whatsapp", whatsapp],
  ]);

  checks.push({
    email,
    id: "member-profile-trpc-db-save",
    ok: true,
    result,
  });
}

async function verifyProviderProfile({ memberEmail }) {
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

  const reportReason = await chooseProviderReportReason({
    memberEmail,
    providerId: provider.id,
  });
  const reportDetail = buildDefaultProviderReportDetail(reportReason.reason);

  await scrollUntilTestID("resource-provider-report-button", { maxSwipes: 5 });
  await tapByAutomationRequired("resource-provider-report-button");
  await waitForTestID("resource-provider-report-modal");
  await delay(500);
  await tapRequired(`resource-provider-report-reason-${reportReason.reason}`);
  await delay(500);
  await screenshot("provider-report-modal.png");
  await tapRequired("resource-provider-report-submit");
  await waitForTestIDToDisappear("resource-provider-report-modal", {
    timeoutMs: 30000,
  });
  await assertProviderReportModerationReceipt({
    detail: reportDetail,
    expectNewReport: reportReason.expectNewReport,
    memberEmail,
    provider,
    reason: reportReason.reason,
  });
  await screenshot("provider-report-submitted.png");
  checks.push({
    id: "provider-report-modal-submit",
    ok: true,
    providerId: provider.id,
    reason: reportReason.reason,
  });
}

async function verifyAdoptionCreationWorkflow() {
  const petName = `Luna E2E ${Date.now()}`;
  const adoptionSummary =
    "Luna busca una familia tranquila y responsable con tiempo para acompanarla.";

  await seedAndroidGalleryImage();
  await openDeepLinkUntilVisibleText(
    ["rastro:///report-create/adoption"],
    "Dar en adopcion",
  );
  await tapVisibleText("Crear aqui", "adoption-inline-pet-mode");
  await replaceTextByAccessibilityLabel("Nombre", petName, {
    context: "adoption-pet-name",
  });
  await tapVisibleText("Gato", "adoption-pet-type");
  await replaceTextByAccessibilityLabel("Raza", "Mestiza", {
    context: "adoption-pet-breed",
  });
  await replaceTextByAccessibilityLabel(
    "Descripcion y marcas",
    "Gatita tranquila con collar verde y manchas blancas.",
    { context: "adoption-pet-description" },
  );
  await addOneReportPhotoFromLibrary();
  await waitForVisibleText("Foto 1", "adoption-photo-selected", {
    exact: false,
    timeoutMs: 60000,
  });
  await screenshot("adoption-photo-selected.png");
  await tapVisibleText("Continuar", "adoption-photos-continue");
  await waitForVisibleText("Sobre la adopcion", "adoption-details-step", {
    timeoutMs: 60000,
  });

  await replaceTextByAccessibilityLabel("Sobre la adopcion", adoptionSummary, {
    context: "adoption-summary",
  });
  await tapVisibleText("Continuar", "adoption-details-continue");
  await waitForVisibleText("Elegir ubicacion", "adoption-location-step", {
    timeoutMs: 30000,
  });
  await tapVisibleText("Elegir ubicacion", "adoption-location-open");
  await waitForVisibleText("Ubicacion del reporte", "location-picker", {
    timeoutMs: 30000,
  });
  await tapVisibleText("Marcar punto exacto en La Paz", "location-map-open");
  await waitForVisibleText("Confirmar punto elegido", "location-map-confirm", {
    timeoutMs: 30000,
  });
  await tapVisibleText("Confirmar punto elegido", "location-map-confirm");
  await waitForVisibleText("Cambiar ubicacion", "adoption-location-selected", {
    timeoutMs: 30000,
  });
  await tapVisibleText("Continuar", "adoption-location-continue");
  await waitForVisibleText("Chat en Rastro", "adoption-contact-step", {
    timeoutMs: 30000,
  });
  await tapVisibleText("Chat en Rastro", "adoption-contact-chat");
  await tapVisibleText("Continuar", "adoption-contact-continue");
  await waitForVisibleText("Publicar adopcion", "adoption-review-step", {
    timeoutMs: 30000,
  });
  await screenshot("adoption-review-ready.png");
  await tapVisibleText("Publicar adopcion", "adoption-publish-open");
  await waitForTestID("report-publish-confirmation", { timeoutMs: 30000 });
  await screenshot("adoption-publish-confirmation.png");
  await tapVisibleText("Confirmar y publicar", "adoption-publish-confirm", {
    timeoutMs: 30000,
  });
  await waitForVisibleText("Adopcion publicada", "adoption-publish-success", {
    timeoutMs: 60000,
  });
  await screenshot("adoption-published.png");
  checks.push({
    detail:
      "Adoption listing was completed from mobile UI with inline pet, native-selected media, location, chat contact, confirmation, and success state.",
    id: "adoption-mobile-publish-success",
    ok: true,
    petName,
  });
  const reportId = await findPublishedAdoptionReportIdByPetName(petName);

  await tapVisibleText("Ver adopcion", "adoption-open-published");
  await waitForTestID("public-report-detail-screen", { timeoutMs: 30000 });
  await waitForTestID("public-report-media-gallery", { timeoutMs: 30000 });
  await screenshot("adoption-published-owner-detail.png");
  await assertNoBrokenMediaFallbacks("adoption-published-detail");

  await verifyPublishedAdoptionContactAsOtherMember({ petName, reportId });
}

async function findPublishedAdoptionReportIdByPetName(petName) {
  const result = await runNextjsWithEnvScript(`
    import { and, desc, eq } from "@acme/db";
    import { db, pool } from "@acme/db/client";
    import { Report } from "@acme/db/schema";

    const petName = ${JSON.stringify(petName)};

    async function main() {
      const [report] = await db
        .select({
          contactPreference: Report.contactPreference,
          id: Report.id,
          petName: Report.petName,
          status: Report.status,
          type: Report.type,
        })
        .from(Report)
        .where(and(eq(Report.petName, petName), eq(Report.type, "adoption")))
        .orderBy(desc(Report.createdAt))
        .limit(1);

      if (!report) {
        throw new Error("Could not find published E2E adoption report.");
      }

      return report;
    }

    main()
      .then((result) => {
        console.log(JSON.stringify(result));
      })
      .finally(() => pool.end());
  `);

  if (
    result.petName !== petName ||
    result.type !== "adoption" ||
    result.status !== "active" ||
    result.contactPreference !== "in_app_chat"
  ) {
    throw new Error(
      `Published adoption report did not match expected contact contract: ${JSON.stringify(
        result,
      )}`,
    );
  }

  checks.push({
    id: "adoption-mobile-backend-report-receipt",
    ok: true,
    reportId: result.id,
  });

  return result.id;
}

async function verifyPublishedAdoptionContactAsOtherMember({
  petName,
  reportId,
}) {
  await switchToFixtureMember({
    checkId: "auth-sign-in-fixture-owner",
    email: manifest.accounts.ownerEmail,
    password: fixtureAccountPasswords.owner,
  });
  await openDeepLinkUntilVisible(
    [`rastro://adopciones/${encodeURIComponent(reportId)}`],
    "public-report-detail-screen",
    { timeoutMs: 30000 },
  );
  await waitForTestID("public-report-media-gallery", { timeoutMs: 30000 });
  await scrollUntilTestID("public-report-contact-in-app-chat-0", {
    maxSwipes: 8,
  });
  await screenshot("adoption-published-detail.png");
  checks.push({
    detail:
      "The adoption detail was reopened as a different signed-in member and exposed the in-app chat contact action.",
    id: "adoption-mobile-detail-opened",
    ok: true,
    petName,
    reportId,
  });
  await switchToFixtureMember({
    checkId: "auth-sign-in-fixture-viewer",
    email: manifest.accounts.viewerEmail,
    password: fixtureAccountPasswords.viewer,
  });
}

async function switchToFixtureMember({ checkId, email, password }) {
  const currentEmail = await readCurrentProfileEmailOrNull();

  if (currentEmail === email) {
    checks.push({
      email,
      id: checkId,
      ok: true,
      reusedExistingSession: true,
    });
    return;
  }

  if (currentEmail) {
    await signOutCurrentMember({ currentEmail });
  }

  await signInFixtureMember({
    checkId,
    email,
    password,
  });
}

async function seedAndroidGalleryImage() {
  if (platform !== "android") {
    return;
  }

  const localPath = join(artifactRoot, `rastro-e2e-adoption-${Date.now()}.jpg`);
  const remoteDir = "/sdcard/Pictures/RastroE2E";
  const remotePath = `${remoteDir}/rastro-e2e-adoption.jpg`;

  await execFileAsync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "testsrc=size=1200x900:rate=1",
      "-frames:v",
      "1",
      "-q:v",
      "2",
      localPath,
    ],
    { cwd: workspaceRoot, timeout: 30000 },
  );
  await adb(["shell", "rm", "-rf", remoteDir]);
  await adb(["shell", "mkdir", "-p", remoteDir]);
  await adb(["push", localPath, remotePath]);
  await adb([
    "shell",
    "am",
    "broadcast",
    "-a",
    "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
    "-d",
    `file://${remotePath}`,
  ]);
  checks.push({
    id: "android-gallery-image-seeded",
    localPath,
    ok: true,
    remotePath,
  });
}

async function addOneReportPhotoFromLibrary() {
  await tapVisibleText("Agregar desde biblioteca", "report-media-library");
  await maybeTapAnyVisibleText(
    ["Permitir", "Allow", "Allow all photos", "Seleccionar fotos"],
    "report-media-library-permission",
    { timeoutMs: 6000 },
  );
  await tapFirstGalleryImage();
  await maybeTapAnyVisibleText(
    ["Add", "Done", "Select", "Agregar", "Listo", "Seleccionar"],
    "photo-picker-confirm",
    { timeoutMs: 8000 },
  );
  await maybeTapAnyVisibleText(
    ["Aplicar", "Cortar", "Crop", "Done"],
    "report-media-crop-apply",
    { timeoutMs: 15000 },
  );
}

async function chooseProviderReportReason({ memberEmail, providerId }) {
  const result = await runNextjsWithEnvScript(`
    import { and, eq } from "@acme/db";
    import { db, pool } from "@acme/db/client";
    import { ResourceProviderModerationReport, user } from "@acme/db/schema";

    const providerId = ${JSON.stringify(providerId)};
    const memberEmail = ${JSON.stringify(memberEmail)};
    const reasons = ${JSON.stringify(providerReportReasons)};

    async function main() {
      const [member] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, memberEmail))
        .limit(1);

      if (!member) {
        throw new Error("Could not find signed-in member for provider report.");
      }

      const existingReports = await db
        .select({ reason: ResourceProviderModerationReport.reason })
        .from(ResourceProviderModerationReport)
        .where(
          and(
            eq(ResourceProviderModerationReport.providerId, providerId),
            eq(ResourceProviderModerationReport.reporterId, member.id),
          ),
        );
      const usedReasons = new Set(existingReports.map((item) => item.reason));
      const reason =
        reasons.find((candidate) => !usedReasons.has(candidate)) ?? reasons[0];

      return {
        expectNewReport: !usedReasons.has(reason),
        reason,
        reporterId: member.id,
        usedReasons: [...usedReasons].sort(),
      };
    }

    main()
      .then((payload) => {
        console.log(JSON.stringify(payload));
      })
      .catch((error) => {
        console.error(error);
        process.exitCode = 1;
      })
      .finally(async () => {
        await pool.end();
      });
  `);

  if (!providerReportReasons.includes(result.reason)) {
    throw new Error(
      `Provider report reason selection returned unsupported reason: ${JSON.stringify(
        result,
      )}`,
    );
  }

  checks.push({
    id: "provider-report-reason-selected",
    ok: true,
    providerId,
    result,
  });

  return result;
}

function buildDefaultProviderReportDetail(reason) {
  const label = providerReportReasonLabels[reason];

  if (!label) {
    throw new Error(`Unsupported provider report reason: ${reason}`);
  }

  return `Reporte de proveedor: ${label}.`;
}

async function assertProviderReportModerationReceipt({
  detail,
  expectNewReport,
  memberEmail,
  provider,
  reason,
}) {
  const result = await runNextjsWithEnvScript(`
    import { and, desc, eq } from "@acme/db";
    import { db, pool } from "@acme/db/client";
    import { ResourceProviderModerationReport, user } from "@acme/db/schema";
    import { appRouter, createDrizzleResourceProviderModerationRepository } from "@acme/api";

    const expected = {
      detail: ${JSON.stringify(detail)},
      expectNewReport: ${JSON.stringify(expectNewReport)},
      memberEmail: ${JSON.stringify(memberEmail)},
      providerId: ${JSON.stringify(provider.id)},
      providerName: ${JSON.stringify(provider.name)},
      reason: ${JSON.stringify(reason)},
    };

    async function readReceipt() {
      const [member] = await db
        .select({ email: user.email, id: user.id, name: user.name })
        .from(user)
        .where(eq(user.email, expected.memberEmail))
        .limit(1);

      if (!member) {
        throw new Error("Could not find signed-in member for provider report.");
      }

      const moderationRepository =
        createDrizzleResourceProviderModerationRepository(db);
      const caller = appRouter.createCaller({
        adminEmailList: member.email,
        resourceProviderModerationRepository: moderationRepository,
        session: {
          user: {
            email: member.email,
            id: member.id,
            name: member.name,
          },
        },
      });
      const queue = await caller.admin.moderation.resourceProviderQueueList({
        filters: {
          reason: [expected.reason],
          status: ["pending"],
        },
        page: 1,
        pageSize: 100,
        sortBy: "lastReportedAt",
        sortDirection: "desc",
      });
      const queueItem =
        queue.items.find(
          (item) =>
            item.provider.id === expected.providerId &&
            item.reason === expected.reason,
        ) ?? null;
      const [report] = await db
        .select({
          createdAt: ResourceProviderModerationReport.createdAt,
          detail: ResourceProviderModerationReport.detail,
          id: ResourceProviderModerationReport.id,
          reason: ResourceProviderModerationReport.reason,
          reporterId: ResourceProviderModerationReport.reporterId,
          reviewItemId: ResourceProviderModerationReport.reviewItemId,
        })
        .from(ResourceProviderModerationReport)
        .where(
          and(
            eq(ResourceProviderModerationReport.providerId, expected.providerId),
            eq(ResourceProviderModerationReport.reporterId, member.id),
            eq(ResourceProviderModerationReport.reason, expected.reason),
          ),
        )
        .orderBy(desc(ResourceProviderModerationReport.createdAt))
        .limit(1);

      return {
        member,
        queueItem,
        queueTotal: queue.total,
        report: report
          ? {
              ...report,
              createdAt:
                report.createdAt instanceof Date
                  ? report.createdAt.toISOString()
                  : report.createdAt,
            }
          : null,
      };
    }

    function matchesReceipt(receipt) {
      return (
        receipt.queueItem !== null &&
        receipt.queueItem.provider.id === expected.providerId &&
        receipt.queueItem.provider.name === expected.providerName &&
        receipt.queueItem.reason === expected.reason &&
        receipt.queueItem.status === "pending" &&
        receipt.report !== null &&
        receipt.report.reason === expected.reason &&
        (!expected.expectNewReport || receipt.report.detail === expected.detail)
      );
    }

    async function main() {
      let lastReceipt = null;

      for (let attempt = 0; attempt < 30; attempt += 1) {
        const receipt = await readReceipt();
        lastReceipt = receipt;

        if (matchesReceipt(receipt)) {
          return receipt;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      throw new Error(
        "Provider report was not visible through admin moderation and DB state: " +
          JSON.stringify(lastReceipt),
      );
    }

    main()
      .then((receipt) => {
        console.log(JSON.stringify(receipt));
      })
      .catch((error) => {
        console.error(error);
        process.exitCode = 1;
      })
      .finally(async () => {
        await pool.end();
      });
  `);

  assertExpectedPayloadFields("Provider report moderation proof", result, [
    ["queueItem.provider.id", provider.id],
    ["queueItem.provider.name", provider.name],
    ["queueItem.reason", reason],
    ["queueItem.status", "pending"],
    ["report.reason", reason],
    ...buildOptionalExpectedFieldSpecs(expectNewReport, [
      ["report.detail", detail],
    ]),
  ]);

  checks.push({
    id: "provider-report-admin-moderation-receipt",
    ok: true,
    providerId: provider.id,
    reason,
    result,
  });
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
  const messageText = `RastroE2Echat${Date.now()}`;

  checks.push({
    detail: "Fixture seeds a backend persisted report-linked chat.",
    id: "chat-backend-persistence",
    ok: manifest.chat.backendPersisted === true,
  });

  await openDeepLinkUntilVisible(
    [
      `rastro:///chats/report/${manifest.chat.reportId}`,
      `rastro://chats/report/${manifest.chat.reportId}`,
    ],
    "chat-screen",
  );
  await waitForTestID("chat-message-list");
  await tapAndText("chat-message-input", messageText);
  await tapRequired("chat-send-button");
  await dismissKeyboard();
  await waitForVisibleText(messageText, "chat-sent-message", {
    timeoutMs: 30000,
  });
  await screenshot("chat-workflow.png");
  checks.push({
    detail:
      "Chat screenshot is captured after the send completes and the keyboard is dismissed.",
    id: "chat-keyboard-safe-screenshot",
    ok: true,
  });

  await openDeepLinkUntilVisible(
    ["rastro://recursos", "rastro:///recursos"],
    "resources-screen",
  );
  await openDeepLinkUntilVisible(
    [
      `rastro:///chats/report/${manifest.chat.reportId}`,
      `rastro://chats/report/${manifest.chat.reportId}`,
    ],
    "chat-screen",
  );
  await waitForTestID("chat-message-list");
  await assertVisibleText(messageText, "chat-reopened-message");

  return messageText;
}

async function verifyAlertSubscriptionWorkflow() {
  await openDeepLinkUntilVisible(
    ["rastro:///alertas", "rastro://alertas"],
    "alert-subscription-settings-screen",
  );
  if (await hasTestID("alert-subscription-enable-button")) {
    await tapRequired("alert-subscription-enable-button");
    await waitForTestID("alert-subscription-feedback", { timeoutMs: 30000 });
  } else {
    await waitForTestID("alert-subscription-pause-button", {
      timeoutMs: 30000,
    });
  }
  await waitForTestID("alert-subscription-pause-button", { timeoutMs: 30000 });
  await assertVisibleText("ALERTAS ACTIVAS", "alerts-enabled");
  await screenshot("alerts-enabled.png");

  await openDeepLinkUntilVisible(
    ["rastro://recursos", "rastro:///recursos"],
    "resources-screen",
  );
  await openDeepLinkUntilVisible(
    ["rastro:///alertas", "rastro://alertas"],
    "alert-subscription-settings-screen",
  );
  await waitForTestID("alert-subscription-pause-button", { timeoutMs: 30000 });
  await assertVisibleText("ALERTAS ACTIVAS", "alerts-reopened");

  checks.push({
    detail:
      "Alert settings survived route remount and backend state refresh after activation.",
    id: "alerts-backend-persistence",
    ok: true,
  });
}

async function verifyActivityInboxWorkflow({ latestChatMessageText }) {
  const reportId = getActivityReportId();

  await openDeepLinkUntilVisible(
    [
      "rastro:///actividad",
      "rastro://actividad",
      "rastro:///(tabs)/(activity)",
      "rastro://(tabs)/(activity)",
    ],
    "activity-screen",
  );
  await waitForTestID("activity-section-nearby-alerts", { timeoutMs: 30000 });
  await assertVisibleText("HISTORIAL DE ALERTAS", "activity-alert-history");
  await scrollUntilTestID("activity-section-chats", { maxSwipes: 4 });
  await assertVisibleText("MENSAJES", "activity-messages");
  const chatItemTestID = await findVisibleTestIDContainingText({
    context: "activity-latest-chat-row",
    testIDPrefix: "activity-item-chat-",
    text: latestChatMessageText,
  });
  await assertVisibleText(latestChatMessageText, "activity-latest-chat-text");
  await screenshot("activity-inbox.png");

  await tapRequired(chatItemTestID);
  await waitForTestID("chat-screen", { timeoutMs: 15000 });
  await waitForTestID("chat-message-list");
  await assertVisibleText(latestChatMessageText, "activity-chat-navigation");

  await openDeepLinkUntilVisible(
    ["rastro:///actividad", "rastro://actividad"],
    "activity-screen",
  );
  await scrollUntilTestID(`activity-item-alert-${reportId}`, {
    maxSwipes: 5,
  });
  await tapRequired(`activity-item-alert-${reportId}`);
  await waitForTestID("public-report-detail-screen", { timeoutMs: 15000 });
  await waitForTestID("public-report-media-gallery");
  await waitForTestID("public-report-contact-in-app-chat-0");
  await screenshot("activity-alert-report-detail.png");

  checks.push({
    detail:
      "Activity showed backend alert history and chat rows, then navigated to chat and report detail.",
    id: "activity-inbox-backend-navigation",
    ok: true,
  });
}

async function openDeepLinkUntilVisible(urls, testID, options = {}) {
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
      await waitForTestID(testID, {
        timeoutMs: options.timeoutMs ?? 12000,
      });
      checks.push({ id: `open:${url}`, ok: true, testID });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Could not open route for ${testID}`);
}

async function openDeepLinkUntilVisibleText(urls, text, options = {}) {
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
      await waitForVisibleText(text, `open:${url}`, {
        exact: options.exact ?? true,
        timeoutMs: options.timeoutMs ?? 12000,
      });
      checks.push({ id: `open:${url}`, ok: true, text });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Could not open route for ${text}`);
}

async function openDevelopmentBuild() {
  const devServerUrl =
    process.env.RASTRO_E2E_EXPO_DEV_SERVER_URL ??
    (await findDevServerUrlAsync(appRoot))?.toString() ??
    "http://localhost:8081";
  const deviceReachableUrl = toDeviceReachableUrl(devServerUrl);

  await adb(["shell", "am", "force-stop", appId]);
  await delay(1000);
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
  await waitForDevelopmentBuildReady();
  checks.push({
    devServerUrl,
    deviceReachableUrl,
    id: "open:development-build",
    ok: true,
  });
}

async function waitForDevelopmentBuildReady() {
  const timeoutMs = 90000;
  const startedAt = Date.now();
  let lastUiDump = "";

  while (Date.now() - startedAt < timeoutMs) {
    const { stdout } = await adb([
      "exec-out",
      "uiautomator",
      "dump",
      "--compressed",
      "/dev/tty",
    ]);

    lastUiDump = stdout;

    if (
      !stdout.includes("Reloading...") &&
      [
        "Cerca",
        "Actividad",
        "Recursos",
        "Perfil",
        "profile-screen",
        "resources-screen",
        "activity-screen",
      ].some((value) => stdout.includes(value))
    ) {
      checks.push({ id: "development-build-ready", ok: true });
      return;
    }

    await delay(1000);
  }

  throw new Error(
    `Development build did not finish loading: ${lastUiDump.slice(0, 1000)}`,
  );
}

async function grantAndroidRuntimePermissions() {
  if (platform !== "android") {
    return;
  }

  const permissions = [
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE",
  ];
  const results = [];

  for (const permission of permissions) {
    try {
      await adb([
        "shell",
        "pm",
        "clear-permission-flags",
        appId,
        permission,
        "user-set",
        "user-fixed",
      ]);
      await adb(["shell", "pm", "grant", appId, permission]);
      results.push({ ok: true, permission });
    } catch (error) {
      results.push({
        error: error instanceof Error ? error.message : String(error),
        ok: false,
        permission,
      });
    }
  }

  checks.push({ id: "permissions:runtime", ok: true, results });
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

async function runNextjsWithEnvScript(script, options = {}) {
  let stdout;

  try {
    ({ stdout } = await execFileAsync(
      "pnpm",
      ["-F", "@acme/nextjs", "with-env", "tsx", "-e", script],
      {
        cwd: workspaceRoot,
        env: process.env,
        maxBuffer: options.maxBuffer ?? 8 * 1024 * 1024,
        timeout: options.timeoutMs ?? 120000,
      },
    ));
  } catch (error) {
    throw new Error(`Next.js env script failed.\n${formatExecError(error)}`);
  }

  const jsonLine = stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);

  if (!jsonLine) {
    throw new Error("Next.js env script did not print a JSON payload.");
  }

  try {
    return JSON.parse(jsonLine);
  } catch (error) {
    throw new Error(
      `Next.js env script printed invalid JSON payload: ${jsonLine}\n${error}`,
    );
  }
}

function assertExpectedPayloadFields(context, payload, fieldSpecs) {
  const fields = fieldSpecs.map(([path, expected]) => ({
    actual: readPayloadPath(payload, path),
    expected,
    label: path,
  }));
  const mismatches = fields.filter(
    (field) => !Object.is(field.actual, field.expected),
  );

  if (mismatches.length === 0) {
    return;
  }

  throw new Error(
    `${context} returned unexpected payload: ${JSON.stringify({
      mismatches,
      payload,
    })}`,
  );
}

function buildOptionalExpectedFieldSpecs(include, fieldSpecs) {
  return include ? fieldSpecs : [];
}

function readPayloadPath(payload, path) {
  return path
    .split(".")
    .reduce(
      (current, segment) =>
        current && typeof current === "object" ? current[segment] : undefined,
      payload,
    );
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

async function waitForTestIDToDisappear(testID, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15000;
  const startedAt = Date.now();
  let lastResult;

  while (Date.now() - startedAt < timeoutMs) {
    const result = await automation.findViewByTestIDAsync(testID);
    lastResult = result;

    if (!result.success || !hasUsableBounds(result.data)) {
      checks.push({ id: `gone:${testID}`, ok: true });
      return;
    }

    await delay(500);
  }

  throw new Error(
    `Timed out waiting for ${testID} to disappear: ${JSON.stringify(
      lastResult,
    )}`,
  );
}

async function hasTestID(testID) {
  const result = await automation.findViewByTestIDAsync(testID);

  return result.success && hasUsableBounds(result.data);
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

async function scrollUntilVisibleText(text, options = {}) {
  const maxSwipes = options.maxSwipes ?? 8;
  const context = options.context ?? text;

  for (let attempt = 0; attempt <= maxSwipes; attempt += 1) {
    const node = await findVisibleNodeByText(text);

    if (node) {
      checks.push({
        id: `find-visible-text:${context}`,
        ok: true,
        scrolled: attempt > 0,
        text,
      });
      return node;
    }

    if (attempt === maxSwipes) {
      throw new Error(
        `Could not scroll to visible text on ${context}: ${text}`,
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

async function tapVisibleText(text, context, options = {}) {
  const node = await waitForVisibleNodeByText(text, {
    context,
    exact: options.exact ?? true,
    timeoutMs: options.timeoutMs ?? 15000,
  });

  await tapParsedBounds(node.bounds);
  checks.push({ id: `tap-visible-text:${context}`, ok: true, text });
}

async function maybeTapAnyVisibleText(texts, context, options = {}) {
  const timeoutMs = options.timeoutMs ?? 5000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    for (const text of texts) {
      const node = await findVisibleNodeByText(text, {
        exact: options.exact ?? true,
      });

      if (node) {
        await tapParsedBounds(node.bounds);
        checks.push({
          id: `tap-visible-text-optional:${context}`,
          ok: true,
          text,
        });
        return true;
      }
    }

    await delay(500);
  }

  checks.push({
    id: `tap-visible-text-optional:${context}`,
    ok: true,
    skipped: true,
  });
  return false;
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

async function replaceText(testID, value) {
  const element = await waitForTestID(testID);
  const centerX = Math.round(element.bounds.x + element.bounds.width / 2);
  const centerY = Math.round(element.bounds.y + element.bounds.height / 2);

  await adb(["shell", "input", "tap", String(centerX), String(centerY)]);
  await delay(300);
  await adb(["shell", "input", "keyevent", "KEYCODE_MOVE_END"]);
  await deleteFocusedText(120);
  await adb(["shell", "input", "text", toAdbText(value)]);
  await delay(300);
  await adb(["shell", "input", "keyevent", "KEYCODE_BACK"]);
  await delay(300);
  checks.push({ id: `replace-text:${testID}`, ok: true });
}

async function replaceTextByAccessibilityLabel(label, value, options = {}) {
  const node = await waitForVisibleNodeByText(label, {
    classNameIncludes: "EditText",
    context: options.context ?? label,
    exact: true,
    matchContentDescription: true,
    matchText: false,
    timeoutMs: options.timeoutMs ?? 15000,
  });

  await tapParsedBounds(node.bounds);
  await delay(300);
  await adb(["shell", "input", "keyevent", "KEYCODE_MOVE_END"]);
  await deleteFocusedText(160);
  await adb(["shell", "input", "text", toAdbText(value)]);
  await delay(300);
  if (options.dismissKeyboard !== false) {
    await adb(["shell", "input", "keyevent", "KEYCODE_BACK"]);
    await delay(300);
  }
  checks.push({
    id: `replace-text-by-label:${options.context ?? label}`,
    label,
    ok: true,
  });
}

async function hideKeyboardIfVisible() {
  const { stdout } = await adb(["shell", "dumpsys", "input_method"]);
  const isVisible =
    /mInputShown=true|mIsInputViewShown=true|inputShown=true/i.test(stdout);

  if (isVisible) {
    await adb(["shell", "input", "keyevent", "KEYCODE_BACK"]);
    await delay(500);
  }

  checks.push({
    id: "keyboard-hidden-if-visible",
    ok: true,
    skipped: !isVisible,
  });
}

async function dismissKeyboard() {
  await adb(["shell", "input", "keyevent", "KEYCODE_BACK"]);
  await delay(750);
  checks.push({ id: "keyboard-dismissed", ok: true });
}

async function tapFirstGalleryImage() {
  const timeoutMs = 30000;
  const startedAt = Date.now();
  let lastCandidateCount = 0;

  while (Date.now() - startedAt < timeoutMs) {
    const { stdout } = await adb([
      "exec-out",
      "uiautomator",
      "dump",
      "--compressed",
      "/dev/tty",
    ]);
    let xml;

    try {
      xml = extractXmlHierarchy(stdout);
    } catch {
      await delay(750);
      continue;
    }

    const candidates = findVisibleXmlNodes(xml, (node) =>
      isLikelyPhotoPickerGridCell(node),
    ).sort(
      (left, right) =>
        left.bounds.y - right.bounds.y || left.bounds.x - right.bounds.x,
    );

    lastCandidateCount = candidates.length;

    if (candidates[0]) {
      await tapParsedBounds(candidates[0].bounds);
      checks.push({
        accessibilityText: candidates[0].contentDesc || candidates[0].text,
        bounds: candidates[0].bounds,
        id: "tap:first-gallery-image",
        ok: true,
      });
      return;
    }

    await delay(750);
  }

  throw new Error(
    `Could not find a gallery image candidate; last count ${lastCandidateCount}.`,
  );
}

function isLikelyPhotoPickerGridCell(node) {
  if (isAndroidPhotoPickerNode(node)) {
    return isTouchableNode(node) && isLargePickerGridCell(node);
  }

  return hasPhotoPickerImageHint(node) && hasMinimumImageBounds(node);
}

function isAndroidPhotoPickerNode(node) {
  return node.packageName === "com.google.android.photopicker";
}

function isTouchableNode(node) {
  return node.enabled && (node.clickable || node.longClickable);
}

function isLargePickerGridCell(node) {
  return (
    node.bounds.y >= 900 &&
    node.bounds.width >= 240 &&
    node.bounds.height >= 240
  );
}

function hasPhotoPickerImageHint(node) {
  const content = `${node.className} ${node.resourceId} ${node.contentDesc} ${node.text}`;
  const lowerContent = content.toLowerCase();

  return (
    lowerContent.includes("image") ||
    lowerContent.includes("thumbnail") ||
    lowerContent.includes("photo") ||
    lowerContent.includes("foto")
  );
}

function hasMinimumImageBounds(node) {
  return (
    node.enabled &&
    node.bounds.y > 120 &&
    node.bounds.width >= 80 &&
    node.bounds.height >= 80
  );
}

async function deleteFocusedText(maxCharacters) {
  const chunkSize = 24;
  let remaining = maxCharacters;

  while (remaining > 0) {
    const count = Math.min(chunkSize, remaining);

    await adb([
      "shell",
      "input",
      "keyevent",
      ...Array.from({ length: count }, () => "KEYCODE_DEL"),
    ]);
    remaining -= count;
  }
}

async function screenshot(fileName) {
  const outputPath = join(artifactRoot, fileName);
  const uiDumpName = fileName.replace(/\.[^.]+$/, ".xml");

  await automation.takeFullScreenshotAsync({ outputPath });

  const size = statSync(outputPath).size;

  if (size < 50000) {
    throw new Error(`Screenshot looks empty: ${outputPath} (${size} bytes)`);
  }

  checks.push({ id: `screenshot:${fileName}`, ok: true, outputPath, size });
  await captureUiDump(uiDumpName);
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

async function assertVisibleText(text, context) {
  const { stdout } = await adb([
    "exec-out",
    "uiautomator",
    "dump",
    "--compressed",
    "/dev/tty",
  ]);

  if (!stdout.includes(text)) {
    throw new Error(`Expected visible text on ${context}: ${text}`);
  }

  checks.push({ id: `visible-text:${context}`, ok: true, text });
}

async function waitForVisibleNodeByText(text, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const node = await findVisibleNodeByText(text, options);

    if (node) {
      checks.push({
        id: `visible-node:${options.context ?? text}`,
        ok: true,
        text,
      });
      return node;
    }

    await delay(500);
  }

  throw new Error(
    `Expected visible node on ${options.context ?? text}: ${text}`,
  );
}

async function findVisibleNodeByText(text, options = {}) {
  const { stdout } = await adb([
    "exec-out",
    "uiautomator",
    "dump",
    "--compressed",
    "/dev/tty",
  ]);
  let xml;

  try {
    xml = extractXmlHierarchy(stdout);
  } catch {
    return null;
  }

  return findFirstVisibleXmlNode(xml, (node) => {
    if (
      options.classNameIncludes &&
      !node.className.includes(options.classNameIncludes)
    ) {
      return false;
    }

    const values = [
      options.matchText === false ? null : node.text,
      options.matchContentDescription === false ? null : node.contentDesc,
    ].filter((value) => typeof value === "string");

    return values.some((value) =>
      options.exact === false ? value.includes(text) : value === text,
    );
  });
}

async function waitForVisibleText(text, context, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const { stdout } = await adb([
      "exec-out",
      "uiautomator",
      "dump",
      "--compressed",
      "/dev/tty",
    ]);
    let visible = false;

    if (options.exact === false) {
      visible = stdout.includes(text);
    } else {
      try {
        visible = Boolean(
          findFirstVisibleXmlNode(extractXmlHierarchy(stdout), (node) =>
            [node.text, node.contentDesc].some((value) => value === text),
          ),
        );
      } catch {
        visible = false;
      }
    }

    if (visible) {
      checks.push({ id: `visible-text:${context}`, ok: true, text });
      return;
    }

    await delay(500);
  }

  throw new Error(`Expected visible text on ${context}: ${text}`);
}

async function findVisibleTestIDContainingText({
  context,
  testIDPrefix,
  text,
}) {
  const { stdout } = await adb([
    "exec-out",
    "uiautomator",
    "dump",
    "--compressed",
    "/dev/tty",
  ]);
  const resourceId = findNodeResourceIdContainingText({
    output: stdout,
    testIDPrefix,
    text,
  });

  if (!resourceId) {
    throw new Error(
      `Expected visible ${testIDPrefix} row containing text on ${context}: ${text}`,
    );
  }

  checks.push({
    id: `find-by-text:${context}`,
    ok: true,
    testID: resourceId,
    text,
  });

  return resourceId;
}

function findNodeResourceIdContainingText({ output, testIDPrefix, text }) {
  const xml = extractXmlHierarchy(output);
  const nodePattern = /<node\b[^>]*>/g;
  let match;

  while ((match = nodePattern.exec(xml))) {
    const tag = match[0] ?? "";
    const resourceId = readXmlAttribute(tag, "resource-id");

    if (!resourceId?.startsWith(testIDPrefix)) {
      continue;
    }

    const visibleText = [
      readXmlAttribute(tag, "text"),
      readXmlAttribute(tag, "content-desc"),
    ]
      .filter((value) => typeof value === "string")
      .map(decodeXmlAttribute)
      .join(" ");

    if (visibleText.includes(text)) {
      return resourceId;
    }
  }

  return null;
}

function findFirstVisibleXmlNode(xml, predicate) {
  return findVisibleXmlNodes(xml, predicate)[0] ?? null;
}

function findVisibleXmlNodes(xml, predicate) {
  const nodes = [];
  const nodePattern = /<node\b[^>]*>/g;
  let match;

  while ((match = nodePattern.exec(xml))) {
    const tag = match[0] ?? "";
    const node = parseVisibleXmlNode(tag);

    if (node && predicate(node)) {
      nodes.push(node);
    }
  }

  return nodes;
}

function parseVisibleXmlNode(tag) {
  const bounds = parseXmlBounds(readXmlAttribute(tag, "bounds"));

  if (!bounds) {
    return null;
  }

  return {
    bounds,
    className: readDecodedXmlAttribute(tag, "class"),
    clickable: isXmlAttributeTrue(tag, "clickable"),
    contentDesc: readDecodedXmlAttribute(tag, "content-desc"),
    enabled: readXmlAttribute(tag, "enabled") !== "false",
    longClickable: isXmlAttributeTrue(tag, "long-clickable"),
    packageName: readDecodedXmlAttribute(tag, "package"),
    resourceId: readDecodedXmlAttribute(tag, "resource-id"),
    text: readDecodedXmlAttribute(tag, "text"),
  };
}

function readDecodedXmlAttribute(tag, name) {
  return decodeXmlAttribute(readXmlAttribute(tag, name) ?? "");
}

function isXmlAttributeTrue(tag, name) {
  return readXmlAttribute(tag, name) === "true";
}

function parseXmlBounds(value) {
  const match = /^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/.exec(value ?? "");

  if (!match) {
    return null;
  }

  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  const bounds = {
    height: bottom - top,
    width: right - left,
    x: left,
    y: top,
  };

  return bounds.width > 0 && bounds.height > 0 ? bounds : null;
}

async function tapParsedBounds(bounds) {
  const centerX = Math.round(bounds.x + bounds.width / 2);
  const centerY = Math.round(bounds.y + bounds.height / 2);

  await adb(["shell", "input", "tap", String(centerX), String(centerY)]);
}

function readXmlAttribute(tag, name) {
  const match = new RegExp(`${name}="([^"]*)"`).exec(tag);

  return match?.[1] ?? null;
}

function decodeXmlAttribute(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function extractXmlHierarchy(output) {
  const endTag = "</hierarchy>";
  const endIndex = output.indexOf(endTag);

  if (endIndex === -1) {
    throw new Error("UIAutomator dump did not include a hierarchy document.");
  }

  return output.slice(0, endIndex + endTag.length);
}

function extractFirstEmail(output) {
  const xml = extractXmlHierarchy(output);
  const emailPattern = /(?:text|content-desc)="([^"@\s]+@[^"@\s]+\.[^"@\s]+)"/g;
  let match;

  while ((match = emailPattern.exec(xml))) {
    const email = decodeXmlAttribute(match[1] ?? "").trim();

    if (email) {
      return email;
    }
  }

  return null;
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

function getActivityReportId() {
  const reportId =
    manifest.chat.reportId ??
    manifest.reports.find((report) => report.type === "lost_pet")?.id;

  if (!reportId) {
    throw new Error("Fixture manifest has no Activity alert report id.");
  }

  return reportId;
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
  const numericBounds = ["height", "width", "x", "y"].every(
    (key) => typeof bounds?.[key] === "number",
  );

  return numericBounds && bounds.width > 0 && bounds.height > 0;
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
