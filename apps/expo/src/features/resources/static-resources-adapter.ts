import type {
  ResourceCategoryId,
  ResourceProviderProfile,
  ResourceProviderSummary,
  ResourceReportReason,
  ResourceSearchLocation,
} from "./resource-types";
import { rastroResourceFixtures } from "./static-resources-fixtures";

export interface ResourceSearchQuery {
  location: ResourceSearchLocation;
  radiusMeters: number;
  categoryIds?: readonly ResourceCategoryId[];
  strategy: "postgis_radius";
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

export function createStaticResourcesAdapter(
  fixtures: {
    providers: readonly ResourceProviderSummary[];
    profiles: readonly ResourceProviderProfile[];
  } = rastroResourceFixtures,
): ResourcesAdapter {
  return {
    searchProviders(query) {
      const selectedCategorySet = new Set(query.categoryIds ?? []);

      if (selectedCategorySet.size === 0) {
        return Promise.resolve(fixtures.providers);
      }

      return Promise.resolve(
        fixtures.providers.filter((provider) =>
          selectedCategorySet.has(provider.categoryId),
        ),
      );
    },
    getProviderProfile(providerId) {
      return Promise.resolve(
        fixtures.profiles.find((profile) => profile.id === providerId) ?? null,
      );
    },
    reportProvider(input) {
      const provider = fixtures.providers.find(
        (candidate) => candidate.id === input.providerId,
      );

      if (provider === undefined) {
        return Promise.reject(
          new Error("No se encontró el proveedor para reportar."),
        );
      }

      return Promise.resolve({
        status: "created",
        moderationItem: {
          id: `resource-provider-report:${provider.id}`,
          targetType: "resource_provider",
          providerId: provider.id,
          providerName: provider.name,
          reason: input.reason,
          detail: input.detail,
        },
      });
    },
  };
}
