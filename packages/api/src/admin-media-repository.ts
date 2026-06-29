import { randomUUID } from "node:crypto";

import type { Database } from "@acme/db/client";
import type {
  AdminMediaAssetPurpose,
  AdminMediaAssetStatus,
  CreateAdminMediaUploadSessionInput,
} from "@acme/validators";
import { and, eq, or } from "@acme/db";
import { AdminMediaAsset } from "@acme/db/schema";

import { buildMediaDeliveryUrl } from "./media-storage";

export interface PersistedAdminMediaAsset {
  createdAt: Date;
  createdByAdminId: string | null;
  deliveryUrl: string | null;
  expectedChecksumSha256: string | null;
  expectedHeight: number;
  expectedMimeType: string;
  expectedSizeBytes: number;
  expectedWidth: number;
  expiresAt: Date;
  id: string;
  objectKey: string;
  purpose: AdminMediaAssetPurpose;
  status: AdminMediaAssetStatus;
  updatedAt: Date;
}

export interface AdminMediaRepository {
  assertReadyAssetForPurpose(input: {
    adminId: string;
    assetId: string;
    purpose: AdminMediaAssetPurpose;
  }): Promise<PersistedAdminMediaAsset>;
  createUploadSession(input: {
    adminId: string;
    metadata: CreateAdminMediaUploadSessionInput;
  }): Promise<PersistedAdminMediaAsset>;
  findAssetById(assetId: string): Promise<PersistedAdminMediaAsset | null>;
  markAssetFailed(input: {
    assetId: string;
    failedAt: Date;
  }): Promise<PersistedAdminMediaAsset>;
  markAssetReady(input: {
    assetId: string;
    verifiedAt: Date;
  }): Promise<PersistedAdminMediaAsset>;
  markAssetRemoved(input: {
    assetId: string;
    removedAt: Date;
  }): Promise<PersistedAdminMediaAsset>;
  refreshUploadSession(input: {
    assetId: string;
  }): Promise<PersistedAdminMediaAsset>;
}

export interface AdminMediaRepositoryOptions {
  deliveryBaseUrl?: string | null;
  now?: () => Date;
  uploadSessionExpiresInSeconds?: number;
}

export class AdminMediaAssetReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminMediaAssetReferenceError";
  }
}

function encodeObjectKeySegment(segment: string) {
  return encodeURIComponent(segment).replaceAll("%2F", "-");
}

function extensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    default:
      return "bin";
  }
}

export function buildAdminMediaObjectKey(input: {
  adminId: string;
  assetId: string;
  mimeType: string;
  purpose: AdminMediaAssetPurpose;
}) {
  return [
    "admin-media",
    encodeObjectKeySegment(input.adminId),
    input.purpose,
    input.assetId,
    `original.${extensionForMimeType(input.mimeType)}`,
  ].join("/");
}

function toPersistedAdminMediaAsset(
  row: typeof AdminMediaAsset.$inferSelect,
  deliveryBaseUrl: string | null,
): PersistedAdminMediaAsset {
  return {
    createdAt: row.createdAt,
    createdByAdminId: row.createdByAdminId,
    deliveryUrl:
      row.canonicalUrl ?? buildMediaDeliveryUrl(deliveryBaseUrl, row.objectKey),
    expectedChecksumSha256: row.expectedChecksumSha256,
    expectedHeight: row.height,
    expectedMimeType: row.mimeType,
    expectedSizeBytes: row.sizeBytes,
    expectedWidth: row.width,
    expiresAt: row.expiresAt,
    id: row.id,
    objectKey: row.objectKey,
    purpose: row.purpose,
    status: row.status,
    updatedAt: row.updatedAt,
  };
}

