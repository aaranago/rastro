import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type {
  AdminSponsorPlacementDashboardViewModel,
  AdminSponsorPlacementRecord,
} from "./admin-sponsor-placement-model";
import { AdminSponsorPlacementDashboard } from "./admin-sponsor-placement-dashboard";
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
    expect(html).toContain("Clinica Veterinaria San Roque");
    expect(html).toContain("Patitas La Paz");
    expect(html).toContain("Directorio de recursos");
    expect(html).toContain("Perfil del proveedor");
    expect(html).toContain("Activo");
    expect(html).toContain("Expirado");
    expect(html).toContain("No afecta Recovery Priority");
    expect(html).toContain("No elegible");
    expect(html).toContain("Editar");
    expect(html).toContain("Retirar");
    expect(html).not.toContain("billing");
    expect(html).not.toContain("marketplace");
  });

  it("renders access denied without the sponsor management workflow", () => {
    const html = renderToStaticMarkup(
      <AdminSponsorPlacementDashboard
        accessDenied={{
          body: "Esta superficie esta disponible solo para administradores.",
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
});

function dashboardViewModel(): AdminSponsorPlacementDashboardViewModel {
  return buildAdminSponsorPlacementDashboardViewModel({
    today: "2026-07-15",
    providers: [],
    placements: [
      sponsorPlacement(),
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
    disclosure: "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
    endsOn: "2026-07-31",
    isActive: true,
    label: "Patrocinado",
    placementId: "22222222-2222-4222-8222-222222222222",
    providerId: "11111111-1111-4111-8111-111111111111",
    providerName: "Clinica Veterinaria San Roque",
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
    ...overrides,
  };
}
