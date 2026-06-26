import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import {
  createReportInputSchema,
  createUploadSessionInputSchema,
  deleteReportInputSchema,
  nearbyReportsInputSchema,
  reportDetailInputSchema,
  resolveReportInputSchema,
  updateReportInputSchema,
  uploadSessionIdInputSchema,
} from "@acme/validators";

import type { PersistedAdminSettings } from "../admin-settings-repository";
import type { MediaStorage, StoredObjectHead } from "../media-storage";
import type { PersistedReportMediaUpload } from "../report-media-repository";
import type { PersistedReport } from "../report-repository";
import { defaultAdminSettings } from "../admin-settings-repository";
import { toPublicReport } from "../report-repository";
import { protectedProcedure, publicProcedure } from "../trpc";

function normalizeContentType(contentType: string | null) {
  return contentType?.split(";")[0]?.trim().toLowerCase() ?? null;
}

function numberMetadata(
  metadata: Record<string, string>,
  key: string,
): number | null {
  const value = metadata[key.toLowerCase()] ?? metadata[key];
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringMetadata(
  metadata: Record<string, string>,
  key: string,
): string | null {
  return metadata[key.toLowerCase()] ?? metadata[key] ?? null;
}

function uploadMetadataMatches(
  storedObject: StoredObjectHead,
  pendingMedia: PersistedReportMediaUpload,
) {
  const storedWidth = numberMetadata(storedObject.metadata, "width");
  const storedHeight = numberMetadata(storedObject.metadata, "height");
  const storedMediaId = stringMetadata(storedObject.metadata, "mediaId");
  const storedSizeBytes = numberMetadata(storedObject.metadata, "sizeBytes");
  const requiredChecks = [
    normalizeContentType(storedObject.contentType) ===
      pendingMedia.expectedMimeType,
    storedObject.contentLength === pendingMedia.expectedSizeBytes,
    storedMediaId === pendingMedia.id,
    storedSizeBytes === pendingMedia.expectedSizeBytes,
    storedWidth === pendingMedia.expectedWidth,
    storedHeight === pendingMedia.expectedHeight,
  ];

  if (pendingMedia.expectedChecksumSha256) {
    requiredChecks.push(
      storedObject.checksumSha256 === pendingMedia.expectedChecksumSha256,
    );
  }

  return requiredChecks.every(Boolean);
}

async function buildUploadSessionResponse(
  mediaStorage: MediaStorage,
  pendingMedia: PersistedReportMediaUpload,
) {
  const upload = await mediaStorage.createPresignedPut({
    checksumSha256: pendingMedia.expectedChecksumSha256 ?? undefined,
    contentType: pendingMedia.expectedMimeType,
    expiresAt: pendingMedia.expiresAt,
    metadata: {
      height: String(pendingMedia.expectedHeight),
      mediaId: pendingMedia.id,
      sizeBytes: String(pendingMedia.expectedSizeBytes),
      width: String(pendingMedia.expectedWidth),
    },
    objectKey: pendingMedia.objectKey,
    sizeBytes: pendingMedia.expectedSizeBytes,
  });

  return {
    expiresAt: upload.expiresAt,
    mediaId: pendingMedia.id,
    objectKey: pendingMedia.objectKey,
    upload: {
      headers: upload.headers,
      method: upload.method,
      url: upload.url,
    },
  };
}

function requireOwnedReport(
  report: PersistedReport | null,
  caretakerId: string,
): PersistedReport {
  if (!report || report.deletedAt) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  if (report.caretakerId !== caretakerId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return report;
}

function canReadReport(
  report: PersistedReport,
  viewerMemberId: string | null,
): boolean {
  if (report.hiddenAt) {
    return false;
  }

  return (
    report.status !== "pending_review" || report.caretakerId === viewerMemberId
  );
}

async function getPublishGateSettings(ctx: {
  adminSettingsRepository?: {
    get: () => Promise<PersistedAdminSettings>;
  };
}) {
  return ctx.adminSettingsRepository?.get() ?? defaultAdminSettings;
}

function assertVerifiedEmailCanPublish(ctx: {
  session: {
    user: {
      emailVerified?: boolean | null;
    };
  };
}) {
  if (ctx.session.user.emailVerified !== true) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Verified email is required to publish in Rastro.",
    });
  }
}

async function assertMemberIsNotSuspendedForPublishing(ctx: {
  memberSuspensionRepository?: {
    findActiveByMemberId: (memberId: string) => Promise<unknown>;
  };
  session: {
    user: {
      id: string;
    };
  };
}) {
  const activeSuspension =
    await ctx.memberSuspensionRepository?.findActiveByMemberId(
      ctx.session.user.id,
    );

  if (activeSuspension) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "El miembro esta suspendido y no puede publicar en Rastro.",
    });
  }
}

