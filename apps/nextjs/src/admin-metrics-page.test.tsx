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

describe("admin metrics page", () => {
  beforeEach(() => {
    vi.resetModules();
    authServer.getSession.mockReset();
    metricsApi.getAdminMetricsOverview.mockReset();
    envMock.env.RASTRO_ADMIN_EMAILS = "admin@rastro.bo";
  });

  it("renders /admin/metricas for an allowlisted admin", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    metricsApi.getAdminMetricsOverview.mockResolvedValue({
      metrics: {
        byCity: [
          {
            abuseReportCount: 8,
            activeSponsorPlacementCount: 2,
            auditEventCount: 16,
            city: "La Paz",
            department: "La Paz",
            hiddenContentCount: 3,
            pendingModerationCount: 5,
            resourceProviderCount: 12,
            sponsorImpressionCount: 24,
            sponsorOpenCount: 6,
            suspendedMemberCount: 1,
            verifiedResourceProviderCount: 9,
          },
        ],
        byDepartment: [
          {
            abuseReportCount: 8,
            activeSponsorPlacementCount: 2,
            auditEventCount: 16,
            department: "La Paz",
            hiddenContentCount: 3,
            pendingModerationCount: 5,
            resourceProviderCount: 12,
            sponsorImpressionCount: 24,
            sponsorOpenCount: 6,
            suspendedMemberCount: 1,
            verifiedResourceProviderCount: 9,
          },
        ],
        summary: {
          abuseReportCount: 8,
          activeSponsorPlacementCount: 2,
          auditEventCount: 16,
          hiddenContentCount: 3,
          pendingModerationCount: 5,
          resourceProviderCount: 12,
          sponsorImpressionCount: 24,
          sponsorOpenCount: 6,
          suspendedMemberCount: 1,
          verifiedResourceProviderCount: 9,
        },
      },
      status: "ready",
    });
    const { default: AdminMetricsPage, metadata } = await import(
      "./app/admin/metricas/page"
    );

    const html = renderToStaticMarkup(await AdminMetricsPage());

    expect(metadata).toMatchObject({
      title: "Métricas admin | Rastro",
    });
    expect(html).toContain("Métricas operativas");
    expect(html).toContain("La Paz");
    expect(metricsApi.getAdminMetricsOverview).toHaveBeenCalledOnce();
  });

  it("does not call the metrics adapter for non-admin members", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "ana@example.com",
        id: "member-ana",
        name: "Ana miembro",
      },
    });
    const { default: AdminMetricsPage } = await import(
      "./app/admin/metricas/page"
    );

    const html = renderToStaticMarkup(await AdminMetricsPage());

    expect(html).toBe("");
    expect(metricsApi.getAdminMetricsOverview).not.toHaveBeenCalled();
  });
});
