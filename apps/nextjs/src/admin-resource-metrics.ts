export interface AdminResourceMetricSource {
  activeSponsorPlacementCount: number;
  isVerified: boolean;
  label: string;
}

export interface AdminResourceMetricGroup {
  activeSponsorPlacementCount: number;
  label: string;
  providerCount: number;
  verifiedProviderCount: number;
}

export function buildAdminResourceMetricGroup(
  sources: readonly AdminResourceMetricSource[],
): AdminResourceMetricGroup[] {
  const metricsByLabel = new Map<string, AdminResourceMetricGroup>();

  for (const source of sources) {
    const metric = metricsByLabel.get(source.label) ?? {
      activeSponsorPlacementCount: 0,
      label: source.label,
      providerCount: 0,
      verifiedProviderCount: 0,
    };

    metric.activeSponsorPlacementCount += source.activeSponsorPlacementCount;
    metric.providerCount += 1;
    metric.verifiedProviderCount += source.isVerified ? 1 : 0;

    metricsByLabel.set(source.label, metric);
  }

  return Array.from(metricsByLabel.values()).sort(
    (left, right) =>
      right.activeSponsorPlacementCount - left.activeSponsorPlacementCount ||
      right.providerCount - left.providerCount ||
      left.label.localeCompare(right.label),
  );
}
