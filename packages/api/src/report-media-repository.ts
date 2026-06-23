import { randomUUID } from "node:crypto";

import type { Database } from "@acme/db/client";
import type { CreateUploadSessionInput, ReportType } from "@acme/validators";
import { and, asc, eq, inArray, isNull, lt, or } from "@acme/db";
import { ReportMedia } from "@acme/db/schema";

export type ReportMediaUploadStatus =
  | "failed"
  | "pending"
  | "ready"
  | "removed";

export interface PersistedReportMediaUpload {
  createdAt: Date;
  draftId: string;
  expectedChecksumSha256: string | null;
  expectedHeight: number;
  expectedMimeType: string;
  expectedSizeBytes: number;
  expectedWidth: number;
  expiresAt: Date;
  id: string;
  objectKey: string;
  ownerId: string;
  reportType: ReportType;
  reportId: string | null;
  status: ReportMediaUploadStatus;
  updatedAt: Date;
}

export interface ReportMediaRepository {
  assertReadyMediaForReport(input: {
    media: {
      altText?: string;
      mediaId: string;
    }[];
    draftId: string;
    ownerId: string;
    reportType: ReportType;
  }): Promise<void>;
  createUploadSession(input: {
    metadata: CreateUploadSessionInput;
    ownerId: string;
  }): Promise<PersistedReportMediaUpload>;
  findAbandonedUploadSessions(input: {
    expiredBefore: Date;
    limit?: number;
  }): Promise<PersistedReportMediaUpload[]>;
  findUploadSessionById(
    mediaId: string,
  ): Promise<PersistedReportMediaUpload | null>;
  markUploadSessionFailed(input: {
    failedAt: Date;
    mediaId: string;
  }): Promise<PersistedReportMediaUpload>;
  markUploadSessionReady(input: {
    mediaId: string;
    verifiedAt: Date;
  }): Promise<PersistedReportMediaUpload>;
  markUploadSessionRemoved(input: {
    mediaId: string;
    removedAt: Date;
  }): Promise<PersistedReportMediaUpload>;
  refreshUploadSession(input: {
    mediaId: string;
  }): Promise<PersistedReportMediaUpload>;
}

export interface ReportMediaRepositoryOptions {
  now?: () => Date;
  uploadSessionExpiresInSeconds?: number;
}

export class ReportMediaReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportMediaReferenceError";
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

export function buildReportMediaObjectKey(input: {
  mediaId: string;
  mimeType: string;
  ownerId: string;
}) {
  return [
    "report-media",
    encodeObjectKeySegment(input.ownerId),
    input.mediaId,
    `original.${extensionForMimeType(input.mimeType)}`,
  ].join("/");
}

function toPersistedReportMediaUpload(
  row: typeof ReportMedia.$inferSelect,
): PersistedReportMediaUpload {
  return {
    createdAt: row.createdAt,
    draftId: row.uploadDraftId,
    expectedChecksumSha256: row.expectedChecksumSha256,
    expectedHeight: row.height,
    expectedMimeType: row.mimeType,
    expectedSizeBytes: row.sizeBytes,
    expectedWidth: row.width,
    expiresAt: row.expiresAt,
    id: row.id,
    objectKey: row.objectKey,
    ownerId: row.ownerId,
    reportType: row.uploadReportType,
    reportId: row.reportId,
    status: row.status,
    updatedAt: row.updatedAt,
  };
}

