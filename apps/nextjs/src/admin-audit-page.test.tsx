import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authServer = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const auditApi = vi.hoisted(() => ({
  listAdminAuditEvents: vi.fn(),
}));

const envMock = vi.hoisted(() => ({
  env: {
    RASTRO_ADMIN_EMAILS: "admin@rastro.bo",
  },
}));

vi.mock("~/auth/server", () => authServer);
vi.mock("~/env", () => envMock);
vi.mock("~/admin-audit-api-adapter", () => auditApi);

describe("admin audit page", () => {
  beforeEach(() => {
    vi.resetModules();
    authServer.getSession.mockReset();
    auditApi.listAdminAuditEvents.mockReset();
    envMock.env.RASTRO_ADMIN_EMAILS = "admin@rastro.bo";
  });

  it("renders /admin/auditoria with parsed filters for an allowlisted admin", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    auditApi.listAdminAuditEvents.mockResolvedValue({
      data: {
        availableSorts: [
          {
            defaultDirection: "desc",
            label: "Fecha",
            value: "createdAt",
          },
          {
            defaultDirection: "asc",
            label: "Objetivo",
            value: "targetLabel",
          },
        ],
        events: [
          {
            action: "settings_updated",
            actor: {
              email: "admin@rastro.bo",
              id: "member-admin-la-paz",
              label: "Admin Rastro",
            },
            city: "La Paz",
            department: "La Paz",
            id: "audit-event-settings",
            occurredAt: "2026-06-26T15:00:00.000Z",
            summary: "modo de revisión activado para adopciones",
            target: {
              id: "admin-settings",
              label: "Ajustes de publicación",
              type: "admin_settings",
            },
          },
        ],
        filters: {
          actions: [
            {
              label: "Ajustes actualizados",
              value: "settings_updated",
            },
          ],
          actors: [
            {
              label: "admin@rastro.bo",
              value: "admin@rastro.bo",
            },
          ],
          targetTypes: [
            {
              label: "Ajustes admin",
              value: "admin_settings",
            },
          ],
        },
        hasNextPage: false,
        hasPreviousPage: false,
        page: 1,
        pageCount: 1,
        pageSize: 100,
        total: 1,
      },
      status: "ready",
    });
    const { default: AdminAuditPage, metadata } = await import(
      "./app/admin/auditoria/page"
    );

    const html = renderToStaticMarkup(
      await AdminAuditPage({
        searchParams: Promise.resolve({
          action: "settings_updated",
          actor: "admin@rastro.bo",
          limit: "500",
          search: "review mode",
          sortBy: "targetLabel",
          sortDirection: "asc",
          targetType: "admin_settings",
        }),
      }),
    );

    expect(metadata).toMatchObject({
      title: "Auditoría admin | Rastro",
    });
    expect(html).toContain("Auditoría administrativa");
    expect(html).toContain("modo de revisión activado para adopciones");
    expect(html).toContain('value="100"');
    expect(auditApi.listAdminAuditEvents).toHaveBeenCalledWith({
      action: "settings_updated",
      actor: "admin@rastro.bo",
      page: 1,
      pageSize: 100,
      search: "review mode",
      sortBy: "targetLabel",
      sortDirection: "asc",
      targetType: "admin_settings",
    });
  });

  it("does not call the audit adapter for non-admin members", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "ana@example.com",
        id: "member-ana",
        name: "Ana miembro",
      },
    });
    const { default: AdminAuditPage } = await import(
      "./app/admin/auditoria/page"
    );

    const html = renderToStaticMarkup(await AdminAuditPage());

    expect(html).toBe("");
    expect(auditApi.listAdminAuditEvents).not.toHaveBeenCalled();
  });
});
