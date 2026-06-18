import type { TrustSafetyRepository } from "../trust-safety";
import type {
  LocalSponsorPlacement,
  ResourceCategoryId,
  ResourceCoordinate,
  ResourceProviderAdminReviewItem,
  ResourceProviderFixture,
  ResourceProviderProfile,
  ResourceProviderSearchLocation,
  ResourceProviderSearchStrategy,
  ResourceProviderSummary,
  ResourceReportReason,
  ResourceSearchLocation,
} from "./resource-types";
import { findWithinRadius } from "../geo/distance";
import { createInMemoryTrustSafetyRepository } from "../trust-safety";
import { rastroResourceFixtures } from "./static-resources-fixtures";

export type { ResourceProviderSearchLocation } from "./resource-types";

export interface ResourceSearchQuery {
  location: ResourceSearchLocation;
  radiusMeters: number;
  categoryIds?: readonly ResourceCategoryId[];
  strategy: ResourceProviderSearchStrategy;
}

export interface ResourceProviderSearchQuery {
  location: ResourceProviderSearchLocation;
  radiusMeters: number;
  categoryIds?: readonly ResourceCategoryId[];
  strategy: ResourceProviderSearchStrategy;
}

export interface ResourceProviderSearchBoundary {
  center: ResourceProviderSearchLocation;
  engine: "rastro-postgis-radius";
  owner: "rastro";
  publicLocationPrecision: "location-cell";
  radiusMeters: number;
}

export interface ResourceProviderSearchResult {
  generatedAt: string;
  providers: readonly ResourceProviderSummary[];
  query: ResourceProviderSearchQuery;
  radiusMeters: number;
  searchBoundary: ResourceProviderSearchBoundary;
  searchStrategy: ResourceProviderSearchStrategy;
}

export interface ResourceProviderReportInput {
  providerId: string;
  reason: ResourceReportReason;
  detail?: string;
}

export interface ResourceModerationItem {
  id: string;
  targetType: "resource_provider";
  providerId: string;
  providerName: string;
  reason: ResourceReportReason;
  detail?: string;
  reviewItem: ResourceProviderAdminReviewItem;
}

export interface ResourceProviderReportReceipt {
  status: "created";
  moderationItem: ResourceModerationItem;
}

export interface ResourcesAdapter {
  searchProviders: (
    query: ResourceSearchQuery,
  ) => Promise<readonly ResourceProviderSummary[]>;
  getProviderProfile: (
    providerId: string,
  ) => Promise<ResourceProviderProfile | null>;
  reportProvider: (
    input: ResourceProviderReportInput,
  ) => Promise<ResourceProviderReportReceipt>;
}

export type ResourcesSessionState =
  | {
      kind: "visitor";
    }
  | {
      kind: "member";
      memberId: string;
    };

export interface ResourceProviderRepository {
  searchResourceProviders: (
    session: ResourcesSessionState,
    query: ResourceProviderSearchQuery,
  ) => Promise<ResourceProviderSearchResult>;
}

export interface StaticResourceProviderRepositoryOptions {
  fixtures?: {
    providers: readonly ResourceProviderFixture[];
    profiles: readonly ResourceProviderProfile[];
  };
  now?: () => string;
}

export function createStaticResourceProviderRepository(
  options: StaticResourceProviderRepositoryOptions = {},
): ResourceProviderRepository {
  const fixtures = options.fixtures ?? rastroResourceFixtures;
  const now = options.now ?? (() => "2026-01-01T00:00:00.000Z");

  return {
    searchResourceProviders(_session, query) {
      try {
        assertResourceProviderSearchQuery(query);

        const selectedCategorySet = new Set(query.categoryIds ?? []);
        const radiusMatches = findWithinRadius({
          center: toCoordinate(query.location.coordinate),
          getLocation: (provider: ResourceProviderFixture) =>
            toCoordinate(provider.exactLocation),
          items: fixtures.providers.filter(
            (provider) =>
              selectedCategorySet.size === 0 ||
              selectedCategorySet.has(provider.categoryId),
          ),
          radiusMeters: query.radiusMeters,
        })
          .sort((left, right) => left.distanceMeters - right.distanceMeters)
          .map(({ distanceMeters, report }) =>
            toResourceProviderSearchSummary({
              distanceMeters,
              provider: report,
            }),
          );

        return Promise.resolve({
          generatedAt: now(),
          providers: radiusMatches,
          query: cloneResourceProviderSearchQuery(query),
          radiusMeters: query.radiusMeters,
          searchBoundary: {
            center: cloneResourceProviderSearchLocation(query.location),
            engine: "rastro-postgis-radius",
            owner: "rastro",
            publicLocationPrecision: "location-cell",
            radiusMeters: query.radiusMeters,
          },
          searchStrategy: "postgis_radius",
        });
      } catch (error) {
        return Promise.reject(
          error instanceof Error
            ? error
            : new Error("No pudimos buscar recursos cercanos."),
        );
      }
    },
  };
}

