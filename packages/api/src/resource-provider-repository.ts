import type { Database } from "@acme/db/client";
import type {
  ActiveLocalSponsorPlacementsInput,
  AdminResourceProviderListFilters,
  AdminResourceProviderListInput,
  AdminResourceProviderMediaState,
  AdminResourceProviderSortBy,
  AdminResourceProviderSponsorState,
  AdminSponsorPlacementListFilters,
  AdminSponsorPlacementListInput,
  AdminSponsorPlacementSortBy,
  AdminSponsorPlacementState,
  AttachLocalSponsorPlacementInput,
  CreateResourceProviderInput,
  DeleteResourceProviderInput,
  DetachLocalSponsorPlacementInput,
  LocalSponsorPlacementSurface,
  NearbyResourceProvidersInput,
  PublicResourceProviderProfile,
  PublicResourceProviderSummary,
  ResourceProviderCategory,
  ResourceProviderContactKind,
  ResourceProviderVerificationStatus,
  UpdateLocalSponsorPlacementInput,
  UpdateResourceProviderInput,
  UpdateResourceProviderVerificationInput,
} from "@acme/validators";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "@acme/db";
import {
  LocalSponsorPlacement,
  LocalSponsorPlacementDeliveryEvent,
  ResourceProvider,
  ResourceProviderContactOption,
  ResourceProviderLocation,
} from "@acme/db/schema";
import { buildApproximatePublicResourceProviderLocation } from "@acme/validators";

import type {
  AdminListFilterOption,
  AdminListResult,
  AdminListSortOption,
  AdminListSortSpec,
  NormalizedAdminListInput,
} from "./admin-list-contract";
import {
  buildAdminListResult,
  compareAdminListItems,
  normalizeAdminListInput,
} from "./admin-list-contract";
import {
  createSponsorDeliveryToken,
  sponsorDeliveryTokenTtlMs,
} from "./local-sponsor-placement-delivery-token";

export interface PersistedResourceProviderContactOption {
  kind: ResourceProviderContactKind;
  label: string;
  value: string;
}

export interface PersistedResourceProviderLocation {
  addressLabel: string | null;
  publicLatitude: number;
  publicLongitude: number;
  precision: "approximate";
  city: string;
  department: string;
  approximateLocationLabel: string;
  locationCell: string;
}

export interface PersistedLocalSponsorPlacement {
  id: string;
  providerId: string;
  surface: LocalSponsorPlacementSurface;
  label: string;
  disclosure: string;
  logoUrl: string | null;
  imageUrl: string | null;
  startsAt: Date;
  endsAt: Date;
}

export interface PersistedResourceProvider {
  id: string;
  name: string;
  category: ResourceProviderCategory;
  description: string;
  shortDescription: string;
  logoUrl: string | null;
  photoUrl: string | null;
  serviceAreaLabel: string;
  hoursLabel: string;
  websiteUrl: string | null;
  socialLinks: ResourceProviderLink[];
  externalLinks: ResourceProviderLink[];
  emergencyAvailable: boolean;
  isOpenNow: boolean;
  verificationStatus: ResourceProviderVerificationStatus;
  verificationNote: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  location: PersistedResourceProviderLocation;
  contactOptions: PersistedResourceProviderContactOption[];
  sponsorPlacements: PersistedLocalSponsorPlacement[];
}

export interface ResourceProviderLink {
  label: string;
  url: string;
}

export interface AdminResourceProviderSponsorPlacement {
  disclosure: string;
  endsOn: string;
  imageUrl?: string;
  isActive: boolean;
  label: string;
  logoUrl?: string;
  placementId: string;
  startsOn: string;
  surface: LocalSponsorPlacementSurface;
}

export interface AdminLocalSponsorPlacementSafetyPolicy {
  eligibleSurfaces: LocalSponsorPlacementSurface[];
  pushNotifications: {
    eligible: false;
  };
  recoveryPriority: {
    canAffect: false;
    label: "Recovery Priority";
  };
}

export interface AdminLocalSponsorPlacementDeliveryMetrics {
  impressionCount: number;
  openCount: number;
}

export interface AdminLocalSponsorPlacement {
  category: ResourceProviderCategory;
  city: string;
  department: string;
  deliveryMetrics: AdminLocalSponsorPlacementDeliveryMetrics;
  disclosure: string;
  endsOn: string;
  imageUrl?: string;
  isActive: boolean;
  label: string;
  logoUrl?: string;
  placementId: string;
  providerId: string;
  providerName: string;
  providerVerificationStatus: ResourceProviderVerificationStatus;
  safetyPolicy: AdminLocalSponsorPlacementSafetyPolicy;
  startsOn: string;
  surface: LocalSponsorPlacementSurface;
}

export type AdminResourceProviderProfile = PublicResourceProviderProfile & {
  addressLabel?: string;
  city: string;
  department: string;
  sponsorPlacements: AdminResourceProviderSponsorPlacement[];
  updatedAt: Date;
  verificationNote?: string;
};

export type AdminResourceProviderAvailableFilters =
  readonly AdminListFilterOption<
    Extract<keyof AdminResourceProviderListFilters, string>
  >[];

export type AdminResourceProviderListResult = AdminListResult<
  AdminResourceProviderProfile,
  AdminResourceProviderAvailableFilters,
  AdminResourceProviderSortBy
>;

export type AdminSponsorPlacementAvailableFilters =
  readonly AdminListFilterOption<
    Extract<keyof AdminSponsorPlacementListFilters, string>
  >[];

export type AdminSponsorPlacementListResult = AdminListResult<
  AdminLocalSponsorPlacement,
  AdminSponsorPlacementAvailableFilters,
  AdminSponsorPlacementSortBy
>;

export interface ResourceProviderRepository {
  nearby(
    input: NearbyResourceProvidersInput,
  ): Promise<PublicResourceProviderSummary[]>;
  listActiveSponsorPlacements(
    input: ActiveLocalSponsorPlacementsInput,
  ): Promise<PublicResourceProviderSummary[]>;
  findProfile(
    providerId: string,
  ): Promise<PublicResourceProviderProfile | null>;
  listProviders(
    input?: AdminResourceProviderListInput,
  ): Promise<AdminResourceProviderListResult>;
  listSponsorPlacements(
    input?: AdminSponsorPlacementListInput,
  ): Promise<AdminSponsorPlacementListResult>;
  createProvider(input: {
    adminId: string;
    provider: CreateResourceProviderInput;
  }): Promise<PublicResourceProviderProfile>;
  updateProvider(input: {
    adminId: string;
    provider: UpdateResourceProviderInput;
  }): Promise<PublicResourceProviderProfile | null>;
  deleteProvider(input: {
    adminId: string;
    provider: DeleteResourceProviderInput;
  }): Promise<{ deletedAt: Date; providerId: string } | null>;
  updateVerification(input: {
    adminId: string;
    verification: UpdateResourceProviderVerificationInput;
  }): Promise<PublicResourceProviderProfile | null>;
  attachSponsor(input: {
    adminId: string;
    sponsorPlacement: AttachLocalSponsorPlacementInput;
  }): Promise<PublicResourceProviderProfile | null>;
  createSponsorPlacement(input: {
    adminId: string;
    sponsorPlacement: AttachLocalSponsorPlacementInput;
  }): Promise<AdminLocalSponsorPlacement | null>;
  updateSponsorPlacement(input: {
    adminId: string;
    sponsorPlacement: UpdateLocalSponsorPlacementInput;
  }): Promise<AdminLocalSponsorPlacement | null>;
  detachSponsor(
    input: DetachLocalSponsorPlacementInput,
  ): Promise<PublicResourceProviderProfile | null>;
}

type ResourceProviderRow = typeof ResourceProvider.$inferSelect & {
  location: typeof ResourceProviderLocation.$inferSelect | null;
};

type ContactOptionRow = typeof ResourceProviderContactOption.$inferSelect;
type SponsorPlacementRow = typeof LocalSponsorPlacement.$inferSelect;
type PublicLocalSponsorPlacement = NonNullable<
  PublicResourceProviderSummary["sponsorPlacement"]
>;

const publicSponsorPlacementSurfaceOrder: LocalSponsorPlacementSurface[] = [
  "resources_directory",
  "provider_details",
  "launch_home_banner",
  "report_success",
  "contextual_care_resources",
];

export function buildNearbyResourceProvidersOrigin(
  input: NearbyResourceProvidersInput,
) {
  return sql`ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)`;
}

export function buildNearbyResourceProvidersCondition(
  input: NearbyResourceProvidersInput,
) {
  return sql`ST_DWithin(${ResourceProviderLocation.exactPoint}::geography, ${buildNearbyResourceProvidersOrigin(input)}::geography, ${input.radiusMeters})`;
}

export function buildNearbyResourceProvidersDistance(
  input: NearbyResourceProvidersInput,
) {
  return sql<number>`ST_Distance(${ResourceProviderLocation.exactPoint}::geography, ${buildNearbyResourceProvidersOrigin(input)}::geography)`;
}