export function createDrizzleAdminMediaRepository(
  db: Database,
  options: AdminMediaRepositoryOptions = {},
): AdminMediaRepository {
  const deliveryBaseUrl = options.deliveryBaseUrl ?? null;
  const now = options.now ?? (() => new Date());
  const uploadSessionExpiresInSeconds =
    options.uploadSessionExpiresInSeconds ?? 10 * 60;

  return {
    assertReadyAssetForPurpose: async ({ adminId, assetId, purpose }) => {
      const asset = await db.query.AdminMediaAsset.findFirst({
        where: and(
          eq(AdminMediaAsset.id, assetId),
          eq(AdminMediaAsset.createdByAdminId, adminId),
          eq(AdminMediaAsset.purpose, purpose),
          eq(AdminMediaAsset.status, "ready"),
        ),
      });

      if (!asset) {
        throw new AdminMediaAssetReferenceError(
          "Admin media asset must be ready, owned by this admin, and match the requested purpose.",
        );
      }

      return toPersistedAdminMediaAsset(asset, deliveryBaseUrl);
    },
    createUploadSession: async ({ adminId, metadata }) => {
      const assetId = randomUUID();
      const createdAt = now();
      const expiresAt = new Date(
        createdAt.getTime() + uploadSessionExpiresInSeconds * 1000,
      );
      const objectKey = buildAdminMediaObjectKey({
        adminId,
        assetId,
        mimeType: metadata.mimeType,
        purpose: metadata.purpose,
      });
      const [row] = await db
        .insert(AdminMediaAsset)
        .values({
          createdByAdminId: adminId,
          expectedChecksumSha256: metadata.checksumSha256 ?? null,
          expiresAt,
          height: metadata.height,
          id: assetId,
          mimeType: metadata.mimeType,
          objectKey,
          purpose: metadata.purpose,
          sizeBytes: metadata.sizeBytes,
          status: "pending",
          width: metadata.width,
        })
        .returning();

      if (!row) {
        throw new Error("Admin media upload session could not be created.");
      }

      return toPersistedAdminMediaAsset(row, deliveryBaseUrl);
    },
    findAssetById: async (assetId) => {
      const row = await db.query.AdminMediaAsset.findFirst({
        where: eq(AdminMediaAsset.id, assetId),
      });

      return row ? toPersistedAdminMediaAsset(row, deliveryBaseUrl) : null;
    },
    markAssetFailed: async ({ assetId, failedAt }) => {
      const [row] = await db
        .update(AdminMediaAsset)
        .set({
          failedAt,
          status: "failed",
        })
        .where(eq(AdminMediaAsset.id, assetId))
        .returning();

      if (!row) {
        throw new AdminMediaAssetReferenceError("Admin media asset was not found.");
      }

      return toPersistedAdminMediaAsset(row, deliveryBaseUrl);
    },
    markAssetReady: async ({ assetId, verifiedAt }) => {
      const asset = await db.query.AdminMediaAsset.findFirst({
        where: eq(AdminMediaAsset.id, assetId),
      });

      if (!asset) {
        throw new AdminMediaAssetReferenceError("Admin media asset was not found.");
      }

      const [row] = await db
        .update(AdminMediaAsset)
        .set({
          canonicalUrl: buildMediaDeliveryUrl(deliveryBaseUrl, asset.objectKey),
          status: "ready",
          verifiedAt,
        })
        .where(eq(AdminMediaAsset.id, assetId))
        .returning();

      if (!row) {
        throw new AdminMediaAssetReferenceError("Admin media asset was not found.");
      }

      return toPersistedAdminMediaAsset(row, deliveryBaseUrl);
    },
    markAssetRemoved: async ({ assetId, removedAt }) => {
      const [row] = await db
        .update(AdminMediaAsset)
        .set({
          removedAt,
          status: "removed",
        })
        .where(eq(AdminMediaAsset.id, assetId))
        .returning();

      if (!row) {
        throw new AdminMediaAssetReferenceError("Admin media asset was not found.");
      }

      return toPersistedAdminMediaAsset(row, deliveryBaseUrl);
    },
    refreshUploadSession: async ({ assetId }) => {
      const refreshedAt = now();
      const expiresAt = new Date(
        refreshedAt.getTime() + uploadSessionExpiresInSeconds * 1000,
      );
      const [row] = await db
        .update(AdminMediaAsset)
        .set({
          expiresAt,
          failedAt: null,
          status: "pending",
        })
        .where(
          and(
            eq(AdminMediaAsset.id, assetId),
            or(
              eq(AdminMediaAsset.status, "pending"),
              eq(AdminMediaAsset.status, "failed"),
            ),
          ),
        )
        .returning();

      if (!row) {
        throw new AdminMediaAssetReferenceError(
          "Pending or failed admin media asset was not found.",
        );
      }

      return toPersistedAdminMediaAsset(row, deliveryBaseUrl);
    },
  };
}
