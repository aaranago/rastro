import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type * as DbClientModule from "@acme/db/client";
import { eq } from "@acme/db";
import {
  AlertNotificationDelivery,
  Report,
  ReportLocation,
  user,
} from "@acme/db/schema";

import type {
  AlertRepository,
  createDrizzleAlertRepository,
} from "./alert-repository";
import { dispatchPendingAlertDeliveries } from "./alert-delivery-dispatcher";

const execFileAsync = promisify(execFile);
const runIntegration =
  process.env.RASTRO_DB_INTEGRATION === "1" && process.env.POSTGRES_URL;
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

function databaseUrlFor(databaseName: string) {
  const url = new URL(
    process.env.POSTGRES_URL?.replace(":6543", ":5432") ?? "",
  );
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll(`"`, `""`)}"`;
}

const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("alert repository integration", () => {
  let db: DbClientModule.Database;
  let pool: { end: () => Promise<void> } | null = null;
  let repository: AlertRepository;
  let createAlertRepository: typeof createDrizzleAlertRepository;
  let tempDatabaseName = "";
  let currentTime = new Date("2026-07-01T12:00:00.000Z");
  const originalPostgresUrl = process.env.POSTGRES_URL;

  beforeAll(async () => {
    tempDatabaseName = `rastro_alert_test_${Date.now()}`;
    const admin = new Client({
      connectionString: databaseUrlFor("postgres"),
    });
    await admin.connect();
    await admin.query(`CREATE DATABASE ${quoteIdentifier(tempDatabaseName)}`);
    await admin.end();

    const tempDatabaseUrl = databaseUrlFor(tempDatabaseName);
    await execFileAsync(
      "pnpm",
      ["-F", "@acme/db", "exec", "drizzle-kit", "migrate"],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          POSTGRES_URL: tempDatabaseUrl,
        },
        timeout: 60_000,
      },
    );

    process.env.POSTGRES_URL = tempDatabaseUrl;

    const dbClientModule = await import("@acme/db/client");
    const alertRepositoryModule = await import("./alert-repository");

    db = dbClientModule.db;
    pool = dbClientModule.pool;
    createAlertRepository = alertRepositoryModule.createDrizzleAlertRepository;
    repository = createAlertRepository(db, { now: () => currentTime });

    await db.insert(user).values([
      {
        email: "owner-alert-test@example.invalid",
        id: "member-alert-owner",
        name: "Owner",
      },
      {
        email: "nearby-alert-test@example.invalid",
        id: "member-alert-nearby",
        name: "Nearby",
      },
      {
        email: "missing-token-alert-test@example.invalid",
        id: "member-alert-missing-token",
        name: "Missing Token",
      },
      {
        email: "paused-alert-test@example.invalid",
        id: "member-alert-paused",
        name: "Paused",
      },
      {
        email: "unsubscribed-alert-test@example.invalid",
        id: "member-alert-unsubscribed",
        name: "Unsubscribed",
      },
      {
        email: "far-alert-test@example.invalid",
        id: "member-alert-far",
        name: "Far",
      },
      {
        email: "dispatch-alert-test@example.invalid",
        id: "member-alert-dispatch",
        name: "Dispatch",
      },
      {
        email: "disabled-token-alert-test@example.invalid",
        id: "member-alert-disabled-token",
        name: "Disabled Token",
      },
    ]);
  }, 90_000);

  afterAll(async () => {
    process.env.POSTGRES_URL = originalPostgresUrl;
    await pool?.end();

    if (!tempDatabaseName) {
      return;
    }

    const admin = new Client({
      connectionString: databaseUrlFor("postgres"),
    });
    await admin.connect();
    await admin.query(
      `DROP DATABASE IF EXISTS ${quoteIdentifier(tempDatabaseName)} WITH (FORCE)`,
    );
    await admin.end();
  }, 30_000);

  it("persists settings, location, push token, and dispatches one idempotent nearby delivery", async () => {
    currentTime = new Date("2026-07-01T12:00:00.000Z");
    await repository.upsertSettings({
      categories: ["lost_pet"],
      memberId: "member-alert-nearby",
      radiusMeters: 5000,
    });
    await repository.recordLocation({
      latitude: -16.510231,
      longitude: -68.123881,
      memberId: "member-alert-nearby",
      label: "Sopocachi, La Paz",
      locationCell: "bo-lpb-sopocachi",
    });
    const token = await repository.registerPushToken({
      memberId: "member-alert-nearby",
      platform: "ios",
      token: "ExponentPushToken[nearby_123]",
    });
    const reportId = await createLostPetReport({
      createdAt: new Date("2026-07-01T11:00:00.000Z"),
      id: "11111111-1111-4111-8111-000000000101",
    });

    const first = await repository.createLostPetReportCreatedDeliveries({
      reportId,
    });
    const second = await repository.createLostPetReportCreatedDeliveries({
      reportId,
    });
    const state = await repository.get({ memberId: "member-alert-nearby" });

    expect(first).toEqual([
      expect.objectContaining({
        pushTokenId: token.id,
        reportId,
        status: "pending",
        title: "Mascota perdida cerca de ti",
      }),
    ]);
    expect(second).toEqual([]);
    expect(state.subscription).toMatchObject({
      categories: ["lost_pet"],
      radiusMeters: 5000,
      status: "active",
    });
    expect(state.pushTokens.map((pushToken) => pushToken.token)).toEqual([
      "ExponentPushToken[nearby_123]",
    ]);

    const sentMessages: { to: string; reportId: string }[] = [];
    currentTime = new Date("2026-07-01T12:01:00.000Z");
    const dispatchResult = await dispatchPendingAlertDeliveries({
      alertRepository: repository,
      limit: 10,
      pushClient: {
        send: (messages) => {
          sentMessages.push(
            ...messages.map((message) => ({
              reportId:
                message.data.type === "alert_delivery"
                  ? message.data.reportId
                  : "",
              to: message.to,
            })),
          );

          return Promise.resolve(
            messages.map((_, index) => ({
              id: `expo-alert-ticket-${index}`,
              status: "ok" as const,
            })),
          );
        },
      },
    });

    expect(dispatchResult).toEqual({
      failed: 0,
      pending: 1,
      requested: 1,
      sent: 1,
      skipped: 0,
    });
    expect(sentMessages).toEqual([
      {
        reportId,
        to: "ExponentPushToken[nearby_123]",
      },
    ]);

    const deliveryRows = await db
      .select()
      .from(AlertNotificationDelivery)
      .where(eq(AlertNotificationDelivery.reportId, reportId));

    expect(deliveryRows).toHaveLength(1);
    expect(deliveryRows[0]).toMatchObject({
      pushTokenId: token.id,
      sentAt: new Date("2026-07-01T12:01:00.000Z"),
      status: "sent",
    });
  });

  it("does not create deliveries for reports older than 24 hours", async () => {
    currentTime = new Date("2026-07-01T12:00:00.000Z");
    const reportId = await createLostPetReport({
      createdAt: new Date("2026-06-30T11:59:59.000Z"),
      id: "11111111-1111-4111-8111-000000000102",
    });

    await expect(
      repository.createLostPetReportCreatedDeliveries({ reportId }),
    ).resolves.toEqual([]);
  });

  it("skips dispatch when a matching subscriber only has a disabled push token", async () => {
    currentTime = new Date("2026-07-01T12:10:00.000Z");
    await configureNearbySubscription("member-alert-disabled-token");
    const token = await repository.registerPushToken({
      memberId: "member-alert-disabled-token",
      platform: "android",
      token: "ExponentPushToken[disabled_123]",
    });
    await repository.disablePushToken({ pushTokenId: token.id });
    const reportId = await createLostPetReport({
      createdAt: new Date("2026-07-01T12:09:00.000Z"),
      id: "11111111-1111-4111-8111-000000000108",
    });

    const deliveries = await repository.createLostPetReportCreatedDeliveries({
      reportId,
    });
    let pushClientWasCalled = false;
    currentTime = new Date("2026-07-01T12:11:00.000Z");
    const dispatchResult = await dispatchPendingAlertDeliveries({
      alertRepository: repository,
      limit: 10,
      pushClient: {
        send: () => {
          pushClientWasCalled = true;
          return Promise.resolve([]);
        },
      },
    });
    await repository.unsubscribe({ memberId: "member-alert-disabled-token" });

    expect(deliveries).toEqual([
      expect.objectContaining({
        pushTokenId: null,
        reportId,
        status: "pending",
      }),
    ]);
    expect(dispatchResult).toEqual({
      failed: 0,
      pending: 1,
      requested: 0,
      sent: 0,
      skipped: 1,
    });
    expect(pushClientWasCalled).toBe(false);

    const [deliveryRow] = await db
      .select()
      .from(AlertNotificationDelivery)
      .where(eq(AlertNotificationDelivery.reportId, reportId));

    expect(deliveryRow).toMatchObject({
      failureReason: "No hay un token push activo para este miembro.",
      pushTokenId: null,
      status: "skipped",
    });
  });

  it("creates history for missing-token subscribers and skips paused, unsubscribed, owner, and out-of-radius members", async () => {
    currentTime = new Date("2026-07-01T12:00:00.000Z");
    await Promise.all([
      configureNearbySubscription("member-alert-missing-token"),
      configureNearbySubscription("member-alert-paused"),
      configureNearbySubscription("member-alert-unsubscribed"),
      configureNearbySubscription("member-alert-owner"),
      repository.upsertSettings({
        categories: ["lost_pet"],
        memberId: "member-alert-far",
        radiusMeters: 1000,
      }),
    ]);
    await repository.recordLocation({
      latitude: -17.783333,
      longitude: -63.182222,
      memberId: "member-alert-far",
      label: "Santa Cruz",
      locationCell: "bo-scz-santa-cruz-de-la-sierra",
    });
    await Promise.all([
      repository.registerPushToken({
        memberId: "member-alert-paused",
        platform: "android",
        token: "ExponentPushToken[paused_123]",
      }),
      repository.registerPushToken({
        memberId: "member-alert-unsubscribed",
        platform: "android",
        token: "ExponentPushToken[unsubscribed_123]",
      }),
      repository.registerPushToken({
        memberId: "member-alert-owner",
        platform: "android",
        token: "ExponentPushToken[owner_123]",
      }),
      repository.registerPushToken({
        memberId: "member-alert-far",
        platform: "android",
        token: "ExponentPushToken[far_123]",
      }),
    ]);
    await repository.pause({
      memberId: "member-alert-paused",
      pausedUntil: "2026-07-01T13:00:00.000Z",
    });
    await repository.unsubscribe({ memberId: "member-alert-unsubscribed" });
    const reportId = await createLostPetReport({
      createdAt: new Date("2026-07-01T11:30:00.000Z"),
      id: "11111111-1111-4111-8111-000000000103",
    });

    const deliveries = await repository.createLostPetReportCreatedDeliveries({
      reportId,
    });
    const deliveryRows = await db
      .select()
      .from(AlertNotificationDelivery)
      .where(eq(AlertNotificationDelivery.reportId, reportId));

    expect(deliveries).toHaveLength(2);
    const projectedDeliveryRows = deliveryRows
      .map((delivery) => ({
        memberId: delivery.memberId,
        pushTokenId: delivery.pushTokenId,
      }))
      .sort((left, right) => left.memberId.localeCompare(right.memberId));

    expect(projectedDeliveryRows.map((delivery) => delivery.memberId)).toEqual([
      "member-alert-missing-token",
      "member-alert-nearby",
    ]);
    expect(projectedDeliveryRows[0]?.pushTokenId).toBeNull();
    expect(projectedDeliveryRows[1]?.pushTokenId).toEqual(expect.any(String));
  });

  it("hydrates pending deliveries with a push token registered after alert matching", async () => {
    currentTime = new Date("2026-07-01T13:30:00.000Z");
    await configureNearbySubscription("member-alert-missing-token");
    const reportId = await createLostPetReport({
      createdAt: new Date("2026-07-01T13:25:00.000Z"),
      id: "11111111-1111-4111-8111-000000000107",
    });

    await repository.createLostPetReportCreatedDeliveries({ reportId });

    const deliveryRows = await db
      .select()
      .from(AlertNotificationDelivery)
      .where(eq(AlertNotificationDelivery.reportId, reportId));
    const missingTokenDelivery = deliveryRows.find(
      (delivery) => delivery.memberId === "member-alert-missing-token",
    );

    expect(missingTokenDelivery?.pushTokenId).toBeNull();

    await repository.registerPushToken({
      memberId: "member-alert-missing-token",
      platform: "android",
      token: "ExponentPushToken[late_missing_token_123]",
    });

    const pending = await repository.listPendingDeliveries({ limit: 500 });

    expect(
      pending.find((delivery) => delivery.id === missingTokenDelivery?.id)
        ?.pushToken?.token,
    ).toBe("ExponentPushToken[late_missing_token_123]");
  });

  it("lists pending deliveries, transitions dispatch statuses, disables tokens, and returns member history newest first", async () => {
    currentTime = new Date("2026-07-01T14:00:00.000Z");
    await repository.upsertSettings({
      categories: ["lost_pet"],
      memberId: "member-alert-nearby",
      radiusMeters: 5000,
    });
    await repository.unsubscribe({ memberId: "member-alert-nearby" });
    await repository.unsubscribe({ memberId: "member-alert-missing-token" });
    await configureNearbySubscription("member-alert-dispatch");
    const token = await repository.registerPushToken({
      memberId: "member-alert-dispatch",
      platform: "ios",
      token: "ExponentPushToken[dispatch_123]",
    });
    const sentReportId = await createLostPetReport({
      createdAt: new Date("2026-07-01T13:50:00.000Z"),
      id: "11111111-1111-4111-8111-000000000104",
    });
    const failedReportId = await createLostPetReport({
      createdAt: new Date("2026-07-01T13:51:00.000Z"),
      id: "11111111-1111-4111-8111-000000000105",
    });
    const skippedReportId = await createLostPetReport({
      createdAt: new Date("2026-07-01T13:52:00.000Z"),
      id: "11111111-1111-4111-8111-000000000106",
    });
    const [sentDelivery] =
      await repository.createLostPetReportCreatedDeliveries({
        reportId: sentReportId,
      });
    const [failedDelivery] =
      await repository.createLostPetReportCreatedDeliveries({
        reportId: failedReportId,
      });
    const [skippedDelivery] =
      await repository.createLostPetReportCreatedDeliveries({
        reportId: skippedReportId,
      });

    if (!sentDelivery || !failedDelivery || !skippedDelivery) {
      throw new Error("Expected dispatch test deliveries to be created.");
    }

    const pending = await repository.listPendingDeliveries({ limit: 20 });
    const pendingSentDelivery = pending.find(
      (delivery) => delivery.id === sentDelivery.id,
    );

    expect(pendingSentDelivery?.pushToken?.token).toBe(
      "ExponentPushToken[dispatch_123]",
    );

    currentTime = new Date("2026-07-01T14:01:00.000Z");
    await expect(
      repository.markDeliverySent({ deliveryId: sentDelivery.id }),
    ).resolves.toMatchObject({
      sentAt: "2026-07-01T14:01:00.000Z",
      status: "sent",
    });

    currentTime = new Date("2026-07-01T14:02:00.000Z");
    await expect(
      repository.markDeliveryFailed({
        deliveryId: failedDelivery.id,
        reason: "Expo rechazo la notificacion: token invalido.",
      }),
    ).resolves.toMatchObject({
      failedAt: "2026-07-01T14:02:00.000Z",
      failureReason: "Expo rechazo la notificacion: token invalido.",
      status: "failed",
    });

    currentTime = new Date("2026-07-01T14:03:00.000Z");
    await expect(
      repository.markDeliverySkipped({
        deliveryId: skippedDelivery.id,
        reason: "No hay un token push activo para este miembro.",
      }),
    ).resolves.toMatchObject({
      failureReason: "No hay un token push activo para este miembro.",
      status: "skipped",
    });
    await expect(
      repository.markDeliverySent({ deliveryId: skippedDelivery.id }),
    ).resolves.toBeNull();
    await expect(
      repository.disablePushToken({ pushTokenId: token.id }),
    ).resolves.toMatchObject({
      disabledAt: "2026-07-01T14:03:00.000Z",
      id: token.id,
    });

    const history = await repository.listMemberDeliveryHistory({
      limit: 3,
      memberId: "member-alert-dispatch",
    });

    expect(history.map((delivery) => delivery.reportId)).toEqual([
      skippedReportId,
      failedReportId,
      sentReportId,
    ]);
  });

  async function configureNearbySubscription(memberId: string) {
    await repository.upsertSettings({
      categories: ["lost_pet"],
      memberId,
      radiusMeters: 5000,
    });
    await repository.recordLocation({
      latitude: -16.510231,
      longitude: -68.123881,
      memberId,
      label: "Sopocachi, La Paz",
      locationCell: "bo-lpb-sopocachi",
    });
  }

  async function createLostPetReport(input: { createdAt: Date; id: string }) {
    await db.insert(Report).values({
      caretakerId: "member-alert-owner",
      color: "marron",
      contactPreference: "in_app_chat",
      createdAt: input.createdAt,
      description: "Bruno se perdió cerca de la plaza y responde a su nombre.",
      eventOccurredAt: input.createdAt,
      id: input.id,
      idempotencyKey: input.id,
      petName: "Bruno",
      species: "dog",
      status: "active",
      title: "Bruno perdido en Sopocachi",
      type: "lost_pet",
      updatedAt: input.createdAt,
    });
    await db.insert(ReportLocation).values({
      city: "La Paz",
      department: "La Paz",
      exactLatitude: -16.5102,
      exactLongitude: -68.1239,
      exactPoint: {
        x: -68.1239,
        y: -16.5102,
      },
      label: "Sopocachi, La Paz",
      locationCell: "bo-lpb-sopocachi",
      publicLatitude: -16.5102,
      publicLongitude: -68.1239,
      publicPoint: {
        x: -68.1239,
        y: -16.5102,
      },
      publicPrecision: "exact",
      reportId: input.id,
      updatedAt: input.createdAt,
    });

    return input.id;
  }
});
