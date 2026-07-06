import type { LastLoadedCache } from "../resilience/last-loaded-cache";
import type { TrustSafetyRepository } from "../trust-safety";
import type {
  LocalSponsorPlacementSurface,
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
import {
  cloneLocalSponsorPlacement,
  cloneLocalSponsorPlacements,
  getLocalSponsorPlacementsForSurface,
} from "./sponsor-surface-policy";
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

export interface ResourceProviderDirectoryResult {
  generatedAt?: string;
  isOffline?: boolean;
  isStale?: boolean;
  providers: readonly ResourceProviderSummary[];
}

export interface ResourceProviderProfileResult {
  generatedAt?: string;
  isOffline?: boolean;
  isStale?: boolean;
  profile: ResourceProviderProfile | null;
  providerId: string;
}

export interface ActiveSponsorPlacementsQuery {
  limit?: number;
  surface: LocalSponsorPlacementSurface;
}

export interface ActiveSponsorPlacementsResult {
  generatedAt?: string;
  providers: readonly ResourceProviderSummary[];
  surface: LocalSponsorPlacementSurface;
}

export interface ResourceProviderReportInput {
  detail: string;
  providerId: string;
  reason: ResourceReportReason;
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
  status: "already_reported" | "created";
  moderationItem: ResourceModerationItem;
}

export interface ResourceSponsorDeliveryInput {
  deliveryToken: string;
  eventType: "impression" | "open";
  idempotencyKey: string;
  providerId: string;
  source?: string;
  surface: LocalSponsorPlacementSurface;
}

export interface ResourceSponsorDeliveryReceipt {
  event?: {
    eventType: "impression" | "open";
    id: string;
    occurredAt: Date | string;
    providerId: string;
    source?: string;
    surface: LocalSponsorPlacementSurface;
  };
  status: "duplicate" | "no_active_placement" | "recorded";
}

export interface ResourcesAdapter {
  getActiveSponsorPlacements?: (
    query: ActiveSponsorPlacementsQuery,
  ) => Promise<ActiveSponsorPlacementsResult>;
  getProviderProfileDetail?: (
    providerId: string,
  ) => Promise<ResourceProviderProfileResult>;
  searchProviderDirectory?: (
    query: ResourceSearchQuery,
  ) => Promise<ResourceProviderDirectoryResult>;
  searchProviders: (
    query: ResourceSearchQuery,
  ) => Promise<readonly ResourceProviderSummary[]>;
  getProviderProfile: (
    providerId: string,
  ) => Promise<ResourceProviderProfile | null>;
  reportProvider: (
    input: ResourceProviderReportInput,
  ) => Promise<ResourceProviderReportReceipt>;
  recordSponsorDelivery?: (
    input: ResourceSponsorDeliveryInput,
  ) => Promise<ResourceSponsorDeliveryReceipt>;
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

  const searchProviderDirectory = async (
    query: ResourceSearchQuery,
  ): Promise<ResourceProviderDirectoryResult> => {
    const location = toResolvedResourceProviderSearchLocation(query.location);

    if (!location) {
      return {
        providers: [],
      };
    }

    const result = await repository.searchResourceProviders(
      {
        kind: "visitor",
      },
      {
        categoryIds: query.categoryIds,
        location,
        radiusMeters: query.radiusMeters,
        strategy: query.strategy,
      },
    );

    return {
      generatedAt: result.generatedAt,
      providers: result.providers,
    };
  };
  const getProviderProfileDetail = (
    providerId: string,
  ): Promise<ResourceProviderProfileResult> =>
    Promise.resolve({
      providerId,
      profile:
        fixtures.profiles.find((profile) => profile.id === providerId) ?? null,
    });

  return {
    getActiveSponsorPlacements(query) {
      const providers = fixtures.providers
        .flatMap((provider) => {
          const surfacePlacements = getLocalSponsorPlacementsForSurface(
            provider.activeSponsorPlacements ?? provider.sponsorPlacement,
            query.surface,
            { limit: 5 },
          );

          if (surfacePlacements.length === 0) {
            return [];
          }

          return [
            {
              ...cloneResourceProviderSummary(provider),
              sponsorPlacement: surfacePlacements[0],
              activeSponsorPlacements: surfacePlacements,
            },
          ];
        })
        .slice(0, query.limit ?? 5);

      return Promise.resolve({
        generatedAt: new Date().toISOString(),
        providers,
        surface: query.surface,
      });
    },
    getProviderProfileDetail,
    searchProviderDirectory,
    searchProviders(query) {
      return searchProviderDirectory(query).then((result) => result.providers);
    },
    getProviderProfile(providerId) {
      return getProviderProfileDetail(providerId).then(
        (result) => result.profile,
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

export function createCachedResourcesAdapter({
  cache,
  cacheKey,
  profileCache,
  profileCacheKey,
  source,
}: {
  cache: LastLoadedCache<ResourceProviderDirectoryResult>;
  cacheKey: string | ((query: ResourceSearchQuery) => string);
  profileCache?: LastLoadedCache<ResourceProviderProfileResult>;
  profileCacheKey?: string | ((providerId: string) => string);
  source: ResourcesAdapter;
}): ResourcesAdapter & {
  getProviderProfileDetail: (
    providerId: string,
  ) => Promise<ResourceProviderProfileResult>;
  searchProviderDirectory: (
    query: ResourceSearchQuery,
  ) => Promise<ResourceProviderDirectoryResult>;
} {
  const searchProviderDirectory = async (
    query: ResourceSearchQuery,
  ): Promise<ResourceProviderDirectoryResult> => {
    const key = resolveResourceCacheKey(cacheKey, query);

    try {
      const result =
        source.searchProviderDirectory !== undefined
          ? await source.searchProviderDirectory(query)
          : {
              providers: await source.searchProviders(query),
            };
      await cache.write(key, toFreshResourceDirectoryResult(result));
      return result;
    } catch (error) {
      const cached = await cache.read(key);

      if (cached === null) {
        throw error;
      }

      return {
        ...cached,
        isOffline: true,
        isStale: true,
      };
    }
  };
  const getProviderProfileDetail = async (
    providerId: string,
  ): Promise<ResourceProviderProfileResult> => {
    const key = resolveResourceProfileCacheKey(profileCacheKey, providerId);

    try {
      const result =
        source.getProviderProfileDetail !== undefined
          ? await source.getProviderProfileDetail(providerId)
          : {
              profile: await source.getProviderProfile(providerId),
              providerId,
            };

      if (profileCache !== undefined) {
        await profileCache.write(key, toFreshResourceProfileResult(result));
      }

      return result;
    } catch (error) {
      const cached = await profileCache?.read(key);

      if (cached === undefined || cached === null) {
        throw error;
      }

      return {
        ...cached,
        isOffline: true,
        isStale: true,
      };
    }
  };

  return {
    ...source,
    getProviderProfileDetail,
    getActiveSponsorPlacements(query) {
      if (source.getActiveSponsorPlacements === undefined) {
        return Promise.resolve({
          providers: [],
          surface: query.surface,
        });
      }

      return source.getActiveSponsorPlacements(query);
    },
    getProviderProfile(providerId) {
      return getProviderProfileDetail(providerId).then(
        (result) => result.profile,
      );
    },
    searchProviderDirectory,
    searchProviders(query) {
      return searchProviderDirectory(query).then((result) => result.providers);
    },
  };
}

function resolveResourceCacheKey(
  cacheKey: string | ((query: ResourceSearchQuery) => string),
  query: ResourceSearchQuery,
) {
  return typeof cacheKey === "function" ? cacheKey(query) : cacheKey;
}

function toFreshResourceDirectoryResult(
  result: ResourceProviderDirectoryResult,
): ResourceProviderDirectoryResult {
  const { isOffline: _isOffline, isStale: _isStale, ...freshResult } = result;

  return freshResult;
}

function resolveResourceProfileCacheKey(
  cacheKey: string | ((providerId: string) => string) | undefined,
  providerId: string,
) {
  if (typeof cacheKey === "function") {
    return cacheKey(providerId);
  }

  return cacheKey ?? `resource-provider-profile:${providerId}`;
}

function toFreshResourceProfileResult(
  result: ResourceProviderProfileResult,
): ResourceProviderProfileResult {
  const { isOffline: _isOffline, isStale: _isStale, ...freshResult } = result;

  return freshResult;
}

function assertResourceProviderSearchQuery(query: ResourceProviderSearchQuery) {
  if (!Number.isFinite(query.radiusMeters) || query.radiusMeters <= 0) {
    throw new Error("La búsqueda necesita un radio válido en metros.");
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
      "La búsqueda de recursos necesita una ubicación resuelta en Bolivia para el radio PostGIS.",
    );
  }
}

export function toResolvedResourceProviderSearchLocation(
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
    location.label ?? (location.kind === "current" ? "Ubicación actual" : "");

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
    activeSponsorPlacements: cloneLocalSponsorPlacements(
      summary.activeSponsorPlacements,
    ),
  };
}

function cloneResourceProviderSummary(
  provider: ResourceProviderSummary,
): ResourceProviderSummary {
  return {
    ...provider,
    approximateLocation: provider.approximateLocation
      ? { ...provider.approximateLocation }
      : undefined,
    contactOptions: provider.contactOptions.map((contact) => ({ ...contact })),
    sponsorPlacement: cloneLocalSponsorPlacement(provider.sponsorPlacement),
    activeSponsorPlacements: cloneLocalSponsorPlacements(
      provider.activeSponsorPlacements,
    ),
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
