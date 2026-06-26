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

import type { RecordAdminAuditEventInput } from "../admin-audit-repository";
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

async function recordResourceAdminAuditEvent(
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

        const provider = await ctx.resourceProviderRepository.createProvider({
          adminId: admin.id,
          provider: input,
        });

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "resource_provider.create",
          metadata: {
            category: input.category,
            city: input.location.city,
            department: input.location.department,
          },
          source: "resources.admin.createProvider",
          summary: `Creo Resource Provider ${provider.name}.`,
          target: {
            id: provider.id,
            label: provider.name,
            type: "resource_provider",
          },
        });

        return provider;
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

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "resource_provider.update",
          metadata: {
            changedFields: Object.keys(input).filter(
              (key) => key !== "providerId",
            ),
          },
          source: "resources.admin.updateProvider",
          summary: `Actualizo Resource Provider ${provider.name}.`,
          target: {
            id: provider.id,
            label: provider.name,
            type: "resource_provider",
          },
        });

        return provider;
      }),
    deleteProvider: protectedProcedure
      .input(deleteResourceProviderInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const existingProvider =
          await ctx.resourceProviderRepository.findProfile(input.providerId);

        if (!existingProvider) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const deleted = await ctx.resourceProviderRepository.deleteProvider({
          adminId: admin.id,
          provider: input,
        });

        if (!deleted) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "resource_provider.archive",
          source: "resources.admin.deleteProvider",
          summary: `Archivo Resource Provider ${existingProvider.name}.`,
          target: {
            id: deleted.providerId,
            label: existingProvider.name,
            type: "resource_provider",
          },
        });

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

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "resource_provider.verification_update",
          metadata: {
            note: input.note ?? null,
            status: input.status,
          },
          source: "resources.admin.updateVerification",
          summary: `Actualizo verificacion de ${provider.name}.`,
          target: {
            id: provider.id,
            label: provider.name,
            type: "resource_provider",
          },
        });

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

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "local_sponsor_placement.create",
          metadata: {
            endsOn: input.endsOn,
            startsOn: input.startsOn,
            surface: input.surface,
          },
          source: "resources.admin.attachSponsor",
          summary: `Creo Local Sponsor Placement para ${provider.name}.`,
          target: {
            id: input.placementId ?? input.providerId,
            label: provider.name,
            type: "local_sponsor_placement",
          },
        });

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

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "local_sponsor_placement.create",
          metadata: {
            endsOn: input.endsOn,
            startsOn: input.startsOn,
            surface: input.surface,
          },
          source: "resources.admin.createSponsor",
          summary: `Creo Local Sponsor Placement ${placement.label} para ${placement.providerName}.`,
          target: {
            id: placement.placementId,
            label: `${placement.providerName} - ${placement.surface}`,
            type: "local_sponsor_placement",
          },
        });

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

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "local_sponsor_placement.update",
          metadata: {
            endsOn: input.endsOn,
            startsOn: input.startsOn,
            surface: input.surface,
          },
          source: "resources.admin.updateSponsor",
          summary: `Actualizo Local Sponsor Placement ${placement.label} para ${placement.providerName}.`,
          target: {
            id: placement.placementId,
            label: `${placement.providerName} - ${placement.surface}`,
            type: "local_sponsor_placement",
          },
        });

        return placement;
      }),
    detachSponsorPlacement: protectedProcedure
      .input(detachLocalSponsorPlacementInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const provider =
          await ctx.resourceProviderRepository.detachSponsor(input);

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "local_sponsor_placement.detach",
          source: "resources.admin.detachSponsorPlacement",
          summary: `Desvinculo Local Sponsor Placement de ${provider.name}.`,
          target: {
            id: input.placementId,
            label: `${provider.name} - ${input.placementId}`,
            type: "local_sponsor_placement",
          },
        });

        return {
          detached: true as const,
          placementId: input.placementId,
          providerId: input.providerId,
        };
      }),
    detachSponsor: protectedProcedure
      .input(detachLocalSponsorPlacementInputSchema)
      .mutation(async ({ ctx, input }) => {
        const admin = requireResourceProviderAdmin(ctx);
        const provider =
          await ctx.resourceProviderRepository.detachSponsor(input);

        if (!provider) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await recordResourceAdminAuditEvent(ctx, admin, {
          action: "local_sponsor_placement.detach",
          source: "resources.admin.detachSponsor",
          summary: `Desvinculo Local Sponsor Placement de ${provider.name}.`,
          target: {
            id: input.placementId,
            label: `${provider.name} - ${input.placementId}`,
            type: "local_sponsor_placement",
          },
        });

        return provider;
      }),
  }),
});