export const reportRouter = {
  createUploadSession: protectedProcedure
    .input(createUploadSessionInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.mediaStorageConfig) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Media storage is not configured.",
        });
      }

      const allowedMimeTypes = ctx.mediaStorageConfig.allowedMimeTypes;
      const maxImageBytes = ctx.mediaStorageConfig.maxImageBytes;

      if (
        !allowedMimeTypes.includes(input.mimeType) ||
        input.sizeBytes > maxImageBytes
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Upload metadata is outside configured storage limits.",
        });
      }

      const pendingMedia = await ctx.mediaRepository.createUploadSession({
        metadata: input,
        ownerId: ctx.session.user.id,
      });

      return buildUploadSessionResponse(ctx.mediaStorage, pendingMedia);
    }),
  completeUploadSession: protectedProcedure
    .input(uploadSessionIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const pendingMedia = await ctx.mediaRepository.findUploadSessionById(
        input.mediaId,
      );

      if (!pendingMedia) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (pendingMedia.ownerId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (pendingMedia.status === "ready") {
        return {
          mediaId: pendingMedia.id,
          objectKey: pendingMedia.objectKey,
          status: "ready" as const,
        };
      }

      if (pendingMedia.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Upload session is not pending.",
        });
      }

      const storedObject = await ctx.mediaStorage.headObject({
        objectKey: pendingMedia.objectKey,
      });

      if (!uploadMetadataMatches(storedObject, pendingMedia)) {
        await ctx.mediaRepository.markUploadSessionFailed({
          failedAt: new Date(),
          mediaId: pendingMedia.id,
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Uploaded media metadata did not match the session.",
        });
      }

      const readyMedia = await ctx.mediaRepository.markUploadSessionReady({
        mediaId: pendingMedia.id,
        verifiedAt: new Date(),
      });

      return {
        mediaId: readyMedia.id,
        objectKey: readyMedia.objectKey,
        status: "ready" as const,
      };
    }),
  refreshUploadSession: protectedProcedure
    .input(uploadSessionIdInputSchema)
    .mutation(async ({ ctx, input }) => {
      const pendingMedia = await ctx.mediaRepository.findUploadSessionById(
        input.mediaId,
      );

      if (!pendingMedia) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (pendingMedia.ownerId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (pendingMedia.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending upload sessions can be refreshed.",
        });
      }

      const refreshedMedia = await ctx.mediaRepository.refreshUploadSession({
        mediaId: pendingMedia.id,
      });

      return buildUploadSessionResponse(ctx.mediaStorage, refreshedMedia);
    }),
  create: protectedProcedure
    .input(createReportInputSchema)
    .mutation(async ({ ctx, input }) => {
      const caretakerId = ctx.session.user.id;
      const existing =
        await ctx.reportRepository.findByCaretakerAndIdempotencyKey({
          caretakerId,
          idempotencyKey: input.idempotencyKey,
        });
      const settings = existing
        ? defaultAdminSettings
        : await getPublishGateSettings(ctx);

      if (!existing) {
        await assertMemberIsNotSuspendedForPublishing(ctx);
      }

      if (!existing && settings.verifiedEmailRequiredToPublish) {
        assertVerifiedEmailCanPublish(ctx);
      }

      const initialStatus =
        !existing &&
        input.type === "adoption" &&
        settings.adoptionReviewModeEnabled
          ? "pending_review"
          : "active";

      if (!existing && input.media.length > 0) {
        try {
          await ctx.mediaRepository.assertReadyMediaForReport({
            draftId: input.idempotencyKey,
            media: input.media,
            ownerId: caretakerId,
            reportType: input.type,
          });
        } catch {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Report media must be ready and owned by the member.",
          });
        }
      }

      const report =
        existing ??
        (await ctx.reportRepository.create({
          caretakerId,
          initialStatus,
          report: input,
        }));

      return toPublicReport(report, caretakerId);
    }),
  detail: publicProcedure
    .input(reportDetailInputSchema)
    .query(async ({ ctx, input }) => {
      const report = await ctx.reportRepository.findById(input.id);

      if (!report || report.deletedAt) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (!canReadReport(report, ctx.session?.user.id ?? null)) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return toPublicReport(report, ctx.session?.user.id ?? null);
    }),
  nearby: publicProcedure
    .input(nearbyReportsInputSchema)
    .query(async ({ ctx, input }) => {
      const reports = await ctx.reportRepository.nearby(input);

      return {
        query: input,
        results: reports
          .filter((report) => !report.deletedAt)
          .filter((report) =>
            canReadReport(report, ctx.session?.user.id ?? null),
          )
          .map((report) =>
            toPublicReport(report, ctx.session?.user.id ?? null),
          ),
      };
    }),
  update: protectedProcedure
    .input(updateReportInputSchema)
    .mutation(async ({ ctx, input }) => {
      requireOwnedReport(
        await ctx.reportRepository.findById(input.id),
        ctx.session.user.id,
      );

      const report = await ctx.reportRepository.update({
        actorId: ctx.session.user.id,
        reportId: input.id,
        patch: input,
      });

      return toPublicReport(report, ctx.session.user.id);
    }),
  resolve: protectedProcedure
    .input(resolveReportInputSchema)
    .mutation(async ({ ctx, input }) => {
      requireOwnedReport(
        await ctx.reportRepository.findById(input.id),
        ctx.session.user.id,
      );

      const report = await ctx.reportRepository.resolve({
        reportId: input.id,
        outcome: input.outcome,
        actorId: ctx.session.user.id,
      });

      return toPublicReport(report, ctx.session.user.id);
    }),
  delete: protectedProcedure
    .input(deleteReportInputSchema)
    .mutation(async ({ ctx, input }) => {
      requireOwnedReport(
        await ctx.reportRepository.findById(input.id),
        ctx.session.user.id,
      );

      return ctx.reportRepository.delete({
        reportId: input.id,
        actorId: ctx.session.user.id,
      });
    }),
} satisfies TRPCRouterRecord;
