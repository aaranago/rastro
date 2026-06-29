import { describe, expect, it } from "vitest";

import type { AdminResourceProviderProfile } from "./admin-resource-provider-admin-model";
import { buildAdminResourceProviderListViewModel } from "./admin-resource-provider-admin-model";

describe("admin resource provider model", () => {
  it("uses structured city and department fields for provider metrics", () => {
    const viewModel = buildAdminResourceProviderListViewModel([
      providerProfile({
        approximateLocationLabel: "Zona norte visible",
        city: "El Alto",
        department: "La Paz",
      }),
    ]);

    expect(viewModel.providers[0]).toMatchObject({
      approximateLocationLabel: "Zona norte visible",
      city: "El Alto",
      department: "La Paz",
    });
    expect(viewModel.providers[0]?.lastUpdatedLabel).toContain("Actualizado");
    expect(viewModel.metrics).toMatchObject({
      byCity: [
        {
          label: "El Alto",
          providerCount: 1,
        },
      ],
      byDepartment: [
        {
          label: "La Paz",
          providerCount: 1,
        },
      ],
    });
    expect(JSON.stringify(viewModel.metrics)).not.toContain(
      "Zona norte visible",
    );
  });

  it("maps active and listed sponsor media separately from provider media", () => {
    const viewModel = buildAdminResourceProviderListViewModel([
      providerProfile({
        logoUrl: "https://example.com/provider-logo.png",
        sponsorPlacement: {
          kind: "Local Sponsor Placement",
          label: "Patrocinado",
          disclosure:
            "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
          logoUrl: "https://example.com/sponsor-logo.png",
          imageUrl: "https://example.com/sponsor-banner.png",
          eligibleSurfaces: ["resources_directory"],
          safetyPolicy: {
            recoveryPriority: {
              label: "Recovery Priority",
              canAffect: false,
            },
            pushNotifications: {
              eligible: false,
            },
          },
        },
        sponsorPlacements: [
          {
            disclosure:
              "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
            endsOn: "2026-07-31",
            imageUrl: "https://example.com/sponsor-banner.png",
            isActive: true,
            label: "Patrocinado",
            logoUrl: "https://example.com/sponsor-logo.png",
            placementId: "22222222-2222-4222-8222-222222222222",
            startsOn: "2026-07-01",
            surface: "resources_directory",
          },
        ],
      }),
    ]);

    expect(viewModel.providers[0]).toMatchObject({
      logoUrl: "https://example.com/provider-logo.png",
      activeSponsorPlacement: {
        logoUrl: "https://example.com/sponsor-logo.png",
        imageUrl: "https://example.com/sponsor-banner.png",
      },
      sponsorPlacements: [
        {
          logoUrl: "https://example.com/sponsor-logo.png",
          imageUrl: "https://example.com/sponsor-banner.png",
        },
      ],
    });
  });
});

function providerProfile(
  overrides: Partial<AdminResourceProviderProfile> = {},
): AdminResourceProviderProfile {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Clinica Veterinaria San Roque",
    categoryId: "veterinary",
    city: "La Paz",
    department: "La Paz",
    description: "Veterinaria local con atencion general y urgencias.",
    approximateLocationLabel: "Sopocachi, La Paz",
    approximateLocation: {
      latitude: -16.51051,
      longitude: -68.124602,
      precision: "approximate",
      label: "Sopocachi, La Paz",
      locationCell: "bo-lpb-sopocachi",
    },
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
    ...overrides,
  };
}
