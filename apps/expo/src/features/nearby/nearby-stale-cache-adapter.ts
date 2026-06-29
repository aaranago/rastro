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
  const latestSuccessfulResults = new Map<string, NearbyLostReportsResult>();

  return {
    async searchLostPetReports(query, options) {
      const key = resolveCacheKey(cacheKey, query);
      let result: NearbyLostReportsResult;

      try {
        result = await source.searchLostPetReports(query, options);
      } catch (error) {
        const cached =
          latestSuccessfulResults.get(key) ?? (await cache.read(key));

        if (cached === null) {
          throw error;
        }

        return toStaleCachedResult(cached);
      }

      const freshResult = toFreshCachedResult(result);

      latestSuccessfulResults.set(key, freshResult);
      await cache.write(key, freshResult).catch(() => undefined);

      return result;
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

function toStaleCachedResult(
  result: NearbyLostReportsResult,
): NearbyLostReportsResult {
  return {
    ...result,
    isOffline: true,
    isStale: true,
  };
}
