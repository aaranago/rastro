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
      const categories =
        query.categories && query.categories.length > 0
          ? new Set(query.categories)
          : undefined;
      const reports = [
        ...options.reports.filter(
          (report) =>
            (report.distanceMeters ?? 0) <= radiusMeters &&
            (!categories || categories.has(getReportKind(report))),
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

function getReportKind(report: NearbyPublicReportSummary) {
  return report.reportKind ?? "lost-pet-report";
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
