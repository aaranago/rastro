import { describe, expect, it } from "vitest";

import type { AdminResourceProviderProfile } from "./admin-resource-provider-admin-model";
import type { AdminSponsorPlacementRecord } from "./admin-sponsor-placement-model";
import { buildAdminSponsorPlacementDashboardViewModel } from "./admin-sponsor-placement-model";

describe("admin sponsor placement model", () => {
  it("lists active, scheduled, and expired placements across providers", () => {
    const viewModel = buildAdminSponsorPlacementDashboardViewModel({
      today: "2026-07-15",
      providers: [providerProfile()],
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
          startsOn: "2026-06-01",
        }),
        sponsorPlacement({
          placementId: "44444444-4444-4444-8444-444444444444",
          startsOn: "2026-08-01",
          endsOn: "2026-08-31",
        }),
      ],
    });

    expect(viewModel.title).toBe("Gestión de patrocinios locales");
    expect(viewModel.stats).toEqual({
      activeCount: 1,
      expiredCount: 1,
      impressionCount: 120,
      openCount: 30,
      placementCount: 3,
      providerCount: 1,
      scheduledCount: 1,
    });
    expect(
      viewModel.placements.map((placement) => placement.stateLabel),
    ).toEqual(["Activo", "Expirado", "Programado"]);
    expect(viewModel.placements[0]).toMatchObject({
      deliveryMetrics: {
        impressionCount: 120,
        openCount: 30,
        openRateLabel: "25%",
      },
      logoUrl: "https://example.com/sponsor-logo.png",
      imageUrl: "https://example.com/sponsor-banner.png",
    });
    expect(viewModel.safetyPolicy).toMatchObject({
      eligibleSurfaceLabels: [
        "Directorio de recursos",
        "Perfil del proveedor",
        "Inicio de lanzamiento",
        "Confirmación de reporte",
        "Cuidados contextuales",
      ],
      pushNotifications: {
        eligible: false,
      },
      recoveryPriority: {
        canAffect: false,
      },
    });
  });
});

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
    providerName: "Clinica Veterinaria San Roque",
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

function providerProfile(): AdminResourceProviderProfile {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Clinica Veterinaria San Roque",
    categoryId: "veterinary",
    city: "La Paz",
    description: "Veterinaria local con atencion general y urgencias.",
    department: "La Paz",
    approximateLocationLabel: "Sopocachi, La Paz",
    serviceAreaLabel: "Atiende La Paz y El Alto",
    hoursLabel: "Lun - Dom: 24 horas",
    shortDescription:
      "Atencion veterinaria general y orientacion para familias cuidadoras.",
    isVerified: true,
    emergencyAvailable: true,
    isOpenNow: true,
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
    contactOptions: [
      {
        kind: "phone",
        label: "Llamar",
        value: "+591 2 222 1111",
      },
    ],
    sponsorPlacements: [],
  };
}
