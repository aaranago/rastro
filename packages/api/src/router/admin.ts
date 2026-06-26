import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

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

const adminAuditListInputSchema = z
  .object({
    action: z.string().trim().min(1).max(120).optional(),
    actor: z.string().trim().min(1).max(320).optional(),
    actorId: z.string().trim().min(1).max(191).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    targetType: z.string().trim().min(1).max(120).optional(),
  })
  .optional();

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
      record: (
        input: RecordAdminAuditEventInput,
      ) => Promise<unknown>;
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
  return {
    events: result.events.map(toAdminAuditEventResponse),
    filters: {
      actions: result.availableFilters.actions,
      actors: result.availableFilters.actors.map((actor) => ({
        label: actor.label,
        value: actor.id ?? actor.email ?? actor.label,
      })),
      targetTypes: result.availableFilters.targetTypes,
    },
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
    reportQueue: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx);

      return ctx.reportModerationRepository.listReportQueue();
    }),
    resourceProviderQueue: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx);

      return ctx.resourceProviderModerationRepository.listResourceProviderQueue();
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
