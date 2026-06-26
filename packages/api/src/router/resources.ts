import { TRPCError } from "@trpc/server";

import {
  attachLocalSponsorPlacementInputSchema,
  createResourceProviderInputSchema,
  deleteResourceProviderInputSchema,
  detachLocalSponsorPlacementInputSchema,
  nearbyResourceProvidersInputSchema,
  resourceProviderDetailInputSchema,
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
  admin: createTRPCRouter({
    listProviders: protectedProcedure.query(async ({ ctx }) => {
      requireResourceProviderAdmin(ctx);

      return ctx.resourceProviderRepository.listProviders();
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
