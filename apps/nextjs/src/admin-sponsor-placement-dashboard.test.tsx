import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type {
  AdminSponsorPlacementDashboardViewModel,
  AdminSponsorPlacementRecord,
} from "./admin-sponsor-placement-model";
import {
  AdminSponsorPlacementDashboard,
  AdminSponsorPlacementMediaFields,
} from "./admin-sponsor-placement-dashboard";
import { buildAdminSponsorPlacementDashboardViewModel } from "./admin-sponsor-placement-model";

describe("admin sponsor placement dashboard", () => {
  it("renders sponsor list, expired state, and data-backed safety policy", () => {
    const html = renderToStaticMarkup(
      <AdminSponsorPlacementDashboard
        accessDenied={{
          body: "Solo administradores.",
          title: "Acceso restringido",
        }}
        viewer={{
          displayName: "Admin Rastro",
          role: "admin",
        }}
        viewModel={dashboardViewModel()}
      />,
    );

    expect(html).toContain("Gestión de patrocinios locales");
    expect(html).toContain("Crear patrocinio");
    expect(html).toContain("Clínica Veterinaria San Roque");
    expect(html).toContain("Patitas La Paz");
    expect(html).toContain("Directorio de recursos");
    expect(html).toContain("Perfil del proveedor");
    expect(html).toContain("Impresiones");
    expect(html).toContain("Aperturas");
    expect(html).toContain("Tasa de apertura: 25%");
    expect(html).toContain("Activo");
    expect(html).toContain("Expirado");
    expect(html).toContain("No afecta prioridad de recuperación");
    expect(html).toContain("No elegible");
    expect(html).toContain("Editar");
    expect(html).toContain("Retirar");
    expect(html).toContain("https://example.com/sponsor-logo.png");
    expect(html).toContain("https://example.com/sponsor-banner.png");
    expect(html).toContain(
      "Logo de patrocinio de Clínica Veterinaria San Roque",
    );
    expect(html).toContain(
      "Imagen de patrocinio de Clínica Veterinaria San Roque",
    );
    expect(html).toContain("data-sponsor-placement-card");
    expect(html).toContain("<table");
    expect(html).toContain("<thead");
    expect(html).toContain("<tbody");
    expect(html).toContain('class="grid gap-3 p-4 md:hidden"');
    expect(html).toContain("/admin/patrocinios?pageSize=2&amp;sortBy=");
    expect(html).toContain("Prioridad de recuperación");
    expect(html).not.toContain("Local Sponsor Placements");
    expect(html).not.toContain("Resource Providers");
    expect(html).not.toContain("Disclosure");
    expect(html).not.toContain("billing");
    expect(html).not.toContain("marketplace");
  });

  it("renders access denied without the sponsor management workflow", () => {
    const html = renderToStaticMarkup(
      <AdminSponsorPlacementDashboard
        accessDenied={{
          body: "Esta superficie está disponible solo para administradores.",
          title: "Acceso restringido",
        }}
        viewer={{
          displayName: "Ana miembro",
          role: "member",
        }}
        viewModel={dashboardViewModel()}
      />,
    );

    expect(html).toContain("Acceso restringido");
    expect(html).toContain("Ana miembro");
    expect(html).not.toContain("Crear patrocinio");
    expect(html).not.toContain("Patrocinios por proveedor");
  });

  it("hides sponsor external URL fallback fields until the advanced disclosure is opened", () => {
    const placement = dashboardViewModel().placements[0];

    if (!placement) {
      throw new Error("Expected sponsor placement fixture");
    }

    const html = renderToStaticMarkup(
      <AdminSponsorPlacementMediaFields
        idPrefix="test-sponsor-media"
        placement={placement}
      />,
    );

    expect(html).toContain("Medios del patrocinio");
    expect(html).toContain("Carga medios administrados por Rastro");
    expect(html).toContain("Logo administrado");
    expect(html).toContain("Imagen administrada");
    expect(html).toContain("Fallback por URL externa (avanzado)");
    expect(html).toContain("Mostrar fallback por URL externa");
    expect(html).not.toContain("Logo URL externa");
    expect(html).not.toContain("Imagen URL externa");
  });

  it("reopens sponsor fallback errors and restores submitted media asset IDs", () => {
    const placement = dashboardViewModel().placements[0];

    if (!placement) {
      throw new Error("Expected sponsor placement fixture");
    }

    const html = renderToStaticMarkup(
      <AdminSponsorPlacementMediaFields
        idPrefix="test-sponsor-media"
        placement={placement}
        feedback={{
          action: "update_sponsor_placement",
          fieldErrors: [
            {
              field: "imageUrl",
              message: "Ingresa una URL válida.",
            },
          ],
          ok: false,
          placementId: "22222222-2222-4222-8222-222222222222",
          providerId: "11111111-1111-4111-8111-111111111111",
          providerName: "Clínica Veterinaria San Roque",
          submittedValues: {
            imageAssetId: "33333333-3333-4333-8333-333333333333",
            imageUrl: "nota-url",
            logoAssetId: "44444444-4444-4444-8444-444444444444",
            logoUrl: "https://manual.example/sponsor-logo.png",
            sponsorAction: "update_sponsor_placement",
          },
        }}
      />,
    );

    expect(html).toContain("Medios del patrocinio");
    expect(html).toContain("Carga medios administrados por Rastro");
    expect(html).toContain("Logo administrado");
    expect(html).toContain("Imagen administrada");
    expect(html).toContain('name="logoAssetId"');
    expect(html).toContain('name="imageAssetId"');
    expect(html).toContain("Fallback por URL externa (avanzado)");
    expect(html).toContain("Logo URL externa");
    expect(html).toContain("Imagen URL externa");
    expect(html).toContain("Ingresa una URL válida.");
    expect(html).toContain("https://manual.example/sponsor-logo.png");
    expect(html).toContain("nota-url");
    expect(html).toContain("Listo para guardar");
    expect(html).toMatch(
      /<input type="hidden" name="logoAssetId" value="44444444-4444-4444-8444-444444444444"\/>/,
    );
    expect(html).toMatch(
      /<input type="hidden" name="imageAssetId" value="33333333-3333-4333-8333-333333333333"\/>/,
    );
  });
});

