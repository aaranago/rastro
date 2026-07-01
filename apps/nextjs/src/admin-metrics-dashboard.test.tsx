import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AdminMetricsOverview } from "./admin-metrics-api-adapter";
import { AdminMetricsDashboard } from "./admin-metrics-dashboard";

describe("AdminMetricsDashboard", () => {
  it("renders summary cards and many-row location tables without desktop clipping wrappers", () => {
    const html = renderToStaticMarkup(
      <AdminMetricsDashboard
        state={{ metrics: metricsOverview(), status: "ready" }}
      />,
    );

    expect(html).toContain("Métricas operativas");
    expect(html).toContain("Eventos de auditoría");
    expect(html).toContain("Reportes de abuso");
    expect(html).toContain("Proveedores verificados");
    expect(html).toContain("Impresiones de patrocinio");
    expect(html).toContain("Aperturas de patrocinio");
    expect(html).toContain("Por ciudad");
    expect(html).toContain("Por departamento");
    expect(html).toContain("La Paz");
    expect(html).toContain("Santa Cruz");
    expect(html).toContain("Vista larga");
    expect(html).toContain("table-fixed");
    expect(html).toContain("break-words");
    expect(html).toContain("Usa ciudad y departamento estructurados");
    expect(html).not.toMatch(/marketplace|seller|comprar|vender/i);
  });

  it("renders empty states without fake operational numbers", () => {
    const html = renderToStaticMarkup(
      <AdminMetricsDashboard
        state={{
          metrics: {
            byCity: [],
            byDepartment: [],
            summary: emptySummary(),
          },
          status: "ready",
        }}
      />,
    );

    expect(html).toContain("Todavía no hay métricas por ciudad.");
    expect(html).toContain("Todavía no hay métricas por departamento.");
    expect(html).toContain("sin usar valores de demostración");
  });

  it("renders loading and error states", () => {
    const loadingHtml = renderToStaticMarkup(
      <AdminMetricsDashboard state={{ status: "loading" }} />,
    );
    const errorHtml = renderToStaticMarkup(
      <AdminMetricsDashboard
        state={{
          message:
            "El contrato admin.metrics.overview todavía no está disponible.",
          status: "error",
        }}
      />,
    );

    expect(loadingHtml).toContain("Cargando resumen de métricas");
    expect(loadingHtml).toContain('data-slot="skeleton"');
    expect(errorHtml).toContain("No se pudieron cargar las métricas");
    expect(errorHtml).toContain("admin.metrics.overview");
  });
});

function metricsOverview(): AdminMetricsOverview {
  const byCity = Array.from({ length: 14 }, (_, index) => ({
    abuseReportCount: 20 - index,
    activeSponsorPlacementCount: index % 3,
    auditEventCount: 40 + index,
    city: index === 0 ? "La Paz" : `Ciudad ${index}`,
    department: index % 2 === 0 ? "La Paz" : "Santa Cruz",
    hiddenContentCount: index % 4,
    pendingModerationCount: index + 1,
    resourceProviderCount: 5 + index,
    sponsorImpressionCount: 10 + index,
    sponsorOpenCount: index % 5,
    suspendedMemberCount: index % 2,
    verifiedResourceProviderCount: 3 + index,
  }));

  return {
    byCity,
    byDepartment: [
      {
        abuseReportCount: 36,
        activeSponsorPlacementCount: 4,
        auditEventCount: 82,
        department: "La Paz",
        hiddenContentCount: 6,
        pendingModerationCount: 11,
        resourceProviderCount: 21,
        sponsorImpressionCount: 44,
        sponsorOpenCount: 8,
        suspendedMemberCount: 2,
        verifiedResourceProviderCount: 17,
      },
      {
        abuseReportCount: 19,
        activeSponsorPlacementCount: 3,
        auditEventCount: 44,
        department: "Santa Cruz",
        hiddenContentCount: 3,
        pendingModerationCount: 9,
        resourceProviderCount: 16,
        sponsorImpressionCount: 31,
        sponsorOpenCount: 5,
        suspendedMemberCount: 1,
        verifiedResourceProviderCount: 12,
      },
    ],
    generatedAt: "2026-06-26T12:00:00.000Z",
    summary: {
      abuseReportCount: 55,
      activeSponsorPlacementCount: 7,
      auditEventCount: 126,
      hiddenContentCount: 9,
      pendingModerationCount: 20,
      resourceProviderCount: 37,
      sponsorImpressionCount: 75,
      sponsorOpenCount: 13,
      suspendedMemberCount: 3,
      verifiedResourceProviderCount: 29,
    },
  };
}

function emptySummary() {
  return {
    abuseReportCount: 0,
    activeSponsorPlacementCount: 0,
    auditEventCount: 0,
    hiddenContentCount: 0,
    pendingModerationCount: 0,
    resourceProviderCount: 0,
    sponsorImpressionCount: 0,
    sponsorOpenCount: 0,
    suspendedMemberCount: 0,
    verifiedResourceProviderCount: 0,
  };
}