export function buildLocalSponsorPlacementPolicy(
  placement: Pick<
    PersistedLocalSponsorPlacement,
    "disclosure" | "endsAt" | "id" | "label" | "providerId" | "surface"
  > &
    Partial<Pick<PersistedLocalSponsorPlacement, "imageUrl" | "logoUrl">>,
  options: { now?: Date } = {},
) {
  const now = options.now ?? new Date();
  const logoUrl = sanitizePublicSponsorMediaUrl(placement.logoUrl);
  const imageUrl = sanitizePublicSponsorMediaUrl(placement.imageUrl);
  const expiresAt = new Date(
    Math.min(
      placement.endsAt.getTime(),
      now.getTime() + sponsorDeliveryTokenTtlMs,
    ),
  );

  return {
    kind: "Local Sponsor Placement",
    deliveryToken: createSponsorDeliveryToken({
      expiresAt,
      now,
      placementId: placement.id,
      providerId: placement.providerId,
      surface: placement.surface,
    }),
    label: placement.label,
    disclosure: placement.disclosure,
    ...(logoUrl ? { logoUrl } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    eligibleSurfaces: [placement.surface],
    safetyPolicy: buildLocalSponsorPlacementSafetyPolicy(),
  } satisfies PublicResourceProviderSummary["sponsorPlacement"];
}

function buildLocalSponsorPlacementSafetyPolicy() {
  return {
    recoveryPriority: {
      label: "Recovery Priority",
      canAffect: false,
    },
    pushNotifications: {
      eligible: false,
    },
  } satisfies NonNullable<
    PublicResourceProviderSummary["sponsorPlacement"]
  >["safetyPolicy"];
}

function buildActiveLocalSponsorPlacementPolicies(
  sponsorPlacements: readonly PersistedLocalSponsorPlacement[],
  now: Date,
): PublicLocalSponsorPlacement[] {
  return sponsorPlacements
    .filter((placement) => isSponsorPlacementActive(placement, now))
    .sort(comparePublicSponsorPlacements)
    .map((placement) => buildLocalSponsorPlacementPolicy(placement, { now }));
}

export function toPublicResourceProviderSummary(
  provider: PersistedResourceProvider,
  options: { distanceMeters?: number; now?: Date } = {},
): PublicResourceProviderSummary {
  const activeSponsorPlacements = buildActiveLocalSponsorPlacementPolicies(
    provider.sponsorPlacements,
    options.now ?? new Date(),
  );
  const legacySponsorPlacement = activeSponsorPlacements[0];

  return {
    id: provider.id,
    name: provider.name,
    categoryId: provider.category,
    description: provider.description,
    approximateLocationLabel: provider.location.approximateLocationLabel,
    approximateLocation: {
      latitude: provider.location.publicLatitude,
      longitude: provider.location.publicLongitude,
      precision: provider.location.precision,
      label: provider.location.approximateLocationLabel,
      locationCell: provider.location.locationCell,
    },
    serviceAreaLabel: provider.serviceAreaLabel,
    distanceMeters: options.distanceMeters,
    isVerified: provider.verificationStatus === "verified",
    sponsorPlacement: legacySponsorPlacement,
    activeSponsorPlacements:
      activeSponsorPlacements.length > 0 ? activeSponsorPlacements : undefined,
    isOpenNow: provider.isOpenNow,
    emergencyAvailable: provider.emergencyAvailable,
    logoUrl: provider.logoUrl ?? undefined,
    photoUrl: provider.photoUrl ?? undefined,
    contactOptions: provider.contactOptions.map((contact) => ({ ...contact })),
  };
}

function sanitizePublicSponsorMediaUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed || !/^https?:\/\/\S+$/i.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

function comparePublicSponsorPlacements(
  left: PersistedLocalSponsorPlacement,
  right: PersistedLocalSponsorPlacement,
) {
  const surfaceComparison =
    getPublicSponsorPlacementSurfaceRank(left.surface) -
    getPublicSponsorPlacementSurfaceRank(right.surface);

  if (surfaceComparison !== 0) {
    return surfaceComparison;
  }

  const startsComparison = left.startsAt.getTime() - right.startsAt.getTime();

  if (startsComparison !== 0) {
    return startsComparison;
  }

  return left.id.localeCompare(right.id);
}

function getPublicSponsorPlacementSurfaceRank(
  surface: LocalSponsorPlacementSurface,
) {
  const index = publicSponsorPlacementSurfaceOrder.indexOf(surface);

  return index === -1 ? publicSponsorPlacementSurfaceOrder.length : index;
}

export function toPublicResourceProviderProfile(
  provider: PersistedResourceProvider,
  options: { now?: Date } = {},
): PublicResourceProviderProfile {
  return {
    ...toPublicResourceProviderSummary(provider, options),
    serviceAreaLabel: provider.serviceAreaLabel,
    hoursLabel: provider.hoursLabel,
    shortDescription: provider.shortDescription,
    websiteUrl: provider.websiteUrl ?? undefined,
    socialLinks:
      provider.socialLinks.length > 0
        ? provider.socialLinks.map((link) => ({ ...link }))
        : undefined,
    externalLinks:
      provider.externalLinks.length > 0
        ? provider.externalLinks.map((link) => ({ ...link }))
        : undefined,
  };
}

export function toAdminResourceProviderProfile(
  provider: PersistedResourceProvider,
  options: { now?: Date } = {},
): AdminResourceProviderProfile {
  const now = options.now ?? new Date();

  return {
    ...toPublicResourceProviderProfile(provider, { now }),
    addressLabel: provider.location.addressLabel ?? undefined,
    city: provider.location.city,
    department: provider.location.department,
    sponsorPlacements: provider.sponsorPlacements.map((placement) => ({
      disclosure: placement.disclosure,
      endsOn: toDateOnly(placement.endsAt),
      imageUrl: placement.imageUrl ?? undefined,
      isActive: isSponsorPlacementActive(placement, now),
      label: placement.label,
      logoUrl: placement.logoUrl ?? undefined,
      placementId: placement.id,
      startsOn: toDateOnly(placement.startsAt),
      surface: placement.surface,
    })),
    updatedAt: provider.updatedAt,
    verificationNote: provider.verificationNote ?? undefined,
  };
}

export interface DrizzleResourceProviderRepositoryOptions {
  now?: () => Date;
}

export class SponsorPlacementOverlapError extends Error {
  readonly fieldErrors: Partial<
    Record<"endsOn" | "providerId" | "startsOn" | "surface", string[]>
  >;

  constructor() {
    super(
      "Ya existe un Local Sponsor Placement activo para este proveedor y superficie en esa ventana.",
    );
    this.name = "SponsorPlacementOverlapError";
    this.fieldErrors = {
      endsOn: ["La ventana se cruza con otro patrocinio local activo."],
      startsOn: ["La ventana se cruza con otro patrocinio local activo."],
      surface: ["La superficie ya tiene un patrocinio local en esa ventana."],
    };
  }
}

export function createDrizzleResourceProviderRepository(
  db: Database,
  options: DrizzleResourceProviderRepositoryOptions = {},
): ResourceProviderRepository {
  const now = options.now ?? (() => new Date());

  const findPersistedProviderById = async (
    providerId: string,
  ): Promise<PersistedResourceProvider | null> => {
    const row = await db.query.ResourceProvider.findFirst({
      where: and(
        eq(ResourceProvider.id, providerId),
        isNull(ResourceProvider.deletedAt),
      ),
      with: {
        location: true,
      },
    });

    if (!row) {
      return null;
    }

    const contactOptions = await loadContactOptions(db, row.id);
    const sponsorPlacements = await loadSponsorPlacements(db, row.id);

    return toPersistedResourceProvider(row, contactOptions, sponsorPlacements);
  };

  const repository: ResourceProviderRepository = {
    nearby: async (input) => {
      const filters = [
        isNull(ResourceProvider.deletedAt),
        buildNearbyResourceProvidersCondition(input),
        input.categoryIds
          ? inArray(ResourceProvider.category, input.categoryIds)
          : undefined,
      ].filter((filter) => filter !== undefined);
      const distance = buildNearbyResourceProvidersDistance(input);
      const rows = await db
        .select({
          distanceMeters: distance,
          id: ResourceProvider.id,
        })
        .from(ResourceProvider)
        .innerJoin(
          ResourceProviderLocation,
          eq(ResourceProviderLocation.providerId, ResourceProvider.id),
        )
        .where(and(...filters))
        .orderBy(distance)
        .limit(input.limit);
      const providers = await Promise.all(
        rows.map(async (row) => {
          const provider = await findPersistedProviderById(row.id);

          return provider
            ? toPublicResourceProviderSummary(provider, {
                distanceMeters: Math.round(row.distanceMeters),
                now: now(),
              })
            : null;
        }),
      );

      return providers.filter((provider) => provider !== null);
    },
    findProfile: async (providerId) => {
      const provider = await findPersistedProviderById(providerId);

      return provider
        ? toPublicResourceProviderProfile(provider, { now: now() })
        : null;
    },
    listActiveSponsorPlacements: async (input) => {
      const currentNow = now();
      const rotationSeed = `${input.surface}:${currentNow.toISOString().slice(0, 10)}`;
      const rows = await db
        .select({
          placementId: LocalSponsorPlacement.id,
          providerId: LocalSponsorPlacement.providerId,
        })
        .from(LocalSponsorPlacement)
        .innerJoin(
          ResourceProvider,
          eq(ResourceProvider.id, LocalSponsorPlacement.providerId),
        )
        .where(
          and(
            eq(LocalSponsorPlacement.surface, input.surface),
            isNull(LocalSponsorPlacement.detachedAt),
            isNull(ResourceProvider.deletedAt),
            lte(LocalSponsorPlacement.startsAt, currentNow),
            gte(LocalSponsorPlacement.endsAt, currentNow),
          ),
        )
        .orderBy(
          sql`md5(${LocalSponsorPlacement.id}::text || ${rotationSeed})`,
          asc(LocalSponsorPlacement.id),
        )
        .limit(input.limit);
      const summaries: PublicResourceProviderSummary[] = [];
      const seenProviderIds = new Set<string>();

      for (const row of rows) {
        if (seenProviderIds.has(row.providerId)) {
          continue;
        }

        const provider = await findPersistedProviderById(row.providerId);

        if (!provider) {
          continue;
        }

        const summary = toPublicResourceProviderSummary(provider, {
          now: currentNow,
        });
        const surfaceSponsorPlacements = (
          summary.activeSponsorPlacements ?? []
        ).filter((placement) =>
          placement.eligibleSurfaces.includes(input.surface),
        );

        if (surfaceSponsorPlacements.length === 0) {
          continue;
        }

        summaries.push({
          ...summary,
          sponsorPlacement: surfaceSponsorPlacements[0],
          activeSponsorPlacements: surfaceSponsorPlacements,
        });
        seenProviderIds.add(row.providerId);
      }

      return summaries;
    },
    listProviders: async (input) => {
      const currentNow = now();
      const normalized = normalizeAdminResourceProviderListInput(input);
      const filters = buildAdminResourceProviderQueryFilters(
        normalized,
        currentNow,
      );
      const whereClause = filters.length > 0 ? and(...filters) : sql`true`;
      const [countRow] = await db
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(ResourceProvider)
        .innerJoin(
          ResourceProviderLocation,
          eq(ResourceProviderLocation.providerId, ResourceProvider.id),
        )
        .where(whereClause);
      const rows = await db
        .select({
          id: ResourceProvider.id,
        })
        .from(ResourceProvider)
        .innerJoin(
          ResourceProviderLocation,
          eq(ResourceProviderLocation.providerId, ResourceProvider.id),
        )
        .where(whereClause)
        .orderBy(
          ...buildAdminResourceProviderQueryOrderBy(normalized, currentNow),
        )
        .limit(normalized.pageSize)
        .offset(normalized.offset);
      const orderedIds = rows.map((row) => row.id);
      const providers = await listAdminResourceProviderProfilesById(db, {
        now: currentNow,
        providerIds: orderedIds,
      });
      const providerById = new Map(
        providers.map((provider) => [provider.id, provider]),
      );

      return buildAdminListResult({
        availableFilters: adminResourceProviderAvailableFilters,
        availableSorts: adminResourceProviderAvailableSorts,
        items: orderedIds
          .map((id) => providerById.get(id))
          .filter((provider) => provider !== undefined),
        page: normalized.page,
        pageSize: normalized.pageSize,
        total: Number(countRow?.total ?? 0),
      });
    },
    listSponsorPlacements: async (input) => {
      const currentNow = now();
      const normalized = normalizeAdminSponsorPlacementListInput(input);
      const filters = buildAdminSponsorPlacementQueryFilters(
        normalized,
        currentNow,
      );
      const whereClause = and(
        isNull(LocalSponsorPlacement.detachedAt),
        ...(filters.length > 0 ? filters : [sql`true`]),
      );
      const [countRow] = await db
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(LocalSponsorPlacement)
        .innerJoin(
          ResourceProvider,
          eq(ResourceProvider.id, LocalSponsorPlacement.providerId),
        )
        .innerJoin(
          ResourceProviderLocation,
          eq(ResourceProviderLocation.providerId, ResourceProvider.id),
        )
        .where(whereClause);
      const rows = await db
        .select(adminSponsorPlacementSelectFields)
        .from(LocalSponsorPlacement)
        .innerJoin(
          ResourceProvider,
          eq(ResourceProvider.id, LocalSponsorPlacement.providerId),
        )
        .innerJoin(
          ResourceProviderLocation,
          eq(ResourceProviderLocation.providerId, ResourceProvider.id),
        )
        .where(whereClause)
        .orderBy(
          ...buildAdminSponsorPlacementQueryOrderBy(normalized, currentNow),
        )
        .limit(normalized.pageSize)
        .offset(normalized.offset);

      return buildAdminListResult({
        availableFilters: adminSponsorPlacementAvailableFilters,
        availableSorts: adminSponsorPlacementAvailableSorts,
        items: rows.map((row) =>
          toAdminLocalSponsorPlacementFromQueryRow(row, {
            now: currentNow,
          }),
        ),
        page: normalized.page,
        pageSize: normalized.pageSize,
        total: Number(countRow?.total ?? 0),
      });
    },
    createProvider: async ({ adminId, provider }) => {
      const createdProviderId = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(ResourceProvider)
          .values({
            category: provider.category,
            createdByAdminId: adminId,
            description: provider.description,
            emergencyAvailable: provider.emergencyAvailable,
            externalLinks: provider.externalLinks ?? null,
            hoursLabel: provider.hoursLabel,
            isOpenNow: provider.isOpenNow,
            logoUrl: provider.logoUrl ?? null,
            name: provider.name,
            photoUrl: provider.photoUrl ?? null,
            serviceAreaLabel: provider.serviceAreaLabel,
            shortDescription: provider.shortDescription,
            socialLinks: provider.socialLinks ?? null,
            websiteUrl: provider.websiteUrl ?? null,
          })
          .returning({ id: ResourceProvider.id });

        if (!created) {
          throw new Error("Resource Provider could not be created.");
        }

        await tx.insert(ResourceProviderLocation).values(
          buildResourceProviderLocationWriteValues({
            location: provider.location,
            providerId: created.id,
          }),
        );

        await tx.insert(ResourceProviderContactOption).values(
          buildResourceProviderContactOptionWriteValues({
            contactOptions: provider.contactOptions,
            providerId: created.id,
          }),
        );

        return created.id;
      });

      const createdProvider = await repository.findProfile(createdProviderId);
      if (!createdProvider) {
        throw new Error("Created Resource Provider could not be reloaded.");
      }

      return createdProvider;
    },
    updateProvider: async ({ provider }) => {
      const updatedProviderId = await db.transaction(async (tx) => {
        const providerUpdate = buildResourceProviderUpdateValues({
          provider,
          updatedAt: now(),
        });

        const [updated] = await tx
          .update(ResourceProvider)
          .set(providerUpdate)
          .where(
            and(
              eq(ResourceProvider.id, provider.providerId),
              isNull(ResourceProvider.deletedAt),
            ),
          )
          .returning({ id: ResourceProvider.id });

        if (!updated) {
          return null;
        }

        if (provider.location) {
          await tx
            .update(ResourceProviderLocation)
            .set(buildResourceProviderLocationUpdateValues(provider.location))
            .where(
              eq(ResourceProviderLocation.providerId, provider.providerId),
            );
        }

        if (provider.contactOptions) {
          await tx
            .delete(ResourceProviderContactOption)
            .where(
              eq(ResourceProviderContactOption.providerId, provider.providerId),
            );
          await tx.insert(ResourceProviderContactOption).values(
            buildResourceProviderContactOptionWriteValues({
              contactOptions: provider.contactOptions,
              providerId: provider.providerId,
            }),
          );
        }

        return updated.id;
      });

      return updatedProviderId
        ? repository.findProfile(updatedProviderId)
        : null;
    },
    deleteProvider: async ({ provider }) => {
      const deletedAt = now();
      const [deleted] = await db
        .update(ResourceProvider)
        .set({
          deletedAt,
          updatedAt: deletedAt,
        })
        .where(
          and(
            eq(ResourceProvider.id, provider.providerId),
            isNull(ResourceProvider.deletedAt),
          ),
        )
        .returning({ id: ResourceProvider.id });

      return deleted ? { deletedAt, providerId: deleted.id } : null;
    },
    updateVerification: async ({ adminId, verification }) => {
      const [updated] = await db
        .update(ResourceProvider)
        .set({
          verificationNote: verification.note ?? null,
          verificationStatus: verification.status,
          verificationUpdatedByAdminId: adminId,
          verifiedAt: verification.status === "verified" ? now() : null,
        })
        .where(
          and(
            eq(ResourceProvider.id, verification.providerId),
            isNull(ResourceProvider.deletedAt),
          ),
        )
        .returning({ id: ResourceProvider.id });

      return updated ? repository.findProfile(updated.id) : null;
    },
    attachSponsor: async ({ adminId, sponsorPlacement }) => {
      const created = await repository.createSponsorPlacement({
        adminId,
        sponsorPlacement,
      });

      return created
        ? repository.findProfile(sponsorPlacement.providerId)
        : null;
    },
    createSponsorPlacement: async ({ adminId, sponsorPlacement }) => {
      const existing = await findPersistedProviderById(
        sponsorPlacement.providerId,
      );

      if (!existing) {
        return null;
      }

      const insertValue: typeof LocalSponsorPlacement.$inferInsert = {
        createdByAdminId: adminId,
        disclosure: sponsorPlacement.disclosure,
        endsAt: endOfDateOnlyUtc(sponsorPlacement.endsOn),
        imageUrl: sponsorPlacement.imageUrl ?? null,
        label: sponsorPlacement.label,
        logoUrl: sponsorPlacement.logoUrl ?? null,
        providerId: sponsorPlacement.providerId,
        startsAt: startOfDateOnlyUtc(sponsorPlacement.startsOn),
        surface: sponsorPlacement.surface,
      };

      if (sponsorPlacement.placementId) {
        insertValue.id = sponsorPlacement.placementId;
      }

      await assertNoOverlappingSponsorPlacement(db, {
        endsAt: insertValue.endsAt,
        providerId: sponsorPlacement.providerId,
        startsAt: insertValue.startsAt,
        surface: sponsorPlacement.surface,
      });

      const [created] = await db
        .insert(LocalSponsorPlacement)
        .values(insertValue)
        .returning({ id: LocalSponsorPlacement.id });

      return findAdminSponsorPlacementById(
        sponsorPlacement.providerId,
        created?.id ?? null,
      );
    },
    updateSponsorPlacement: async ({ sponsorPlacement }) => {
      const provider = await findPersistedProviderById(
        sponsorPlacement.providerId,
      );

      if (!provider) {
        return null;
      }

      const startsAt = startOfDateOnlyUtc(sponsorPlacement.startsOn);
      const endsAt = endOfDateOnlyUtc(sponsorPlacement.endsOn);
      const [existing] = await db
        .select({ id: LocalSponsorPlacement.id })
        .from(LocalSponsorPlacement)
        .where(
          and(
            eq(LocalSponsorPlacement.id, sponsorPlacement.placementId),
            eq(LocalSponsorPlacement.providerId, sponsorPlacement.providerId),
            isNull(LocalSponsorPlacement.detachedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        return null;
      }

      await assertNoOverlappingSponsorPlacement(db, {
        endsAt,
        excludingPlacementId: sponsorPlacement.placementId,
        providerId: sponsorPlacement.providerId,
        startsAt,
        surface: sponsorPlacement.surface,
      });

      const [updated] = await db
        .update(LocalSponsorPlacement)
        .set({
          disclosure: sponsorPlacement.disclosure,
          endsAt,
          label: sponsorPlacement.label,
          startsAt,
          surface: sponsorPlacement.surface,
          updatedAt: now(),
          ...omitUndefinedProperties({
            imageUrl: sponsorPlacement.imageUrl,
            logoUrl: sponsorPlacement.logoUrl,
          }),
        })
        .where(
          and(
            eq(LocalSponsorPlacement.id, sponsorPlacement.placementId),
            eq(LocalSponsorPlacement.providerId, sponsorPlacement.providerId),
            isNull(LocalSponsorPlacement.detachedAt),
          ),
        )
        .returning({ id: LocalSponsorPlacement.id });

      return updated
        ? findAdminSponsorPlacementById(
            sponsorPlacement.providerId,
            sponsorPlacement.placementId,
          )
        : null;
    },
    detachSponsor: async (input) => {
      const provider = await findPersistedProviderById(input.providerId);

      if (!provider) {
        return null;
      }

      const detachedAt = now();
      const [detached] = await db
        .update(LocalSponsorPlacement)
        .set({
          detachedAt,
          updatedAt: detachedAt,
        })
        .where(
          and(
            eq(LocalSponsorPlacement.id, input.placementId),
            eq(LocalSponsorPlacement.providerId, input.providerId),
            isNull(LocalSponsorPlacement.detachedAt),
          ),
        )
        .returning({ id: LocalSponsorPlacement.id });

      return detached ? repository.findProfile(input.providerId) : null;
    },
  };

  async function findAdminSponsorPlacementById(
    providerId: string,
    placementId: string | null,
  ): Promise<AdminLocalSponsorPlacement | null> {
    if (!placementId) {
      return null;
    }

    const [row] = await db
      .select(adminSponsorPlacementSelectFields)
      .from(LocalSponsorPlacement)
      .innerJoin(
        ResourceProvider,
        eq(ResourceProvider.id, LocalSponsorPlacement.providerId),
      )
      .innerJoin(
        ResourceProviderLocation,
        eq(ResourceProviderLocation.providerId, ResourceProvider.id),
      )
      .where(
        and(
          eq(LocalSponsorPlacement.id, placementId),
          eq(LocalSponsorPlacement.providerId, providerId),
          isNull(LocalSponsorPlacement.detachedAt),
          isNull(ResourceProvider.deletedAt),
        ),
      )
      .limit(1);

    return row
      ? toAdminLocalSponsorPlacementFromQueryRow(row, { now: now() })
      : null;
  }

  return repository;
}

async function assertNoOverlappingSponsorPlacement(
  db: Database,
  input: {
    endsAt: Date;
    excludingPlacementId?: string;
    providerId: string;
    startsAt: Date;
    surface: LocalSponsorPlacementSurface;
  },
) {
  const filters = [
    eq(LocalSponsorPlacement.providerId, input.providerId),
    eq(LocalSponsorPlacement.surface, input.surface),
    isNull(LocalSponsorPlacement.detachedAt),
    lte(LocalSponsorPlacement.startsAt, input.endsAt),
    gte(LocalSponsorPlacement.endsAt, input.startsAt),
    input.excludingPlacementId
      ? sql`${LocalSponsorPlacement.id} <> ${input.excludingPlacementId}`
      : undefined,
  ].filter((filter) => filter !== undefined);
  const [overlapping] = await db
    .select({ id: LocalSponsorPlacement.id })
    .from(LocalSponsorPlacement)
    .where(and(...filters))
    .limit(1);

  if (overlapping) {
    throw new SponsorPlacementOverlapError();
  }
}

async function loadContactOptions(db: Database, providerId: string) {
  return db
    .select()
    .from(ResourceProviderContactOption)
    .where(eq(ResourceProviderContactOption.providerId, providerId))
    .orderBy(asc(ResourceProviderContactOption.sortOrder));
}

async function loadSponsorPlacements(db: Database, providerId: string) {
  return db
    .select()
    .from(LocalSponsorPlacement)
    .where(
      and(
        eq(LocalSponsorPlacement.providerId, providerId),
        isNull(LocalSponsorPlacement.detachedAt),
      ),
    );
}

async function listAdminResourceProviderProfilesById(
  db: Database,
  input: {
    now: Date;
    providerIds: readonly string[];
  },
): Promise<AdminResourceProviderProfile[]> {
  const providerIds = [...new Set(input.providerIds)];

  if (providerIds.length === 0) {
    return [];
  }

  const rows = await db.query.ResourceProvider.findMany({
    where: inArray(ResourceProvider.id, providerIds),
    with: {
      location: true,
    },
  });
  const contactOptionsByProviderId = await loadContactOptionsForProviders(
    db,
    providerIds,
  );
  const sponsorPlacementsByProviderId = await loadSponsorPlacementsForProviders(
    db,
    providerIds,
  );

  return rows.map((row) =>
    toAdminResourceProviderProfile(
      toPersistedResourceProvider(
        row,
        contactOptionsByProviderId.get(row.id) ?? [],
        sponsorPlacementsByProviderId.get(row.id) ?? [],
      ),
      { now: input.now },
    ),
  );
}

async function loadContactOptionsForProviders(
  db: Database,
  providerIds: readonly string[],
) {
  const rows = await db
    .select()
    .from(ResourceProviderContactOption)
    .where(inArray(ResourceProviderContactOption.providerId, providerIds))
    .orderBy(
      asc(ResourceProviderContactOption.providerId),
      asc(ResourceProviderContactOption.sortOrder),
    );

  return groupRowsByProviderId(rows);
}

async function loadSponsorPlacementsForProviders(
  db: Database,
  providerIds: readonly string[],
) {
  const rows = await db
    .select()
    .from(LocalSponsorPlacement)
    .where(
      and(
        inArray(LocalSponsorPlacement.providerId, providerIds),
        isNull(LocalSponsorPlacement.detachedAt),
      ),
    )
    .orderBy(
      asc(LocalSponsorPlacement.providerId),
      asc(LocalSponsorPlacement.startsAt),
      asc(LocalSponsorPlacement.id),
    );

  return groupRowsByProviderId(rows);
}

function groupRowsByProviderId<T extends { providerId: string }>(
  rows: readonly T[],
) {
  const rowsByProviderId = new Map<string, T[]>();

  for (const row of rows) {
    rowsByProviderId.set(row.providerId, [
      ...(rowsByProviderId.get(row.providerId) ?? []),
      row,
    ]);
  }

  return rowsByProviderId;
}

export function derivePublicResourceProviderLocation(
  location: Pick<
    CreateResourceProviderInput["location"],
    "exactLatitude" | "exactLongitude"
  >,
) {
  const approximateLocation = buildApproximatePublicResourceProviderLocation({
    exactLatitude: location.exactLatitude,
    exactLongitude: location.exactLongitude,
  });

  return {
    publicLatitude: approximateLocation.approximateLatitude,
    publicLongitude: approximateLocation.approximateLongitude,
  };
}

export function buildResourceProviderLocationWriteValues({
  location,
  providerId,
}: {
  location: CreateResourceProviderInput["location"];
  providerId: string;
}) {
  const publicLocation = derivePublicResourceProviderLocation(location);

  return {
    addressLabel: location.addressLabel ?? null,
    approximateLocationLabel: location.approximateLocationLabel,
    city: location.city,
    department: location.department,
    exactLatitude: location.exactLatitude,
    exactLongitude: location.exactLongitude,
    exactPoint: {
      x: location.exactLongitude,
      y: location.exactLatitude,
    },
    locationCell: location.locationCell,
    providerId,
    publicLatitude: publicLocation.publicLatitude,
    publicLongitude: publicLocation.publicLongitude,
    publicPoint: {
      x: publicLocation.publicLongitude,
      y: publicLocation.publicLatitude,
    },
    publicPrecision: "approximate" as const,
  };
}

export function buildResourceProviderLocationUpdateValues(
  location: UpdateResourceProviderInput["location"],
) {
  if (!location) {
    return {};
  }

  const exactLocation =
    location.exactLatitude !== undefined &&
    location.exactLongitude !== undefined
      ? buildExactResourceProviderLocationUpdateValues({
          exactLatitude: location.exactLatitude,
          exactLongitude: location.exactLongitude,
        })
      : {};

  return omitUndefinedProperties({
    ...exactLocation,
    addressLabel: location.addressLabel,
    approximateLocationLabel: location.approximateLocationLabel,
    city: location.city,
    department: location.department,
    locationCell: location.locationCell,
  }) as Partial<typeof ResourceProviderLocation.$inferInsert>;
}

function buildExactResourceProviderLocationUpdateValues({
  exactLatitude,
  exactLongitude,
}: {
  exactLatitude: number;
  exactLongitude: number;
}) {
  const publicLocation = derivePublicResourceProviderLocation({
    exactLatitude,
    exactLongitude,
  });

  return {
    exactLatitude,
    exactLongitude,
    exactPoint: {
      x: exactLongitude,
      y: exactLatitude,
    },
    publicLatitude: publicLocation.publicLatitude,
    publicLongitude: publicLocation.publicLongitude,
    publicPoint: {
      x: publicLocation.publicLongitude,
      y: publicLocation.publicLatitude,
    },
    publicPrecision: "approximate" as const,
  };
}

export function buildResourceProviderContactOptionWriteValues({
  contactOptions,
  providerId,
}: {
  contactOptions: CreateResourceProviderInput["contactOptions"];
  providerId: string;
}) {
  return contactOptions.map((contact, index) => ({
    kind: contact.kind,
    label: contact.label,
    providerId,
    sortOrder: index,
    value: contact.value,
  }));
}

export function buildResourceProviderUpdateValues({
  provider,
  updatedAt,
}: {
  provider: UpdateResourceProviderInput;
  updatedAt: Date;
}): Partial<typeof ResourceProvider.$inferInsert> {
  return omitUndefinedProperties({
    category: provider.category,
    description: provider.description,
    emergencyAvailable: provider.emergencyAvailable,
    externalLinks: provider.externalLinks,
    hoursLabel: provider.hoursLabel,
    isOpenNow: provider.isOpenNow,
    logoUrl: provider.logoUrl,
    name: provider.name,
    photoUrl: provider.photoUrl,
    serviceAreaLabel: provider.serviceAreaLabel,
    shortDescription: provider.shortDescription,
    socialLinks: provider.socialLinks,
    updatedAt,
    websiteUrl: provider.websiteUrl,
  }) as Partial<typeof ResourceProvider.$inferInsert>;
}

function omitUndefinedProperties<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}

