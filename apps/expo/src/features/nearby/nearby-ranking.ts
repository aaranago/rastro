import type { NearbyPublicReportSummary } from "./nearby-types";

const farAwayDistance = Number.POSITIVE_INFINITY;

export function compareNearbyPublicReports(
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
  if (report.reportKind === "adoption-listing") {
    return 1;
  }

  if (report.reportKind === "found-pet-report") {
    return 1;
  }

  if (report.reportKind === "sighting-report") {
    return 1;
  }

  return report.alertPriority === "urgent" ? 2 : 1;
}
