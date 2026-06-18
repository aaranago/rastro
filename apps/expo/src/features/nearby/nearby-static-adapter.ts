import type {
  LostPetReportSummary,
  NearbyLostReportsAdapter,
  NearbyLostReportsQuery,
  NearbyLostReportsResult,
  NearbySearchBoundary,
} from "./nearby-types";

interface StaticNearbyLostReportsAdapterOptions {
  reports: LostPetReportSummary[];
  generatedAt?: string;
  isOffline?: boolean;
  isStale?: boolean;
}

const farAwayDistance = Number.POSITIVE_INFINITY;

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
      ].sort(compareLostReports);

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

function compareLostReports(
  left: LostPetReportSummary,
  right: LostPetReportSummary,
) {
  const priority = priorityScore(right) - priorityScore(left);

  if (priority !== 0) {
    return priority;
  }

  return (
    (left.distanceMeters ?? farAwayDistance) -
    (right.distanceMeters ?? farAwayDistance)
  );
}

function priorityScore(report: LostPetReportSummary) {
  return report.alertPriority === "urgent" ? 1 : 0;
}