function toPersistedResourceProvider(
  row: ResourceProviderRow,
  contactOptions: ContactOptionRow[],
  sponsorPlacements: SponsorPlacementRow[],
): PersistedResourceProvider {
  if (!row.location) {
    throw new Error(`Resource Provider ${row.id} is missing its location row.`);
  }

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    shortDescription: row.shortDescription,
    logoUrl: row.logoUrl,
    photoUrl: row.photoUrl,
    serviceAreaLabel: row.serviceAreaLabel,
    hoursLabel: row.hoursLabel,
    websiteUrl: row.websiteUrl,
    socialLinks: row.socialLinks ?? [],
    externalLinks: row.externalLinks ?? [],
    emergencyAvailable: row.emergencyAvailable,
    isOpenNow: row.isOpenNow,
    verificationStatus: row.verificationStatus,
    verificationNote: row.verificationNote,
    verifiedAt: row.verifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    location: {
      addressLabel: row.location.addressLabel,
      publicLatitude: row.location.publicLatitude,
      publicLongitude: row.location.publicLongitude,
      precision: "approximate",
      city: row.location.city,
      department: row.location.department,
      approximateLocationLabel: row.location.approximateLocationLabel,
      locationCell: row.location.locationCell,
    },
    contactOptions: contactOptions.map((contact) => ({
      kind: contact.kind,
      label: contact.label,
      value: contact.value,
    })),
    sponsorPlacements: sponsorPlacements.map((placement) => ({
      id: placement.id,
      providerId: row.id,
      surface: placement.surface,
      label: placement.label,
      disclosure: placement.disclosure,
      startsAt: placement.startsAt,
      endsAt: placement.endsAt,
      logoUrl: placement.logoUrl,
      imageUrl: placement.imageUrl,
    })),
  };
}

