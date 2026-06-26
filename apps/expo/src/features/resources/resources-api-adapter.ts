import type { RouterInputs, RouterOutputs } from "@acme/api";

import type {
  ResourceProviderDirectoryResult,
  ResourceProviderProfileResult,
  ResourceProviderReportInput,
  ResourceProviderReportReceipt,
  ResourceSearchQuery,
  ResourcesAdapter,
} from "./static-resources-adapter";
import { toResolvedResourceProviderSearchLocation } from "./static-resources-adapter";
import type {
  ResourceCategoryId,
  ResourceProviderProfile,
  ResourceProviderSummary,
} from "./resource-types";

export type ResourceNearbyInput = RouterInputs["resources"]["nearby"];
export type ResourceNearbyOutput = RouterOutputs["resources"]["nearby"];
export type ResourceDetailInput = RouterInputs["resources"]["detail"];
export type ResourceDetailOutput = RouterOutputs["resources"]["detail"];

export interface ResourcesApiClient {
  resources: {
    nearby: {
      query: (input: ResourceNearbyInput) => Promise<ResourceNearbyOutput>;
    };
    detail: {
      query: (input: ResourceDetailInput) => Promise<ResourceDetailOutput>;
    };
  };
}

export interface ApiResourcesAdapterOptions {
  client: ResourcesApiClient;
}

export function createApiResourcesAdapter({
  client,
}: ApiResourcesAdapterOptions): ResourcesAdapter {
  const searchProviderDirectory = async (
    query: ResourceSearchQuery,
  ): Promise<ResourceProviderDirectoryResult> => {
    const location = toResolvedResourceProviderSearchLocation(query.location);

    if (!location) {
      return { providers: [] };
    }

    const response = await client.resources.nearby.query({
      categoryIds: toApiCategoryIds(query.categoryIds),
      latitude: location.coordinate.latitude,
      longitude: location.coordinate.longitude,
      radiusMeters: query.radiusMeters,
      strategy: query.strategy,
    });

    return {
      generatedAt: response.generatedAt,
      providers: response.results.map(toResourceProviderSummary),
    };
  };

  const getProviderProfileDetail = async (
    providerId: string,
  ): Promise<ResourceProviderProfileResult> => {
    try {
      const profile = await client.resources.detail.query({ providerId });

      return {
        profile: toResourceProviderProfile(profile),
        providerId,
      };
    } catch (error) {
      if (isNotFoundLikeError(error)) {
        return {
          profile: null,
          providerId,
        };
      }

      throw error;
    }
  };

  return {
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
    reportProvider,
  };
}

function toApiCategoryIds(
  categoryIds: readonly ResourceCategoryId[] | undefined,
) {
  return categoryIds && categoryIds.length > 0 ? [...categoryIds] : undefined;
}

function toResourceProviderSummary(
  provider: ResourceNearbyOutput["results"][number],
): ResourceProviderSummary {
  return {
    id: provider.id,
    name: provider.name,
    categoryId: provider.categoryId,
    description: provider.description,
    approximateLocationLabel: provider.approximateLocationLabel,
    contactOptions: provider.contactOptions.map((contact) => ({ ...contact })),
    distanceMeters: provider.distanceMeters,
    emergencyAvailable: provider.emergencyAvailable,
    isOpenNow: provider.isOpenNow,
    isVerified: provider.isVerified,
    logoUrl: provider.logoUrl,
    photoUrl: provider.photoUrl,
    serviceAreaLabel: provider.serviceAreaLabel,
    sponsorPlacement: provider.sponsorPlacement
      ? {
          ...provider.sponsorPlacement,
          eligibleSurfaces: [...provider.sponsorPlacement.eligibleSurfaces],
          safetyPolicy: {
            recoveryPriority: {
              ...provider.sponsorPlacement.safetyPolicy.recoveryPriority,
            },
            pushNotifications: {
              ...provider.sponsorPlacement.safetyPolicy.pushNotifications,
            },
          },
        }
      : undefined,
  };
}

function toResourceProviderProfile(
  profile: ResourceDetailOutput,
): ResourceProviderProfile {
  return {
    ...toResourceProviderSummary(profile),
    externalLinks: profile.externalLinks
      ? profile.externalLinks.map((link) => ({ ...link }))
      : undefined,
    hoursLabel: profile.hoursLabel,
    serviceAreaLabel: profile.serviceAreaLabel,
    shortDescription: profile.shortDescription,
    socialLinks: profile.socialLinks
      ? profile.socialLinks.map((link) => ({ ...link }))
      : undefined,
    websiteUrl: profile.websiteUrl,
  };
}

function isNotFoundLikeError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("NOT_FOUND") ||
    error.message.includes("BAD_REQUEST") ||
    error.message.includes("No encontrado")
  );
}

function reportProvider(
  _input: ResourceProviderReportInput,
): Promise<ResourceProviderReportReceipt> {
  return Promise.reject(
    new Error(
      "El reporte de proveedores requiere moderacion persistida y aun no esta habilitado.",
    ),
  );
}
