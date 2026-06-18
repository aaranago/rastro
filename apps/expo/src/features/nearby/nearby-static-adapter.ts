import type {
  NearbyLostReportsAdapter,
  NearbyLostReportsQuery,
  NearbyLostReportsResult,
  NearbyPublicReportSummary,
  NearbySearchBoundary,
} from "./nearby-types";
import { compareNearbyPublicReports } from "./nearby-ranking";

interface StaticNearbyLostReportsAdapterOptions {
  reports: NearbyPublicReportSummary[];
  generatedAt?: string;
  isOffline?: boolean;
  isStale?: boolean;
}

export function createStaticNearbyLostReportsAdapter(
  options: StaticNearbyLostReportsAdapterOptions,
): NearbyLostReportsAdapter {
  return {
    searchLostPetReports(
      query: NearbyLostReportsQuery,
    ): Promise<NearbyLostReportsResult> {
      const radiusMeters = query.radiusKm * 1000;
      const reports = [
        ...options.reports.filter(
          (report) => (report.distanceMeters ?? 0) <= radiusMeters,
        ),
      ].sort(compareNearbyPublicReports);

      return Promise.resolve({
        generatedAt: options.generatedAt ?? "2026-01-01T00:00:00.000Z",
        isOffline: options.isOffline,
        isStale: options.isStale,
        query,
        reports,
        searchBoundary: buildSearchBoundary(query),
      });
    },
  };
}

function buildSearchBoundary(
  query: NearbyLostReportsQuery,
): NearbySearchBoundary {
  return {
    center: query.location,
    engine: "rastro-postgis-radius",
    owner: "rastro",
    publicLocationPrecision: "location-cell",
    radiusKm: query.radiusKm,
  };
}
