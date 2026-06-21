import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type * as DbClientModule from "@acme/db/client";
import type * as DbSchemaModule from "@acme/db/schema";

import type { ReportMediaRepository } from "./report-media-repository";
import type { ReportRepository } from "./report-repository";

const execFileAsync = promisify(execFile);
const runIntegration =
  process.env.RASTRO_DB_INTEGRATION === "1" && process.env.POSTGRES_URL;

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
    const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

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
});
