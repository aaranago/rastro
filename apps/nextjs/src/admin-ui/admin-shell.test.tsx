import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "@acme/ui/theme";

import { AdminNavigation } from "./admin-navigation";
import { AdminAccessDenied } from "./admin-shell";
import { AdminHeaderThemeToggle } from "./admin-shell-client";

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

    expect(html).toContain("Resumen");
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
    expect(html).not.toContain("Overview");
    expect(html).not.toContain("Resource Provider");
    expect(html).not.toContain("Local Sponsor Placements");
    expect(html).not.toContain("Review Mode");
  });

  it("keeps the admin navigation mobile-safe and keyboard focus visible", () => {
    const html = renderToStaticMarkup(
      <AdminNavigation currentPathname="/admin" />,
    );

    expect(html).toContain("grid w-full min-w-0 grid-cols-1");
    expect(html).toContain("sm:grid-cols-2");
    expect(html).toContain("min-h-12");
    expect(html).toContain("focus-visible:ring-[3px]");
    expect(html).not.toContain("overflow-x-auto");
  });

  it("renders the admin theme toggle with Spanish accessible naming", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <AdminHeaderThemeToggle />
      </ThemeProvider>,
    );

    expect(html).toContain(
      'aria-label="Cambiar tema de color. Tema actual: automático"',
    );
    expect(html).toContain("Sistema");
    expect(html).toContain("min-h-11");
    expect(html).not.toContain("Toggle theme");
  });
});
