import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type * as DbClientModule from "@acme/db/client";
import type * as DbSchemaModule from "@acme/db/schema";

import type { ReportMediaRepository } from "./report-media-repository";
import type { ReportRepository } from "./report-repository";

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

async function runMigrationSql(client: Client, migrationPath: string) {
  const migrationSql = await readFile(migrationPath, "utf8");
  const statements = migrationSql
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await client.query(statement);
  }
}

const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("report repository integration", () => {
  let db: DbClientModule.Database;
  let pool: { end: () => Promise<void> } | null = null;
  let mediaRepository: ReportMediaRepository;
  let repository: ReportRepository;
  let user: typeof DbSchemaModule.user;
  let tempDatabaseName = "";
  const originalPostgresUrl = process.env.POSTGRES_URL;

  beforeAll(async () => {
    tempDatabaseName = `rastro_report_test_${Date.now()}`;
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
    const dbSchemaModule = await import("@acme/db/schema");
    const reportMediaRepositoryModule = await import(
      "./report-media-repository"
    );
    const reportRepositoryModule = await import("./report-repository");

    db = dbClientModule.db;
    pool = dbClientModule.pool;
    user = dbSchemaModule.user;
    mediaRepository =
      reportMediaRepositoryModule.createDrizzleReportMediaRepository(db);
    repository = reportRepositoryModule.createDrizzleReportRepository(db);

    await db.insert(user).values({
      email: "camila-report-test@example.invalid",
      id: "member-report-integration",
      name: "Camila",
    });
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

  it("persists reports, queries nearby, replaces media, and applies lifecycle changes", async () => {
    const createReadyMedia = async (sizeBytes: number, draftId: string) => {
      const pendingMedia = await mediaRepository.createUploadSession({
        metadata: {
          draftId,
          height: 900,
          mimeType: "image/webp",
          reportType: "sighting",
          sizeBytes,
          width: 1200,
        },
        ownerId: "member-report-integration",
      });

      return mediaRepository.markUploadSessionReady({
        mediaId: pendingMedia.id,
        verifiedAt: new Date("2026-06-20T01:31:00.000Z"),
      });
    };
    const firstMedia = await createReadyMedia(
      300_000,
      "sighting-integration-2026-06-20",
    );
    const input = {
      contact: {
        preference: "in_app_chat",
      },
      description:
        "Perro mediano caminando solo cerca de la plaza. No pude asegurarlo.",
      eventOccurredAt: "2026-06-20T01:30:00.000Z",
      idempotencyKey: "sighting-integration-2026-06-20",
      location: {
        exactLatitude: -16.510231,
        exactLongitude: -68.123881,
        exposeExactLocation: false,
        label: "Sopocachi, La Paz",
        locationCell: "bo-lpb-sopocachi",
      },
      media: [
        {
          altText: "Perro marron",
          mediaId: firstMedia.id,
        },
      ],
      pet: {
        color: "marron",
        size: "mediano",
        species: "dog",
      },
      title: "Perro visto cerca de Sopocachi",
      type: "sighting",
    } satisfies Parameters<ReportRepository["create"]>[0]["report"];

    const [created, duplicate] = await Promise.all([
      repository.create({
        caretakerId: "member-report-integration",
        report: input,
      }),
      repository.create({
        caretakerId: "member-report-integration",
        report: input,
      }),
    ]);

    expect(duplicate.id).toBe(created.id);
    expect(created.location).toMatchObject({
      precision: "approximate",
      publicLatitude: -16.51,
      publicLongitude: -68.12,
    });

    const detail = await repository.findById(created.id);
    expect(detail?.media).toHaveLength(1);

    const nearby = await repository.nearby({
      latitude: -16.51,
      limit: 10,
      longitude: -68.12,
      radiusMeters: 5000,
      types: ["sighting"],
    });
    expect(nearby.map((report) => report.id)).toContain(created.id);

    const secondMedia = await createReadyMedia(301_000, created.id);
    await repository.update({
      actorId: "member-report-integration",
      patch: {
        id: created.id,
        media: [
          {
            mediaId: secondMedia.id,
          },
        ],
      },
      reportId: created.id,
    });
    const thirdMedia = await createReadyMedia(302_000, created.id);
    const updatedAgain = await repository.update({
      actorId: "member-report-integration",
      patch: {
        id: created.id,
        media: [
          {
            mediaId: thirdMedia.id,
          },
        ],
      },
      reportId: created.id,
    });
    expect(updatedAgain.media).toHaveLength(1);
    expect(updatedAgain.media[0]?.objectKey).toBe(thirdMedia.objectKey);

    const resolved = await repository.resolve({
      actorId: "member-report-integration",
      outcome: "reunited",
      reportId: created.id,
    });
    expect(resolved).toMatchObject({
      outcome: "reunited",
      status: "closed",
    });

    await expect(
      repository.delete({
        actorId: "member-report-integration",
        reportId: created.id,
      }),
    ).resolves.toEqual({
      deleted: true,
      id: created.id,
    });
  }, 90_000);

  it("persists an authenticated no-photo sighting report", async () => {
    const input = {
      contact: {
        preference: "in_app_chat",
      },
      description:
        "Perro mediano caminando solo cerca de la plaza. No pude asegurarlo.",
      eventOccurredAt: "2026-06-22T20:45:00.000Z",
      idempotencyKey: "sighting-report-android-no-media",
      location: {
        exactLatitude: -16.510231,
        exactLongitude: -68.123881,
        exposeExactLocation: false,
        label: "Sopocachi, La Paz",
        locationCell: "bo-lpb-sopocachi",
      },
      media: [],
      pet: {
        color: "marron",
        size: "mediano",
        species: "dog",
      },
      title: "Perro visto cerca de Sopocachi",
      type: "sighting",
    } satisfies Parameters<ReportRepository["create"]>[0]["report"];

    const created = await repository.create({
      caretakerId: "member-report-integration",
      report: input,
    });

    expect(created).toMatchObject({
      idempotencyKey: "sighting-report-android-no-media",
      type: "sighting",
      media: [],
      location: {
        label: "Sopocachi, La Paz",
        precision: "approximate",
        publicLatitude: -16.51,
        publicLongitude: -68.12,
      },
    });

    const duplicate = await repository.create({
      caretakerId: "member-report-integration",
      report: input,
    });
    expect(duplicate.id).toBe(created.id);
  });

  it("returns failed upload sessions for cleanup after rejected metadata", async () => {
    const pendingMedia = await mediaRepository.createUploadSession({
      metadata: {
        draftId: "failed-media-cleanup-draft",
        height: 900,
        mimeType: "image/webp",
        reportType: "lost_pet",
        sizeBytes: 300_000,
        width: 1200,
      },
      ownerId: "member-report-integration",
    });
    const failedMedia = await mediaRepository.markUploadSessionFailed({
      failedAt: new Date("2026-06-21T18:12:00.000Z"),
      mediaId: pendingMedia.id,
    });

    const abandoned = await mediaRepository.findAbandonedUploadSessions({
      expiredBefore: new Date("2026-06-21T19:00:00.000Z"),
      limit: 20,
    });

    expect(abandoned).toContainEqual(
      expect.objectContaining({
        id: failedMedia.id,
        objectKey: failedMedia.objectKey,
        status: "failed",
      }),
    );
  });
});

describeIntegration(
  "report repository against legacy report media schema",
  () => {
    let tempDatabaseName = "";
    let pool: { end: () => Promise<void> } | null = null;
    let repository: ReportRepository;
    const originalPostgresUrl = process.env.POSTGRES_URL;

    beforeAll(async () => {
      tempDatabaseName = `rastro_report_legacy_test_${Date.now()}`;
      const admin = new Client({
        connectionString: databaseUrlFor("postgres"),
      });
      await admin.connect();
      await admin.query(`CREATE DATABASE ${quoteIdentifier(tempDatabaseName)}`);
      await admin.end();

      const tempDatabaseUrl = databaseUrlFor(tempDatabaseName);
      const client = new Client({ connectionString: tempDatabaseUrl });
      await client.connect();
      await runMigrationSql(
        client,
        `${repoRoot}/packages/db/drizzle/20260620013433_initial_report_core.sql`,
      );
      await client.query(`DROP INDEX "report_caretaker_idempotency_key_idx"`);
      await client.end();

      process.env.POSTGRES_URL = tempDatabaseUrl;
      vi.resetModules();
      delete (globalThis as { rastroPgPool?: unknown }).rastroPgPool;

      const dbClientModule = await import("@acme/db/client");
      const dbSchemaModule = await import("@acme/db/schema");
      const reportRepositoryModule = await import("./report-repository");

      pool = dbClientModule.pool;
      const db = dbClientModule.db;
      repository = reportRepositoryModule.createDrizzleReportRepository(db);

      await db.insert(dbSchemaModule.user).values({
        email: "camila-report-legacy-test@example.invalid",
        id: "member-report-legacy",
        name: "Camila",
      });
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

    it("persists a no-photo sighting without selecting upload-session media columns", async () => {
      const input = {
        contact: {
          preference: "in_app_chat",
        },
        description:
          "Perro mediano caminando solo cerca de la plaza. No pude asegurarlo.",
        eventOccurredAt: "2026-06-22T20:45:00.000Z",
        idempotencyKey: "sighting-report-legacy-no-media",
        location: {
          exactLatitude: -16.510231,
          exactLongitude: -68.123881,
          exposeExactLocation: false,
          label: "Sopocachi, La Paz",
          locationCell: "bo-lpb-sopocachi",
        },
        media: [],
        pet: {
          color: "marron",
          size: "mediano",
          species: "dog",
        },
        title: "Perro visto cerca de Sopocachi",
        type: "sighting",
      } satisfies Parameters<ReportRepository["create"]>[0]["report"];

      const created = await repository.create({
        caretakerId: "member-report-legacy",
        report: input,
      });

      expect(created).toMatchObject({
        idempotencyKey: "sighting-report-legacy-no-media",
        media: [],
        type: "sighting",
      });
    });
  },
);
