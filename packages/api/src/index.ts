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
export {
  buildActiveAlertSubscriptionCondition,
  buildAlertReportCreatedCutoff,
  createDrizzleAlertRepository,
  type AlertRepository,
  type DrizzleAlertRepositoryOptions,
  type PendingAlertNotificationDelivery,
  type PersistedAlertNotificationDelivery,
  type PersistedAlertPushToken,
  type PersistedAlertState,
  type PersistedAlertSubscription,
} from "./alert-repository";
export {
  createExpoPushClient,
  dispatchPendingAlertDeliveries,
  type AlertDeliveryDispatchResult,
  type DispatchPendingAlertDeliveriesInput,
  type ExpoPushClient,
  type ExpoPushClientOptions,
  type ExpoPushMessage,
  type ExpoPushTicket,
  type FetchLike,
} from "./alert-delivery-dispatcher";
export {
  buildAdminMediaObjectKey,
  createDrizzleAdminMediaRepository,
  type AdminMediaRepository,
  type PersistedAdminMediaAsset,
} from "./admin-media-repository";
export { cleanupAbandonedReportMediaUploads } from "./report-media-cleanup";
export {
  buildReportSubjectHref,
  createDrizzleChatRepository,
  type ChatRepository,
  type DrizzleChatRepositoryOptions,
  type PersistedChatBlockedMembership,
  type PersistedChatConversation,
  type PersistedChatConversationReport,
  type PersistedChatMessage,
  type PersistedChatParticipant,
  type PersistedChatSubject,
} from "./chat-repository";
export {
  createDrizzleReportMediaRepository,
  type ReportMediaRepository,
  type PersistedReportMediaUpload,
  type ReportMediaUploadStatus,
} from "./report-media-repository";
export { buildReportChatContactHref } from "./report-repository";
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
  createDrizzleMemberProfileRepository,
  defaultMemberProfileContactPreference,
  type MemberProfileRepository,
} from "./member-profile-repository";
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
