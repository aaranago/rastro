import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";

import type {
  AdminMediaAssetPurpose,
  AttachLocalSponsorPlacementInput,
  CreateResourceProviderInput,
  LocalSponsorPlacementDeliveryEventType,
  UpdateLocalSponsorPlacementInput,
  UpdateResourceProviderInput,
} from "@acme/validators";
import {
  activeLocalSponsorPlacementsInputSchema,
  adminMediaAssetIdInputSchema,
  adminResourceProviderListInputSchema,
  adminSponsorPlacementListInputSchema,
  attachLocalSponsorPlacementInputSchema,
  createAdminMediaUploadSessionInputSchema,
  createResourceProviderInputSchema,
  createResourceProviderReportInputSchema,
  deleteResourceProviderInputSchema,
  detachLocalSponsorPlacementInputSchema,
  nearbyResourceProvidersInputSchema,
  recordLocalSponsorPlacementDeliveryInputSchema,
  resourceProviderDetailInputSchema,
  updateLocalSponsorPlacementInputSchema,
  updateResourceProviderInputSchema,
  updateResourceProviderVerificationInputSchema,
} from "@acme/validators";

import type { RecordAdminAuditEventInput } from "../admin-audit-repository";
import type { PersistedAdminMediaAsset } from "../admin-media-repository";
import type { RecordLocalSponsorPlacementDeliveryEventResult } from "../local-sponsor-placement-delivery-repository";
import type { StoredObjectHead } from "../media-storage";
import { AdminMediaAssetReferenceError } from "../admin-media-repository";
import {
  SponsorDeliveryTokenError,
  verifySponsorDeliveryToken,
} from "../local-sponsor-placement-delivery-token";
import { SponsorPlacementOverlapError } from "../resource-provider-repository";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import {
  normalizeUploadContentType,
  readNumberUploadMetadata,
  readStringUploadMetadata,
} from "../upload-metadata";

export function parseRastroAdminEmails(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(/[\s,]+/)
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0),
  );
}

function requireResourceProviderAdmin(ctx: {
  adminEmailList: string | undefined;
  session: {
    user: {
      email?: string | null;
      id: string;
    };
  };
}) {
  const email = ctx.session.user.email?.trim().toLowerCase();

  if (!email || !parseRastroAdminEmails(ctx.adminEmailList).has(email)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return {
    email,
    id: ctx.session.user.id,
  };
}

function adminUploadMetadataMatches(
  storedObject: StoredObjectHead,
  pendingAsset: PersistedAdminMediaAsset,
) {
  const storedAdminId = readStringUploadMetadata(
    storedObject.metadata,
    "adminId",
  );
  const storedAssetId = readStringUploadMetadata(
    storedObject.metadata,
    "adminMediaAssetId",
  );
  const storedHeight = readNumberUploadMetadata(
    storedObject.metadata,
    "height",
  );
  const storedPurpose = readStringUploadMetadata(
    storedObject.metadata,
    "purpose",
  );
  const storedSizeBytes = readNumberUploadMetadata(
    storedObject.metadata,
    "sizeBytes",
  );
  const storedWidth = readNumberUploadMetadata(storedObject.metadata, "width");
  const requiredChecks = [
    normalizeUploadContentType(storedObject.contentType) ===
      pendingAsset.expectedMimeType,
    storedObject.contentLength === pendingAsset.expectedSizeBytes,
    storedAdminId === pendingAsset.createdByAdminId,
    storedAssetId === pendingAsset.id,
    storedHeight === pendingAsset.expectedHeight,
    storedPurpose === pendingAsset.purpose,
    storedSizeBytes === pendingAsset.expectedSizeBytes,
    storedWidth === pendingAsset.expectedWidth,
  ];

  if (pendingAsset.expectedChecksumSha256) {
    requiredChecks.push(
      storedObject.checksumSha256 === pendingAsset.expectedChecksumSha256,
    );
  }

  return requiredChecks.every(Boolean);
}

async function buildAdminMediaUploadSessionResponse(
  ctx: {
    mediaStorage: {
      createPresignedPut: (input: {
        checksumSha256?: string;
        contentType: string;
        expiresAt: Date;
        metadata: Record<string, string>;
        objectKey: string;
        sizeBytes: number;
      }) => Promise<{
        expiresAt: Date;
        headers: Record<string, string>;
        method: "PUT";
        url: string;
      }>;
    };
  },
  pendingAsset: PersistedAdminMediaAsset,
) {
  const upload = await ctx.mediaStorage.createPresignedPut({
    checksumSha256: pendingAsset.expectedChecksumSha256 ?? undefined,
    contentType: pendingAsset.expectedMimeType,
    expiresAt: pendingAsset.expiresAt,
    metadata: {
      adminId: pendingAsset.createdByAdminId ?? "",
      adminMediaAssetId: pendingAsset.id,
      height: String(pendingAsset.expectedHeight),
      purpose: pendingAsset.purpose,
      sizeBytes: String(pendingAsset.expectedSizeBytes),
      width: String(pendingAsset.expectedWidth),
    },
    objectKey: pendingAsset.objectKey,
    sizeBytes: pendingAsset.expectedSizeBytes,
  });

  return {
    asset: toAdminMediaAssetResponse(pendingAsset),
    expiresAt: upload.expiresAt,
    upload: {
      headers: upload.headers,
      method: upload.method,
      url: upload.url,
    },
  };
}

function toAdminMediaAssetResponse(asset: PersistedAdminMediaAsset) {
  return {
    assetId: asset.id,
    deliveryUrl: asset.deliveryUrl,
    objectKey: asset.objectKey,
    purpose: asset.purpose,
    status: asset.status,
  };
}

function requireConfiguredMediaStorage<TConfig>(ctx: {
  mediaStorageConfig: TConfig | null | undefined;
}) {
  const mediaStorageConfig = ctx.mediaStorageConfig;

  if (!mediaStorageConfig) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Media storage is not configured.",
    });
  }

  return mediaStorageConfig;
}

