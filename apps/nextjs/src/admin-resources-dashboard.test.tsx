import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { AdminResourceManagementViewer } from "./admin-resources";
import { createInMemoryAdminResourceManagement } from "./admin-resources";
import { AdminResourcesDashboard } from "./admin-resources-dashboard";
import {
  buildForbiddenAdminResourcesDashboardProps,
  toAdminResourcesDashboardProps,
} from "./admin-resources-dashboard-adapter";

const adminViewer = {
  memberId: "member-admin-la-paz",
  role: "admin",
} satisfies AdminResourceManagementViewer;

const forbiddenTerms = new RegExp(
  [
    ["Resource", "Provider"].join(" "),
    ["Verification", "Badge"].join(" "),
  ].join("|"),
  "i",
);
const marketplaceTerms = /marketplace|seller|comprar|vender/i;

describe("AdminResourcesDashboard", () => {
  it("renders dense provider management controls with Spanish Bolivia copy", () => {
    const resources = createInMemoryAdminResourceManagement({
      now: "2026-07-15",
    });

    resources.attachSponsorPlacement(adminViewer, {
      endsOn: "2026-08-31",
      placementId: "patrocinio-san-roque-julio",
      providerId: "clinic-san-roque",
      startsOn: "2026-07-01",
      surface: "resources_directory",
    });

    const listResult = resources.listProviders(adminViewer);
    const metricsResult = resources.getMetrics(adminViewer);

    if (
      listResult.status !== "authorized" ||
      metricsResult.status !== "authorized"
    ) {
      throw new Error("Expected admin resource access");
    }

    const html = renderToStaticMarkup(
      <AdminResourcesDashboard
        {...toAdminResourcesDashboardProps(
          listResult.viewModel,
          metricsResult.metrics,
          {
            displayName: "Admin Rastro",
            role: "admin",
          },
        )}
      />,
    );

    expect(html).toContain("Gestion de proveedores de recursos");
    expect(html).toContain("Administracion de recursos");
    expect(html).toContain("modelo administrativo temporal");
    expect(html).toContain("Clinica San Roque");
    expect(html).toContain("Santa Cruz de la Sierra");
    expect(html).toContain("Registrar proveedor");
    expect(html).toContain("Guardar identidad");
    expect(html).toContain("Adjuntar patrocinio local");
    expect(html).toContain("Retirar patrocinio local");
    expect(html).toContain("Metricas por departamento");
    expect(html).toContain("Metricas por ciudad");
    expect(html).toContain("No cambia la prioridad de recuperacion");
    expect(html).toContain("No activa alertas push");
    expect(html).not.toMatch(forbiddenTerms);
    expect(html).not.toMatch(marketplaceTerms);
  });

  it("renders restricted access without mutation controls for non-admin viewers", () => {
    const html = renderToStaticMarkup(
      <AdminResourcesDashboard
        {...buildForbiddenAdminResourcesDashboardProps(
          {
            displayName: "Ana miembro",
            role: "member",
          },
          {
            body: "Esta superficie esta disponible solo para administradores de Rastro.",
            locale: "es-BO",
            title: "Acceso restringido",
          },
        )}
      />,
    );

    expect(html).toContain("Acceso restringido");
    expect(html).toContain("solo para administradores");
    expect(html).toContain("Ana miembro");
    expect(html).not.toContain("Registrar proveedor");
    expect(html).not.toContain("Guardar identidad");
    expect(html).not.toContain("Adjuntar patrocinio local");
    expect(html).not.toMatch(forbiddenTerms);
    expect(html).not.toMatch(marketplaceTerms);
  });
});
