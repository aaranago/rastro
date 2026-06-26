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
export type ResourceProviderReportApiInput =
  RouterInputs["resources"]["reportProvider"];
export type ResourceProviderReportApiOutput =
  RouterOutputs["resources"]["reportProvider"];

export interface ResourcesApiClient {
  resources: {
    nearby: {
      query: (input: ResourceNearbyInput) => Promise<ResourceNearbyOutput>;
    };
    detail: {
      query: (input: ResourceDetailInput) => Promise<ResourceDetailOutput>;
    };
    reportProvider: {
      mutate: (
        input: ResourceProviderReportApiInput,
      ) => Promise<ResourceProviderReportApiOutput>;
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
    reportProvider(input) {
      return reportProvider(client, input);
    },
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

async function reportProvider(
  client: ResourcesApiClient,
  input: ResourceProviderReportInput,
): Promise<ResourceProviderReportReceipt> {
  const response = await client.resources.reportProvider.mutate({
    detail: input.detail,
    providerId: input.providerId,
    reason: input.reason,
  });

  return {
    status: response.status,
    moderationItem: {
      id: response.reviewItem.id,
      targetType: "resource_provider",
      providerId: response.reviewItem.provider.id,
      providerName: response.reviewItem.provider.name,
      reason: response.reviewItem.reason,
      detail: response.reviewItem.newestReport.detail,
      reviewItem: {
        createdAt: toIsoString(response.reviewItem.createdAt),
        detail: response.reviewItem.newestReport.detail,
        id: response.reviewItem.id,
        kind: "abuse_report",
        reason: response.reviewItem.reason,
        reporterMemberId:
          response.reviewItem.newestReport.reporter.memberId ?? undefined,
        status: "pending",
        targetId: response.reviewItem.provider.id,
        targetType: "resource_provider",
      },
    },
  };
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
