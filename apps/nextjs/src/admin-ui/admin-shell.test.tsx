import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminNavigation } from "./admin-navigation";
import { AdminAccessDenied } from "./admin-shell";

describe("admin shell foundation", () => {
  it("renders the shared access-denied state for non-admin visitors", () => {
    const html = renderToStaticMarkup(
      <AdminAccessDenied
        viewer={{
          displayName: "Visitante sin sesión",
          role: "visitor",
        }}
      />,
    );

    expect(html).toContain("Acceso restringido");
    expect(html).toContain("Solo administradores de Rastro");
    expect(html).toContain("Visitante sin sesión");
    expect(html).toContain("Visitante");
  });

  it("renders admin navigation labels, route status, and active route state", () => {
    const html = renderToStaticMarkup(
      <AdminNavigation currentPathname="/admin/proveedores" />,
    );

    expect(html).toContain("Overview");
    expect(html).toContain("Moderación");
    expect(html).toContain("Proveedores");
    expect(html).toContain("Patrocinios");
    expect(html).toContain("Miembros");
    expect(html).toContain("Ajustes");
    expect(html).toContain("Métricas");
    expect(html).toContain("Auditoría");
    expect(html).toContain("Disponible");
    expect(html).toContain('href="/admin/proveedores"');
    expect(html).toContain('href="/admin/miembros"');
    expect(html).toContain('href="/admin/metricas"');
    expect(html).toContain('href="/admin/auditoria"');
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain("Planificado");
    expect(html).not.toContain('aria-disabled="true"');
  });
});
