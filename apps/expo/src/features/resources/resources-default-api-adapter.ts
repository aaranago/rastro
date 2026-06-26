import type { ResourceSearchQuery } from "./static-resources-adapter";
import { createInMemoryLastLoadedCache } from "../resilience/last-loaded-cache";
import { trpcClient } from "../../utils/api";
import { createApiResourcesAdapter } from "./resources-api-adapter";
import { createCachedResourcesAdapter } from "./static-resources-adapter";

export const defaultApiResourcesAdapter = createCachedResourcesAdapter({
  cache: createInMemoryLastLoadedCache(),
  cacheKey: buildResourceDirectoryCacheKey,
  profileCache: createInMemoryLastLoadedCache(),
  profileCacheKey: (providerId) => `api-profile:${providerId}`,
  source: createApiResourcesAdapter({ client: trpcClient }),
});

function buildResourceDirectoryCacheKey(query: ResourceSearchQuery) {
  const categories = [...(query.categoryIds ?? [])].sort().join(",");
  const location = query.location;
  const coordinate =
    "coordinate" in location && location.coordinate
      ? `${location.coordinate.latitude.toFixed(5)},${location.coordinate.longitude.toFixed(5)}`
      : "no-coordinate";

  return [
    "api-directory",
    query.strategy,
    query.radiusMeters,
    categories,
    location.kind,
    location.label ?? "sin-etiqueta",
    coordinate,
  ].join(":");
}