export function toAdminLocalSponsorPlacements(
  providers: readonly AdminResourceProviderProfile[],
): AdminLocalSponsorPlacement[] {
  return providers
    .flatMap((provider) =>
      provider.sponsorPlacements.map((placement) => ({
        category: provider.categoryId,
        city: provider.city,
        department: provider.department,
        deliveryMetrics: emptySponsorPlacementDeliveryMetrics(),
        disclosure: placement.disclosure,
        endsOn: placement.endsOn,
        imageUrl: placement.imageUrl,
        isActive: placement.isActive,
        label: placement.label,
        logoUrl: placement.logoUrl,
        placementId: placement.placementId,
        providerId: provider.id,
        providerName: provider.name,
        providerVerificationStatus:
          getAdminProviderVerificationStatus(provider),
        safetyPolicy: {
          eligibleSurfaces: [placement.surface],
          ...buildLocalSponsorPlacementSafetyPolicy(),
        },
        startsOn: placement.startsOn,
        surface: placement.surface,
      })),
    )
    .sort((left, right) => {
      const dateComparison = left.startsOn.localeCompare(right.startsOn);

      return dateComparison === 0
        ? left.providerName.localeCompare(right.providerName)
        : dateComparison;
    });
}

const adminSponsorPlacementSelectFields = {
  category: ResourceProvider.category,
  city: ResourceProviderLocation.city,
  department: ResourceProviderLocation.department,
  sponsorImpressionCount:
    sponsorPlacementDeliveryEventCountExpression("impression"),
  sponsorOpenCount: sponsorPlacementDeliveryEventCountExpression("open"),
  disclosure: LocalSponsorPlacement.disclosure,
  endsAt: LocalSponsorPlacement.endsAt,
  imageUrl: LocalSponsorPlacement.imageUrl,
  label: LocalSponsorPlacement.label,
  logoUrl: LocalSponsorPlacement.logoUrl,
  placementId: LocalSponsorPlacement.id,
  providerId: ResourceProvider.id,
  providerName: ResourceProvider.name,
  providerVerificationStatus: ResourceProvider.verificationStatus,
  startsAt: LocalSponsorPlacement.startsAt,
  surface: LocalSponsorPlacement.surface,
};

