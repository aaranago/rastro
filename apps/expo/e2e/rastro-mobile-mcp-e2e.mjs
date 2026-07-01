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

await grantAndroidRuntimePermissions();
await openDevelopmentBuild();
const memberEmail = await verifyMemberProfileSettingsWorkflow();
await verifyResourcesDirectory();
await verifyProviderProfile({ memberEmail });
await verifyReportDetails();
const latestChatMessageText = await verifyChatWorkflow();
await verifyAlertSubscriptionWorkflow();
await verifyActivityInboxWorkflow({ latestChatMessageText });

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

async function verifyMemberProfileSettingsWorkflow() {
  const displayName = `Rastro E2E Vecina ${Date.now()}`;
  const phone = "59170123456";
  const whatsapp = "59171234567";
  const memberEmail = await readCurrentProfileEmail();

  await openDeepLinkUntilVisible(
    [
      "rastro:///perfil/ajustes",
      "rastro://perfil/ajustes",
      "rastro:///(tabs)/(profile)/ajustes",
      "rastro://(tabs)/(profile)/ajustes",
    ],
    "member-profile-settings-screen",
  );
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

  await openDeepLinkUntilVisible(
    [
      "rastro:///perfil",
      "rastro://perfil",
      "rastro:///(tabs)/(profile)",
      "rastro://(tabs)/(profile)",
    ],
    "profile-screen",
  );
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

async function readCurrentProfileEmail() {
  await openDeepLinkUntilVisible(
    [
      "rastro:///perfil",
      "rastro://perfil",
      "rastro:///(tabs)/(profile)",
      "rastro://(tabs)/(profile)",
    ],
    "profile-screen",
  );

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

  throw new Error("Could not read the current signed-in member email.");
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
  await screenshot("chat-workflow.png");
  await assertVisibleText(messageText, "chat-sent-message");

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

async function grantAndroidRuntimePermissions() {
  if (platform !== "android") {
    return;
  }

  const permissions = [
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
    "android.permission.POST_NOTIFICATIONS",
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

    if (stdout.includes(text)) {
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
