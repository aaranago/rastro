import { describe, expect, it } from "vitest";

import { buildAdminMetricsOverviewFromGroups } from "./admin-metrics-repository";

describe("admin metrics repository", () => {
  it("aggregates content, abuse, resources, and sponsor metrics by structured city and department", () => {
    const overview = buildAdminMetricsOverviewFromGroups({
      generatedAt: new Date("2026-06-26T16:00:00.000Z"),
      groups: [
        [
          {
            key: {
              city: "La Paz",
              department: "La Paz",
            },
            metrics: {
              adoptionListingCount: 1,
              contentReportCount: 3,
              hiddenReportCount: 1,
              pendingProviderReportCount: 0,
              pendingReviewReportCount: 1,
              resourceProviderCount: 0,
              sponsorImpressionCount: 0,
              sponsorOpenCount: 0,
              sponsorPlacementCount: 0,
              verifiedResourceProviderCount: 0,
            },
          },
          {
            key: {
              city: "El Alto",
              department: "La Paz",
            },
            metrics: {
              adoptionListingCount: 0,
              contentReportCount: 2,
              hiddenReportCount: 0,
              pendingProviderReportCount: 0,
              pendingReviewReportCount: 0,
              resourceProviderCount: 0,
              sponsorImpressionCount: 0,
              sponsorOpenCount: 0,
              sponsorPlacementCount: 0,
              verifiedResourceProviderCount: 0,
            },
          },
        ],
        [
          {
            key: {
              city: "La Paz",
              department: "La Paz",
            },
            metrics: {
              adoptionListingCount: 0,
              contentReportCount: 0,
              hiddenReportCount: 0,
              pendingProviderReportCount: 2,
              pendingReviewReportCount: 0,
              resourceProviderCount: 4,
              sponsorImpressionCount: 12,
              sponsorOpenCount: 3,
              sponsorPlacementCount: 1,
              verifiedResourceProviderCount: 3,
            },
          },
        ],
      ],
    });

    expect(overview.cityRows).toEqual([
      expect.objectContaining({
        city: "El Alto",
        contentReportCount: 2,
        department: "La Paz",
        resourceProviderCount: 0,
      }),
      expect.objectContaining({
        city: "La Paz",
        contentReportCount: 3,
        department: "La Paz",
        hiddenReportCount: 1,
        pendingProviderReportCount: 2,
        resourceProviderCount: 4,
        sponsorImpressionCount: 12,
        sponsorOpenCount: 3,
        sponsorPlacementCount: 1,
        verifiedResourceProviderCount: 3,
      }),
    ]);
    expect(overview.departmentRows).toEqual([
      expect.objectContaining({
        city: null,
        contentReportCount: 5,
        department: "La Paz",
        hiddenReportCount: 1,
        pendingProviderReportCount: 2,
        resourceProviderCount: 4,
        sponsorImpressionCount: 12,
        sponsorOpenCount: 3,
      }),
    ]);
    expect(overview.summaryCards).toEqual(
      expect.arrayContaining([
        {
          id: "content-reports",
          label: "Reportes",
          value: 5,
        },
        {
          id: "resource-providers",
          label: "Resource Providers",
          value: 4,
        },
        {
          id: "sponsor-impressions",
          label: "Impresiones de patrocinio",
          value: 12,
        },
        {
          id: "sponsor-opens",
          label: "Aperturas de patrocinio",
          value: 3,
        },
      ]),
    );
  });
});
