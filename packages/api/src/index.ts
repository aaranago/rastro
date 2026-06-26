import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "./root";

/**
 * Inference helpers for input types
 * @example
 * type PostByIdInput = RouterInputs['post']['byId']
 *      ^? { id: number }
 */
type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helpers for output types
 * @example
 * type AllPostsOutput = RouterOutputs['post']['all']
 *      ^? Post[]
 */
type RouterOutputs = inferRouterOutputs<AppRouter>;

export { type AppRouter, appRouter } from "./root";
export { cleanupAbandonedReportMediaUploads } from "./report-media-cleanup";
export {
  createDrizzleReportMediaRepository,
  type ReportMediaRepository,
  type PersistedReportMediaUpload,
  type ReportMediaUploadStatus,
} from "./report-media-repository";
export {
  createDrizzleReportModerationRepository,
  type ReportModerationQueueItem,
  type ReportModerationRepository,
  type ReportModerationTargetType,
} from "./report-moderation-repository";
export {
  createDrizzleResourceProviderModerationRepository,
  createInMemoryResourceProviderModerationRepository,
  type ResourceProviderModerationQueueItem,
  type ResourceProviderModerationRepository,
  type ResourceProviderReportCreationResult,
} from "./resource-provider-moderation-repository";
export {
  createDrizzleMemberSuspensionRepository,
  type AdminMemberModerationReportSummary,
  type AdminMemberProfile,
  type AdminMemberReportSummary,
  type AdminMemberSearchResult,
  type MemberSuspensionRepository,
  type PersistedMemberSuspension,
} from "./member-suspension-repository";
export {
  buildLocalSponsorPlacementPolicy,
  buildNearbyResourceProvidersCondition,
  buildNearbyResourceProvidersDistance,
  buildNearbyResourceProvidersOrigin,
  createDrizzleResourceProviderRepository,
  type PersistedLocalSponsorPlacement,
  type PersistedResourceProvider,
  type PersistedResourceProviderContactOption,
  type PersistedResourceProviderLocation,
  type ResourceProviderRepository,
} from "./resource-provider-repository";
export {
  createS3MediaStorage,
  parseMediaStorageConfig,
  parseOptionalMediaStorageConfig,
  redactMediaStorageConfig,
} from "./media-storage";
export { createTRPCContext } from "./trpc";
export type { RouterInputs, RouterOutputs };