export function createStaticResourcesAdapter(
  fixtures: {
    providers: readonly ResourceProviderFixture[];
    profiles: readonly ResourceProviderProfile[];
  } = rastroResourceFixtures,
  trustSafety: TrustSafetyRepository = createInMemoryTrustSafetyRepository(),
): ResourcesAdapter {
  const repository = createStaticResourceProviderRepository({ fixtures });

  return {
    searchProviders(query) {
      const location = toResolvedResourceProviderSearchLocation(query.location);

      if (!location) {
        return Promise.resolve([]);
      }

      return repository
        .searchResourceProviders(
          {
            kind: "visitor",
          },
          {
            categoryIds: query.categoryIds,
            location,
            radiusMeters: query.radiusMeters,
            strategy: query.strategy,
          },
        )
        .then((result) => result.providers);
    },
    getProviderProfile(providerId) {
      return Promise.resolve(
        fixtures.profiles.find((profile) => profile.id === providerId) ?? null,
      );
    },
    async reportProvider(input) {
      const provider = fixtures.providers.find(
        (candidate) => candidate.id === input.providerId,
      );

      if (provider === undefined) {
        throw new Error("No se encontró el proveedor para reportar.");
      }

      const receipt = await trustSafety.submitReport({
        detail: input.detail,
        reason: input.reason,
        targetId: provider.id,
        targetType: "resource_provider",
      });

      return {
        status: "created",
        moderationItem: {
          id: `resource-provider-report:${provider.id}`,
          targetType: "resource_provider",
          providerId: provider.id,
          providerName: provider.name,
          reason: input.reason,
          detail: input.detail,
          reviewItem: receipt.reviewItem,
        },
      };
    },
  };
}

function assertResourceProviderSearchQuery(query: ResourceProviderSearchQuery) {
  if (!Number.isFinite(query.radiusMeters) || query.radiusMeters <= 0) {
    throw new Error("La busqueda necesita un radio valido en metros.");
  }

  const location = query.location as Partial<ResourceProviderSearchLocation>;
  const coordinate = location.coordinate;

  if (
    location.countryCode !== "BO" ||
    coordinate === undefined ||
    !Number.isFinite(coordinate.latitude) ||
    !Number.isFinite(coordinate.longitude) ||
    location.label === undefined ||
    location.label.trim().length === 0 ||
    location.locationCellLabel === undefined ||
    location.locationCellLabel.trim().length === 0
  ) {
    throw new Error(
      "La busqueda de recursos necesita una ubicacion resuelta en Bolivia para el radio PostGIS.",
    );
  }
}

function toResolvedResourceProviderSearchLocation(
  location: ResourceSearchLocation,
): ResourceProviderSearchLocation | null {
  if (location.kind === "denied" || location.kind === "none") {
    return null;
  }

  if (
    location.coordinate === undefined ||
    location.countryCode !== "BO" ||
    location.locationCellLabel === undefined
  ) {
    return null;
  }

  const label =
    location.label ?? (location.kind === "current" ? "Ubicacion actual" : "");

  if (label.trim().length === 0) {
    return null;
  }

  return {
    coordinate: { ...location.coordinate },
    countryCode: location.countryCode,
    kind: location.kind,
    label,
    locationCellLabel: location.locationCellLabel,
    ...(location.kind === "manual" && location.manualLocationKind !== undefined
      ? { manualLocationKind: location.manualLocationKind }
      : {}),
  };
}

function toResourceProviderSearchSummary({
  distanceMeters,
  provider,
}: {
  distanceMeters: number;
  provider: ResourceProviderFixture;
}): ResourceProviderSummary {
  const { exactLocation: _exactLocation, ...summary } = provider;

  return {
    ...summary,
    contactOptions: summary.contactOptions.map((contact) => ({ ...contact })),
    distanceMeters: Math.round(distanceMeters),
    sponsorPlacement: cloneLocalSponsorPlacement(summary.sponsorPlacement),
  };
}

function cloneLocalSponsorPlacement(
  placement: LocalSponsorPlacement | undefined,
) {
  if (placement === undefined) {
    return undefined;
  }

  return {
    ...placement,
    eligibleSurfaces: [...placement.eligibleSurfaces],
    safetyPolicy: {
      recoveryPriority: { ...placement.safetyPolicy.recoveryPriority },
      pushNotifications: { ...placement.safetyPolicy.pushNotifications },
    },
  };
}

function cloneResourceProviderSearchQuery(
  query: ResourceProviderSearchQuery,
): ResourceProviderSearchQuery {
  return {
    ...query,
    categoryIds: query.categoryIds ? [...query.categoryIds] : undefined,
    location: cloneResourceProviderSearchLocation(query.location),
  };
}

function cloneResourceProviderSearchLocation(
  location: ResourceProviderSearchLocation,
): ResourceProviderSearchLocation {
  return {
    ...location,
    coordinate: { ...location.coordinate },
  };
}

function toCoordinate(coordinate: ResourceCoordinate) {
  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
  };
}
