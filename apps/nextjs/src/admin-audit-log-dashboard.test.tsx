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
          limit: 75,
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
    expect(html).toContain('value="75"');
    expect(html).toContain("Actor: admin@rastro.bo");
    expect(html).toContain("Destino: Ajustes admin");
    expect(html).toContain("Acción: Ajustes actualizados");
    expect(html).toContain("Eventos");
    expect(html).toContain("Vista larga");
    expect(html).toContain("table-fixed");
    expect(html).toContain("break-words");
    expect(html).toContain("Review Mode activado para adopciones");
    expect(html).toContain("La Paz, La Paz");
    expect(html).not.toMatch(/marketplace|seller|comprar|vender/i);
  });

  it("renders selected filter options even before backend filter catalogs include them", () => {
    const html = renderToStaticMarkup(
      <AdminAuditLogDashboard
        query={{
          action: "member_suspended",
          actor: "nueva-admin@rastro.bo",
          limit: 50,
          targetType: "member",
        }}
        state={{
          data: {
            events: [],
            filters: {
              actions: [],
              actors: [],
              targetTypes: [],
            },
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
        query={{ limit: 50 }}
        state={{ status: "loading" }}
      />,
    );
    const errorHtml = renderToStaticMarkup(
      <AdminAuditLogDashboard
        query={{ limit: 50 }}
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
          ? "Review Mode activado para adopciones"
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
    total: 14,
  };
}
