import type { Database } from "@acme/db/client";
import type {
  AttachLocalSponsorPlacementInput,
  CreateResourceProviderInput,
  DetachLocalSponsorPlacementInput,
  LocalSponsorPlacementSurface,
  NearbyResourceProvidersInput,
  PublicResourceProviderProfile,
  PublicResourceProviderSummary,
  ResourceProviderCategory,
  ResourceProviderContactKind,
  ResourceProviderVerificationStatus,
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
  publicLatitude: number;
  publicLongitude: number;
  precision: "approximate";
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

export interface ResourceProviderRepository {
  nearby(
    input: NearbyResourceProvidersInput,
  ): Promise<PublicResourceProviderSummary[]>;
  findProfile(
    providerId: string,
  ): Promise<PublicResourceProviderProfile | null>;
  listProviders(): Promise<PublicResourceProviderProfile[]>;
  createProvider(input: {
    adminId: string;
    provider: CreateResourceProviderInput;
  }): Promise<PublicResourceProviderProfile>;
  updateVerification(input: {
    adminId: string;
    verification: UpdateResourceProviderVerificationInput;
  }): Promise<PublicResourceProviderProfile | null>;
  attachSponsor(input: {
    adminId: string;
    sponsorPlacement: AttachLocalSponsorPlacementInput;
  }): Promise<PublicResourceProviderProfile | null>;
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
        toPublicResourceProviderProfile(provider, { now: now() }),
      );
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

        const publicLocation = derivePublicResourceProviderLocation(
          provider.location,
        );

        await tx.insert(ResourceProviderLocation).values({
          addressLabel: provider.location.addressLabel ?? null,
          approximateLocationLabel: provider.location.approximateLocationLabel,
          exactLatitude: provider.location.exactLatitude,
          exactLongitude: provider.location.exactLongitude,
          exactPoint: {
            x: provider.location.exactLongitude,
            y: provider.location.exactLatitude,
          },
          locationCell: provider.location.locationCell,
          providerId: created.id,
          publicLatitude: publicLocation.publicLatitude,
          publicLongitude: publicLocation.publicLongitude,
          publicPoint: {
            x: publicLocation.publicLongitude,
            y: publicLocation.publicLatitude,
          },
          publicPrecision: "approximate",
        });

        await tx.insert(ResourceProviderContactOption).values(
          provider.contactOptions.map((contact, index) => ({
            kind: contact.kind,
            label: contact.label,
            providerId: created.id,
            sortOrder: index,
            value: contact.value,
          })),
        );

        return created.id;
      });

      const createdProvider = await repository.findProfile(createdProviderId);
      if (!createdProvider) {
        throw new Error("Created Resource Provider could not be reloaded.");
      }

      return createdProvider;
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

      await db.insert(LocalSponsorPlacement).values(insertValue);

      return repository.findProfile(sponsorPlacement.providerId);
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
  location: CreateResourceProviderInput["location"],
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
      publicLatitude: row.location.publicLatitude,
      publicLongitude: row.location.publicLongitude,
      precision: "approximate",
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
