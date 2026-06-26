import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createTRPCRouter, protectedProcedure } from "../trpc";

const updateAdminSettingsInputSchema = z.object({
  adoptionReviewModeEnabled: z.boolean(),
  verifiedEmailRequiredToPublish: z.boolean(),
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
  moderation: createTRPCRouter({
    resourceProviderQueue: protectedProcedure.query(async ({ ctx }) => {
      requireAdmin(ctx);

      return ctx.resourceProviderModerationRepository.listResourceProviderQueue();
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