function assertAdminMediaWithinConfiguredLimits(
  ctx: {
    mediaStorageConfig: {
      allowedMimeTypes: string[];
      maxImageBytes: number;
    } | null;
  },
  input: { mimeType: string; sizeBytes: number },
) {
  const mediaStorageConfig = requireConfiguredMediaStorage(ctx);

  if (
    !mediaStorageConfig.allowedMimeTypes.includes(input.mimeType) ||
    input.sizeBytes > mediaStorageConfig.maxImageBytes
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Upload metadata is outside configured storage limits.",
    });
  }
}

function requireOwnedAdminMediaAsset(
  asset: PersistedAdminMediaAsset | null,
  adminId: string,
): PersistedAdminMediaAsset {
  if (!asset) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  if (asset.createdByAdminId !== adminId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return asset;
}

function requireReadyAssetDeliveryUrl(asset: PersistedAdminMediaAsset) {
  if (!asset.deliveryUrl) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Admin media delivery URL is not available.",
    });
  }

  return asset.deliveryUrl;
}

async function resolveReadyAdminAssetUrl(
  ctx: {
    adminMediaRepository: {
      assertReadyAssetForPurpose: (input: {
        adminId: string;
        assetId: string;
        purpose: AdminMediaAssetPurpose;
      }) => Promise<PersistedAdminMediaAsset>;
    };
  },
  input: {
    adminId: string;
    assetId: string;
    purpose: AdminMediaAssetPurpose;
  },
) {
  try {
    return requireReadyAssetDeliveryUrl(
      await ctx.adminMediaRepository.assertReadyAssetForPurpose(input),
    );
  } catch (error) {
    if (error instanceof AdminMediaAssetReferenceError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
        cause: error,
      });
    }

    throw error;
  }
}

async function withResolvedCreateProviderMedia(
  ctx: Parameters<typeof resolveReadyAdminAssetUrl>[0],
  adminId: string,
  input: CreateResourceProviderInput,
): Promise<CreateResourceProviderInput> {
  const { logoAssetId, photoAssetId, ...provider } = input;
  const resolvedProvider: CreateResourceProviderInput = { ...provider };

  if (logoAssetId) {
    resolvedProvider.logoUrl = await resolveReadyAdminAssetUrl(ctx, {
      adminId,
      assetId: logoAssetId,
      purpose: "provider_logo",
    });
  }

  if (photoAssetId) {
    resolvedProvider.photoUrl = await resolveReadyAdminAssetUrl(ctx, {
      adminId,
      assetId: photoAssetId,
      purpose: "provider_photo",
    });
  }

  return resolvedProvider;
}

