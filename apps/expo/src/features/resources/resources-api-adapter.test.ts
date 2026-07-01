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
    disclosure: "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
    logoUrl: "https://example.com/sponsor-logo.png",
    imageUrl: "https://example.com/sponsor-banner.png",
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
    const sponsorPlacementWithAdminIds = {
      ...apiProvider.sponsorPlacement,
      imageAssetId: "33333333-3333-4333-8333-333333333333",
      logoAssetId: "22222222-2222-4222-8222-222222222222",
    } as unknown as typeof apiProvider.sponsorPlacement;
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
          sponsorPlacement: sponsorPlacementWithAdminIds,
          activeSponsorPlacements: [
            sponsorPlacementWithAdminIds,
            {
              ...apiProvider.sponsorPlacement,
              imageUrl: "https://example.com/provider-details-sponsor.png",
              eligibleSurfaces: ["provider_details" as const],
              label: "Perfil",
              logoAssetId: "44444444-4444-4444-8444-444444444444",
            } as unknown as typeof apiProvider.sponsorPlacement,
          ],
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
            logoUrl: "https://example.com/sponsor-logo.png",
            imageUrl: "https://example.com/sponsor-banner.png",
            safetyPolicy: {
              recoveryPriority: {
                canAffect: false,
              },
              pushNotifications: {
                eligible: false,
              },
            },
          },
          activeSponsorPlacements: [
            {
              eligibleSurfaces: ["resources_directory"],
              imageUrl: "https://example.com/sponsor-banner.png",
              label: "Patrocinado",
              logoUrl: "https://example.com/sponsor-logo.png",
            },
            {
              eligibleSurfaces: ["provider_details"],
              imageUrl: "https://example.com/provider-details-sponsor.png",
              label: "Perfil",
            },
          ],
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("exactLatitude");
    expect(JSON.stringify(result)).not.toContain("logoAssetId");
    expect(JSON.stringify(result)).not.toContain("imageAssetId");
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

  it("calls the persisted provider report API and returns the backend receipt", async () => {
    const reportProvider = vi.fn().mockResolvedValue({
      status: "created",
      reviewItem: {
        createdAt: new Date("2026-06-26T16:00:00.000Z"),
        id: "22222222-2222-4222-8222-222222222222",
        lastReportedAt: new Date("2026-06-26T16:00:00.000Z"),
        newestReport: {
          createdAt: new Date("2026-06-26T16:00:00.000Z"),
          detail: "La direccion visible no coincide con el local.",
          reporter: {
            displayName: "Ana S.",
            email: "ana@example.com",
            memberId: "member-ana",
          },
        },
        provider: {
          city: "La Paz",
          department: "La Paz",
          id: "11111111-1111-4111-8111-111111111111",
          locationLabel: "Sopocachi, La Paz",
          name: "Clinica Veterinaria San Roque",
          verificationStatus: "verified",
        },
        reason: "incorrect_location",
        reportCount: 1,
        status: "pending",
      },
    });
    const adapter = createApiResourcesAdapter({
      client: createClient({ reportProvider }),
    });

    const receipt = await adapter.reportProvider({
      detail: "La direccion visible no coincide con el local.",
      providerId: "11111111-1111-4111-8111-111111111111",
      reason: "incorrect_location",
    });

    expect(reportProvider).toHaveBeenCalledWith({
      detail: "La direccion visible no coincide con el local.",
      providerId: "11111111-1111-4111-8111-111111111111",
      reason: "incorrect_location",
    });
    expect(receipt).toMatchObject({
      status: "created",
      moderationItem: {
        providerId: "11111111-1111-4111-8111-111111111111",
        providerName: "Clinica Veterinaria San Roque",
        reason: "incorrect_location",
        reviewItem: {
          createdAt: "2026-06-26T16:00:00.000Z",
          reporterMemberId: "member-ana",
          status: "pending",
        },
      },
    });
  });

  it("records sponsor delivery events through the resources API", async () => {
    const recordSponsorDelivery = vi.fn().mockResolvedValue({
      event: {
        eventType: "impression",
        id: "33333333-3333-4333-8333-333333333333",
        occurredAt: "2026-07-15T12:00:00.000Z",
        providerId: "11111111-1111-4111-8111-111111111111",
        source: "resources-list",
        surface: "resources_directory",
      },
      status: "recorded",
    });
    const adapter = createApiResourcesAdapter({
      client: createClient({ recordSponsorDelivery }),
    });

    await expect(
      adapter.recordSponsorDelivery?.({
        eventType: "impression",
        idempotencyKey:
          "resources:session:11111111-1111-4111-8111-111111111111",
        providerId: "11111111-1111-4111-8111-111111111111",
        source: "resources-list",
        surface: "resources_directory",
      }),
    ).resolves.toMatchObject({
      event: {
        eventType: "impression",
        providerId: "11111111-1111-4111-8111-111111111111",
      },
      status: "recorded",
    });
    expect(recordSponsorDelivery).toHaveBeenCalledWith({
      eventType: "impression",
      idempotencyKey: "resources:session:11111111-1111-4111-8111-111111111111",
      providerId: "11111111-1111-4111-8111-111111111111",
      source: "resources-list",
      surface: "resources_directory",
    });
  });

  it("does not fake successful provider reports when the API rejects", async () => {
    const adapter = createApiResourcesAdapter({
      client: createClient({
        reportProvider: vi
          .fn()
          .mockRejectedValue(new Error("Backend moderation unavailable.")),
      }),
    });

    await expect(
      adapter.reportProvider({
        detail: "La direccion visible no coincide con el local.",
        providerId: "11111111-1111-4111-8111-111111111111",
        reason: "other",
      }),
    ).rejects.toThrow("Backend moderation unavailable.");
  });
});

function createClient({
  detail = vi.fn(),
  nearby = vi.fn(),
  recordSponsorDelivery = vi.fn(),
  reportProvider = vi.fn(),
}: {
  detail?: ResourcesApiClient["resources"]["detail"]["query"];
  nearby?: ResourcesApiClient["resources"]["nearby"]["query"];
  recordSponsorDelivery?: ResourcesApiClient["resources"]["recordSponsorDelivery"]["mutate"];
  reportProvider?: ResourcesApiClient["resources"]["reportProvider"]["mutate"];
} = {}): ResourcesApiClient {
  return {
    resources: {
      detail: {
        query: detail,
      },
      nearby: {
        query: nearby,
      },
      reportProvider: {
        mutate: reportProvider,
      },
      recordSponsorDelivery: {
        mutate: recordSponsorDelivery,
      },
    },
  };
}