interface AdminSponsorPlacementQueryRow {
  category: ResourceProviderCategory;
  city: string;
  department: string;
  sponsorImpressionCount: number;
  sponsorOpenCount: number;
  disclosure: string;
  endsAt: Date;
  imageUrl: string | null;
  label: string;
  logoUrl: string | null;
  placementId: string;
  providerId: string;
  providerName: string;
  providerVerificationStatus: ResourceProviderVerificationStatus;
  startsAt: Date;
  surface: LocalSponsorPlacementSurface;
}

function toAdminLocalSponsorPlacementFromQueryRow(
  row: AdminSponsorPlacementQueryRow,
  options: { now?: Date } = {},
): AdminLocalSponsorPlacement {
  const persistedPlacement = {
    disclosure: row.disclosure,
    endsAt: row.endsAt,
    id: row.placementId,
    imageUrl: row.imageUrl,
    label: row.label,
    logoUrl: row.logoUrl,
    providerId: row.providerId,
    startsAt: row.startsAt,
    surface: row.surface,
  } satisfies PersistedLocalSponsorPlacement;
  const policy = buildLocalSponsorPlacementPolicy(persistedPlacement, {
    now: options.now,
  });

  return {
    category: row.category,
    city: row.city,
    department: row.department,
    deliveryMetrics: {
      impressionCount: Number(row.sponsorImpressionCount),
      openCount: Number(row.sponsorOpenCount),
    },
    disclosure: row.disclosure,
    endsOn: toDateOnly(row.endsAt),
    imageUrl: row.imageUrl ?? undefined,
    isActive: isSponsorPlacementActive(
      persistedPlacement,
      options.now ?? new Date(),
    ),
    label: row.label,
    logoUrl: row.logoUrl ?? undefined,
    placementId: row.placementId,
    providerId: row.providerId,
    providerName: row.providerName,
    providerVerificationStatus: row.providerVerificationStatus,
    safetyPolicy: {
      eligibleSurfaces: policy.eligibleSurfaces,
      ...policy.safetyPolicy,
    },
    startsOn: toDateOnly(row.startsAt),
    surface: row.surface,
  };
}

function sponsorPlacementDeliveryEventCountExpression(
  eventType: "impression" | "open",
) {
  return sql<number>`coalesce((
    select count(*)::int
    from ${LocalSponsorPlacementDeliveryEvent}
    where ${LocalSponsorPlacementDeliveryEvent.placementId} = ${LocalSponsorPlacement.id}
      and ${LocalSponsorPlacementDeliveryEvent.providerId} = ${ResourceProvider.id}
      and ${LocalSponsorPlacementDeliveryEvent.surface} = ${LocalSponsorPlacement.surface}
      and ${LocalSponsorPlacementDeliveryEvent.eventType} = ${eventType}
  ), 0)`;
}

function emptySponsorPlacementDeliveryMetrics(): AdminLocalSponsorPlacementDeliveryMetrics {
  return {
    impressionCount: 0,
    openCount: 0,
  };
}

function getAdminProviderVerificationStatus(
  provider: Pick<AdminResourceProviderProfile, "isVerified">,
): ResourceProviderVerificationStatus {
  return provider.isVerified ? "verified" : "unverified";
}

export function buildAdminResourceProviderListResult(
  providers: readonly AdminResourceProviderProfile[],
  input?: AdminResourceProviderListInput,
  options: { now?: Date } = {},
): AdminResourceProviderListResult {
  const currentNow = options.now ?? new Date();
  const normalized = normalizeAdminListInput<
    AdminResourceProviderListFilters,
    AdminResourceProviderSortBy
  >(withDefaultAdminResourceListPageSize(input), {
    defaultFilters: defaultAdminResourceProviderListFilters(),
    defaultSortBy: "name",
    defaultSortDirection: "asc",
  });
  const filteredProviders = providers
    .filter((provider) =>
      matchesAdminResourceProviderFilters(
        provider,
        normalized.filters,
        currentNow,
      ),
    )
    .filter((provider) =>
      matchesAdminResourceProviderSearch(provider, normalized.search),
    )
    .sort((left, right) =>
      compareAdminListItems(
        left,
        right,
        buildAdminResourceProviderSortSpecs(
          normalized.sortBy,
          normalized.sortDirection,
        ),
      ),
    );

  return buildAdminListResult({
    availableFilters: adminResourceProviderAvailableFilters,
    availableSorts: adminResourceProviderAvailableSorts,
    items: filteredProviders.slice(
      normalized.offset,
      normalized.offset + normalized.pageSize,
    ),
    page: normalized.page,
    pageSize: normalized.pageSize,
    total: filteredProviders.length,
  });
}

export function buildAdminSponsorPlacementListResult(
  placements: readonly AdminLocalSponsorPlacement[],
  input?: AdminSponsorPlacementListInput,
  options: { now?: Date } = {},
): AdminSponsorPlacementListResult {
  const currentNow = options.now ?? new Date();
  const normalized = normalizeAdminListInput<
    AdminSponsorPlacementListFilters,
    AdminSponsorPlacementSortBy
  >(withDefaultAdminSponsorListPageSize(input), {
    defaultFilters: defaultAdminSponsorPlacementListFilters(),
    defaultSortBy: "startsOn",
    defaultSortDirection: "asc",
  });
  const filteredPlacements = placements
    .filter((placement) =>
      matchesAdminSponsorPlacementFilters(
        placement,
        normalized.filters,
        currentNow,
      ),
    )
    .filter((placement) =>
      matchesAdminSponsorPlacementSearch(placement, normalized.search),
    )
    .sort((left, right) =>
      compareAdminListItems(
        left,
        right,
        buildAdminSponsorPlacementSortSpecs(
          normalized.sortBy,
          normalized.sortDirection,
          currentNow,
        ),
      ),
    );

  return buildAdminListResult({
    availableFilters: adminSponsorPlacementAvailableFilters,
    availableSorts: adminSponsorPlacementAvailableSorts,
    items: filteredPlacements.slice(
      normalized.offset,
      normalized.offset + normalized.pageSize,
    ),
    page: normalized.page,
    pageSize: normalized.pageSize,
    total: filteredPlacements.length,
  });
}

const adminResourceListDefaultPageSize = 10;

function withDefaultAdminResourceListPageSize(
  input: AdminResourceProviderListInput | undefined,
): AdminResourceProviderListInput {
  return {
    ...(input ?? {}),
    pageSize: input?.pageSize ?? adminResourceListDefaultPageSize,
  };
}

function withDefaultAdminSponsorListPageSize(
  input: AdminSponsorPlacementListInput | undefined,
): AdminSponsorPlacementListInput {
  return {
    ...(input ?? {}),
    pageSize: input?.pageSize ?? adminResourceListDefaultPageSize,
  };
}

function defaultAdminResourceProviderListFilters(): AdminResourceProviderListFilters {
  return {
    mediaState: "any",
    sponsorState: "any",
  };
}

function defaultAdminSponsorPlacementListFilters(): AdminSponsorPlacementListFilters {
  return {
    mediaState: "any",
    state: "any",
  };
}

function normalizeAdminResourceProviderListInput(
  input: AdminResourceProviderListInput | undefined,
): NormalizedAdminListInput<
  AdminResourceProviderListFilters,
  AdminResourceProviderSortBy