async function withResolvedUpdateProviderMedia(
  ctx: Parameters<typeof resolveReadyAdminAssetUrl>[0],
  adminId: string,
  input: UpdateResourceProviderInput,
): Promise<UpdateResourceProviderInput> {
  const { logoAssetId, photoAssetId, ...provider } = input;
  const resolvedProvider: UpdateResourceProviderInput = { ...provider };

  if (logoAssetId !== undefined) {
    resolvedProvider.logoUrl =
      logoAssetId === null
        ? null
        : await resolveReadyAdminAssetUrl(ctx, {
            adminId,
            assetId: logoAssetId,
            purpose: "provider_logo",
          });
  }

  if (photoAssetId !== undefined) {
    resolvedProvider.photoUrl =
      photoAssetId === null
        ? null
        : await resolveReadyAdminAssetUrl(ctx, {
            adminId,
            assetId: photoAssetId,
            purpose: "provider_photo",
          });
  }

  return resolvedProvider;
}

async function withResolvedAttachSponsorMedia(
  ctx: Parameters<typeof resolveReadyAdminAssetUrl>[0],
  adminId: string,
  input: AttachLocalSponsorPlacementInput,
): Promise<AttachLocalSponsorPlacementInput> {
  const { imageAssetId, logoAssetId, ...sponsorPlacement } = input;
  const resolvedSponsorPlacement: AttachLocalSponsorPlacementInput = {
    ...sponsorPlacement,
  };

  if (logoAssetId !== undefined) {
    resolvedSponsorPlacement.logoUrl =
      logoAssetId === null
        ? null
        : await resolveReadyAdminAssetUrl(ctx, {
            adminId,
            assetId: logoAssetId,
            purpose: "sponsor_logo",
          });
  }

  if (imageAssetId !== undefined) {
    resolvedSponsorPlacement.imageUrl =
      imageAssetId === null
        ? null
        : await resolveReadyAdminAssetUrl(ctx, {
            adminId,
            assetId: imageAssetId,
            purpose: "sponsor_image",
          });
  }

  return resolvedSponsorPlacement;
}

async function withResolvedUpdateSponsorMedia(
  ctx: Parameters<typeof resolveReadyAdminAssetUrl>[0],
  adminId: string,
  input: UpdateLocalSponsorPlacementInput,
): Promise<UpdateLocalSponsorPlacementInput> {
  const { imageAssetId, logoAssetId, ...sponsorPlacement } = input;
  const resolvedSponsorPlacement: UpdateLocalSponsorPlacementInput = {
    ...sponsorPlacement,
  };

  if (logoAssetId !== undefined) {
    resolvedSponsorPlacement.logoUrl =
      logoAssetId === null
        ? null
        : await resolveReadyAdminAssetUrl(ctx, {
            adminId,
            assetId: logoAssetId,
            purpose: "sponsor_logo",
          });
  }

  if (imageAssetId !== undefined) {
    resolvedSponsorPlacement.imageUrl =
      imageAssetId === null
        ? null
        : await resolveReadyAdminAssetUrl(ctx, {
            adminId,
            assetId: imageAssetId,
            purpose: "sponsor_image",
          });
  }

  return resolvedSponsorPlacement;
}

async function recordResourceAdminAuditEvent(
  ctx: {
    adminAuditRepository: {
      record: (input: RecordAdminAuditEventInput) => Promise<unknown>;
    };
  },
  admin: { email: string; id: string },
  event: Omit<RecordAdminAuditEventInput, "actor">,
) {
  await ctx.adminAuditRepository.record({
    ...event,
    actor: admin,
  });
}

async function assertMemberCanReportResourceProvider(ctx: {
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
      message:
        "El miembro está suspendido y no puede reportar Resource Providers.",
    });
  }
}

function getOptionalSessionUserId(
  session:
    | {
        user?: {
          id?: string | null;
        } | null;
      }
    | null
    | undefined,
) {
  const memberId = session?.user?.id;

  return typeof memberId === "string" ? memberId : undefined;
}

