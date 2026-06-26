import { TRPCError } from "@trpc/server";

import {
  attachLocalSponsorPlacementInputSchema,
  createResourceProviderInputSchema,
  createResourceProviderReportInputSchema,
  deleteResourceProviderInputSchema,
  detachLocalSponsorPlacementInputSchema,
  nearbyResourceProvidersInputSchema,
  resourceProviderDetailInputSchema,
  updateLocalSponsorPlacementInputSchema,
  updateResourceProviderInputSchema,
  updateResourceProviderVerificationInputSchema,
} from "@acme/validators";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

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
        "El miembro esta suspendido y no puede reportar Resource Providers.",
    });
  }
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
  admin: createTRPCRouter({
    listProviders: protectedProcedure.query(async ({ ctx }) => {
      requireResourceProviderAdmin(ctx);

      return ctx.resourceProviderRepository.listProviders();
    }),
    listSponsorPlacements: protectedProcedure.query(async ({ ctx }) => {
      requireResourceProviderAdmin(ctx);

      return ctx.resourceProviderRepository.listSponsorPlacements();
    }),
    createProvider: protectedProcedure
      .input(createResourceProviderInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);

        return ctx.resourceProviderRepository.createProvider({
          adminId: admin.id,
          provider: input,
        });
      }),
    updateProvider: protectedProcedure
      .input(updateResourceProviderInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const provider = await ctx.resourceProviderRepository.updateProvider({
          adminId: admin.id,
          provider: input,
        });

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return provider;
      }),
    deleteProvider: protectedProcedure
      .input(deleteResourceProviderInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const deleted = await ctx.resourceProviderRepository.deleteProvider({
          adminId: admin.id,
          provider: input,
        });

        if (!deleted) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

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

        return provider;
      }),
    attachSponsor: protectedProcedure
      .input(attachLocalSponsorPlacementInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const provider = await ctx.resourceProviderRepository.attachSponsor({
          adminId: admin.id,
          sponsorPlacement: input,
        });

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return provider;
      }),
    createSponsor: protectedProcedure
      .input(attachLocalSponsorPlacementInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const placement =
          await ctx.resourceProviderRepository.createSponsorPlacement({
            adminId: admin.id,
            sponsorPlacement: input,
          });

        if (!placement) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return placement;
      }),
    updateSponsor: protectedProcedure
      .input(updateLocalSponsorPlacementInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const placement =
          await ctx.resourceProviderRepository.updateSponsorPlacement({
            adminId: admin.id,
            sponsorPlacement: input,
          });

        if (!placement) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return placement;
      }),
    detachSponsorPlacement: protectedProcedure
      .input(detachLocalSponsorPlacementInputSchema)
      .mutation(async ({ ctx, input }) => {
        requireResourceProviderAdmin(ctx);
        const provider =
          await ctx.resourceProviderRepository.detachSponsor(input);

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return {
          detached: true as const,
          placementId: input.placementId,
          providerId: input.providerId,
        };
      }),
    detachSponsor: protectedProcedure
      .input(detachLocalSponsorPlacementInputSchema)
      .mutation(async ({ ctx, input }) => {
        requireResourceProviderAdmin(ctx);
        const provider =
          await ctx.resourceProviderRepository.detachSponsor(input);

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        return provider;
      }),
  }),
});
