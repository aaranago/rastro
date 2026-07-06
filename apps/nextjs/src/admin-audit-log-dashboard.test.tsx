import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AdminAuditLogData } from "./admin-audit-api-adapter";
import { AdminAuditLogDashboard } from "./admin-audit-log-dashboard";

describe("AdminAuditLogDashboard", () => {
  it("renders filters, active filter badges, and a many-row audit table", () => {
    const html = renderToStaticMarkup(
      <AdminAuditLogDashboard
        query={{
          action: "settings_updated",
          actor: "admin@rastro.bo",
          page: 2,
          pageSize: 10,
          search: "adopciones",
          sortBy: "createdAt",
          sortDirection: "desc",
          targetType: "admin_settings",
        }}
        state={{
          data: auditLogData(),
          status: "ready",
        }}
      />,
    );

    expect(html).toContain("Auditoría administrativa");
    expect(html).toContain("Filtros");
    expect(html).toContain("Todos los actores");
    expect(html).toContain("Todos los destinos");
    expect(html).toContain("Todas las acciones");
    expect(html).toContain('value="adopciones"');
    expect(html).toContain('value="10"');
    expect(html).toContain("Actor: admin@rastro.bo");
    expect(html).toContain("Búsqueda: adopciones");
    expect(html).toContain("Destino: Ajustes admin");
    expect(html).toContain("Acción: Ajustes actualizados");
    expect(html).toContain("Eventos");
    expect(html).toContain("Vista larga");
    expect(html).toContain("Fecha");
    expect(html).toContain(
      "/admin/auditoria?search=adopciones&amp;actor=admin%40rastro.bo&amp;targetType=admin_settings&amp;action=settings_updated&amp;pageSize=10&amp;sortBy=action&amp;sortDirection=asc",
    );
    expect(html).toContain(
      "/admin/auditoria?search=adopciones&amp;actor=admin%40rastro.bo&amp;targetType=admin_settings&amp;action=settings_updated&amp;pageSize=10&amp;sortBy=createdAt&amp;sortDirection=asc",
    );
    expect(html).toContain(
      "/admin/auditoria?search=adopciones&amp;actor=admin%40rastro.bo&amp;targetType=admin_settings&amp;action=settings_updated&amp;page=3&amp;pageSize=10&amp;sortBy=createdAt&amp;sortDirection=desc",
    );
    expect(html).toContain("table-fixed");
    expect(html).toContain("break-words");
    expect(html).toContain("modo de revisión activado para adopciones");
    expect(html).toContain("La Paz, La Paz");
    expect(html).not.toMatch(/marketplace|seller|comprar|vender/i);
  });

  it("renders selected filter options even before backend filter catalogs include them", () => {
    const html = renderToStaticMarkup(
      <AdminAuditLogDashboard
        query={{
          action: "member_suspended",
          actor: "nueva-admin@rastro.bo",
          pageSize: 10,
          targetType: "member",
        }}
        state={{
          data: {
            availableSorts: [],
            events: [],
            filters: {
              actions: [],
              actors: [],
              targetTypes: [],
            },
            hasNextPage: false,
            hasPreviousPage: false,
            page: 1,
            pageCount: 0,
            pageSize: 10,
            total: 0,
          },
          status: "ready",
        }}
      />,
    );

    expect(html).toContain("nueva-admin@rastro.bo");
    expect(html).toContain("Miembro suspendido");
    expect(html).toContain("Miembro");
    expect(html).toContain("No hay eventos de auditoría para estos filtros.");
  });

  it("renders loading and error states", () => {
    const loadingHtml = renderToStaticMarkup(
      <AdminAuditLogDashboard
        query={{ pageSize: 10 }}
        state={{ status: "loading" }}
      />,
    );
    const errorHtml = renderToStaticMarkup(
      <AdminAuditLogDashboard
        query={{ pageSize: 10 }}
        state={{
          message: "El contrato admin.audit.list todavía no está disponible.",
          status: "error",
        }}
      />,
    );

    expect(loadingHtml).toContain('data-slot="skeleton"');
    expect(errorHtml).toContain("No se pudo cargar la auditoría");
    expect(errorHtml).toContain("admin.audit.list");
  });
});

function auditLogData(): AdminAuditLogData {
  return {
    availableSorts: [
      {
        defaultDirection: "asc",
        label: "Acción",
        value: "action",
      },
      {
        defaultDirection: "desc",
        label: "Fecha",
        value: "createdAt",
      },
    ],
    events: Array.from({ length: 14 }, (_, index) => ({
      action: index === 0 ? "settings_updated" : "moderation_hide_target",
      actor: {
        email: index === 0 ? "admin@rastro.bo" : `admin-${index}@rastro.bo`,
        id: `member-admin-${index}`,
        label: index === 0 ? "Admin Rastro" : `Admin ${index}`,
      },
      city: index % 2 === 0 ? "La Paz" : "Santa Cruz",
      department: index % 2 === 0 ? "La Paz" : "Santa Cruz",
      id: `audit-event-${index}`,
      occurredAt: `2026-06-26T1${index % 10}:00:00.000Z`,
      summary:
        index === 0
          ? "modo de revisión activado para adopciones"
          : `Contenido ocultado por revisión ${index}`,
      target: {
        id: index === 0 ? "admin-settings" : `target-${index}`,
        label: index === 0 ? "Ajustes de publicación" : `Reporte ${index}`,
        type: index === 0 ? "admin_settings" : "lost_pet_report",
      },
    })),
    filters: {
      actions: [
        {
          label: "Ajustes actualizados",
          value: "settings_updated",
        },
        {
          label: "Contenido ocultado",
          value: "moderation_hide_target",
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
        {
          label: "Reporte de mascota perdida",
          value: "lost_pet_report",
        },
      ],
    },
    hasNextPage: true,
    hasPreviousPage: true,
    page: 2,
    pageCount: 3,
    pageSize: 10,
    total: 23,
  };
}
