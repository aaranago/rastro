import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authServer = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const metricsApi = vi.hoisted(() => ({
  getAdminMetricsOverview: vi.fn(),
}));

const envMock = vi.hoisted(() => ({
  env: {
    RASTRO_ADMIN_EMAILS: "admin@rastro.bo",
  },
}));

vi.mock("~/auth/server", () => authServer);
vi.mock("~/env", () => envMock);
vi.mock("~/admin-metrics-api-adapter", () => metricsApi);

describe("admin overview page", () => {
  beforeEach(() => {
    vi.resetModules();
    authServer.getSession.mockReset();
    metricsApi.getAdminMetricsOverview.mockReset();
    envMock.env.RASTRO_ADMIN_EMAILS = "admin@rastro.bo";
  });

  it("renders available sections and a metrics snapshot for admins", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    metricsApi.getAdminMetricsOverview.mockResolvedValue({
      metrics: {
        byCity: [],
        byDepartment: [],
        summary: {
          abuseReportCount: 8,
          activeSponsorPlacementCount: 2,
          auditEventCount: 16,
          hiddenContentCount: 3,
          pendingModerationCount: 5,
          resourceProviderCount: 12,
          suspendedMemberCount: 1,
          verifiedResourceProviderCount: 9,
        },
      },
      status: "ready",
    });
    const { default: AdminOverviewPage, metadata } = await import(
      "./app/admin/page"
    );

    const html = renderToStaticMarkup(await AdminOverviewPage());

    expect(metadata).toMatchObject({
      title: "Overview admin | Rastro",
    });
    expect(html).toContain("Panel de administración");
    expect(html).toContain("Snapshot operativo");
    expect(html).toContain("Subconjunto de las mismas métricas");
    expect(html).toContain("Métricas");
    expect(html).toContain("Auditoría");
    expect(html).toContain("Abrir Métricas");
    expect(html).toContain("Abrir Auditoría");
    expect(html).not.toContain("Secciones planificadas");
    expect(metricsApi.getAdminMetricsOverview).toHaveBeenCalledOnce();
  });

  it("renders a metrics error snapshot without blocking section navigation", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    metricsApi.getAdminMetricsOverview.mockResolvedValue({
      message: "El contrato admin.metrics.overview todavía no está disponible.",
      status: "error",
    });
    const { default: AdminOverviewPage } = await import("./app/admin/page");

    const html = renderToStaticMarkup(await AdminOverviewPage());

    expect(html).toContain("Métricas operativas no disponibles");
    expect(html).toContain("admin.metrics.overview");
    expect(html).toContain("Abrir Métricas");
  });
});