> {
  return normalizeAdminListInput<
    AdminResourceProviderListFilters,
    AdminResourceProviderSortBy
  >(withDefaultAdminResourceListPageSize(input), {
    defaultFilters: defaultAdminResourceProviderListFilters(),
    defaultSortBy: "name",
    defaultSortDirection: "asc",
  });
}

function normalizeAdminSponsorPlacementListInput(
  input: AdminSponsorPlacementListInput | undefined,
): NormalizedAdminListInput<
  AdminSponsorPlacementListFilters,
  AdminSponsorPlacementSortBy
> {
  return normalizeAdminListInput<
    AdminSponsorPlacementListFilters,
    AdminSponsorPlacementSortBy
  >(withDefaultAdminSponsorListPageSize(input), {
    defaultFilters: defaultAdminSponsorPlacementListFilters(),
    defaultSortBy: "startsOn",
    defaultSortDirection: "asc",
  });
}

function buildAdminResourceProviderQueryFilters(
  input: NormalizedAdminListInput<
    AdminResourceProviderListFilters,
    AdminResourceProviderSortBy
  >,
  now: Date,
) {
  return [
    isNull(ResourceProvider.deletedAt),
    buildProviderCategoryQueryFilter(input.filters.category),
    buildProviderCityQueryFilter(input.filters.city),
    buildProviderDepartmentQueryFilter(input.filters.department),
    buildProviderVerificationQueryFilter(input.filters.verification),
    buildProviderSponsorStateQueryFilter(
      input.filters.sponsorState,
      input.filters.activeOn ?? toDateOnly(now),
    ),
    buildProviderSponsorSurfaceQueryFilter(input.filters.sponsorSurface),
    buildProviderActiveOnQueryFilter(input.filters.activeOn),
    buildProviderMediaStateQueryFilter(input.filters.mediaState),
    buildProviderSearchQueryFilter(input.search),
  ].filter((filter) => filter !== undefined);
}

function buildAdminSponsorPlacementQueryFilters(
  input: NormalizedAdminListInput<
    AdminSponsorPlacementListFilters,
    AdminSponsorPlacementSortBy
  >,
  now: Date,
) {
  const referenceDate = input.filters.activeOn ?? toDateOnly(now);

  return [
    isNull(ResourceProvider.deletedAt),
    buildProviderCategoryQueryFilter(input.filters.category),
    buildProviderCityQueryFilter(input.filters.city),
    buildProviderDepartmentQueryFilter(input.filters.department),
    buildProviderVerificationQueryFilter(input.filters.verification),
    buildSponsorPlacementStateQueryFilter(input.filters.state, referenceDate),
    input.filters.surface && input.filters.surface.length > 0
      ? inArray(LocalSponsorPlacement.surface, input.filters.surface)
      : undefined,
    buildSponsorPlacementActiveOnQueryFilter(input.filters.activeOn),
    input.filters.startsFrom
      ? gte(
          LocalSponsorPlacement.startsAt,
          startOfDateOnlyUtc(input.filters.startsFrom),
        )
      : undefined,
    input.filters.startsTo
      ? lte(
          LocalSponsorPlacement.startsAt,
          endOfDateOnlyUtc(input.filters.startsTo),
        )
      : undefined,
    input.filters.endsFrom
      ? gte(
          LocalSponsorPlacement.endsAt,
          startOfDateOnlyUtc(input.filters.endsFrom),
        )
      : undefined,
    input.filters.endsTo
      ? lte(
          LocalSponsorPlacement.endsAt,
          endOfDateOnlyUtc(input.filters.endsTo),
        )
      : undefined,
    buildSponsorPlacementMediaStateQueryFilter(input.filters.mediaState),
    buildSponsorPlacementSearchQueryFilter(input.search),
  ].filter((filter) => filter !== undefined);
}

function buildProviderCategoryQueryFilter(
  category: AdminResourceProviderListFilters["category"],
) {
  return category && category.length > 0
    ? inArray(ResourceProvider.category, category)
    : undefined;
}

function buildProviderCityQueryFilter(city: string | undefined) {
  return city
    ? sql`lower(${ResourceProviderLocation.city}) = ${city.toLowerCase()}`
    : undefined;
}

function buildProviderDepartmentQueryFilter(department: string | undefined) {
  return department
    ? sql`lower(${ResourceProviderLocation.department}) = ${department.toLowerCase()}`
    : undefined;
}

function buildProviderVerificationQueryFilter(
  verification: readonly ResourceProviderVerificationStatus[] | undefined,
) {
  return verification && verification.length > 0
    ? inArray(ResourceProvider.verificationStatus, verification)
    : undefined;
}

function buildProviderSponsorStateQueryFilter(
  sponsorState: AdminResourceProviderSponsorState | undefined,
  activeOn: string,
) {
  if (!sponsorState || sponsorState === "any") {
    return undefined;
  }

  const hasSponsorPlacement = providerSponsorPlacementExists();
  const hasActiveSponsorPlacement =
    providerSponsorPlacementActiveOnExists(activeOn);

  if (sponsorState === "none") {
    return sql`NOT ${hasSponsorPlacement}`;
  }

  if (sponsorState === "active") {
    return hasActiveSponsorPlacement;
  }

  return sql`${hasSponsorPlacement} AND NOT ${hasActiveSponsorPlacement}`;
}

function buildProviderSponsorSurfaceQueryFilter(
  surfaces: AdminResourceProviderListFilters["sponsorSurface"],
) {
  return surfaces && surfaces.length > 0
    ? providerSponsorPlacementExists(
        inArray(LocalSponsorPlacement.surface, surfaces),
      )
    : undefined;
}

function buildProviderActiveOnQueryFilter(
  activeOn: AdminResourceProviderListFilters["activeOn"],
) {
  return activeOn
    ? providerSponsorPlacementActiveOnExists(activeOn)
    : undefined;
}

function buildProviderMediaStateQueryFilter(
  mediaState: AdminResourceProviderListFilters["mediaState"],
) {
  if (!mediaState || mediaState === "any") {
    return undefined;
  }

  const hasMedia = sql`(${ResourceProvider.logoUrl} IS NOT NULL OR ${ResourceProvider.photoUrl} IS NOT NULL)`;

  return mediaState === "has_media" ? hasMedia : sql`NOT ${hasMedia}`;
}

function buildSponsorPlacementMediaStateQueryFilter(
  mediaState: AdminSponsorPlacementListFilters["mediaState"],
) {
  if (!mediaState || mediaState === "any") {
    return undefined;
  }

  const hasMedia = sql`(${LocalSponsorPlacement.logoUrl} IS NOT NULL OR ${LocalSponsorPlacement.imageUrl} IS NOT NULL)`;

  return mediaState === "has_media" ? hasMedia : sql`NOT ${hasMedia}`;
}

function buildProviderSearchQueryFilter(search: string | null) {
  const searchPattern = search ? `%${escapeLikePattern(search)}%` : null;

  return searchPattern
    ? or(
        sql`${ResourceProvider.name} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${ResourceProvider.description} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${ResourceProvider.shortDescription} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${ResourceProviderLocation.city} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${ResourceProviderLocation.department} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${ResourceProviderLocation.approximateLocationLabel} ILIKE ${searchPattern} ESCAPE '\\'`,
      )
    : undefined;
}

function buildSponsorPlacementSearchQueryFilter(search: string | null) {
  const searchPattern = search ? `%${escapeLikePattern(search)}%` : null;

  return searchPattern
    ? or(
        sql`${ResourceProvider.name} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${LocalSponsorPlacement.label} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${LocalSponsorPlacement.disclosure} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${ResourceProviderLocation.city} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${ResourceProviderLocation.department} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${LocalSponsorPlacement.surface}::text ILIKE ${searchPattern} ESCAPE '\\'`,
      )
    : undefined;
}

function escapeLikePattern(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}

function buildSponsorPlacementStateQueryFilter(
  state: AdminSponsorPlacementState | undefined,
  referenceDate: string,
) {
  if (!state || state === "any") {
    return undefined;
  }

  if (state === "expired") {
    return sql`${LocalSponsorPlacement.endsAt} < ${startOfDateOnlyUtc(referenceDate)}`;
  }

  if (state === "scheduled") {
    return sql`${LocalSponsorPlacement.startsAt} > ${endOfDateOnlyUtc(referenceDate)}`;
  }

  return sponsorPlacementActiveOnCondition(referenceDate);
}

function buildSponsorPlacementActiveOnQueryFilter(
  activeOn: string | undefined,
) {
  return activeOn ? sponsorPlacementActiveOnCondition(activeOn) : undefined;
}

function providerSponsorPlacementExists(extraCondition = sql`true`) {
  return sql`EXISTS (
    SELECT 1
    FROM ${LocalSponsorPlacement}
    WHERE ${LocalSponsorPlacement.providerId} = ${ResourceProvider.id}
      AND ${LocalSponsorPlacement.detachedAt} IS NULL
      AND ${extraCondition}
  )`;
}

function providerSponsorPlacementActiveOnExists(activeOn: string) {
  return providerSponsorPlacementExists(
    sponsorPlacementActiveOnCondition(activeOn),
  );
}

function providerSponsorPlacementActiveAtExists(activeAt: Date) {
  return providerSponsorPlacementExists(
    sql`${LocalSponsorPlacement.startsAt} <= ${activeAt}
      AND ${LocalSponsorPlacement.endsAt} >= ${activeAt}`,
  );
}

function sponsorPlacementActiveOnCondition(activeOn: string) {
  return sql`${LocalSponsorPlacement.startsAt} <= ${endOfDateOnlyUtc(activeOn)}
    AND ${LocalSponsorPlacement.endsAt} >= ${startOfDateOnlyUtc(activeOn)}`;
}

