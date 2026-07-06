import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authServer = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const envMock = vi.hoisted(() => ({
  env: {
    RASTRO_ADMIN_EMAILS: "admin@rastro.bo",
  },
}));

const adminSettingsApi = vi.hoisted(() => ({
  getAdminSettings: vi.fn(),
}));
const resourceProviderModerationApi = vi.hoisted(() => ({
  getAdminResourceProviderModerationQueueItem: vi.fn(),
  listAdminResourceProviderModerationQueueList: vi.fn(),
  resolveResourceProviderReviewItem: vi.fn(),
}));
const reportModerationApi = vi.hoisted(() => ({
  getAdminReportModerationQueueItem: vi.fn(),
  hideAdminReportTarget: vi.fn(),
  listAdminReportModerationQueueList: vi.fn(),
  markFalseReportTarget: vi.fn(),
  restoreAdminReportTarget: vi.fn(),
  unmarkFalseReportTarget: vi.fn(),
}));

vi.mock("~/auth/server", () => authServer);
vi.mock("~/env", () => envMock);
vi.mock("~/admin-settings-api-adapter", () => adminSettingsApi);
vi.mock(
  "~/admin-resource-provider-moderation-api-adapter",
  () => resourceProviderModerationApi,
);
vi.mock("~/admin-report-moderation-api-adapter", () => reportModerationApi);