function rethrowSponsorPlacementWriteError(error: unknown): never {
  if (error instanceof SponsorPlacementOverlapError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
      cause: error,
    });
  }

  throw error;
}

async function runSponsorPlacementWrite<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    rethrowSponsorPlacementWriteError(error);
  }
}

function toPublicSponsorDeliveryResponse(
  result: RecordLocalSponsorPlacementDeliveryEventResult,
) {
  if (result.status === "no_active_placement") {
    return result;
  }

  return {
    event: {
      eventType: result.event.eventType,
      id: result.event.id,
      occurredAt: result.event.occurredAt,
      providerId: result.event.providerId,
      ...(result.event.source ? { source: result.event.source } : {}),
      surface: result.event.surface,
    },
    status: result.status,
  };
}

const sponsorDeliveryThrottleWindowMs = 60_000;
const sponsorDeliveryThrottleLimit = 30;
const sponsorDeliveryThrottleBuckets = new Map<
  string,
  { count: number; resetAt: number }
>();

function assertSponsorDeliveryTokenMatches(input: {
  deliveryToken: string;
  providerId: string;
  surface: string;
}) {
  try {
    const payload = verifySponsorDeliveryToken(input.deliveryToken);

    if (
      payload.providerId !== input.providerId ||
      payload.surface !== input.surface
    ) {
      throw new SponsorDeliveryTokenError(
        "invalid",
        "Sponsor delivery token does not match the delivery target.",
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof SponsorDeliveryTokenError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "El token del patrocinio no es válido.",
        cause: error,
      });
    }

    throw error;
  }
}

function assertSponsorDeliveryThrottle(input: {
  clientKey: string | null;
  eventType: LocalSponsorPlacementDeliveryEventType;
  placementId: string;
  providerId: string;
  surface: string;
}) {
  if (!input.clientKey) {
    return;
  }

  const now = Date.now();
  const key = [
    input.clientKey,
    input.placementId,
    input.providerId,
    input.surface,
    input.eventType,
  ].join(":");
  const bucket = sponsorDeliveryThrottleBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    sponsorDeliveryThrottleBuckets.set(key, {
      count: 1,
      resetAt: now + sponsorDeliveryThrottleWindowMs,
    });
    return;
  }

  bucket.count += 1;

  if (bucket.count > sponsorDeliveryThrottleLimit) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Demasiados eventos de patrocinio en poco tiempo.",
    });
  }
}

function getSponsorDeliveryThrottleClientKey(input: {
  requestHeaders?: Headers;
  session: { user?: { id?: string | null } | null } | null;
}) {
  const memberId = getOptionalSessionUserId(input.session);

  if (memberId) {
    return `member:${hashThrottleKeyPart(memberId)}`;
  }

  const networkKey = getFirstHeaderValue(
    input.requestHeaders,
    "cf-connecting-ip",
    "true-client-ip",
    "x-real-ip",
    "x-forwarded-for",
  );
  const userAgent = normalizeThrottleHeaderValue(
    input.requestHeaders?.get("user-agent"),
  );

  if (!networkKey && !userAgent) {
    return null;
  }

  return `anonymous:${hashThrottleKeyPart(
    [networkKey || "unknown-network", userAgent || "unknown-agent"].join("|"),
  )}`;
}

function getFirstHeaderValue(headers: Headers | undefined, ...names: string[]) {
  for (const name of names) {
    const value = normalizeThrottleHeaderValue(headers?.get(name));

    if (value) {
      return value.split(",")[0]?.trim().toLowerCase() ?? "";
    }
  }

  return "";
}

function normalizeThrottleHeaderValue(value: string | null | undefined) {
  return value?.trim().slice(0, 200) ?? "";
}

function hashThrottleKeyPart(value: string) {
  return createHash("sha256").update(value).digest("base64url").slice(0, 32);
}