export function createDrizzleReportMediaRepository(
  db: Database,
  options: ReportMediaRepositoryOptions = {},
): ReportMediaRepository {
  const now = options.now ?? (() => new Date());
  const uploadSessionExpiresInSeconds =
    options.uploadSessionExpiresInSeconds ?? 10 * 60;

  return {
    assertReadyMediaForReport: async ({
      draftId,
      media,
      ownerId,
      reportType,
    }) => {
      const mediaIds = media.map((item) => item.mediaId);
      const uniqueMediaIds = [...new Set(mediaIds)];

      if (uniqueMediaIds.length !== mediaIds.length) {
        throw new ReportMediaReferenceError(
          "Report media references must be unique.",
        );
      }

      if (uniqueMediaIds.length === 0) {
        return;
      }

      const readyMedia = await db
        .select({ id: ReportMedia.id })
        .from(ReportMedia)
        .where(
          and(
            inArray(ReportMedia.id, uniqueMediaIds),
            eq(ReportMedia.ownerId, ownerId),
            eq(ReportMedia.uploadDraftId, draftId),
            eq(ReportMedia.uploadReportType, reportType),
            eq(ReportMedia.status, "ready"),
            isNull(ReportMedia.reportId),
          ),
        );

      if (readyMedia.length !== uniqueMediaIds.length) {
        throw new ReportMediaReferenceError(
          "Report media must be ready and owned by the member.",
        );
      }
    },
    createUploadSession: async ({ metadata, ownerId }) => {
      const mediaId = randomUUID();
      const createdAt = now();
      const expiresAt = new Date(
        createdAt.getTime() + uploadSessionExpiresInSeconds * 1000,
      );
      const objectKey = buildReportMediaObjectKey({
        mediaId,
        mimeType: metadata.mimeType,
        ownerId,
      });

      const [row] = await db
        .insert(ReportMedia)
        .values({
          expectedChecksumSha256: metadata.checksumSha256 ?? null,
          expiresAt,
          height: metadata.height,
          id: mediaId,
          mimeType: metadata.mimeType,
          objectKey,
          ownerId,
          reportId: null,
          uploadDraftId: metadata.draftId,
          uploadReportType: metadata.reportType,
          sizeBytes: metadata.sizeBytes,
          status: "pending",
          width: metadata.width,
        })
        .returning();

      if (!row) {
        throw new Error("Upload session could not be created.");
      }

      return toPersistedReportMediaUpload(row);
    },
    findUploadSessionById: async (mediaId) => {
      const row = await db.query.ReportMedia.findFirst({
        where: eq(ReportMedia.id, mediaId),
      });

      return row ? toPersistedReportMediaUpload(row) : null;
    },
    findAbandonedUploadSessions: async ({ expiredBefore, limit = 100 }) => {
      const rows = await db
        .select()
        .from(ReportMedia)
        .where(
          and(
            isNull(ReportMedia.reportId),
            or(
              and(
                eq(ReportMedia.status, "pending"),
                lt(ReportMedia.expiresAt, expiredBefore),
              ),
              and(
                eq(ReportMedia.status, "failed"),
                lt(ReportMedia.failedAt, expiredBefore),
              ),
            ),
          ),
        )
        .orderBy(asc(ReportMedia.expiresAt))
        .limit(limit);

      return rows.map(toPersistedReportMediaUpload);
    },
    markUploadSessionFailed: async ({ failedAt, mediaId }) => {
      const [row] = await db
        .update(ReportMedia)
        .set({
          failedAt,
          status: "failed",
        })
        .where(eq(ReportMedia.id, mediaId))
        .returning();

      if (!row) {
        throw new ReportMediaReferenceError("Upload session was not found.");
      }

      return toPersistedReportMediaUpload(row);
    },
    markUploadSessionReady: async ({ mediaId, verifiedAt }) => {
      const [row] = await db
        .update(ReportMedia)
        .set({
          status: "ready",
          verifiedAt,
        })
        .where(eq(ReportMedia.id, mediaId))
        .returning();

      if (!row) {
        throw new ReportMediaReferenceError("Upload session was not found.");
      }

      return toPersistedReportMediaUpload(row);
    },
    markUploadSessionRemoved: async ({ mediaId, removedAt }) => {
      const [row] = await db
        .update(ReportMedia)
        .set({
          removedAt,
          status: "removed",
        })
        .where(eq(ReportMedia.id, mediaId))
        .returning();

      if (!row) {
        throw new ReportMediaReferenceError("Upload session was not found.");
      }

      return toPersistedReportMediaUpload(row);
    },
    refreshUploadSession: async ({ mediaId }) => {
      const refreshedAt = now();
      const expiresAt = new Date(
        refreshedAt.getTime() + uploadSessionExpiresInSeconds * 1000,
      );
      const [row] = await db
        .update(ReportMedia)
        .set({
          expiresAt,
        })
        .where(
          and(eq(ReportMedia.id, mediaId), eq(ReportMedia.status, "pending")),
        )
        .returning();

      if (!row) {
        throw new ReportMediaReferenceError(
          "Pending upload session was not found.",
        );
      }

      return toPersistedReportMediaUpload(row);
    },
  };
}
