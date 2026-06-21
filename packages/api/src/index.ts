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
  createS3MediaStorage,
  parseMediaStorageConfig,
  parseOptionalMediaStorageConfig,
  redactMediaStorageConfig,
} from "./media-storage";
export { createTRPCContext } from "./trpc";
export type { RouterInputs, RouterOutputs };
