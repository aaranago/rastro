import { describe, expect, it } from "vitest";

import type { AdminMediaAssetPurpose, AdminMediaAssetStatus } from "@acme/validators";

import {
  buildAdminMediaObjectKey,
  createDrizzleAdminMediaRepository,
} from "./admin-media-repository";

interface AdminMediaAssetRow {
  canonicalUrl: string | null;
  createdAt: Date;
  createdByAdminId: string | null;
  expectedChecksumSha256: string | null;
  expiresAt: Date;
  failedAt: Date | null;
  height: number;
  id: string;
  mimeType: string;
  objectKey: string;
  purpose: AdminMediaAssetPurpose;
  removedAt: Date | null;
  sizeBytes: number;
  status: AdminMediaAssetStatus;
  updatedAt: Date;
  verifiedAt: Date | null;
  width: number;
}

describe("admin media repository", () => {
  it("builds admin media object keys separately from report upload sessions", () => {
    expect(
      buildAdminMediaObjectKey({
        adminId: "admin/la-paz",
        assetId: "11111111-1111-4111-8111-111111111111",
        mimeType: "image/webp",
        purpose: "provider_logo",
      }),
    ).toBe(
      "admin-media/admin-la-paz/provider_logo/11111111-1111-4111-8111-111111111111/original.webp",
    );
  });

  it("creates, marks ready, refreshes, and removes admin media assets", async () => {
    const rows = new Map<string, AdminMediaAssetRow>();
    const repository = createDrizzleAdminMediaRepository(
      createFakeAdminMediaDb(rows) as never,
      {
        deliveryBaseUrl: "https://cdn.rastro.bo/media",
        now: () => new Date("2026-07-15T12:00:00.000Z"),
        uploadSessionExpiresInSeconds: 300,
      },
    );

    const created = await repository.createUploadSession({
      adminId: "member-admin-la-paz",
      metadata: {
        height: 900,
        mimeType: "image/webp",
        purpose: "provider_logo",
        sizeBytes: 300_000,
        width: 1200,
      },
    });

    expect(created).toMatchObject({
      createdByAdminId: "member-admin-la-paz",
      expectedHeight: 900,
      expectedMimeType: "image/webp",
      expectedSizeBytes: 300_000,
      expectedWidth: 1200,
      purpose: "provider_logo",
      status: "pending",
    });
    expect(created.objectKey).toContain("admin-media/");
    expect(created.objectKey).not.toContain("report-media");

    const ready = await repository.markAssetReady({
      assetId: created.id,
      verifiedAt: new Date("2026-07-15T12:02:00.000Z"),
    });

    expect(ready).toMatchObject({
      deliveryUrl: `https://cdn.rastro.bo/media/${created.objectKey}`,
      status: "ready",
    });

    await repository.markAssetFailed({
      assetId: created.id,
      failedAt: new Date("2026-07-15T12:03:00.000Z"),
    });
    const refreshed = await repository.refreshUploadSession({
      assetId: created.id,
    });

    expect(refreshed).toMatchObject({
      status: "pending",
    });
    expect(rows.get(created.id)?.failedAt).toBeNull();

    const removed = await repository.markAssetRemoved({
      assetId: created.id,
      removedAt: new Date("2026-07-15T12:04:00.000Z"),
    });

    expect(removed.status).toBe("removed");
  });
});

function createFakeAdminMediaDb(rows: Map<string, AdminMediaAssetRow>) {
  return {
    insert: () => ({
      values(value: Partial<AdminMediaAssetRow> & { id: string }) {
        return {
          returning: () => {
            const now = new Date("2026-07-15T12:00:00.000Z");
            const row: AdminMediaAssetRow = {
              canonicalUrl: value.canonicalUrl ?? null,
              createdAt: now,
              createdByAdminId: value.createdByAdminId ?? null,
              expectedChecksumSha256: value.expectedChecksumSha256 ?? null,
              expiresAt: value.expiresAt ?? now,
              failedAt: null,
              height: value.height ?? 0,
              id: value.id,
              mimeType: value.mimeType ?? "image/webp",
              objectKey: value.objectKey ?? "",
              purpose: value.purpose ?? "provider_logo",
              removedAt: null,
              sizeBytes: value.sizeBytes ?? 0,
              status: value.status ?? "pending",
              updatedAt: now,
              verifiedAt: null,
              width: value.width ?? 0,
            };

            rows.set(row.id, row);

            return Promise.resolve([row]);
          },
        };
      },
    }),
    query: {
      AdminMediaAsset: {
        findFirst: () => Promise.resolve([...rows.values()][0] ?? null),
      },
    },
    update: () => ({
      set(update: Partial<AdminMediaAssetRow>) {
        return {
          where: () => ({
            returning: () => {
              const row = [...rows.values()][0];

              if (!row) {
                return Promise.resolve([]);
              }

              const updated = {
                ...row,
                ...update,
                updatedAt: new Date("2026-07-15T12:00:00.000Z"),
              };

              rows.set(row.id, updated);

              return Promise.resolve([updated]);
            },
          }),
        };
      },
    }),
  };
}
