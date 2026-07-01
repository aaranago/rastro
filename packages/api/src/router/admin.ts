import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import {
  createAdminListBaseInputSchema,
  moderationReportReasonSchema,
  reportTypeSchema,
  resourceProviderVerificationStatusSchema,
} from "@acme/validators";

import type {
  AdminAuditListResult,
  PersistedAdminAuditEvent,
  RecordAdminAuditEventInput,
} from "../admin-audit-repository";
import type {
  AdminLocationMetricRow,
  AdminMetricsOverview,
} from "../admin-metrics-repository";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const updateAdminSettingsInputSchema = z.object({
  adoptionReviewModeEnabled: z.boolean(),
  verifiedEmailRequiredToPublish: z.boolean(),
});

const reportModerationTransitionInputSchema = z.object({
  note: z.string().trim().max(1_000).optional(),
  reason: z.string().trim().min(1).max(120),
  reportId: z.uuid(),
});

const memberSearchInputSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  query: z.string().trim().min(1).max(120),
});

const memberProfileInputSchema = z.object({
  memberId: z.string().trim().min(1).max(191),
});

const memberSuspensionTransitionInputSchema = memberProfileInputSchema.extend({
  reason: z.string().trim().min(1).max(1_000),
});

const adminListBaseInputSchema = createAdminListBaseInputSchema();

const adminAuditListInputSchema = z
  .object({
    action: z.string().trim().min(1).max(120).optional(),
    actor: z.string().trim().min(1).max(320).optional(),
    actorId: z.string().trim().min(1).max(191).optional(),
    filters: z
      .object({
        action: z.string().trim().min(1).max(120).optional(),
        actor: z.string().trim().min(1).max(320).optional(),
        actorId: z.string().trim().min(1).max(191).optional(),
        targetType: z.string().trim().min(1).max(120).optional(),
      })
      .optional(),
    limit: z.number().int().min(1).max(100).optional(),
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
    search: z.string().trim().max(160).optional(),
    sortBy: z
      .enum(["action", "actor", "createdAt", "targetLabel", "targetType"])
      .optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    targetType: z.string().trim().min(1).max(120).optional(),
  })
  .optional();

const adminMemberListInputSchema = adminListBaseInputSchema
  .extend({
    filters: z
      .object({
        createdFrom: z.coerce.date().optional(),
        createdTo: z.coerce.date().optional(),
        emailVerification: z.enum(["any", "unverified", "verified"]).optional(),
        suspension: z.enum(["any", "not_suspended", "suspended"]).optional(),
      })
      .optional(),
    sortBy: z
      .enum(["createdAt", "email", "emailVerified", "name", "suspensionStatus"])
      .optional(),
  })
  .optional();

const reportModerationListInputSchema = adminListBaseInputSchema
  .extend({
    filters: z
      .object({
        city: z.string().trim().min(1).max(120).optional(),
        department: z.string().trim().min(1).max(120).optional(),
        falseReportState: z
          .enum(["any", "marked_false", "not_false"])
          .optional(),
        reason: z.string().trim().min(1).max(120).optional(),
        risk: z.enum(["any", "caretaker_suspended", "none"]).optional(),
        type: z.array(reportTypeSchema).max(4).optional(),
        visibility: z.enum(["any", "hidden", "visible"]).optional(),
      })
      .optional(),
    sortBy: z
      .enum([
        "city",
        "createdAt",
        "department",
        "falseReportState",
        "title",
        "type",
        "updatedAt",
        "visibility",
      ])
      .optional(),
  })
  .optional();

const resourceProviderModerationListInputSchema = adminListBaseInputSchema
  .extend({
    filters: z
      .object({
        city: z.string().trim().min(1).max(120).optional(),
        department: z.string().trim().min(1).max(120).optional(),
        reason: z.array(moderationReportReasonSchema).max(8).optional(),
        reporterSuspension: z
          .enum(["any", "none", "reporter_suspended"])
          .optional(),
        status: z
          .array(
            z.enum([
              "dismissed_false_report",
              "pending",
              "resolved_action_taken",
              "resolved_no_action",
            ]),
          )
          .max(4)
          .optional(),
        verification: z
          .array(resourceProviderVerificationStatusSchema)
          .max(2)
          .optional(),
      })
      .optional(),
    sortBy: z
      .enum([
        "city",
        "createdAt",
        "department",
        "lastReportedAt",
        "providerName",
        "reason",
        "status",
        "verification",
      ])
      .optional(),
  })
  .optional();

const reportQueueItemInputSchema = z.object({
  id: z.string().trim().min(1).max(160),
});

const resourceProviderQueueItemInputSchema = z.object({
  reviewItemId: z.uuid(),
});

