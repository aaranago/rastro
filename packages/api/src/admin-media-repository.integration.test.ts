import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type * as DbClientModule from "@acme/db/client";
import { eq } from "@acme/db";
import * as schema from "@acme/db/schema";

import { createDrizzleAdminMediaRepository } from "./admin-media-repository";

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

describeIntegration("admin media repository integration", () => {
  let db: DbClientModule.Database;
  let pool: { end: () => Promise<void> } | null = null;
  let tempDatabaseName = "";
  const originalPostgresUrl = process.env.POSTGRES_URL;

  beforeAll(async () => {
    tempDatabaseName = `rastro_admin_media_test_${Date.now()}`;
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
    db = dbClientModule.db;
    pool = dbClientModule.pool;
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

  it("creates admin media upload sessions against migrated Postgres", async () => {
    const repository = createDrizzleAdminMediaRepository(db, {
      deliveryBaseUrl: "https://cdn.rastro.bo/media",
      now: () => new Date("2026-07-15T12:00:00.000Z"),
      uploadSessionExpiresInSeconds: 300,
    });

    await db.insert(schema.user).values({
      email: "admin-media-test@example.invalid",
      id: "member-admin-media-integration",
      name: "Admin Rastro",
    });

    const created = await repository.createUploadSession({
      adminId: "member-admin-media-integration",
      metadata: {
        height: 900,
        mimeType: "image/webp",
        purpose: "provider_logo",
        sizeBytes: 300_000,
        width: 1200,
      },
    });

    expect(created).toMatchObject({
      createdByAdminId: "member-admin-media-integration",
      expectedHeight: 900,
      expectedMimeType: "image/webp",
      expectedSizeBytes: 300_000,
      expectedWidth: 1200,
      purpose: "provider_logo",
      status: "pending",
    });
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);
    expect(created.expiresAt.toISOString()).toBe("2026-07-15T12:05:00.000Z");
    expect(created.objectKey).toMatch(
      /^admin-media\/member-admin-media-integration\/provider_logo\/.+\/original\.webp$/,
    );

    const stored = await db.query.AdminMediaAsset.findFirst({
      where: eq(schema.AdminMediaAsset.id, created.id),
    });

    expect(stored).toMatchObject({
      createdByAdminId: "member-admin-media-integration",
      purpose: "provider_logo",
      status: "pending",
    });
  });
});
