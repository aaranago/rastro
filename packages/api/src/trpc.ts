/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1)
 * 2. You want to create a new middleware or type of procedure (see Part 3)
 *
 * tl;dr - this is where all the tRPC server stuff is created and plugged in.
 * The pieces you will need to use are documented accordingly near the end
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod/v4";

import type { Auth } from "@acme/auth";
import type { Database } from "@acme/db/client";

import type { AdminAuditRepository } from "./admin-audit-repository";
import type { AdminMetricsRepository } from "./admin-metrics-repository";
import type { AdminSettingsRepository } from "./admin-settings-repository";
import type { MediaStorage, MediaStorageConfig } from "./media-storage";
import type { MemberSuspensionRepository } from "./member-suspension-repository";
import type { ReportMediaRepository } from "./report-media-repository";
import type { ReportModerationRepository } from "./report-moderation-repository";
import type { ReportRepository } from "./report-repository";
import type { ResourceProviderModerationRepository } from "./resource-provider-moderation-repository";
import type { ResourceProviderRepository } from "./resource-provider-repository";
import { createDrizzleAdminAuditRepository } from "./admin-audit-repository";
import { createDrizzleAdminMetricsRepository } from "./admin-metrics-repository";
import { createDrizzleAdminSettingsRepository } from "./admin-settings-repository";
import {
  createS3MediaStorage,
  createUnavailableMediaStorage,
  parseOptionalMediaStorageConfig,
  resolveMediaDeliveryBaseUrl,
} from "./media-storage";
import { createDrizzleMemberSuspensionRepository } from "./member-suspension-repository";
import { createDrizzleReportMediaRepository } from "./report-media-repository";
import { createDrizzleReportModerationRepository } from "./report-moderation-repository";
import { createDrizzleReportRepository } from "./report-repository";
import { createDrizzleResourceProviderModerationRepository } from "./resource-provider-moderation-repository";
import { createDrizzleResourceProviderRepository } from "./resource-provider-repository";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */

export const createTRPCContext = async (opts: {
  adminEmailList: string | undefined;
  headers: Headers;
  auth: Auth;
}): Promise<{
  adminEmailList: string | undefined;
  adminAuditRepository: AdminAuditRepository;
  adminMetricsRepository: AdminMetricsRepository;
  authApi: Auth["api"];
  adminSettingsRepository: AdminSettingsRepository;
  db: Database;
  mediaRepository: ReportMediaRepository;
  mediaStorageConfig: MediaStorageConfig | null;
  mediaStorage: MediaStorage;
  memberSuspensionRepository: MemberSuspensionRepository;
  reportModerationRepository: ReportModerationRepository;
  reportRepository: ReportRepository;
  resourceProviderModerationRepository: ResourceProviderModerationRepository;
  resourceProviderRepository: ResourceProviderRepository;
  session: Awaited<ReturnType<Auth["api"]["getSession"]>>;
}> => {
  const authApi = opts.auth.api;
  const session = await authApi.getSession({
    headers: opts.headers,
  });
  const { db } = await import("@acme/db/client");
  const mediaStorageConfig = parseOptionalMediaStorageConfig(process.env);
  const mediaDeliveryBaseUrl = mediaStorageConfig
    ? resolveMediaDeliveryBaseUrl({
        configuredDeliveryBaseUrl: mediaStorageConfig.deliveryBaseUrl,
        headers: opts.headers,
      })
    : null;

  return {
    adminEmailList: opts.adminEmailList,
    adminAuditRepository: createDrizzleAdminAuditRepository(db),
    adminMetricsRepository: createDrizzleAdminMetricsRepository(db),
    adminSettingsRepository: createDrizzleAdminSettingsRepository(db),
    authApi,
    db,
    mediaRepository: createDrizzleReportMediaRepository(db, {
      deliveryBaseUrl: mediaStorageConfig?.deliveryBaseUrl,
      uploadSessionExpiresInSeconds: mediaStorageConfig?.presignExpiresSeconds,
    }),
    mediaStorageConfig,
    mediaStorage: mediaStorageConfig
      ? createS3MediaStorage(mediaStorageConfig)
      : createUnavailableMediaStorage(),
    memberSuspensionRepository: createDrizzleMemberSuspensionRepository(db),
    reportModerationRepository: createDrizzleReportModerationRepository(db),
    reportRepository: createDrizzleReportRepository(db, {
      deliveryBaseUrl: mediaDeliveryBaseUrl,
    }),
    resourceProviderModerationRepository:
      createDrizzleResourceProviderModerationRepository(db),
    resourceProviderRepository: createDrizzleResourceProviderRepository(db),
    session,
  };
};
/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError:
        error.cause instanceof ZodError
          ? z.flattenError(error.cause as ZodError<Record<string, unknown>>)
          : null,
    },
  }),
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an articifial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev 100-500ms
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