const resourceProviderReviewResolutionInputSchema =
  resourceProviderQueueItemInputSchema.extend({
    resolutionNote: z.string().trim().max(1_000).optional(),
    resolutionReason: z.string().trim().min(1).max(120),
    status: z.enum([
      "dismissed_false_report",
      "resolved_action_taken",
      "resolved_no_action",
    ]),
  });

const adminAuditRecordInputSchema = z.object({
  action: z.string().trim().min(1).max(120),
  metadata: z.record(z.string(), z.unknown()).optional(),
  source: z.string().trim().min(1).max(120).optional(),
  summary: z.string().trim().min(1).max(1_000),
  target: z.object({
    id: z.string().trim().min(1).max(160),
    label: z.string().trim().min(1).max(240),
    type: z.string().trim().min(1).max(120),
  }),
});

function parseRastroAdminEmails(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(/[\s,]+/)
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0),
  );
}

function requireAdmin(ctx: {
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

async function recordAdminAuditEvent(
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

function toAdminAuditListResponse(result: AdminAuditListResult) {
  const events = result.events.map(toAdminAuditEventResponse);

  return {
    availableFilters: result.availableFilters,
    availableSorts: result.availableSorts,
    events,
    filters: {
      actions: result.availableFilters.actions,
      actors: result.availableFilters.actors.map((actor) => ({
        label: actor.label,
        value: actor.id ?? actor.email ?? actor.label,
      })),
      targetTypes: result.availableFilters.targetTypes,
    },
    hasNextPage: result.hasNextPage,
    hasPreviousPage: result.hasPreviousPage,
    items: events,
    page: result.page,
    pageCount: result.pageCount,
    pageSize: result.pageSize,
    total: result.total,
  };
}

function toAdminAuditEventResponse(event: PersistedAdminAuditEvent) {
  return {
    action: event.action,
    actor: {
      email: event.actor.email,
      id: event.actor.id ?? event.actor.email ?? "admin-no-disponible",
      label: event.actor.label,
    },
    city: readMetadataString(event.metadata, "city"),
    department: readMetadataString(event.metadata, "department"),
    id: event.id,
    occurredAt: event.createdAt,
    summary: event.summary,
    target: event.target,
  };
}

function toAdminMetricsOverviewResponse(overview: AdminMetricsOverview) {
  return {
    byCity: overview.cityRows.map(toAdminMetricsLocationRow),
    byDepartment: overview.departmentRows.map(toAdminMetricsLocationRow),
    generatedAt: overview.generatedAt,
    summary: buildAdminMetricsSummary(overview),
  };
}

function toAdminMetricsLocationRow(row: AdminLocationMetricRow) {
  return {
    abuseReportCount: row.pendingProviderReportCount,
    activeSponsorPlacementCount: row.sponsorPlacementCount,
    auditEventCount: 0,
    city: row.city,
    department: row.department,
    hiddenContentCount: row.hiddenReportCount,
    pendingModerationCount:
      row.pendingProviderReportCount + row.pendingReviewReportCount,
    resourceProviderCount: row.resourceProviderCount,
    sponsorImpressionCount: row.sponsorImpressionCount,
    sponsorOpenCount: row.sponsorOpenCount,
    suspendedMemberCount: 0,
    verifiedResourceProviderCount: row.verifiedResourceProviderCount,
  };
}

function buildAdminMetricsSummary(overview: AdminMetricsOverview) {
  const totals = overview.cityRows.reduce(
    (accumulator, row) => ({
      abuseReportCount:
        accumulator.abuseReportCount + row.pendingProviderReportCount,
      activeSponsorPlacementCount:
        accumulator.activeSponsorPlacementCount + row.sponsorPlacementCount,
      hiddenContentCount:
        accumulator.hiddenContentCount + row.hiddenReportCount,
      pendingModerationCount:
        accumulator.pendingModerationCount +
        row.pendingProviderReportCount +
        row.pendingReviewReportCount,
      resourceProviderCount:
        accumulator.resourceProviderCount + row.resourceProviderCount,
      sponsorImpressionCount:
        accumulator.sponsorImpressionCount + row.sponsorImpressionCount,
      sponsorOpenCount: accumulator.sponsorOpenCount + row.sponsorOpenCount,
      verifiedResourceProviderCount:
        accumulator.verifiedResourceProviderCount +
        row.verifiedResourceProviderCount,
    }),
    {
      abuseReportCount: 0,
      activeSponsorPlacementCount: 0,
      hiddenContentCount: 0,
      pendingModerationCount: 0,
      resourceProviderCount: 0,
      sponsorImpressionCount: 0,
      sponsorOpenCount: 0,
      verifiedResourceProviderCount: 0,
    },
  );

  return {
    ...totals,
    auditEventCount: overview.auditEventCount,
    suspendedMemberCount: overview.suspendedMemberCount,
  };
}

function readMetadataString(
  metadata: Record<string, unknown> | null,
  key: string,
) {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function unwrapAdminListItems<T>(result: { items: T[] } | T[]) {
  return Array.isArray(result) ? result : result.items;
}

export const adminRouter = createTRPCRouter({
  audit: createTRPCRouter({
    list: protectedProcedure
      .input(adminAuditListInputSchema)
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);

        return toAdminAuditListResponse(
          await ctx.adminAuditRepository.list(input ?? {}),
        );
      }),
    record: protectedProcedure
      .input(adminAuditRecordInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireAdmin(ctx);

        return ctx.adminAuditRepository.record({
          action: input.action,
          actor: admin,
          metadata: input.metadata,
          source: input.source ?? "admin.audit.record",
          summary: input.summary,
          target: input.target,
        });
      }),
  }),
  metrics: createTRPCRouter({
    overview: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx);

      return toAdminMetricsOverviewResponse(
        await ctx.adminMetricsRepository.overview(),
      );
    }),
  }),
  members: createTRPCRouter({
    list: protectedProcedure
      .input(adminMemberListInputSchema)
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);

        return ctx.memberSuspensionRepository.listMembers(input ?? {});
      }),
    profile: protectedProcedure
      .input(memberProfileInputSchema)
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const profile = await ctx.memberSuspensionRepository.getMemberProfile(
          input.memberId,
        );

        if (!profile) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return profile;
      }),
    search: protectedProcedure
      .input(memberSearchInputSchema)
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);

        return ctx.memberSuspensionRepository.searchMembers(input);
      }),
    suspend: protectedProcedure
      .input(memberSuspensionTransitionInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireAdmin(ctx);
        const suspension = await ctx.memberSuspensionRepository.suspendMember({
          adminId: admin.id,
          memberId: input.memberId,
          reason: input.reason,
        });

        if (!suspension) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordAdminAuditEvent(ctx, admin, {
          action: "member.suspend",
          metadata: {
            reason: input.reason,
          },
          source: "admin.members.suspend",
          summary: `Suspendio al miembro ${input.memberId}.`,
          target: {
            id: input.memberId,
            label: input.memberId,
            type: "member",
          },
        });

        return suspension;
      }),
    unsuspend: protectedProcedure
      .input(memberSuspensionTransitionInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireAdmin(ctx);
        const suspension = await ctx.memberSuspensionRepository.unsuspendMember(
          {
            adminId: admin.id,
            memberId: input.memberId,
            reason: input.reason,
          },
        );

        if (!suspension) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordAdminAuditEvent(ctx, admin, {
          action: "member.unsuspend",
          metadata: {
            reason: input.reason,
            suspensionId: suspension.id,
          },
          source: "admin.members.unsuspend",
          summary: `Rehabilito al miembro ${input.memberId}.`,
          target: {
            id: input.memberId,
            label: input.memberId,
            type: "member",
          },
        });

        return suspension;
      }),
  }),
  moderation: createTRPCRouter({
    hideReportTarget: protectedProcedure
      .input(reportModerationTransitionInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireAdmin(ctx);
        const item = await ctx.reportModerationRepository.hideReportTarget({
          adminId: admin.id,
          note: input.note,
          reason: input.reason,
          reportId: input.reportId,
        });

        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordAdminAuditEvent(ctx, admin, {
          action: "report.hide",
          metadata: {
            note: input.note ?? null,
            reason: input.reason,
            reportType: item.target.reportType,
          },
          source: "admin.moderation.hideReportTarget",
          summary: `Oculto ${item.target.title}.`,
          target: {
            id: item.target.id,
            label: item.target.title,
            type: item.target.type,
          },
        });

        return item;
      }),
    markFalseReportTarget: protectedProcedure
      .input(reportModerationTransitionInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireAdmin(ctx);
        const item = await ctx.reportModerationRepository.markFalseReportTarget(
          {
            adminId: admin.id,
            note: input.note,
            reason: input.reason,
            reportId: input.reportId,
          },
        );

        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordAdminAuditEvent(ctx, admin, {
          action: "report.mark_false",
          metadata: {
            note: input.note ?? null,
            reason: input.reason,
            reportType: item.target.reportType,
          },
          source: "admin.moderation.markFalseReportTarget",
          summary: `Marco como falso ${item.target.title}.`,
          target: {
            id: item.target.id,
            label: item.target.title,
            type: item.target.type,
          },
        });

        return item;
      }),
    reportQueue: protectedProcedure
      .input(reportModerationListInputSchema)
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);

        return unwrapAdminListItems(
          await ctx.reportModerationRepository.listReportQueue(input ?? {}),
        );
      }),
    reportQueueItem: protectedProcedure
      .input(reportQueueItemInputSchema)
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const item =
          await ctx.reportModerationRepository.getReportQueueItem(input);

        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return item;
      }),
    reportQueueList: protectedProcedure
      .input(reportModerationListInputSchema)
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);

        return ctx.reportModerationRepository.listReportQueue(input ?? {});
      }),
    resolveResourceProviderReviewItem: protectedProcedure
      .input(resourceProviderReviewResolutionInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireAdmin(ctx);
        const item =
          await ctx.resourceProviderModerationRepository.resolveResourceProviderReviewItem(
            {
              adminId: admin.id,
              resolutionNote: input.resolutionNote,
              resolutionReason: input.resolutionReason,
              reviewItemId: input.reviewItemId,
              status: input.status,
            },
          );

        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordAdminAuditEvent(ctx, admin, {
          action: "resource_provider_report.resolve",
          metadata: {
            reason: input.resolutionReason,
            resolutionNote: input.resolutionNote ?? null,
            status: input.status,
          },
          source: "admin.moderation.resolveResourceProviderReviewItem",
          summary: `Resolvio reporte de ${item.provider.name}.`,
          target: {
            id: item.id,
            label: item.provider.name,
            type: "resource_provider_moderation_review",
          },
        });

        return item;
      }),
    resourceProviderQueue: protectedProcedure
      .input(resourceProviderModerationListInputSchema)
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);

        return unwrapAdminListItems(
          await ctx.resourceProviderModerationRepository.listResourceProviderQueue(
            input ?? {},
          ),
        );
      }),
    resourceProviderQueueItem: protectedProcedure
      .input(resourceProviderQueueItemInputSchema)
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);
        const item =
          await ctx.resourceProviderModerationRepository.getResourceProviderQueueItem(
            input,
          );

        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return item;
      }),
    resourceProviderQueueList: protectedProcedure
      .input(resourceProviderModerationListInputSchema)
      .query(async ({ ctx, input }) => {
        requireAdmin(ctx);

        return ctx.resourceProviderModerationRepository.listResourceProviderQueue(
          input ?? {},
        );
      }),
    restoreReportTarget: protectedProcedure
      .input(reportModerationTransitionInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireAdmin(ctx);
        const item = await ctx.reportModerationRepository.restoreReportTarget({
          adminId: admin.id,
          note: input.note,
          reason: input.reason,
          reportId: input.reportId,
        });

        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordAdminAuditEvent(ctx, admin, {
          action: "report.restore",
          metadata: {
            note: input.note ?? null,
            reason: input.reason,
            reportType: item.target.reportType,
          },
          source: "admin.moderation.restoreReportTarget",
          summary: `Restauro ${item.target.title}.`,
          target: {
            id: item.target.id,
            label: item.target.title,
            type: item.target.type,
          },
        });

        return item;
      }),
    unmarkFalseReportTarget: protectedProcedure
      .input(reportModerationTransitionInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireAdmin(ctx);
        const item =
          await ctx.reportModerationRepository.unmarkFalseReportTarget({
            adminId: admin.id,
            note: input.note,
            reason: input.reason,
            reportId: input.reportId,
          });

        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordAdminAuditEvent(ctx, admin, {
          action: "report.unmark_false",
          metadata: {
            note: input.note ?? null,
            reason: input.reason,
            reportType: item.target.reportType,
          },
          source: "admin.moderation.unmarkFalseReportTarget",
          summary: `Reabrio revision de falsedad para ${item.target.title}.`,
          target: {
            id: item.target.id,
            label: item.target.title,
            type: item.target.type,
          },
        });

        return item;
      }),
  }),
  settings: createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx);

      return ctx.adminSettingsRepository.get();
    }),
    update: protectedProcedure
      .input(updateAdminSettingsInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireAdmin(ctx);

        const settings = await ctx.adminSettingsRepository.update({
          adminId: admin.id,
          ...input,
        });

        await recordAdminAuditEvent(ctx, admin, {
          action: "settings.update",
          metadata: {
            adoptionReviewModeEnabled: input.adoptionReviewModeEnabled,
            verifiedEmailRequiredToPublish:
              input.verifiedEmailRequiredToPublish,
          },
          source: "admin.settings.update",
          summary: "Actualizo ajustes globales de publicacion.",
          target: {
            id: "global",
            label: "Ajustes globales",
            type: "admin_settings",
          },
        });

        return settings;
      }),
  }),
});
