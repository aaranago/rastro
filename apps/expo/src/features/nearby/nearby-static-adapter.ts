import type {
  NearbyLostReportsAdapter,
  NearbyLostReportsQuery,
  NearbyLostReportsResult,
  NearbyPublicReportSummary,
  NearbySearchBoundary,
} from "./nearby-types";

interface StaticNearbyLostReportsAdapterOptions {
  reports: NearbyPublicReportSummary[];
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
  left: NearbyPublicReportSummary,
  right: NearbyPublicReportSummary,
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

function priorityScore(report: NearbyPublicReportSummary) {
  if (report.reportKind === "found-pet-report") {
    return 1;
  }

  if (report.reportKind === "sighting-report") {
    return 1;
  }

  return report.alertPriority === "urgent" ? 2 : 1;
}
