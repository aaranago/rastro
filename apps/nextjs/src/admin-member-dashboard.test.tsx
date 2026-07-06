import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminMemberDashboard } from "./admin-member-dashboard";

const baseViewer = {
  displayName: "Admin Rastro",
  role: "admin",
} as const;

const activeSuspension = {
  id: "member-suspension-1",
  memberId: "member-diego",
  reason: "Reportes falsos repetidos.",
  revokedAt: null,
  revokedByAdminId: null,
  revokedReason: null,
  status: "active",
  suspendedAt: new Date("2026-06-26T16:00:00.000Z"),
  suspendedByAdminId: "member-admin",
  updatedAt: new Date("2026-06-26T16:00:00.000Z"),
} as const;

describe("AdminMemberDashboard", () => {
  it("renders member search, profile, suspension state, reports, moderation, and history", () => {
    const html = renderToStaticMarkup(
      <AdminMemberDashboard
        profile={{
          currentSuspension: activeSuspension,
          member: {
            createdAt: new Date("2026-06-20T12:00:00.000Z"),
            email: "diego@example.com",
            emailVerified: false,
            id: "member-diego",
            name: "Diego P.",
            updatedAt: new Date("2026-06-26T12:00:00.000Z"),
          },
          moderationReports: [
            {
              action: "hide",
              adminId: "member-admin",
              createdAt: new Date("2026-06-26T17:00:00.000Z"),
              id: "moderation-action-1",
              note: "Contenido duplicado.",
              reason: "spam",
              reportId: "report-1",
              reportTitle: "Bruno perdido",
              reportType: "lost_pet",
            },
          ],
          recentReports: [
            {
              createdAt: new Date("2026-06-26T15:00:00.000Z"),
              hiddenAt: null,
              id: "report-1",
              locationLabel: "Sopocachi, La Paz",
              status: "active",
              title: "Bruno perdido",
              type: "lost_pet",
            },
            {
              createdAt: new Date("2026-06-26T14:00:00.000Z"),
              hiddenAt: new Date("2026-06-26T17:00:00.000Z"),
              id: "adoption-1",
              locationLabel: "Achumani, La Paz",
              status: "active",
              title: "Nala busca nuevo hogar",
              type: "adoption",
            },
          ],
          summary: {
            adoptionListingCount: 1,
            moderationReportCount: 1,
            reportCount: 2,
          },
          suspensionHistory: [activeSuspension],
        }}
        query="diego"
        listState={adminMemberListResult([
          {
            createdAt: new Date("2026-06-20T12:00:00.000Z"),
            currentSuspension: activeSuspension,
            email: "diego@example.com",
            emailVerified: false,
            id: "member-diego",
            name: "Diego P.",
            updatedAt: new Date("2026-06-26T12:00:00.000Z"),
          },
        ])}
        viewer={baseViewer}
      />,
    );

    expect(html).toContain("Gestión de miembros");
    expect(html).toContain("Buscar por correo, nombre o ID");
    expect(html).toContain("diego@example.com");
    expect(html).toContain("Suspendido");
    expect(html).toContain("Correo pendiente");
    expect(html).toContain("Reportes falsos repetidos.");
    expect(html).toContain("Revocar suspensión");
    expect(html).toContain("Reportes y publicaciones recientes");
    expect(html).toContain("Bruno perdido");
    expect(html).toContain("Publicación de adopción");
    expect(html).toContain("Moderación asociada");
    expect(html).toContain("Ocultado");
    expect(html).toContain("Historial de suspensión");
    expect(html).not.toMatch(/marketplace|seller|comprar|vender/i);
  });

  it("renders the suspend workflow for active members and field-level feedback", () => {
    const html = renderToStaticMarkup(
      <AdminMemberDashboard
        profile={{
          currentSuspension: null,
          member: {
            createdAt: new Date("2026-06-20T12:00:00.000Z"),
            email: "camila@example.com",
            emailVerified: true,
            id: "member-camila",
            name: "Camila R.",
            updatedAt: new Date("2026-06-26T12:00:00.000Z"),
          },
          moderationReports: [],
          recentReports: [],
          summary: {
            adoptionListingCount: 0,
            moderationReportCount: 0,
            reportCount: 0,
          },
          suspensionHistory: [],
        }}
        query="camila"
        listState={adminMemberListResult([
          {
            createdAt: new Date("2026-06-20T12:00:00.000Z"),
            currentSuspension: null,
            email: "camila@example.com",
            emailVerified: true,
            id: "member-camila",
            name: "Camila R.",
            updatedAt: new Date("2026-06-26T12:00:00.000Z"),
          },
        ])}
        viewer={baseViewer}
        workflowFeedback={{
          fieldErrors: {
            confirmation:
              "Confirma que entiendes que el miembro no podrá publicar.",
            reason: "Ingresa un motivo para registrar la decisión.",
          },
          memberId: "member-camila",
          status: "error",
          workflow: "suspend",
        }}
      />,
    );

    expect(html).toContain("Camila R.");
    expect(html).toContain("Activo");
    expect(html).toContain("Correo verificado");
    expect(html).toContain("Suspender miembro");
    expect(html).toContain("No se guardó el cambio");
    expect(html).toContain('data-state="open"');
  });
});

function adminMemberListResult<T>(items: T[]) {
  return {
    availableFilters: [],
    availableSorts: [],
    hasNextPage: false,
    hasPreviousPage: false,
    items,
    page: 1,
    pageCount: items.length > 0 ? 1 : 0,
    pageSize: 10,
    total: items.length,
  };
}
