import { describe, expect, it } from "vitest";

import type { PersistedResourceProvider } from "./resource-provider-repository";
import {
  buildLocalSponsorPlacementPolicy,
  buildNearbyResourceProvidersCondition,
  buildResourceProviderContactOptionWriteValues,
  buildResourceProviderLocationUpdateValues,
  buildResourceProviderLocationWriteValues,
  buildResourceProviderUpdateValues,
  derivePublicResourceProviderLocation,
  toAdminLocalSponsorPlacements,
  toAdminResourceProviderProfile,
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
      addressLabel: "Plaza Abaroa, La Paz",
      publicLatitude: -16.51051,
      publicLongitude: -68.124602,
      precision: "approximate",
      city: "La Paz",
      department: "La Paz",
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
    });

    expect(publicLocation).toEqual({
      publicLatitude: -16.51051,
      publicLongitude: -68.124602,
    });
    expect(publicLocation.publicLatitude).not.toBe(-16.510231);
    expect(publicLocation.publicLongitude).not.toBe(-68.123881);
  });

  it("builds location write values with exact private and approximate public coordinates", () => {
    const writeValues = buildResourceProviderLocationWriteValues({
      providerId: "11111111-1111-4111-8111-111111111111",
      location: {
        exactLatitude: -16.510231,
        exactLongitude: -68.123881,
        city: "La Paz",
        department: "La Paz",
        approximateLocationLabel: "Sopocachi, La Paz",
        locationCell: "bo-lpb-sopocachi",
        addressLabel: "Plaza Abaroa, La Paz",
      },
    });

    expect(writeValues).toMatchObject({
      providerId: "11111111-1111-4111-8111-111111111111",
      exactLatitude: -16.510231,
      exactLongitude: -68.123881,
      exactPoint: {
        x: -68.123881,
        y: -16.510231,
      },
      city: "La Paz",
      department: "La Paz",
      publicLatitude: -16.51051,
      publicLongitude: -68.124602,
      publicPoint: {
        x: -68.124602,
        y: -16.51051,
      },
      publicPrecision: "approximate",
    });
  });

  it("builds structured location updates without touching exact coordinates unless supplied", () => {
    expect(
      buildResourceProviderLocationUpdateValues({
        city: "El Alto",
        department: "La Paz",
        approximateLocationLabel: "Ciudad Satelite, El Alto",
        locationCell: "bo-lpb-el-alto-ciudad-satelite",
      }),
    ).toEqual({
      approximateLocationLabel: "Ciudad Satelite, El Alto",
      city: "El Alto",
      department: "La Paz",
      locationCell: "bo-lpb-el-alto-ciudad-satelite",
    });

    expect(
      buildResourceProviderLocationUpdateValues({
        exactLatitude: -17.783333,
        exactLongitude: -63.182222,
      }),
    ).toMatchObject({
      exactLatitude: -17.783333,
      exactLongitude: -63.182222,
      publicPrecision: "approximate",
    });
  });

  it("builds repository write values that preserve multiple contacts and link fields", () => {
    const providerId = "11111111-1111-4111-8111-111111111111";

    expect(
      buildResourceProviderContactOptionWriteValues({
        providerId,
        contactOptions: [
          {
            kind: "phone",
            label: "Llamar",
            value: "+591 2 222 1111",
          },
          {
            kind: "whatsapp",
            label: "WhatsApp",
            value: "+591 70000001",
          },
          {
            kind: "email",
            label: "Correo",
            value: "contacto@sanroque.example",
          },
        ],
      }),
    ).toEqual([
      {
        kind: "phone",
        label: "Llamar",
        providerId,
        sortOrder: 0,
        value: "+591 2 222 1111",
      },
      {
        kind: "whatsapp",
        label: "WhatsApp",
        providerId,
        sortOrder: 1,
        value: "+591 70000001",
      },
      {
        kind: "email",
        label: "Correo",
        providerId,
        sortOrder: 2,
        value: "contacto@sanroque.example",
      },
    ]);

    expect(
      buildResourceProviderUpdateValues({
        provider: {
          providerId,
          logoUrl: "https://example.com/logo.png",
          photoUrl: "https://example.com/photo.png",
          websiteUrl: "https://sanroque.example.com",
          socialLinks: [
            {
              label: "Instagram",
              url: "https://instagram.example.com/sanroque",
            },
          ],
          externalLinks: [
            {
              label: "Ficha municipal",
              url: "https://municipio.example.com/sanroque",
            },
          ],
        },
        updatedAt: new Date("2026-07-15T12:00:00.000Z"),
      }),
    ).toMatchObject({
      externalLinks: [
        {
          label: "Ficha municipal",
          url: "https://municipio.example.com/sanroque",
        },
      ],
      logoUrl: "https://example.com/logo.png",
      photoUrl: "https://example.com/photo.png",
      socialLinks: [
        {
          label: "Instagram",
          url: "https://instagram.example.com/sanroque",
        },
      ],
      websiteUrl: "https://sanroque.example.com",
    });
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
    expect(JSON.stringify(profile)).not.toContain("Plaza Abaroa");
    expect(JSON.stringify(profile)).not.toContain(
      "22222222-2222-4222-8222-222222222222",
    );
    expect(JSON.stringify(profile)).not.toContain(
      "Identidad revisada por Rastro.",
    );
  });

  it("maps admin-only notes and sponsor placement IDs without exact location details", () => {
    const profile = toAdminResourceProviderProfile(persistedProvider(), {
      now: new Date("2026-07-15T12:00:00.000Z"),
    });

    expect(profile).toMatchObject({
      addressLabel: "Plaza Abaroa, La Paz",
      city: "La Paz",
      department: "La Paz",
      sponsorPlacements: [
        {
          endsOn: "2026-07-31",
          isActive: true,
          placementId: "22222222-2222-4222-8222-222222222222",
          startsOn: "2026-07-01",
          surface: "resources_directory",
        },
      ],
      updatedAt: new Date("2026-07-01T12:00:00.000Z"),
      verificationNote: "Identidad revisada por Rastro.",
    });
    expect(JSON.stringify(profile)).not.toContain("exact");
  });

  it("lists admin sponsor placements across providers with provider context and safety policy", () => {
    const placements = toAdminLocalSponsorPlacements([
      toAdminResourceProviderProfile(persistedProvider(), {
        now: new Date("2026-07-15T12:00:00.000Z"),
      }),
      toAdminResourceProviderProfile(
        persistedProvider({
          id: "33333333-3333-4333-8333-333333333333",
          name: "Patitas La Paz",
          category: "shelter",
          location: {
            ...persistedProvider().location,
            city: "El Alto",
            department: "La Paz",
          },
          sponsorPlacements: [
            {
              id: "44444444-4444-4444-8444-444444444444",
              surface: "provider_details",
              label: "Aliado local",
              disclosure:
                "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
              startsAt: new Date("2026-06-01T00:00:00.000Z"),
              endsAt: new Date("2026-06-30T23:59:59.999Z"),
            },
          ],
        }),
        {
          now: new Date("2026-07-15T12:00:00.000Z"),
        },
      ),
    ]);

    expect(placements).toEqual([
      expect.objectContaining({
        city: "El Alto",
        isActive: false,
        placementId: "44444444-4444-4444-8444-444444444444",
        providerName: "Patitas La Paz",
        safetyPolicy: {
          eligibleSurfaces: ["provider_details"],
          recoveryPriority: {
            label: "Recovery Priority",
            canAffect: false,
          },
          pushNotifications: {
            eligible: false,
          },
        },
      }),
      expect.objectContaining({
        isActive: true,
        placementId: "22222222-2222-4222-8222-222222222222",
        providerName: "Clinica Veterinaria San Roque",
        surface: "resources_directory",
      }),
    ]);
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