function buildAdminResourceProviderQueryOrderBy(
  input: NormalizedAdminListInput<
    AdminResourceProviderListFilters,
    AdminResourceProviderSortBy
  >,
  now: Date,
) {
  const order = input.sortDirection === "asc" ? asc : desc;

  switch (input.sortBy) {
    case "category":
      return [
        order(ResourceProvider.category),
        asc(ResourceProvider.name),
        asc(ResourceProvider.id),
      ];
    case "city":
      return [
        order(ResourceProviderLocation.city),
        asc(ResourceProvider.name),
        asc(ResourceProvider.id),
      ];
    case "department":
      return [
        order(ResourceProviderLocation.department),
        asc(ResourceProviderLocation.city),
        asc(ResourceProvider.name),
        asc(ResourceProvider.id),
      ];
    case "mediaState":
      return [
        order(
          sql`${ResourceProvider.logoUrl} IS NOT NULL OR ${ResourceProvider.photoUrl} IS NOT NULL`,
        ),
        asc(ResourceProvider.name),
        asc(ResourceProvider.id),
      ];
    case "name":
      return [order(ResourceProvider.name), asc(ResourceProvider.id)];
    case "sponsorState":
      return [
        order(providerSponsorSortRankExpression(now)),
        asc(ResourceProvider.name),
        asc(ResourceProvider.id),
      ];
    case "updatedAt":
      return [order(ResourceProvider.updatedAt), asc(ResourceProvider.id)];
    case "verification":
      return [
        order(sql`${ResourceProvider.verificationStatus} = 'verified'`),
        asc(ResourceProvider.name),
        asc(ResourceProvider.id),
      ];
  }
}

function providerSponsorSortRankExpression(now: Date) {
  return sql`CASE
    WHEN ${providerSponsorPlacementActiveAtExists(now)} THEN 2
    WHEN ${providerSponsorPlacementExists()} THEN 1
    ELSE 0
  END`;
}

function buildAdminSponsorPlacementQueryOrderBy(
  input: NormalizedAdminListInput<
    AdminSponsorPlacementListFilters,
    AdminSponsorPlacementSortBy
  >,
  now: Date,
) {
  const order = input.sortDirection === "asc" ? asc : desc;

  switch (input.sortBy) {
    case "city":
      return [
        order(ResourceProviderLocation.city),
        asc(ResourceProvider.name),
        asc(LocalSponsorPlacement.id),
      ];
    case "department":
      return [
        order(ResourceProviderLocation.department),
        asc(ResourceProviderLocation.city),
        asc(ResourceProvider.name),
        asc(LocalSponsorPlacement.id),
      ];
    case "endsOn":
      return [
        order(LocalSponsorPlacement.endsAt),
        asc(LocalSponsorPlacement.startsAt),
        asc(LocalSponsorPlacement.id),
      ];
    case "mediaState":
      return [
        order(
          sql`${LocalSponsorPlacement.logoUrl} IS NOT NULL OR ${LocalSponsorPlacement.imageUrl} IS NOT NULL`,
        ),
        asc(ResourceProvider.name),
        asc(LocalSponsorPlacement.id),
      ];
    case "providerName":
      return [order(ResourceProvider.name), asc(LocalSponsorPlacement.id)];
    case "startsOn":
      return [
        order(LocalSponsorPlacement.startsAt),
        asc(ResourceProvider.name),
        asc(LocalSponsorPlacement.id),
      ];
    case "state":
      return [
        order(sponsorPlacementStateExpression(now)),
        asc(LocalSponsorPlacement.startsAt),
        asc(LocalSponsorPlacement.id),
      ];
    case "surface":
      return [
        order(LocalSponsorPlacement.surface),
        asc(ResourceProvider.name),
        asc(LocalSponsorPlacement.id),
      ];
  }
}

function sponsorPlacementStateExpression(now: Date) {
  const referenceDate = toDateOnly(now);

  return sql`CASE
    WHEN ${LocalSponsorPlacement.endsAt} < ${startOfDateOnlyUtc(referenceDate)} THEN 'expired'
    WHEN ${LocalSponsorPlacement.startsAt} > ${endOfDateOnlyUtc(referenceDate)} THEN 'scheduled'
    ELSE 'active'
  END`;
}

function matchesAdminResourceProviderFilters(
  provider: AdminResourceProviderProfile,
  filters: AdminResourceProviderListFilters,
  now: Date,
) {
  return [
    matchesArrayFilter(filters.category, provider.categoryId),
    matchesTextFilter(filters.city, provider.city),
    matchesTextFilter(filters.department, provider.department),
    matchesArrayFilter(
      filters.verification,
      provider.isVerified ? "verified" : "unverified",
    ),
    matchesProviderSponsorStateFilter(
      provider,
      filters.sponsorState,
      filters.activeOn ?? toDateOnly(now),
    ),
    matchesProviderSponsorSurfaceFilter(provider, filters.sponsorSurface),
    matchesProviderActiveOnFilter(provider, filters.activeOn),
    matchesMediaStateFilter(
      filters.mediaState,
      Boolean(provider.logoUrl ?? provider.photoUrl),
    ),
  ].every(Boolean);
}

function matchesAdminSponsorPlacementFilters(
  placement: AdminLocalSponsorPlacement,
  filters: AdminSponsorPlacementListFilters,
  now: Date,
) {
  const referenceDate = filters.activeOn ?? toDateOnly(now);

  return [
    matchesArrayFilter(filters.category, placement.category),
    matchesTextFilter(filters.city, placement.city),
    matchesTextFilter(filters.department, placement.department),
    matchesArrayFilter(
      filters.verification,
      placement.providerVerificationStatus,
    ),
    matchesSponsorPlacementStateFilter(placement, filters.state, referenceDate),
    matchesArrayFilter(filters.surface, placement.surface),
    matchesSponsorPlacementActiveOnFilter(placement, filters.activeOn),
    matchesDateFromFilter(filters.startsFrom, placement.startsOn),
    matchesDateToFilter(filters.startsTo, placement.startsOn),
    matchesDateFromFilter(filters.endsFrom, placement.endsOn),
    matchesDateToFilter(filters.endsTo, placement.endsOn),
    matchesMediaStateFilter(
      filters.mediaState,
      Boolean(placement.logoUrl ?? placement.imageUrl),
    ),
  ].every(Boolean);
}

function matchesAdminResourceProviderSearch(
  provider: AdminResourceProviderProfile,
  search: string | null,
) {
  return matchesSearch(search, [
    provider.name,
    provider.description,
    provider.shortDescription,
    provider.city,
    provider.department,
    provider.approximateLocationLabel,
  ]);
}

function matchesAdminSponsorPlacementSearch(
  placement: AdminLocalSponsorPlacement,
  search: string | null,
) {
  return matchesSearch(search, [
    placement.providerName,
    placement.label,
    placement.disclosure,
    placement.city,
    placement.department,
    placement.surface,
  ]);
}

function matchesSearch(search: string | null, values: readonly string[]) {
  if (!search) {
    return true;
  }

  const normalizedSearch = search.toLowerCase();

  return values.some((value) => value.toLowerCase().includes(normalizedSearch));
}

function matchesArrayFilter<T extends string>(
  filterValues: readonly T[] | undefined,
  value: T,
) {
  return !filterValues || filterValues.length === 0
    ? true
    : filterValues.includes(value);
}

function matchesTextFilter(filterValue: string | undefined, value: string) {
  return filterValue ? value.toLowerCase() === filterValue.toLowerCase() : true;
}

function matchesProviderSponsorStateFilter(
  provider: AdminResourceProviderProfile,
  sponsorState: AdminResourceProviderSponsorState | undefined,
  activeOn: string,
) {
  if (!sponsorState || sponsorState === "any") {
    return true;
  }

  const hasSponsorPlacements = provider.sponsorPlacements.length > 0;
  const hasActiveSponsorPlacement = provider.sponsorPlacements.some(
    (placement) => isDateInSponsorPlacementWindow(placement, activeOn),
  );

  if (sponsorState === "none") {
    return !hasSponsorPlacements;
  }

  if (sponsorState === "active") {
    return hasActiveSponsorPlacement;
  }

  return hasSponsorPlacements && !hasActiveSponsorPlacement;
}

function matchesProviderSponsorSurfaceFilter(
  provider: AdminResourceProviderProfile,
  surfaces: readonly LocalSponsorPlacementSurface[] | undefined,
) {
  return !surfaces || surfaces.length === 0
    ? true
    : provider.sponsorPlacements.some((placement) =>
        surfaces.includes(placement.surface),
      );
}

function matchesProviderActiveOnFilter(
  provider: AdminResourceProviderProfile,
  activeOn: string | undefined,
) {
  return activeOn
    ? provider.sponsorPlacements.some((placement) =>
        isDateInSponsorPlacementWindow(placement, activeOn),
      )
    : true;
}

function matchesSponsorPlacementStateFilter(
  placement: AdminLocalSponsorPlacement,
  state: AdminSponsorPlacementState | undefined,
  referenceDate: string,
) {
  return !state || state === "any"
    ? true
    : getSponsorPlacementState(placement, referenceDate) === state;
}

function matchesSponsorPlacementActiveOnFilter(
  placement: AdminLocalSponsorPlacement,
  activeOn: string | undefined,
) {
  return activeOn ? isDateInSponsorPlacementWindow(placement, activeOn) : true;
}

function matchesDateFromFilter(from: string | undefined, value: string) {
  return from ? value >= from : true;
}

function matchesDateToFilter(to: string | undefined, value: string) {
  return to ? value <= to : true;
}

function matchesMediaStateFilter(
  mediaState: AdminResourceProviderMediaState | undefined,
  hasMedia: boolean,
) {
  if (!mediaState || mediaState === "any") {
    return true;
  }

  return mediaState === "has_media" ? hasMedia : !hasMedia;
}

function getProviderSponsorSortRank(provider: AdminResourceProviderProfile) {
  const hasActiveSponsorPlacement = provider.sponsorPlacements.some(
    (placement) => placement.isActive,
  );

  if (hasActiveSponsorPlacement) {
    return 2;
  }

  return provider.sponsorPlacements.length > 0 ? 1 : 0;
}

function getSponsorPlacementState(
  placement: Pick<AdminLocalSponsorPlacement, "endsOn" | "startsOn">,
  referenceDate: string,
): Exclude<AdminSponsorPlacementState, "any"> {
  if (placement.endsOn < referenceDate) {
    return "expired";
  }

  return placement.startsOn > referenceDate ? "scheduled" : "active";
}

function isDateInSponsorPlacementWindow(
  placement: Pick<AdminLocalSponsorPlacement, "endsOn" | "startsOn">,
  date: string,
) {
  return placement.startsOn <= date && placement.endsOn >= date;
}

