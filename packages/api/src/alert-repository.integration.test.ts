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

  it("persists settings, location, push token, and creates one idempotent nearby delivery", async () => {
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

    const deliveryRows = await db
      .select()
      .from(AlertNotificationDelivery)
      .where(eq(AlertNotificationDelivery.reportId, reportId));

    expect(deliveryRows).toHaveLength(1);
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

  it("skips paused, unsubscribed, missing-token, owner, and out-of-radius members", async () => {
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

    expect(deliveries).toHaveLength(1);
    expect(deliveryRows.map((delivery) => delivery.memberId)).toEqual([
      "member-alert-nearby",
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
      description: "Bruno se perdio cerca de la plaza y responde a su nombre.",
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
