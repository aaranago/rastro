import { describe, expect, it } from "vitest";

import {
  LocalSponsorPlacement,
  ResourceProviderContactOption,
} from "@acme/db/schema";

import type {
  PersistedLocalSponsorPlacement,
  PersistedResourceProvider,
} from "./resource-provider-repository";
import {
  buildAdminResourceProviderListResult,
  buildAdminSponsorPlacementListResult,
  buildLocalSponsorPlacementPolicy,
  buildNearbyResourceProvidersCondition,
  buildResourceProviderContactOptionWriteValues,
  buildResourceProviderLocationUpdateValues,
  buildResourceProviderLocationWriteValues,
  buildResourceProviderUpdateValues,
  createDrizzleResourceProviderRepository,
  derivePublicResourceProviderLocation,
  SponsorPlacementOverlapError,
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

type PersistedSponsorPlacementFixture = Omit<
  PersistedLocalSponsorPlacement,
  "providerId"
> &
  Partial<Pick<PersistedLocalSponsorPlacement, "providerId">>;

type PersistedResourceProviderFixtureOverrides = Omit<
  Partial<PersistedResourceProvider>,
  "sponsorPlacements"
> & {
  sponsorPlacements?: PersistedSponsorPlacementFixture[];
};

function persistedProvider(
  overrides: PersistedResourceProviderFixtureOverrides = {},
): PersistedResourceProvider {
  const { sponsorPlacements, ...providerOverrides } = overrides;
  const providerId =
    providerOverrides.id ?? "11111111-1111-4111-8111-111111111111";
  const baseSponsorPlacements: PersistedSponsorPlacementFixture[] = [
    {
      id: "22222222-2222-4222-8222-222222222222",
      surface: "resources_directory",
      label: "Patrocinado",
      disclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      logoUrl: "https://example.com/sponsor-logo.png",
      imageUrl: "https://example.com/sponsor-banner.png",
      startsAt: new Date("2026-07-01T00:00:00.000Z"),
      endsAt: new Date("2026-07-31T23:59:59.999Z"),
    },
  ];
  const provider: Omit<PersistedResourceProvider, "sponsorPlacements"> = {
    id: providerId,
    name: "Clínica Veterinaria San Roque",
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
    ...providerOverrides,
  };

  return {
    ...provider,
    sponsorPlacements: (sponsorPlacements ?? baseSponsorPlacements).map(
      (placement) => ({
        ...placement,
        providerId: placement.providerId ?? provider.id,
      }),
    ),
  };
}

function testUuid(index: number) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function providerRow(provider: PersistedResourceProvider) {
  return {
    category: provider.category,
    createdAt: provider.createdAt,
    createdByAdminId: "member-admin-la-paz",
    deletedAt: provider.deletedAt,
    description: provider.description,
    emergencyAvailable: provider.emergencyAvailable,
    externalLinks: provider.externalLinks,
    hoursLabel: provider.hoursLabel,
    id: provider.id,
    isOpenNow: provider.isOpenNow,
    location: {
      addressLabel: provider.location.addressLabel,
      approximateLocationLabel: provider.location.approximateLocationLabel,
      city: provider.location.city,
      countryCode: "BO",
      createdAt: provider.createdAt,
      department: provider.location.department,
      exactLatitude: provider.location.publicLatitude,
      exactLongitude: provider.location.publicLongitude,
      exactPoint: {
        x: provider.location.publicLongitude,
        y: provider.location.publicLatitude,
      },
      locationCell: provider.location.locationCell,
      providerId: provider.id,
      publicLatitude: provider.location.publicLatitude,
      publicLongitude: provider.location.publicLongitude,
      publicPoint: {
        x: provider.location.publicLongitude,
        y: provider.location.publicLatitude,
      },
      publicPrecision: provider.location.precision,
      updatedAt: provider.updatedAt,
    },
    logoUrl: provider.logoUrl,
    name: provider.name,
    photoUrl: provider.photoUrl,
    serviceAreaLabel: provider.serviceAreaLabel,
    shortDescription: provider.shortDescription,
    socialLinks: provider.socialLinks,
    updatedAt: provider.updatedAt,
    verificationNote: provider.verificationNote,
    verificationStatus: provider.verificationStatus,
    verificationUpdatedByAdminId: "member-admin-la-paz",
    verifiedAt: provider.verifiedAt,
    websiteUrl: provider.websiteUrl,
  };
}

function contactOptionRows(provider: PersistedResourceProvider) {
  return provider.contactOptions.map((contact, index) => ({
    createdAt: provider.createdAt,
    id: testUuid(index + 1),
    kind: contact.kind,
    label: contact.label,
    providerId: provider.id,
    sortOrder: index,
    updatedAt: provider.updatedAt,
    value: contact.value,
  }));
}

function sponsorPlacementRows(provider: PersistedResourceProvider) {
  return provider.sponsorPlacements.map((placement) => ({
    createdAt: provider.createdAt,
    createdByAdminId: "member-admin-la-paz",
    disclosure: placement.disclosure,
    endsAt: placement.endsAt,
    id: placement.id,
    imageUrl: placement.imageUrl,
    label: placement.label,
    logoUrl: placement.logoUrl,
    providerId: provider.id,
    startsAt: placement.startsAt,
    surface: placement.surface,
    detachedAt: null,
    updatedAt: provider.updatedAt,
  }));
}

interface SponsorPlacementDeliveryMetricsFixture {
  impressionCount?: number;
  openCount?: number;
}

function sponsorPlacementQueryRow(
  provider: PersistedResourceProvider,
  deliveryMetricsByPlacementId: Record<
    string,
    SponsorPlacementDeliveryMetricsFixture
  > = {},
) {
  const [placement] = provider.sponsorPlacements;

  if (!placement) {
    throw new Error(
      "Expected provider fixture to include a sponsor placement.",
    );
  }

  const deliveryMetrics = deliveryMetricsByPlacementId[placement.id];

  return {
    category: provider.category,
    city: provider.location.city,
    department: provider.location.department,
    sponsorImpressionCount: deliveryMetrics?.impressionCount ?? 0,
    sponsorOpenCount: deliveryMetrics?.openCount ?? 0,
    disclosure: placement.disclosure,
    endsAt: placement.endsAt,
    imageUrl: placement.imageUrl,
    label: placement.label,
    logoUrl: placement.logoUrl,
    placementId: placement.id,
    providerId: provider.id,
    providerName: provider.name,
    providerVerificationStatus: provider.verificationStatus,
    startsAt: placement.startsAt,
    surface: placement.surface,
  };
}

function createSelectChain(
  getRows: (state: { fromTable: unknown }) => unknown[],
  callbacks: {
    onLimit?: (value: number) => void;
    onOffset?: (value: number) => void;
  } = {},
) {
  const state = {
    fromTable: undefined as unknown,
  };
  const chain = {
    from(table: unknown) {
      state.fromTable = table;

      return chain;
    },
    innerJoin() {
      return chain;
    },
    limit(value: number) {
      callbacks.onLimit?.(value);

      return chain;
    },
    offset(value: number) {
      callbacks.onOffset?.(value);

      return chain;
    },
    orderBy() {
      return chain;
    },
    then(resolve: (rows: unknown[]) => void) {
      resolve(getRows(state));
    },
    where() {
      return chain;
    },
  };

  return chain;
}

function createAdminProviderListDb(input: {
  pageProviders: PersistedResourceProvider[];
  total: number;
}) {
  const calls = {
    contactProviderRows: 0,
    findManyProviderRows: 0,
    limits: [] as number[],
    offsets: [] as number[],
    sponsorProviderRows: 0,
  };
  const pageProviderIds = new Set(
    input.pageProviders.map((provider) => provider.id),
  );
  const select = (fields?: Record<string, unknown>) => {
    return createSelectChain(
      ({ fromTable }) => {
        if (fields && "total" in fields) {
          return [{ total: input.total }];
        }

        if (fields && "id" in fields) {
          return input.pageProviders.map((provider) => ({ id: provider.id }));
        }

        if (fromTable === ResourceProviderContactOption) {
          const rows = input.pageProviders.flatMap(contactOptionRows);
          calls.contactProviderRows = new Set(
            rows.map((row) => row.providerId),
          ).size;

          return rows;
        }

        if (fromTable === LocalSponsorPlacement) {
          const rows = input.pageProviders.flatMap(sponsorPlacementRows);
          calls.sponsorProviderRows = new Set(
            rows.map((row) => row.providerId),
          ).size;

          return rows;
        }

        return [];
      },
      {
        onLimit(value) {
          calls.limits.push(value);
        },
        onOffset(value) {
          calls.offsets.push(value);
        },
      },
    );
  };

  return {
    calls,
    db: {
      query: {
        ResourceProvider: {
          findMany: () => {
            calls.findManyProviderRows = pageProviderIds.size;

            return Promise.resolve(input.pageProviders.map(providerRow));
          },
        },
      },
      select,
    },
  };
}

function createAdminSponsorPlacementListDb(input: {
  deliveryMetricsByPlacementId?: Record<
    string,
    SponsorPlacementDeliveryMetricsFixture
  >;
  pageProviders: PersistedResourceProvider[];
  total: number;
}) {
  const calls = {
    findManyWasCalled: false,
    limits: [] as number[],
    offsets: [] as number[],
  };
  const select = (fields?: Record<string, unknown>) => {
    return createSelectChain(
      () => {
        if (fields && "total" in fields) {
          return [{ total: input.total }];
        }

        if (fields && "placementId" in fields) {
          return input.pageProviders.map((provider) =>
            sponsorPlacementQueryRow(
              provider,
              input.deliveryMetricsByPlacementId,
            ),
          );
        }

        return [];
      },
      {
        onLimit(value) {
          calls.limits.push(value);
        },
        onOffset(value) {
          calls.offsets.push(value);
        },
      },
    );
  };

  return {
    calls,
    db: {
      query: {
        ResourceProvider: {
          findMany: () => {
            calls.findManyWasCalled = true;

            throw new Error(
              "Sponsor placement list must not hydrate providers.",
            );
          },
        },
      },
      select,
    },
  };
}

function createActiveSponsorPlacementDb(input: {
  providers: PersistedResourceProvider[];
}) {
  const calls = {
    findProviderRows: 0,
    limits: [] as number[],
  };
  let activeProviderIndex = 0;
  let loadingProviderId: string | undefined;
  const select = (fields?: Record<string, unknown>) => {
    return createSelectChain(
      ({ fromTable }) => {
        if (fields && "placementId" in fields) {
          return input.providers.map((provider) => ({
            placementId: provider.sponsorPlacements[0]?.id,
            providerId: provider.id,
          }));
        }

        if (!loadingProviderId) {
          return [];
        }

        const provider = input.providers.find(
          (candidate) => candidate.id === loadingProviderId,
        );

        if (!provider) {
          return [];
        }

        if (fromTable === ResourceProviderContactOption) {
          return contactOptionRows(provider);
        }

        if (fromTable === LocalSponsorPlacement) {
          return sponsorPlacementRows(provider);
        }

        return [];
      },
      {
        onLimit(value) {
          calls.limits.push(value);
        },
      },
    );
  };

  return {
    calls,
    db: {
      query: {
        ResourceProvider: {
          findFirst: () => {
            const provider = input.providers[activeProviderIndex];
            activeProviderIndex += 1;
            loadingProviderId = provider?.id;
            calls.findProviderRows += provider ? 1 : 0;

            return Promise.resolve(provider ? providerRow(provider) : null);
          },
        },
      },
      select,
    },
  };
}

function createDetachSponsorPlacementDb(input: {
  provider: PersistedResourceProvider;
}) {
  const calls = {
    deleteCalled: false,
    updateValues: [] as Record<string, unknown>[],
  };
  let detached = false;
  const select = () =>
    createSelectChain(({ fromTable }) => {
      if (fromTable === ResourceProviderContactOption) {
        return contactOptionRows(input.provider);
      }

      if (fromTable === LocalSponsorPlacement) {
        return detached ? [] : sponsorPlacementRows(input.provider);
      }

      return [];
    });

  return {
    calls,
    db: {
      delete: () => {
        calls.deleteCalled = true;

        throw new Error("Sponsor placements must be archived, not deleted.");
      },
      query: {
        ResourceProvider: {
          findFirst: () => Promise.resolve(providerRow(input.provider)),
        },
      },
      select,
      update: () => ({
        set(values: Record<string, unknown>) {
          calls.updateValues.push(values);

          return {
            where: () => ({
              returning: () => {
                detached = true;

                return Promise.resolve([
                  { id: input.provider.sponsorPlacements[0]?.id },
                ]);
              },
            }),
          };
        },
      }),
    },
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

    expect(summary.sponsorPlacement).toMatchObject({
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
    });
    expect(typeof summary.sponsorPlacement?.deliveryToken).toBe("string");
    expect(JSON.stringify(summary.sponsorPlacement)).not.toContain(
      "placementId",
    );
    expect(summary.activeSponsorPlacements).toEqual([summary.sponsorPlacement]);
  });

  it("returns active sponsor placements for each eligible surface without collapsing to the first active placement", () => {
    const summary = toPublicResourceProviderSummary(
      persistedProvider({
        sponsorPlacements: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            surface: "provider_details",
            label: "Aliado local",
            disclosure:
              "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
            logoUrl: null,
            imageUrl: "https://example.com/provider-details-sponsor.png",
            startsAt: new Date("2026-07-01T00:00:00.000Z"),
            endsAt: new Date("2026-07-31T23:59:59.999Z"),
          },
          {
            id: "22222222-2222-4222-8222-222222222222",
            providerId: "11111111-1111-4111-8111-111111111111",
            surface: "resources_directory",
            label: "Patrocinado",
            disclosure:
              "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
            logoUrl: "https://example.com/sponsor-logo.png",
            imageUrl: null,
            startsAt: new Date("2026-07-01T00:00:00.000Z"),
            endsAt: new Date("2026-07-31T23:59:59.999Z"),
          },
        ],
      }),
      {
        now: new Date("2026-07-15T12:00:00.000Z"),
      },
    );

    expect(summary.sponsorPlacement).toMatchObject({
      eligibleSurfaces: ["resources_directory"],
      label: "Patrocinado",
      logoUrl: "https://example.com/sponsor-logo.png",
    });
    expect(summary.activeSponsorPlacements).toEqual([
      expect.objectContaining({
        eligibleSurfaces: ["resources_directory"],
        label: "Patrocinado",
        logoUrl: "https://example.com/sponsor-logo.png",
      }),
      expect.objectContaining({
        eligibleSurfaces: ["provider_details"],
        label: "Aliado local",
        imageUrl: "https://example.com/provider-details-sponsor.png",
      }),
    ]);
  });

  it("keeps active sponsor placements visible when sponsor media is missing or broken", () => {
    const summary = toPublicResourceProviderSummary(
      persistedProvider({
        sponsorPlacements: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            surface: "resources_directory",
            label: "Patrocinado",
            disclosure:
              "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
            logoUrl: "nota-url",
            imageUrl: null,
            startsAt: new Date("2026-07-01T00:00:00.000Z"),
            endsAt: new Date("2026-07-31T23:59:59.999Z"),
          },
        ],
      }),
      {
        now: new Date("2026-07-15T12:00:00.000Z"),
      },
    );

    expect(summary.activeSponsorPlacements).toEqual([
      {
        kind: "Local Sponsor Placement",
        deliveryToken: summary.activeSponsorPlacements?.[0]?.deliveryToken,
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
      },
    ]);
    expect(typeof summary.activeSponsorPlacements?.[0]?.deliveryToken).toBe(
      "string",
    );
    expect(summary.sponsorPlacement).toEqual(
      summary.activeSponsorPlacements?.[0],
    );
  });

  it("omits inactive sponsor placements from public provider output", () => {
    const summary = toPublicResourceProviderSummary(persistedProvider(), {
      now: new Date("2026-08-15T12:00:00.000Z"),
    });

    expect(summary.sponsorPlacement).toBeUndefined();
    expect(summary.activeSponsorPlacements).toBeUndefined();
  });

  it("lists active sponsor placements for a requested surface across multiple providers", async () => {
    const providers = [
      persistedProvider({
        id: testUuid(1),
        name: "Clínica San Roque",
        sponsorPlacements: [
          {
            id: testUuid(101),
            surface: "launch_home_banner",
            label: "Portada",
            disclosure:
              "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
            logoUrl: "https://example.com/launch-logo-1.png",
            imageUrl: "https://example.com/launch-banner-1.png",
            startsAt: new Date("2026-07-01T00:00:00.000Z"),
            endsAt: new Date("2026-07-31T23:59:59.999Z"),
          },
          {
            id: testUuid(102),
            surface: "resources_directory",
            label: "Recursos",
            disclosure:
              "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
            logoUrl: null,
            imageUrl: null,
            startsAt: new Date("2026-07-01T00:00:00.000Z"),
            endsAt: new Date("2026-07-31T23:59:59.999Z"),
          },
        ],
      }),
      persistedProvider({
        id: testUuid(2),
        name: "Farmacia Veterinaria Calacoto",
        sponsorPlacements: [
          {
            id: testUuid(201),
            surface: "launch_home_banner",
            label: "Portada",
            disclosure:
              "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
            logoUrl: "https://example.com/launch-logo-2.png",
            imageUrl: "https://example.com/launch-banner-2.png",
            startsAt: new Date("2026-07-01T00:00:00.000Z"),
            endsAt: new Date("2026-07-31T23:59:59.999Z"),
          },
        ],
      }),
    ];
    const { calls, db } = createActiveSponsorPlacementDb({ providers });
    const repository = createDrizzleResourceProviderRepository(db as never, {
      now: () => new Date("2026-07-15T12:00:00.000Z"),
    });

    const result = await repository.listActiveSponsorPlacements({
      limit: 2,
      surface: "launch_home_banner",
    });

    expect(calls.limits).toEqual([2]);
    expect(calls.findProviderRows).toBe(2);
    expect(result.map((provider) => provider.name)).toEqual([
      "Clínica San Roque",
      "Farmacia Veterinaria Calacoto",
    ]);
    expect(result[0]).toMatchObject({
      activeSponsorPlacements: [
        {
          eligibleSurfaces: ["launch_home_banner"],
          imageUrl: "https://example.com/launch-banner-1.png",
          label: "Portada",
        },
      ],
      sponsorPlacement: {
        eligibleSurfaces: ["launch_home_banner"],
      },
    });
    expect(result[1]).toMatchObject({
      activeSponsorPlacements: [
        {
          eligibleSurfaces: ["launch_home_banner"],
          imageUrl: "https://example.com/launch-banner-2.png",
          label: "Portada",
        },
      ],
      sponsorPlacement: {
        eligibleSurfaces: ["launch_home_banner"],
      },
    });
    expect(JSON.stringify(result)).not.toContain("resources_directory");
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
    expect(profile.sponsorPlacement?.deliveryToken).toEqual(expect.any(String));
    expect(JSON.stringify(profile)).not.toContain("placementId");
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
          logoUrl: "https://example.com/sponsor-logo.png",
          imageUrl: "https://example.com/sponsor-banner.png",
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
              logoUrl: null,
              imageUrl: "https://example.com/patitas-sponsor.png",
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
        providerVerificationStatus: "verified",
        imageUrl: "https://example.com/patitas-sponsor.png",
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
        logoUrl: "https://example.com/sponsor-logo.png",
        imageUrl: "https://example.com/sponsor-banner.png",
        placementId: "22222222-2222-4222-8222-222222222222",
        providerName: "Clínica Veterinaria San Roque",
        surface: "resources_directory",
      }),
    ]);
  });

  it("builds paginated admin provider lists with typed filters and deterministic sorting", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    const profiles = [
      toAdminResourceProviderProfile(persistedProvider(), { now }),
      toAdminResourceProviderProfile(
        persistedProvider({
          id: "33333333-3333-4333-8333-333333333333",
          name: "Patitas La Paz",
          category: "shelter",
          logoUrl: null,
          photoUrl: null,
          verificationStatus: "unverified",
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
              logoUrl: null,
              imageUrl: null,
              startsAt: new Date("2026-06-01T00:00:00.000Z"),
              endsAt: new Date("2026-06-30T23:59:59.999Z"),
            },
          ],
        }),
        { now },
      ),
      toAdminResourceProviderProfile(
        persistedProvider({
          id: "55555555-5555-4555-8555-555555555555",
          name: "Alimentos Andes",
          category: "pet_food",
          verificationStatus: "unverified",
          location: {
            ...persistedProvider().location,
            city: "La Paz",
            department: "La Paz",
          },
          sponsorPlacements: [],
        }),
        { now },
      ),
    ];

    const sorted = buildAdminResourceProviderListResult(
      profiles,
      {
        page: 1,
        pageSize: 2,
        sortBy: "city",
        sortDirection: "asc",
      },
      { now },
    );
    const filtered = buildAdminResourceProviderListResult(
      profiles,
      {
        filters: {
          category: ["shelter"],
          city: "El Alto",
          mediaState: "missing_media",
          sponsorState: "inactive",
          sponsorSurface: ["provider_details"],
          verification: ["unverified"],
        },
      },
      { now },
    );

    expect(sorted).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
      page: 1,
      pageCount: 2,
      pageSize: 2,
      total: 3,
    });
    expect(sorted.items.map((provider) => provider.name)).toEqual([
      "Patitas La Paz",
      "Alimentos Andes",
    ]);
    expect(filtered).toMatchObject({
      pageSize: 10,
      total: 1,
    });
    expect(filtered.items[0]?.name).toBe("Patitas La Paz");
    expect(filtered.availableFilters.map((filter) => filter.key)).toEqual(
      expect.arrayContaining([
        "activeOn",
        "category",
        "city",
        "department",
        "mediaState",
        "sponsorState",
        "sponsorSurface",
        "verification",
      ]),
    );
  });

  it("builds paginated sponsor placement lists with state, window, and media filters", () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    const placements = toAdminLocalSponsorPlacements([
      toAdminResourceProviderProfile(persistedProvider(), { now }),
      toAdminResourceProviderProfile(
        persistedProvider({
          id: "33333333-3333-4333-8333-333333333333",
          name: "Patitas La Paz",
          category: "shelter",
          verificationStatus: "unverified",
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
              logoUrl: null,
              imageUrl: null,
              startsAt: new Date("2026-06-01T00:00:00.000Z"),
              endsAt: new Date("2026-06-30T23:59:59.999Z"),
            },
          ],
        }),
        { now },
      ),
    ]);

    const filtered = buildAdminSponsorPlacementListResult(
      placements,
      {
        filters: {
          category: ["shelter"],
          city: "El Alto",
          endsTo: "2026-06-30",
          mediaState: "missing_media",
          startsFrom: "2026-06-01",
          state: "expired",
          surface: ["provider_details"],
          verification: ["unverified"],
        },
        sortBy: "providerName",
        sortDirection: "asc",
      },
      { now },
    );

    expect(filtered).toMatchObject({
      page: 1,
      pageCount: 1,
      pageSize: 10,
      total: 1,
    });
    expect(filtered.items[0]).toMatchObject({
      placementId: "44444444-4444-4444-8444-444444444444",
      providerName: "Patitas La Paz",
      providerVerificationStatus: "unverified",
      surface: "provider_details",
    });
    expect(filtered.availableSorts.map((sort) => sort.value)).toEqual(
      expect.arrayContaining(["endsOn", "providerName", "state", "surface"]),
    );
  });

  it("applies admin provider pagination before hydrating provider contacts and sponsor placements", async () => {
    const providers = Array.from({ length: 25 }, (_, index) =>
      persistedProvider({
        id: testUuid(index + 1),
        name: `Proveedor ${String(index + 1).padStart(2, "0")}`,
        sponsorPlacements: [
          {
            id: testUuid(index + 101),
            surface: "resources_directory",
            label: "Patrocinado",
            disclosure:
              "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
            logoUrl: null,
            imageUrl: null,
            startsAt: new Date("2026-07-01T00:00:00.000Z"),
            endsAt: new Date("2026-07-31T23:59:59.999Z"),
          },
        ],
      }),
    );
    const pageProviders = providers.slice(10, 20);
    const { calls, db } = createAdminProviderListDb({
      pageProviders,
      total: providers.length,
    });
    const repository = createDrizzleResourceProviderRepository(db as never, {
      now: () => new Date("2026-07-15T12:00:00.000Z"),
    });

    const result = await repository.listProviders({
      page: 2,
      pageSize: 10,
      sortBy: "name",
      sortDirection: "asc",
    });

    expect(result).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: true,
      page: 2,
      pageCount: 3,
      pageSize: 10,
      total: 25,
    });
    expect(result.items.map((provider) => provider.name)).toEqual(
      pageProviders.map((provider) => provider.name),
    );
    expect(calls.limits).toEqual([10]);
    expect(calls.offsets).toEqual([10]);
    expect(calls.findManyProviderRows).toBe(10);
    expect(calls.contactProviderRows).toBe(10);
    expect(calls.sponsorProviderRows).toBe(10);
  });

  it("applies admin sponsor placement pagination without hydrating every provider", async () => {
    const providers = Array.from({ length: 25 }, (_, index) =>
      persistedProvider({
        id: testUuid(index + 1),
        name: `Proveedor ${String(index + 1).padStart(2, "0")}`,
        sponsorPlacements: [
          {
            id: testUuid(index + 101),
            surface:
              index % 2 === 0 ? "resources_directory" : "provider_details",
            label: "Patrocinado",
            disclosure:
              "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
            logoUrl: index % 2 === 0 ? "https://example.com/logo.png" : null,
            imageUrl: null,
            startsAt: new Date("2026-07-01T00:00:00.000Z"),
            endsAt: new Date("2026-07-31T23:59:59.999Z"),
          },
        ],
      }),
    );
    const pageProviders = providers.slice(10, 20);
    const { calls, db } = createAdminSponsorPlacementListDb({
      pageProviders,
      total: providers.length,
    });
    const repository = createDrizzleResourceProviderRepository(db as never, {
      now: () => new Date("2026-07-15T12:00:00.000Z"),
    });

    const result = await repository.listSponsorPlacements({
      filters: {
        state: "active",
      },
      page: 2,
      pageSize: 10,
      sortBy: "providerName",
      sortDirection: "asc",
    });

    expect(result).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: true,
      page: 2,
      pageCount: 3,
      pageSize: 10,
      total: 25,
    });
    expect(result.items.map((placement) => placement.providerName)).toEqual(
      pageProviders.map((provider) => provider.name),
    );
    expect(result.items.every((placement) => placement.isActive)).toBe(true);
    expect(calls.limits).toEqual([10]);
    expect(calls.offsets).toEqual([10]);
    expect(calls.findManyWasCalled).toBe(false);
  });

  it("returns delivery metrics per admin sponsor placement", async () => {
    const providers = [
      persistedProvider({
        id: "11111111-1111-4111-8111-111111111111",
        name: "Clínica Veterinaria San Roque",
        sponsorPlacements: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            surface: "resources_directory",
            label: "Patrocinado",
            disclosure:
              "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
            logoUrl: "https://example.com/logo.png",
            imageUrl: "https://example.com/banner.png",
            startsAt: new Date("2026-07-01T00:00:00.000Z"),
            endsAt: new Date("2026-07-31T23:59:59.999Z"),
          },
        ],
      }),
    ];
    const { db } = createAdminSponsorPlacementListDb({
      deliveryMetricsByPlacementId: {
        "22222222-2222-4222-8222-222222222222": {
          impressionCount: 1280,
          openCount: 96,
        },
      },
      pageProviders: providers,
      total: providers.length,
    });
    const repository = createDrizzleResourceProviderRepository(db as never, {
      now: () => new Date("2026-07-15T12:00:00.000Z"),
    });

    const result = await repository.listSponsorPlacements({
      filters: {
        state: "active",
      },
      page: 1,
      pageSize: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      deliveryMetrics: {
        impressionCount: 1280,
        openCount: 96,
      },
      placementId: "22222222-2222-4222-8222-222222222222",
      providerName: "Clínica Veterinaria San Roque",
      surface: "resources_directory",
    });
  });

  it("archives detached sponsor placements without deleting delivery history", async () => {
    const now = new Date("2026-07-15T12:00:00.000Z");
    const provider = persistedProvider();
    const { calls, db } = createDetachSponsorPlacementDb({ provider });
    const repository = createDrizzleResourceProviderRepository(db as never, {
      now: () => now,
    });

    const detached = await repository.detachSponsor({
      placementId: "22222222-2222-4222-8222-222222222222",
      providerId: "11111111-1111-4111-8111-111111111111",
    });

    expect(calls.deleteCalled).toBe(false);
    expect(calls.updateValues).toEqual([
      {
        detachedAt: now,
        updatedAt: now,
      },
    ]);
    expect(JSON.stringify(detached)).not.toContain(
      "22222222-2222-4222-8222-222222222222",
    );
  });

  it("provides field-specific sponsor placement overlap errors", () => {
    const error = new SponsorPlacementOverlapError();

    expect(error.fieldErrors).toMatchObject({
      endsOn: ["La ventana se cruza con otro patrocinio local activo."],
      startsOn: ["La ventana se cruza con otro patrocinio local activo."],
      surface: ["La superficie ya tiene un patrocinio local en esa ventana."],
    });
  });

  it("builds standalone sponsor policy for any supported surface", () => {
    const policy = buildLocalSponsorPlacementPolicy({
      id: "22222222-2222-4222-8222-222222222222",
      providerId: "11111111-1111-4111-8111-111111111111",
      surface: "contextual_care_resources",
      label: "Patrocinado",
      disclosure: "Patrocinio local identificado por Rastro.",
      endsAt: new Date("2026-07-31T23:59:59.999Z"),
    });

    expect(typeof policy.deliveryToken).toBe("string");
    expect(policy).toMatchObject({
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
