import { describe, expect, it, vi } from "vitest";

import type { ResourcesApiClient } from "./resources-api-adapter";
import { createApiResourcesAdapter } from "./resources-api-adapter";

const apiProvider = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Clinica Veterinaria San Roque",
  categoryId: "veterinary",
  description: "Veterinaria local con atencion general y urgencias.",
  approximateLocationLabel: "Sopocachi, La Paz",
  approximateLocation: {
    latitude: -16.51051,
    longitude: -68.124602,
    precision: "approximate" as const,
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
  contactOptions: [
    {
      kind: "whatsapp" as const,
      label: "WhatsApp",
      value: "+591 70000001",
    },
  ],
  sponsorPlacement: {
    kind: "Local Sponsor Placement" as const,
    label: "Patrocinado",
    disclosure:
      "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
    eligibleSurfaces: ["resources_directory" as const],
    safetyPolicy: {
      recoveryPriority: {
        label: "Recovery Priority" as const,
        canAffect: false as const,
      },
      pushNotifications: {
        eligible: false as const,
      },
    },
  },
};

describe("createApiResourcesAdapter", () => {
  it("maps resolved Bolivia searches to the resources nearby API", async () => {
    const nearby = vi.fn().mockResolvedValue({
      generatedAt: "2026-07-15T12:00:00.000Z",
      query: {
        latitude: -16.5,
        longitude: -68.12,
        radiusMeters: 5000,
        strategy: "postgis_radius",
      },
      radiusMeters: 5000,
      results: [
        {
          ...apiProvider,
          distanceMeters: 800,
        },
      ],
      searchBoundary: {
        center: {
          latitude: -16.5,
          longitude: -68.12,
        },
        engine: "rastro-postgis-radius",
        owner: "rastro",
        publicLocationPrecision: "location-cell",
        radiusMeters: 5000,
      },
      searchStrategy: "postgis_radius",
    });
    const adapter = createApiResourcesAdapter({
      client: createClient({ nearby }),
    });

    const result = await adapter.searchProviderDirectory?.({
      categoryIds: ["veterinary"],
      location: {
        coordinate: {
          latitude: -16.5,
          longitude: -68.12,
        },
        countryCode: "BO",
        kind: "manual",
        label: "Sopocachi",
        locationCellLabel: "bo-lpb-sopocachi",
      },
      radiusMeters: 5000,
      strategy: "postgis_radius",
    });

    expect(nearby).toHaveBeenCalledWith({
      categoryIds: ["veterinary"],
      latitude: -16.5,
      longitude: -68.12,
      radiusMeters: 5000,
      strategy: "postgis_radius",
    });
    expect(result).toMatchObject({
      generatedAt: "2026-07-15T12:00:00.000Z",
      providers: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          distanceMeters: 800,
          sponsorPlacement: {
            safetyPolicy: {
              recoveryPriority: {
                canAffect: false,
              },
              pushNotifications: {
                eligible: false,
              },
            },
          },
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("exactLatitude");
  });

  it("does not call the API until the search location is resolved", async () => {
    const nearby = vi.fn();
    const adapter = createApiResourcesAdapter({
      client: createClient({ nearby }),
    });

    const result = await adapter.searchProviderDirectory?.({
      location: {
        kind: "none",
      },
      radiusMeters: 5000,
      strategy: "postgis_radius",
    });

    expect(nearby).not.toHaveBeenCalled();
    expect(result).toEqual({ providers: [] });
  });

  it("loads provider profiles by UUID through the detail API", async () => {
    const detail = vi.fn().mockResolvedValue(apiProvider);
    const adapter = createApiResourcesAdapter({
      client: createClient({ detail }),
    });

    const result = await adapter.getProviderProfileDetail?.(
      "11111111-1111-4111-8111-111111111111",
    );

    expect(detail).toHaveBeenCalledWith({
      providerId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result).toMatchObject({
      profile: {
        hoursLabel: "Lun - Dom: 24 horas",
        id: "11111111-1111-4111-8111-111111111111",
      },
      providerId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("does not fake successful provider reports", async () => {
    const adapter = createApiResourcesAdapter({
      client: createClient(),
    });

    await expect(
      adapter.reportProvider({
        providerId: "11111111-1111-4111-8111-111111111111",
        reason: "other",
      }),
    ).rejects.toThrow("requiere moderacion persistida");
  });
});

function createClient({
  detail = vi.fn(),
  nearby = vi.fn(),
}: {
  detail?: ResourcesApiClient["resources"]["detail"]["query"];
  nearby?: ResourcesApiClient["resources"]["nearby"]["query"];
} = {}): ResourcesApiClient {
  return {
    resources: {
      detail: {
        query: detail,
      },
      nearby: {
        query: nearby,
      },
    },
  };
}