const adminResourceProviderAvailableSorts = [
  {
    defaultDirection: "asc",
    label: "Nombre",
    value: "name",
  },
  {
    defaultDirection: "asc",
    label: "Categoria",
    value: "category",
  },
  {
    defaultDirection: "asc",
    label: "Ciudad",
    value: "city",
  },
  {
    defaultDirection: "asc",
    label: "Departamento",
    value: "department",
  },
  {
    defaultDirection: "desc",
    label: "Verificacion",
    value: "verification",
  },
  {
    defaultDirection: "desc",
    label: "Patrocinio",
    value: "sponsorState",
  },
  {
    defaultDirection: "desc",
    label: "Medios",
    value: "mediaState",
  },
  {
    defaultDirection: "desc",
    label: "Actualizado",
    value: "updatedAt",
  },
] satisfies readonly AdminListSortOption<AdminResourceProviderSortBy>[];

const adminSponsorPlacementAvailableSorts = [
  {
    defaultDirection: "asc",
    label: "Inicio",
    value: "startsOn",
  },
  {
    defaultDirection: "asc",
    label: "Fin",
    value: "endsOn",
  },
  {
    defaultDirection: "asc",
    label: "Proveedor",
    value: "providerName",
  },
  {
    defaultDirection: "asc",
    label: "Superficie",
    value: "surface",
  },
  {
    defaultDirection: "desc",
    label: "Estado",
    value: "state",
  },
  {
    defaultDirection: "asc",
    label: "Ciudad",
    value: "city",
  },
  {
    defaultDirection: "asc",
    label: "Departamento",
    value: "department",
  },
  {
    defaultDirection: "desc",
    label: "Medios",
    value: "mediaState",
  },
] satisfies readonly AdminListSortOption<AdminSponsorPlacementSortBy>[];

const resourceProviderCategoryFilterOptions = [
  { label: "Veterinaria", value: "veterinary" },
  { label: "Refugio", value: "shelter" },
  { label: "Peluqueria", value: "groomer" },
  { label: "Alimento", value: "pet_food" },
  { label: "Entrenamiento", value: "trainer" },
  { label: "Tienda", value: "pet_store" },
  { label: "Transporte", value: "transport" },
  { label: "Otro", value: "other" },
] satisfies AdminListFilterOption["options"];

const verificationFilterOptions = [
  { label: "Verificado", value: "verified" },
  { label: "Sin verificar", value: "unverified" },
] satisfies AdminListFilterOption["options"];

const sponsorStateFilterOptions = [
  { label: "Todos", value: "any" },
  { label: "Activo", value: "active" },
  { label: "Inactivo", value: "inactive" },
  { label: "Sin patrocinio", value: "none" },
] satisfies AdminListFilterOption["options"];

const sponsorPlacementStateFilterOptions = [
  { label: "Todos", value: "any" },
  { label: "Activo", value: "active" },
  { label: "Programado", value: "scheduled" },
  { label: "Expirado", value: "expired" },
] satisfies AdminListFilterOption["options"];

const sponsorSurfaceFilterOptions = [
  { label: "Directorio de recursos", value: "resources_directory" },
  { label: "Perfil del proveedor", value: "provider_details" },
  { label: "Inicio de lanzamiento", value: "launch_home_banner" },
  { label: "Confirmacion de reporte", value: "report_success" },
  { label: "Cuidados contextuales", value: "contextual_care_resources" },
] satisfies AdminListFilterOption["options"];

const mediaStateFilterOptions = [
  { label: "Todos", value: "any" },
  { label: "Con medios", value: "has_media" },
  { label: "Sin medios", value: "missing_media" },
] satisfies AdminListFilterOption["options"];

const adminResourceProviderAvailableFilters = [
  {
    key: "category",
    label: "Categoria",
    options: resourceProviderCategoryFilterOptions,
    type: "enum",
  },
  {
    key: "city",
    label: "Ciudad",
    type: "text",
  },
  {
    key: "department",
    label: "Departamento",
    type: "text",
  },
  {
    key: "verification",
    label: "Verificacion",
    options: verificationFilterOptions,
    type: "enum",
  },
  {
    key: "sponsorState",
    label: "Patrocinio",
    options: sponsorStateFilterOptions,
    type: "enum",
  },
  {
    key: "sponsorSurface",
    label: "Superficie patrocinada",
    options: sponsorSurfaceFilterOptions,
    type: "enum",
  },
  {
    key: "activeOn",
    label: "Activo en fecha",
    type: "date",
  },
  {
    key: "mediaState",
    label: "Medios",
    options: mediaStateFilterOptions,
    type: "enum",
  },
] satisfies AdminResourceProviderAvailableFilters;

const adminSponsorPlacementAvailableFilters = [
  {
    key: "category",
    label: "Categoria",
    options: resourceProviderCategoryFilterOptions,
    type: "enum",
  },
  {
    key: "city",
    label: "Ciudad",
    type: "text",
  },
  {
    key: "department",
    label: "Departamento",
    type: "text",
  },
  {
    key: "verification",
    label: "Verificacion",
    options: verificationFilterOptions,
    type: "enum",
  },
  {
    key: "state",
    label: "Estado",
    options: sponsorPlacementStateFilterOptions,
    type: "enum",
  },
  {
    key: "surface",
    label: "Superficie",
    options: sponsorSurfaceFilterOptions,
    type: "enum",
  },
  {
    key: "activeOn",
    label: "Activo en fecha",
    type: "date",
  },
  {
    key: "startsFrom",
    label: "Inicia desde",
    type: "date",
  },
  {
    key: "startsTo",
    label: "Inicia hasta",
    type: "date",
  },
  {
    key: "endsFrom",
    label: "Termina desde",
    type: "date",
  },
  {
    key: "endsTo",
    label: "Termina hasta",
    type: "date",
  },
  {
    key: "mediaState",
    label: "Medios",
    options: mediaStateFilterOptions,
    type: "enum",
  },
] satisfies AdminSponsorPlacementAvailableFilters;

function buildAdminResourceProviderSortSpecs(
  sortBy: AdminResourceProviderSortBy,
  sortDirection: "asc" | "desc",
): readonly AdminListSortSpec<AdminResourceProviderProfile>[] {
  const secondary = [
    {
      direction: "asc",
      getValue: (provider: AdminResourceProviderProfile) => provider.id,
    },
  ] satisfies readonly AdminListSortSpec<AdminResourceProviderProfile>[];

  switch (sortBy) {
    case "category":
      return [
        {
          direction: sortDirection,
          getValue: (provider) => provider.categoryId,
        },
        { direction: "asc", getValue: (provider) => provider.name },
        ...secondary,
      ];
    case "city":
      return [
        { direction: sortDirection, getValue: (provider) => provider.city },
        { direction: "asc", getValue: (provider) => provider.name },
        ...secondary,
      ];
    case "department":
      return [
        {
          direction: sortDirection,
          getValue: (provider) => provider.department,
        },
        { direction: "asc", getValue: (provider) => provider.city },
        { direction: "asc", getValue: (provider) => provider.name },
        ...secondary,
      ];
    case "mediaState":
      return [
        {
          direction: sortDirection,
          getValue: (provider) =>
            Boolean(provider.logoUrl ?? provider.photoUrl),
        },
        { direction: "asc", getValue: (provider) => provider.name },
        ...secondary,
      ];
    case "name":
      return [
        { direction: sortDirection, getValue: (provider) => provider.name },
        ...secondary,
      ];
    case "sponsorState":
      return [
        {
          direction: sortDirection,
          getValue: (provider) => getProviderSponsorSortRank(provider),
        },
        { direction: "asc", getValue: (provider) => provider.name },
        ...secondary,
      ];
    case "updatedAt":
      return [
        {
          direction: sortDirection,
          getValue: (provider) => provider.updatedAt,
        },
        ...secondary,
      ];
    case "verification":
      return [
        {
          direction: sortDirection,
          getValue: (provider) => provider.isVerified,
        },
        { direction: "asc", getValue: (provider) => provider.name },
        ...secondary,
      ];
  }
}

function buildAdminSponsorPlacementSortSpecs(
  sortBy: AdminSponsorPlacementSortBy,
  sortDirection: "asc" | "desc",
  now: Date,
): readonly AdminListSortSpec<AdminLocalSponsorPlacement>[] {
  const secondary = [
    {
      direction: "asc",
      getValue: (placement: AdminLocalSponsorPlacement) =>
        placement.placementId,
    },
  ] satisfies readonly AdminListSortSpec<AdminLocalSponsorPlacement>[];

  switch (sortBy) {
    case "city":
      return [
        { direction: sortDirection, getValue: (placement) => placement.city },
        { direction: "asc", getValue: (placement) => placement.providerName },
        ...secondary,
      ];
    case "department":
      return [
        {
          direction: sortDirection,
          getValue: (placement) => placement.department,
        },
        { direction: "asc", getValue: (placement) => placement.city },
        { direction: "asc", getValue: (placement) => placement.providerName },
        ...secondary,
      ];
    case "endsOn":
      return [
        { direction: sortDirection, getValue: (placement) => placement.endsOn },
        { direction: "asc", getValue: (placement) => placement.startsOn },
        ...secondary,
      ];
    case "mediaState":
      return [
        {
          direction: sortDirection,
          getValue: (placement) =>
            Boolean(placement.logoUrl ?? placement.imageUrl),
        },
        { direction: "asc", getValue: (placement) => placement.providerName },
        ...secondary,
      ];
    case "providerName":
      return [
        {
          direction: sortDirection,
          getValue: (placement) => placement.providerName,
        },
        ...secondary,
      ];
    case "startsOn":
      return [
        {
          direction: sortDirection,
          getValue: (placement) => placement.startsOn,
        },
        { direction: "asc", getValue: (placement) => placement.providerName },
        ...secondary,
      ];
    case "state":
      return [
        {
          direction: sortDirection,
          getValue: (placement) =>
            getSponsorPlacementState(placement, toDateOnly(now)),
        },
        { direction: "asc", getValue: (placement) => placement.startsOn },
        ...secondary,
      ];
    case "surface":
      return [
        {
          direction: sortDirection,
          getValue: (placement) => placement.surface,
        },
        { direction: "asc", getValue: (placement) => placement.providerName },
        ...secondary,
      ];
  }
}

function isSponsorPlacementActive(
  placement: PersistedLocalSponsorPlacement,
  now: Date,
) {
  return placement.startsAt <= now && placement.endsAt >= now;
}

function startOfDateOnlyUtc(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function endOfDateOnlyUtc(date: string) {
  return new Date(`${date}T23:59:59.999Z`);
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}
