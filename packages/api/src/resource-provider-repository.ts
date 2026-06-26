import type { Database } from "@acme/db/client";
import type {
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
import { and, asc, eq, inArray, isNull, sql } from "@acme/db";
import {
  LocalSponsorPlacement,
  ResourceProvider,
  ResourceProviderContactOption,
  ResourceProviderLocation,
} from "@acme/db/schema";
import { buildApproximatePublicResourceProviderLocation } from "@acme/validators";

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
  surface: LocalSponsorPlacementSurface;
  label: string;
  disclosure: string;
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
  isActive: boolean;
  label: string;
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

export interface AdminLocalSponsorPlacement {
  category: ResourceProviderCategory;
  city: string;
  department: string;
  disclosure: string;
  endsOn: string;
  isActive: boolean;
  label: string;
  placementId: string;
  providerId: string;
  providerName: string;
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

export interface ResourceProviderRepository {
  nearby(
    input: NearbyResourceProvidersInput,
  ): Promise<PublicResourceProviderSummary[]>;
  findProfile(
    providerId: string,
  ): Promise<PublicResourceProviderProfile | null>;
  listProviders(): Promise<AdminResourceProviderProfile[]>;
  listSponsorPlacements(): Promise<AdminLocalSponsorPlacement[]>;
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
    "disclosure" | "label" | "surface"
  >,
) {
  return {
    kind: "Local Sponsor Placement",
    label: placement.label,
    disclosure: placement.disclosure,
    eligibleSurfaces: [placement.surface],
    safetyPolicy: {
      recoveryPriority: {
        label: "Recovery Priority",
        canAffect: false,
      },
      pushNotifications: {
        eligible: false,
      },
    },
  } satisfies PublicResourceProviderSummary["sponsorPlacement"];
}

export function toPublicResourceProviderSummary(
  provider: PersistedResourceProvider,
  options: { distanceMeters?: number; now?: Date } = {},
): PublicResourceProviderSummary {
  const activeSponsorPlacement = provider.sponsorPlacements.find((placement) =>
    isSponsorPlacementActive(placement, options.now ?? new Date()),
  );

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
    sponsorPlacement: activeSponsorPlacement
      ? buildLocalSponsorPlacementPolicy(activeSponsorPlacement)
      : undefined,
    isOpenNow: provider.isOpenNow,
    emergencyAvailable: provider.emergencyAvailable,
    logoUrl: provider.logoUrl ?? undefined,
    photoUrl: provider.photoUrl ?? undefined,
    contactOptions: provider.contactOptions.map((contact) => ({ ...contact })),
  };
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
      isActive: isSponsorPlacementActive(placement, now),
      label: placement.label,
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
    listProviders: async () => {
      const rows = await db.query.ResourceProvider.findMany({
        where: isNull(ResourceProvider.deletedAt),
        with: {
          location: true,
        },
        orderBy: [asc(ResourceProvider.name)],
      });
      const providers = await Promise.all(
        rows.map(async (row) =>
          toPersistedResourceProvider(
            row,
            await loadContactOptions(db, row.id),
            await loadSponsorPlacements(db, row.id),
          ),
        ),
      );

      return providers.map((provider) =>
        toAdminResourceProviderProfile(provider, { now: now() }),
      );
    },
    listSponsorPlacements: async () => {
      return toAdminLocalSponsorPlacements(await repository.listProviders());
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
        label: sponsorPlacement.label,
        providerId: sponsorPlacement.providerId,
        startsAt: startOfDateOnlyUtc(sponsorPlacement.startsOn),
        surface: sponsorPlacement.surface,
      };

      if (sponsorPlacement.placementId) {
        insertValue.id = sponsorPlacement.placementId;
      }

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
      const [updated] = await db
        .update(LocalSponsorPlacement)
        .set({
          disclosure: sponsorPlacement.disclosure,
          endsAt: endOfDateOnlyUtc(sponsorPlacement.endsOn),
          label: sponsorPlacement.label,
          startsAt: startOfDateOnlyUtc(sponsorPlacement.startsOn),
          surface: sponsorPlacement.surface,
          updatedAt: now(),
        })
        .where(
          and(
            eq(LocalSponsorPlacement.id, sponsorPlacement.placementId),
            eq(LocalSponsorPlacement.providerId, sponsorPlacement.providerId),
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
      const [deleted] = await db
        .delete(LocalSponsorPlacement)
        .where(
          and(
            eq(LocalSponsorPlacement.id, input.placementId),
            eq(LocalSponsorPlacement.providerId, input.providerId),
          ),
        )
        .returning({ id: LocalSponsorPlacement.id });

      return deleted ? repository.findProfile(input.providerId) : null;
    },
  };

  async function findAdminSponsorPlacementById(
    providerId: string,
    placementId: string | null,
  ): Promise<AdminLocalSponsorPlacement | null> {
    const placements = await repository.listSponsorPlacements();

    return (
      placements.find(
        (placement) =>
          placement.providerId === providerId &&
          (placementId === null || placement.placementId === placementId),
      ) ?? null
    );
  }

  return repository;
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
    .where(eq(LocalSponsorPlacement.providerId, providerId));
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
      surface: placement.surface,
      label: placement.label,
      disclosure: placement.disclosure,
      startsAt: placement.startsAt,
      endsAt: placement.endsAt,
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
        disclosure: placement.disclosure,
        endsOn: placement.endsOn,
        isActive: placement.isActive,
        label: placement.label,
        placementId: placement.placementId,
        providerId: provider.id,
        providerName: provider.name,
        safetyPolicy: {
          eligibleSurfaces:
            buildLocalSponsorPlacementPolicy(placement).eligibleSurfaces,
          ...buildLocalSponsorPlacementPolicy(placement).safetyPolicy,
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