function dashboardViewModel(): AdminSponsorPlacementDashboardViewModel {
  return buildAdminSponsorPlacementDashboardViewModel({
    today: "2026-07-15",
    providers: [],
    placements: [
      sponsorPlacement({
        deliveryMetrics: {
          impressionCount: 120,
          openCount: 30,
        },
      }),
      sponsorPlacement({
        endsOn: "2026-06-30",
        placementId: "33333333-3333-4333-8333-333333333333",
        providerName: "Patitas La Paz",
        startsOn: "2026-06-01",
        surface: "provider_details",
      }),
    ],
  });
}

function sponsorPlacement(
  overrides: Partial<AdminSponsorPlacementRecord> = {},
): AdminSponsorPlacementRecord {
  return {
    category: "veterinary",
    city: "La Paz",
    department: "La Paz",
    deliveryMetrics: overrides.deliveryMetrics ?? {
      impressionCount: 0,
      openCount: 0,
    },
    disclosure: "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
    endsOn: "2026-07-31",
    isActive: true,
    imageUrl: "https://example.com/sponsor-banner.png",
    label: "Patrocinado",
    logoUrl: "https://example.com/sponsor-logo.png",
    placementId: "22222222-2222-4222-8222-222222222222",
    providerId: "11111111-1111-4111-8111-111111111111",
    providerName: "Clínica Veterinaria San Roque",
    providerVerificationStatus: "verified",
    safetyPolicy: {
      eligibleSurfaces: ["resources_directory"],
      recoveryPriority: {
        label: "Recovery Priority",
        canAffect: false,
      },
      pushNotifications: {
        eligible: false,
      },
    },
    startsOn: "2026-07-01",
    surface: "resources_directory",
    ...omitDeliveryMetrics(overrides),
  };
}

function omitDeliveryMetrics(placement: Partial<AdminSponsorPlacementRecord>) {
  const { deliveryMetrics: _deliveryMetrics, ...rest } = placement;

  return rest;
}
