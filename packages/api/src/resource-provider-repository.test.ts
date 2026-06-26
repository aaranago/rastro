import { describe, expect, it } from "vitest";

import type { PersistedResourceProvider } from "./resource-provider-repository";
import {
  buildLocalSponsorPlacementPolicy,
  buildNearbyResourceProvidersCondition,
  derivePublicResourceProviderLocation,
  toPublicResourceProviderProfile,
  toPublicResourceProviderSummary,
} from "./resource-provider-repository";

const postgresQueryConfig = {
  casing: {
    getColumnCasing: (column: { name: string }) => column.name,
  },
  escapeName: (name: string) => `"${name}"`,
  escapeParam: (index: number) => `$${index + 1}`,
  escapeString: (value: string) => `'${value.replaceAll("'", "''")}'`,
};

function persistedProvider(
  overrides: Partial<PersistedResourceProvider> = {},
): PersistedResourceProvider {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Clinica Veterinaria San Roque",
    category: "veterinary",
    description: "Veterinaria local con atencion general y urgencias.",
    shortDescription:
      "Atencion veterinaria general y orientacion para familias cuidadoras.",
    logoUrl: "https://example.com/san-roque-logo.png",
    photoUrl: null,
    serviceAreaLabel: "Atiende La Paz y El Alto",
    hoursLabel: "Lun - Dom: 24 horas",
    websiteUrl: "https://sanroque.example.com",
    socialLinks: [
      {
        label: "Instagram",
        url: "https://instagram.example.com/sanroque",
      },
    ],
    externalLinks: [],
    emergencyAvailable: true,
    isOpenNow: true,
    verificationStatus: "verified",
    verificationNote: "Identidad revisada por Rastro.",
    verifiedAt: new Date("2026-07-01T12:00:00.000Z"),
    createdAt: new Date("2026-07-01T12:00:00.000Z"),
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
    deletedAt: null,
    location: {
      publicLatitude: -16.51051,
      publicLongitude: -68.124602,
      precision: "approximate",
      approximateLocationLabel: "Sopocachi, La Paz",
      locationCell: "bo-lpb-sopocachi",
    },
    contactOptions: [
      {
        kind: "phone",
        label: "Llamar",
        value: "+591 2 222 1111",
      },
    ],
    sponsorPlacements: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        surface: "resources_directory",
        label: "Patrocinado",
        disclosure:
          "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
        startsAt: new Date("2026-07-01T00:00:00.000Z"),
        endsAt: new Date("2026-07-31T23:59:59.999Z"),
      },
    ],
    ...overrides,
  };
}

describe("resource provider repository", () => {
  it("builds a parameterized PostGIS radius condition against exact private coordinates", () => {
    const query = buildNearbyResourceProvidersCondition({
      latitude: -16.5,
      longitude: -68.12,
      radiusMeters: 5000,
      categoryIds: ["veterinary", "shelter"],
      limit: 50,
      strategy: "postgis_radius",
    }).toQuery(postgresQueryConfig as never);

    expect(query.sql).toContain("ST_DWithin");
    expect(query.sql).toContain("ST_SetSRID(ST_MakePoint($1, $2), 4326)");
    expect(query.sql).toContain('"resource_provider_location"."exact_point"');
    expect(query.params).toEqual([-68.12, -16.5, 5000]);
  });

  it("maps nearby providers to public approximate location data without exact coordinates", () => {
    const summary = toPublicResourceProviderSummary(persistedProvider(), {
      distanceMeters: 800,
      now: new Date("2026-07-15T12:00:00.000Z"),
    });

    expect(summary).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      categoryId: "veterinary",
      distanceMeters: 800,
      approximateLocationLabel: "Sopocachi, La Paz",
      approximateLocation: {
        latitude: -16.51051,
        longitude: -68.124602,
        precision: "approximate",
      },
      isVerified: true,
    });
    expect(JSON.stringify(summary)).not.toContain("-16.510231");
    expect(JSON.stringify(summary)).not.toContain("-68.123881");
    expect(JSON.stringify(summary)).not.toContain("exactLatitude");
    expect(JSON.stringify(summary)).not.toContain("exactLongitude");
  });

  it("derives provider public coordinates from the exact location server-side", () => {
    const publicLocation = derivePublicResourceProviderLocation({
      exactLatitude: -16.510231,
      exactLongitude: -68.123881,
      approximateLocationLabel: "Sopocachi, La Paz",
      locationCell: "bo-lpb-sopocachi",
    });

    expect(publicLocation).toEqual({
      publicLatitude: -16.51051,
      publicLongitude: -68.124602,
    });
    expect(publicLocation.publicLatitude).not.toBe(-16.510231);
    expect(publicLocation.publicLongitude).not.toBe(-68.123881);
  });

  it("keeps sponsor policy explicit without changing recovery priority or push eligibility", () => {
    const summary = toPublicResourceProviderSummary(persistedProvider(), {
      now: new Date("2026-07-15T12:00:00.000Z"),
    });

    expect(summary.sponsorPlacement).toEqual({
      kind: "Local Sponsor Placement",
      label: "Patrocinado",
      disclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
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
    });
  });

  it("omits inactive sponsor placements from public provider output", () => {
    const summary = toPublicResourceProviderSummary(persistedProvider(), {
      now: new Date("2026-08-15T12:00:00.000Z"),
    });

    expect(summary.sponsorPlacement).toBeUndefined();
  });

  it("maps profile-only fields without exposing private location details", () => {
    const profile = toPublicResourceProviderProfile(persistedProvider(), {
      now: new Date("2026-07-15T12:00:00.000Z"),
    });

    expect(profile).toMatchObject({
      hoursLabel: "Lun - Dom: 24 horas",
      shortDescription:
        "Atencion veterinaria general y orientacion para familias cuidadoras.",
      websiteUrl: "https://sanroque.example.com",
      socialLinks: [
        {
          label: "Instagram",
          url: "https://instagram.example.com/sanroque",
        },
      ],
    });
    expect(JSON.stringify(profile)).not.toContain("exact");
  });

  it("builds standalone sponsor policy for any supported surface", () => {
    expect(
      buildLocalSponsorPlacementPolicy({
        surface: "contextual_care_resources",
        label: "Patrocinado",
        disclosure: "Patrocinio local identificado por Rastro.",
      }),
    ).toMatchObject({
      eligibleSurfaces: ["contextual_care_resources"],
      safetyPolicy: {
        recoveryPriority: {
          canAffect: false,
        },
        pushNotifications: {
          eligible: false,
        },
      },
    });
  });
});
