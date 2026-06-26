import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

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

export const adminRouter = createTRPCRouter({
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

        return ctx.adminSettingsRepository.update({
          adminId: admin.id,
          ...input,
        });
      }),
  }),
});