export const resourcesRouter = createTRPCRouter({
  nearby: publicProcedure
    .input(nearbyResourceProvidersInputSchema)
    .query(async ({ ctx, input }) => {
      const results = await ctx.resourceProviderRepository.nearby(input);

      return {
        generatedAt: new Date().toISOString(),
        query: input,
        radiusMeters: input.radiusMeters,
        results,
        searchBoundary: {
          center: {
            latitude: input.latitude,
            longitude: input.longitude,
          },
          engine: "rastro-postgis-radius" as const,
          owner: "rastro" as const,
          publicLocationPrecision: "location-cell" as const,
          radiusMeters: input.radiusMeters,
        },
        searchStrategy: input.strategy,
      };
    }),
  detail: publicProcedure
    .input(resourceProviderDetailInputSchema)
    .query(async ({ ctx, input }) => {
      const profile = await ctx.resourceProviderRepository.findProfile(
        input.providerId,
      );

      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return profile;
    }),
  activeSponsorPlacements: publicProcedure
    .input(activeLocalSponsorPlacementsInputSchema)
    .query(async ({ ctx, input }) => {
      const results =
        await ctx.resourceProviderRepository.listActiveSponsorPlacements(input);

      return {
        generatedAt: new Date().toISOString(),
        results,
        surface: input.surface,
      };
    }),
  reportProvider: protectedProcedure
    .input(createResourceProviderReportInputSchema)
    .mutation(async ({ ctx, input }) => {
      await assertMemberCanReportResourceProvider(ctx);

      const result =
        await ctx.resourceProviderModerationRepository.createResourceProviderReport(
          {
            report: input,
            reporterId: ctx.session.user.id,
          },
        );

      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return result;
    }),
  recordSponsorDelivery: publicProcedure
    .input(recordLocalSponsorPlacementDeliveryInputSchema)
    .mutation(async ({ ctx, input }) => {
      const sponsorDelivery = assertSponsorDeliveryTokenMatches(input);
      assertSponsorDeliveryThrottle({
        clientKey: getSponsorDeliveryThrottleClientKey(ctx),
        eventType: input.eventType,
        placementId: sponsorDelivery.placementId,
        providerId: sponsorDelivery.providerId,
        surface: sponsorDelivery.surface,
      });

      const result = await ctx.localSponsorPlacementDeliveryRepository.record({
        eventType: input.eventType,
        idempotencyKey: input.idempotencyKey,
        memberId: getOptionalSessionUserId(ctx.session),
        placementId: sponsorDelivery.placementId,
        providerId: sponsorDelivery.providerId,
        source: input.source,
        surface: sponsorDelivery.surface,
      });

      return toPublicSponsorDeliveryResponse(result);
    }),
  admin: createTRPCRouter({
    createMediaUploadSession: protectedProcedure
      .input(createAdminMediaUploadSessionInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);

        assertAdminMediaWithinConfiguredLimits(ctx, input);

        const pendingAsset = await ctx.adminMediaRepository.createUploadSession(
          {
            adminId: admin.id,
            metadata: input,
          },
        );

        return buildAdminMediaUploadSessionResponse(ctx, pendingAsset);
      }),
    completeMediaUploadSession: protectedProcedure
      .input(adminMediaAssetIdInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);

        requireConfiguredMediaStorage(ctx);

        const asset = requireOwnedAdminMediaAsset(
          await ctx.adminMediaRepository.findAssetById(input.assetId),
          admin.id,
        );

        if (asset.status === "ready") {
          return {
            asset: toAdminMediaAssetResponse(asset),
          };
        }

        if (asset.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Admin media upload session is not pending.",
          });
        }

        const storedObject = await ctx.mediaStorage.headObject({
          objectKey: asset.objectKey,
        });

        if (!adminUploadMetadataMatches(storedObject, asset)) {
          await ctx.adminMediaRepository.markAssetFailed({
            assetId: asset.id,
            failedAt: new Date(),
          });

          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Uploaded admin media metadata did not match the session.",
          });
        }

        const readyAsset = await ctx.adminMediaRepository.markAssetReady({
          assetId: asset.id,
          verifiedAt: new Date(),
        });

        return {
          asset: {
            ...toAdminMediaAssetResponse(readyAsset),
            deliveryUrl: requireReadyAssetDeliveryUrl(readyAsset),
          },
        };
      }),
    refreshMediaUploadSession: protectedProcedure
      .input(adminMediaAssetIdInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);

        requireConfiguredMediaStorage(ctx);

        const asset = requireOwnedAdminMediaAsset(
          await ctx.adminMediaRepository.findAssetById(input.assetId),
          admin.id,
        );

        if (asset.status !== "pending" && asset.status !== "failed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Only pending or failed admin media upload sessions can be refreshed.",
          });
        }

        const refreshedAsset =
          await ctx.adminMediaRepository.refreshUploadSession({
            assetId: asset.id,
          });

        return buildAdminMediaUploadSessionResponse(ctx, refreshedAsset);
      }),
    removeMediaAsset: protectedProcedure
      .input(adminMediaAssetIdInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const asset = requireOwnedAdminMediaAsset(
          await ctx.adminMediaRepository.findAssetById(input.assetId),
          admin.id,
        );

        if (asset.status === "removed") {
          return {
            asset: toAdminMediaAssetResponse(asset),
          };
        }

        const removedAsset = await ctx.adminMediaRepository.markAssetRemoved({
          assetId: asset.id,
          removedAt: new Date(),
        });

        if (ctx.mediaStorageConfig) {
          try {
            await ctx.mediaStorage.deleteObject({ objectKey: asset.objectKey });
          } catch {
            // The asset is no longer attachable; object cleanup can be retried later.
          }
        }

        return {
          asset: toAdminMediaAssetResponse(removedAsset),
        };
      }),
    listProviders: protectedProcedure
      .input(adminResourceProviderListInputSchema.optional())
      .query(async ({ ctx, input }) => {
        requireResourceProviderAdmin(ctx);

        return ctx.resourceProviderRepository.listProviders(input);
      }),
    listSponsorPlacements: protectedProcedure
      .input(adminSponsorPlacementListInputSchema.optional())
      .query(async ({ ctx, input }) => {
        requireResourceProviderAdmin(ctx);

        return ctx.resourceProviderRepository.listSponsorPlacements(input);
      }),
    createProvider: protectedProcedure
      .input(createResourceProviderInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const providerInput = await withResolvedCreateProviderMedia(
          ctx,
          admin.id,
          input,
        );

        const provider = await ctx.resourceProviderRepository.createProvider({
          adminId: admin.id,
          provider: providerInput,
        });

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "resource_provider.create",
          metadata: {
            category: providerInput.category,
            city: providerInput.location.city,
            department: providerInput.location.department,
          },
          source: "resources.admin.createProvider",
          summary: `Creo Resource Provider ${provider.name}.`,
          target: {
            id: provider.id,
            label: provider.name,
            type: "resource_provider",
          },
        });

        return provider;
      }),
    updateProvider: protectedProcedure
      .input(updateResourceProviderInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const providerInput = await withResolvedUpdateProviderMedia(
          ctx,
          admin.id,
          input,
        );
        const provider = await ctx.resourceProviderRepository.updateProvider({
          adminId: admin.id,
          provider: providerInput,
        });

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "resource_provider.update",
          metadata: {
            changedFields: Object.keys(input).filter(
              (key) => key !== "providerId",
            ),
          },
          source: "resources.admin.updateProvider",
          summary: `Actualizo Resource Provider ${provider.name}.`,
          target: {
            id: provider.id,
            label: provider.name,
            type: "resource_provider",
          },
        });

        return provider;
      }),
    deleteProvider: protectedProcedure
      .input(deleteResourceProviderInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const existingProvider =
          await ctx.resourceProviderRepository.findProfile(input.providerId);

        if (!existingProvider) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const deleted = await ctx.resourceProviderRepository.deleteProvider({
          adminId: admin.id,
          provider: input,
        });

        if (!deleted) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "resource_provider.archive",
          source: "resources.admin.deleteProvider",
          summary: `Archivo Resource Provider ${existingProvider.name}.`,
          target: {
            id: deleted.providerId,
            label: existingProvider.name,
            type: "resource_provider",
          },
        });

        return {
          deletedAt: deleted.deletedAt.toISOString(),
          deleted: true as const,
          providerId: deleted.providerId,
        };
      }),
    updateVerification: protectedProcedure
      .input(updateResourceProviderVerificationInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const provider =
          await ctx.resourceProviderRepository.updateVerification({
            adminId: admin.id,
            verification: input,
          });

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "resource_provider.verification_update",
          metadata: {
            note: input.note ?? null,
            status: input.status,
          },
          source: "resources.admin.updateVerification",
          summary: `Actualizo verificacion de ${provider.name}.`,
          target: {
            id: provider.id,
            label: provider.name,
            type: "resource_provider",
          },
        });

        return provider;
      }),
    attachSponsor: protectedProcedure
      .input(attachLocalSponsorPlacementInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const sponsorPlacement = await withResolvedAttachSponsorMedia(
          ctx,
          admin.id,
          input,
        );
        const provider = await runSponsorPlacementWrite(() =>
          ctx.resourceProviderRepository.attachSponsor({
            adminId: admin.id,
            sponsorPlacement,
          }),
        );

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "local_sponsor_placement.create",
          metadata: {
            endsOn: input.endsOn,
            startsOn: input.startsOn,
            surface: input.surface,
          },
          source: "resources.admin.attachSponsor",
          summary: `Creo Local Sponsor Placement para ${provider.name}.`,
          target: {
            id: input.placementId ?? input.providerId,
            label: provider.name,
            type: "local_sponsor_placement",
          },
        });

        return provider;
      }),
    createSponsor: protectedProcedure
      .input(attachLocalSponsorPlacementInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const sponsorPlacement = await withResolvedAttachSponsorMedia(
          ctx,
          admin.id,
          input,
        );
        const placement = await runSponsorPlacementWrite(() =>
          ctx.resourceProviderRepository.createSponsorPlacement({
            adminId: admin.id,
            sponsorPlacement,
          }),
        );

        if (!placement) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "local_sponsor_placement.create",
          metadata: {
            endsOn: input.endsOn,
            startsOn: input.startsOn,
            surface: input.surface,
          },
          source: "resources.admin.createSponsor",
          summary: `Creo Local Sponsor Placement ${placement.label} para ${placement.providerName}.`,
          target: {
            id: placement.placementId,
            label: `${placement.providerName} - ${placement.surface}`,
            type: "local_sponsor_placement",
          },
        });

        return placement;
      }),
    updateSponsor: protectedProcedure
      .input(updateLocalSponsorPlacementInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const sponsorPlacement = await withResolvedUpdateSponsorMedia(
          ctx,
          admin.id,
          input,
        );
        const placement = await runSponsorPlacementWrite(() =>
          ctx.resourceProviderRepository.updateSponsorPlacement({
            adminId: admin.id,
            sponsorPlacement,
          }),
        );

        if (!placement) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "local_sponsor_placement.update",
          metadata: {
            endsOn: input.endsOn,
            startsOn: input.startsOn,
            surface: input.surface,
          },
          source: "resources.admin.updateSponsor",
          summary: `Actualizo Local Sponsor Placement ${placement.label} para ${placement.providerName}.`,
          target: {
            id: placement.placementId,
            label: `${placement.providerName} - ${placement.surface}`,
            type: "local_sponsor_placement",
          },
        });

        return placement;
      }),
    detachSponsorPlacement: protectedProcedure
      .input(detachLocalSponsorPlacementInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const provider =
          await ctx.resourceProviderRepository.detachSponsor(input);

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "local_sponsor_placement.detach",
          source: "resources.admin.detachSponsorPlacement",
          summary: `Desvinculo Local Sponsor Placement de ${provider.name}.`,
          target: {
            id: input.placementId,
            label: `${provider.name} - ${input.placementId}`,
            type: "local_sponsor_placement",
          },
        });

        return {
          detached: true as const,
          placementId: input.placementId,
          providerId: input.providerId,
        };
      }),
    detachSponsor: protectedProcedure
      .input(detachLocalSponsorPlacementInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const provider =
          await ctx.resourceProviderRepository.detachSponsor(input);

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "local_sponsor_placement.detach",
          source: "resources.admin.detachSponsor",
          summary: `Desvinculo Local Sponsor Placement de ${provider.name}.`,
          target: {
            id: input.placementId,
            label: `${provider.name} - ${input.placementId}`,
            type: "local_sponsor_placement",
          },
        });

        return provider;
      }),
  }),
});
