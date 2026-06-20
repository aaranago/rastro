import type { LastLoadedCache } from "../resilience/last-loaded-cache";
import type {
  NearbyLostReportsAdapter,
  NearbyLostReportsQuery,
  NearbyLostReportsResult,
} from "./nearby-types";

export interface CachedNearbyLostReportsAdapterOptions {
  cache: LastLoadedCache<NearbyLostReportsResult>;
  cacheKey: string | ((query: NearbyLostReportsQuery) => string);
  source: NearbyLostReportsAdapter;
}

export function createCachedNearbyLostReportsAdapter({
  cache,
  cacheKey,
  source,
}: CachedNearbyLostReportsAdapterOptions): NearbyLostReportsAdapter {
  return {
    async searchLostPetReports(query, options) {
      const key = resolveCacheKey(cacheKey, query);

      try {
        const result = await source.searchLostPetReports(query, options);
        await cache.write(key, toFreshCachedResult(result));
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
    },
  };
}

function resolveCacheKey(
  cacheKey: CachedNearbyLostReportsAdapterOptions["cacheKey"],
  query: NearbyLostReportsQuery,
) {
  return typeof cacheKey === "function" ? cacheKey(query) : cacheKey;
}

function toFreshCachedResult(
  result: NearbyLostReportsResult,
): NearbyLostReportsResult {
  const { isOffline: _isOffline, isStale: _isStale, ...freshResult } = result;

  return freshResult;
}
