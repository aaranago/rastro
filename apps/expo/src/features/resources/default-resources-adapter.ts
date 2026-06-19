import type {
  ResourceProviderDirectoryResult,
  ResourceProviderProfileResult,
  ResourceSearchQuery,
} from "./static-resources-adapter";
import { createInMemoryLastLoadedCache } from "../resilience/last-loaded-cache";
import {
  createCachedResourcesAdapter,
  createStaticResourcesAdapter,
} from "./static-resources-adapter";

export const defaultCachedResourcesAdapter = createCachedResourcesAdapter({
  cache: createInMemoryLastLoadedCache<ResourceProviderDirectoryResult>(),
  cacheKey: buildResourceDirectoryCacheKey,
  profileCache: createInMemoryLastLoadedCache<ResourceProviderProfileResult>(),
  profileCacheKey: (providerId) => `profile:${providerId}`,
  source: createStaticResourcesAdapter(),
});

function buildResourceDirectoryCacheKey(query: ResourceSearchQuery) {
  const categories = [...(query.categoryIds ?? [])].sort().join(",");
  const location = query.location;
  const coordinate =
    "coordinate" in location && location.coordinate
      ? `${location.coordinate.latitude.toFixed(5)},${location.coordinate.longitude.toFixed(5)}`
      : "no-coordinate";

  return [
    "directory",
    query.strategy,
    query.radiusMeters,
    categories,
    location.kind,
    location.label ?? "sin-etiqueta",
    coordinate,
  ].join(":");
}