describe("admin moderation page", () => {
  beforeEach(() => {
    vi.resetModules();
    authServer.getSession.mockReset();
    adminSettingsApi.getAdminSettings.mockReset();
    adminSettingsApi.getAdminSettings.mockResolvedValue({
      adoptionReviewModeEnabled: false,
      updatedAt: null,
      updatedByAdminId: null,
      verifiedEmailRequiredToPublish: false,
    });
    resourceProviderModerationApi.getAdminResourceProviderModerationQueueItem.mockReset();
    resourceProviderModerationApi.getAdminResourceProviderModerationQueueItem.mockResolvedValue(
      null,
    );
    resourceProviderModerationApi.listAdminResourceProviderModerationQueueList.mockReset();
    resourceProviderModerationApi.listAdminResourceProviderModerationQueueList.mockResolvedValue(
      adminListResult([]),
    );
    resourceProviderModerationApi.resolveResourceProviderReviewItem.mockReset();
    reportModerationApi.getAdminReportModerationQueueItem.mockReset();
    reportModerationApi.getAdminReportModerationQueueItem.mockResolvedValue(
      null,
    );
    reportModerationApi.listAdminReportModerationQueueList.mockReset();
    reportModerationApi.listAdminReportModerationQueueList.mockResolvedValue(
      adminListResult([]),
    );
    reportModerationApi.hideAdminReportTarget.mockReset();
    reportModerationApi.markFalseReportTarget.mockReset();
    reportModerationApi.restoreAdminReportTarget.mockReset();
    reportModerationApi.unmarkFalseReportTarget.mockReset();
  });

  it("renders the moderation dashboard for an allowed admin member", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    reportModerationApi.listAdminReportModerationQueueList.mockResolvedValue(
      adminListResult(
        [
          {
            createdAt: new Date("2026-06-26T17:00:00.000Z"),
            id: "report-review-33333333-3333-4333-8333-333333333333",
            newestAction: null,
            reportCount: 1,
            target: {
              caretaker: {
                displayName: "Huellitas La Paz",
                email: "huellitas@example.com",
                memberId: "member-huellitas",
                suspension: {
                  reason: "Reportes falsos repetidos.",
                  suspendedAt: new Date("2026-06-26T16:30:00.000Z"),
                  suspendedByAdminId: "member-admin",
                },
              },
              city: "La Paz",
              department: "La Paz",
              falseReport: null,
              falseReportState: "not_false",
              hiddenAt: null,
              hiddenByAdminId: null,
              hiddenNote: null,
              hiddenReason: null,
              id: "33333333-3333-4333-8333-333333333333",
              locationLabel: "Sopocachi, La Paz",
              reportType: "adoption",
              status: "visible",
              title: "Nala busca nuevo hogar DB",
              type: "adoption_listing",
              visibility: "visible",
            },
            updatedAt: new Date("2026-06-26T17:00:00.000Z"),
          },
        ],
        {
          availableSorts: [
            {
              defaultDirection: "desc",
              label: "Actualizado",
              value: "updatedAt",
            },
          ],
          total: 12,
        },
      ),
    );
    resourceProviderModerationApi.listAdminResourceProviderModerationQueueList.mockResolvedValue(
      adminListResult(
        [
          {
            createdAt: new Date("2026-06-26T16:00:00.000Z"),
            id: "22222222-2222-4222-8222-222222222222",
            lastReportedAt: new Date("2026-06-26T16:00:00.000Z"),
            newestReport: {
              createdAt: new Date("2026-06-26T16:00:00.000Z"),
              detail: "La dirección visible no coincide con el local.",
              reporter: {
                displayName: "Ana S.",
                email: "ana@example.com",
                memberId: "member-ana",
              },
            },
            provider: {
              city: "La Paz",
              department: "La Paz",
              id: "11111111-1111-4111-8111-111111111111",
              locationLabel: "Sopocachi, La Paz",
              name: "Clínica Veterinaria San Roque DB",
              verificationStatus: "verified",
            },
            reason: "incorrect_location",
            reportCount: 2,
            status: "pending",
          },
        ],
        {
          availableSorts: [
            {
              defaultDirection: "desc",
              label: "Ultimo reporte",
              value: "lastReportedAt",
            },
          ],
          total: 11,
        },
      ),
    );
    const { default: AdminModerationPage } = await import(
      "./app/admin/moderacion/page"
    );

    const html = renderToStaticMarkup(await AdminModerationPage());

    expect(html).toContain("Contenido reportado");
    expect(html).toContain("Filtros de revisión");
    expect(html).toContain("Nala busca nuevo hogar DB");
    expect(html).toContain("Publicación de adopción");
    expect(html).toContain(
      "/admin/moderacion/report-review-33333333-3333-4333-8333-333333333333",
    );
    expect(html).toContain("Miembro suspendido");
    expect(html).toContain("Reportes falsos repetidos.");
    expect(html).toContain("/admin/miembros?memberId=member-huellitas");
    expect(html).not.toContain("Bruno reportado como posible riesgo");
    expect(html).toContain("Perfil de proveedor de recursos");
    expect(html).toContain("Clínica Veterinaria San Roque DB");
    expect(html).toContain("Ubicación incorrecta");
    expect(html).toContain("Reportado por Ana S.");
    expect(html).toContain("Sopocachi, La Paz");
    expect(html).toContain("2 reportes");
    expect(html).toContain("1 de 12 revisiones");
    expect(html).toContain("1 de 11 revisiones");
    expect(html).toContain("Mostrando 1-10 de 12");
    expect(html).toContain("Mostrando 1-10 de 11");
    expect(html).toContain("/admin/moderacion?page=2&amp;pageSize=10");
    expect(html).toContain(
      "/admin/moderacion?pageSize=10&amp;sortBy=updatedAt&amp;sortDirection=desc",
    );
    expect(html).toContain(
      "/admin/moderacion?pageSize=10&amp;sortBy=lastReportedAt&amp;sortDirection=desc",
    );
    expect(html).not.toContain("Clínica San Roque");
    expect(html).toContain("Modo de revisión para adopciones");
    expect(html).toContain("Métricas visibles de abuso por ciudad");
    expect(html).toContain("Admin Rastro");
    expect(
      resourceProviderModerationApi.listAdminResourceProviderModerationQueueList,
    ).toHaveBeenCalledWith({ filters: {}, page: 1, pageSize: 10 });
    expect(
      reportModerationApi.listAdminReportModerationQueueList,
    ).toHaveBeenCalledWith({ filters: {}, page: 1, pageSize: 10 });
  });

  it("filters the persisted queue and renders action feedback from search params", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    reportModerationApi.listAdminReportModerationQueueList.mockResolvedValue(
      adminListResult([
        {
          createdAt: new Date("2026-06-26T17:00:00.000Z"),
          id: "report-review-luna",
          newestAction: null,
          reportCount: 4,
          target: {
            caretaker: {
              displayName: "Mateo R.",
              email: "mateo@example.com",
              memberId: "member-mateo",
              suspension: null,
            },
            city: "La Paz",
            department: "La Paz",
            falseReport: null,
            falseReportState: "not_false",
            hiddenAt: null,
            hiddenByAdminId: null,
            hiddenNote: null,
            hiddenReason: "Ubicación incorrecta",
            id: "lost-luna-centro",
            locationLabel: "Centro, La Paz",
            reportType: "lost_pet",
            status: "visible",
            title: "Luna perdida cerca de la plaza",
            type: "lost_pet_report",
            visibility: "visible",
          },
          updatedAt: new Date("2026-06-26T17:00:00.000Z"),
        },
      ]),
    );
    const { default: AdminModerationPage } = await import(
      "./app/admin/moderacion/page"
    );

    const html = renderToStaticMarkup(
      await AdminModerationPage({
        searchParams: Promise.resolve({
          accion: "hide_target",
          estado: "ok",
          objetivo: "Luna perdida cerca de la plaza",
          risk: "high",
          search: "Luna",
          sortBy: "updatedAt",
          sortDirection: "asc",
          targetType: "lost_pet_report",
        }),
      }),
    );

    expect(html).toContain("Contenido ocultado");
    expect(html).toContain("Luna perdida cerca de la plaza quedó oculto");
    expect(html).toContain("Búsqueda: Luna");
    expect(html).toContain("1 de 1 revisiones");
    expect(html).toContain("Mostrando 1-1 de 1");
    expect(html).toContain("Luna perdida cerca de la plaza");
    expect(html).not.toContain("Michi busca nuevo hogar");
    expect(html).not.toContain('name="confirmModerationAction"');
    expect(html).toContain("Luna perdida cerca de la plaza quedó oculto");
    expect(html).toContain(
      "/admin/moderacion/report-review-luna?targetType=lost_pet_report&amp;risk=high&amp;search=Luna&amp;pageSize=10&amp;sortBy=updatedAt&amp;sortDirection=asc",
    );
    expect(
      reportModerationApi.listAdminReportModerationQueueList,
    ).toHaveBeenCalledWith({
      filters: {
        risk: "caretaker_suspended",
        type: ["lost_pet"],
      },
      page: 1,
      pageSize: 10,
      search: "Luna",
      sortBy: "updatedAt",
      sortDirection: "asc",
    });
    expect(
      resourceProviderModerationApi.listAdminResourceProviderModerationQueueList,
    ).not.toHaveBeenCalled();
  });

  it("renders a persisted review detail route with evidence and moderation actions", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    reportModerationApi.getAdminReportModerationQueueItem.mockResolvedValue({
      createdAt: new Date("2026-06-26T17:00:00.000Z"),
      id: "report-review-luna",
      newestAction: {
        action: "hide",
        adminId: "member-admin",
        createdAt: new Date("2026-06-26T17:10:00.000Z"),
        note: "Ubicación inconsistente.",
        reason: "admin_review",
      },
      reportCount: 4,
      target: {
        caretaker: {
          displayName: "Mateo R.",
          email: "mateo@example.com",
          memberId: "member-mateo",
          suspension: null,
        },
        city: "La Paz",
        department: "La Paz",
        falseReport: null,
        falseReportState: "not_false",
        hiddenAt: null,
        hiddenByAdminId: null,
        hiddenNote: null,
        hiddenReason: "Ubicación incorrecta",
        id: "lost-luna-centro",
        locationLabel: "Centro, La Paz",
        reportType: "lost_pet",
        status: "visible",
        title: "Luna perdida cerca de la plaza",
        type: "lost_pet_report",
        visibility: "visible",
      },
      updatedAt: new Date("2026-06-26T17:10:00.000Z"),
    });
    const { default: AdminModerationReviewItemPage } = await import(
      "./app/admin/moderacion/[reviewItemId]/page"
    );

    const html = renderToStaticMarkup(
      await AdminModerationReviewItemPage({
        params: Promise.resolve({ reviewItemId: "report-review-luna" }),
        searchParams: Promise.resolve({
          accion: "hide_target",
          estado: "error",
          error: "confirmation",
          page: "3",
          pageSize: "25",
          risk: "high",
          search: "Luna",
          sortBy: "updatedAt",
          sortDirection: "asc",
          targetType: "lost_pet_report",
        }),
      }),
    );

    expect(html).toContain("Revisión de moderación");
    expect(html).toContain("Evidencia");
    expect(html).toContain("Historial");
    expect(html).toContain("Confirmación requerida");
    expect(html).toContain("Luna perdida cerca de la plaza");
    expect(html).toContain("Confirmo ocultar reporte");
    expect(html).toContain("Marcar reporte falso");
    expect(html).toContain("/admin/miembros?memberId=member-mateo");
    expect(html).toContain(
      "/admin/moderacion?targetType=lost_pet_report&amp;risk=high&amp;search=Luna&amp;page=3&amp;pageSize=25&amp;sortBy=updatedAt&amp;sortDirection=asc",
    );
    expect(html).toContain(
      "/admin/moderacion/report-review-luna?targetType=lost_pet_report&amp;risk=high&amp;search=Luna&amp;page=3&amp;pageSize=25&amp;sortBy=updatedAt&amp;sortDirection=asc",
    );
    expect(
      reportModerationApi.getAdminReportModerationQueueItem,
    ).toHaveBeenCalledWith("report-review-luna");
    expect(
      reportModerationApi.listAdminReportModerationQueueList,
    ).not.toHaveBeenCalled();
    expect(
      resourceProviderModerationApi.listAdminResourceProviderModerationQueueList,
    ).not.toHaveBeenCalled();
  });

  it("renders a provider review detail route from the direct provider queue item adapter", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    resourceProviderModerationApi.getAdminResourceProviderModerationQueueItem.mockResolvedValue(
      {
        createdAt: new Date("2026-06-26T16:00:00.000Z"),
        id: "22222222-2222-4222-8222-222222222222",
        lastReportedAt: new Date("2026-06-26T16:00:00.000Z"),
        newestReport: {
          createdAt: new Date("2026-06-26T16:00:00.000Z"),
          detail: "La dirección visible no coincide con el local.",
          reporter: {
            displayName: "Ana S.",
            email: "ana@example.com",
            memberId: "member-ana",
          },
        },
        provider: {
          city: "La Paz",
          department: "La Paz",
          id: "11111111-1111-4111-8111-111111111111",
          locationLabel: "Sopocachi, La Paz",
          name: "Clínica Veterinaria San Roque DB",
          verificationStatus: "verified",
        },
        reason: "incorrect_location",
        reportCount: 2,
        resolution: null,
        status: "pending",
      },
    );
    const { default: AdminModerationReviewItemPage } = await import(
      "./app/admin/moderacion/[reviewItemId]/page"
    );

    const html = renderToStaticMarkup(
      await AdminModerationReviewItemPage({
        params: Promise.resolve({
          reviewItemId: "22222222-2222-4222-8222-222222222222",
        }),
      }),
    );

    expect(html).toContain("Clínica Veterinaria San Roque DB");
    expect(html).toContain("Resolver con acción");
    expect(html).toContain('name="providerResolutionStatus"');
    expect(
      resourceProviderModerationApi.getAdminResourceProviderModerationQueueItem,
    ).toHaveBeenCalledWith("22222222-2222-4222-8222-222222222222");
    expect(
      resourceProviderModerationApi.listAdminResourceProviderModerationQueueList,
    ).not.toHaveBeenCalled();
    expect(
      reportModerationApi.listAdminReportModerationQueueList,
    ).not.toHaveBeenCalled();
  });

  it("renders access denied for signed-in non-admin members", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "ana@example.com",
        id: "member-ana",
        name: "Ana miembro",
      },
    });
    const { default: AdminModerationPage } = await import(
      "./app/admin/moderacion/page"
    );

    const html = renderToStaticMarkup(await AdminModerationPage());

    expect(html).toContain("Acceso restringido");
    expect(html).toContain("Solo administradores de Rastro");
    expect(html).toContain("Ana miembro");
    expect(html).not.toContain("Cola de revisión");
    expect(html).not.toContain("Suspender miembro");
    expect(
      resourceProviderModerationApi.listAdminResourceProviderModerationQueueList,
    ).not.toHaveBeenCalled();
    expect(
      reportModerationApi.listAdminReportModerationQueueList,
    ).not.toHaveBeenCalled();
  });
});

function adminListResult<T>(
  items: T[],
  overrides: {
    availableSorts?: {
      defaultDirection: "asc" | "desc";
      label: string;
      value: string;
    }[];
    page?: number;
    pageSize?: number;
    total?: number;
  } = {},
) {
  const page = overrides.page ?? 1;
  const pageSize = overrides.pageSize ?? 10;
  const total = overrides.total ?? items.length;
  const pageCount = total > 0 ? Math.ceil(total / pageSize) : 0;

  return {
    availableFilters: [],
    availableSorts: overrides.availableSorts ?? [],
    hasNextPage: page < pageCount,
    hasPreviousPage: page > 1,
    items,
    page,
    pageCount,
    pageSize,
    total,
  };
}
