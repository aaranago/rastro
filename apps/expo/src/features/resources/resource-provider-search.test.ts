import { describe, expect, it } from "vitest";

import type {
  ResourceProviderSearchLocation,
  ResourceSearchQuery,
} from "./static-resources-adapter";
import {
  createStaticResourceProviderRepository,
  createStaticResourcesAdapter,
} from "./static-resources-adapter";

const sopocachiSearchLocation = {
  coordinate: {
    latitude: -16.5103,
    longitude: -68.1299,
  },
  countryCode: "BO",
  kind: "manual",
  label: "Sopocachi, La Paz",
  locationCellLabel: "Sopocachi",
  manualLocationKind: "place",
} satisfies ResourceProviderSearchLocation;

const boliviaSearchLocation = {
  coordinate: {
    latitude: -17.3895,
    longitude: -66.1568,
  },
  countryCode: "BO",
  kind: "manual",
  label: "Queru Queru, Cochabamba",
  locationCellLabel: "Queru Queru",
  manualLocationKind: "map-pin",
} satisfies ResourceProviderSearchLocation;

describe("Resource Provider nearby search", () => {
  it("lets visitors browse providers through the Rastro-owned PostGIS radius boundary", async () => {
    const repository = createStaticResourceProviderRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });

    const result = await repository.searchResourceProviders(
      { kind: "visitor" },
      {
        location: sopocachiSearchLocation,
        radiusMeters: 2_000,
        strategy: "postgis_radius",
      },
    );

    expect(result).toMatchObject({
      generatedAt: "2026-06-18T12:00:00.000Z",
      radiusMeters: 2_000,
      searchBoundary: {
        engine: "rastro-postgis-radius",
        owner: "rastro",
        publicLocationPrecision: "location-cell",
        radiusMeters: 2_000,
      },
      searchStrategy: "postgis_radius",
    });
    expect(result.searchBoundary.center).toMatchObject({
      countryCode: "BO",
      kind: "manual",
      label: "Sopocachi, La Paz",
      locationCellLabel: "Sopocachi",
    });
    expect(result.providers.map((provider) => provider.id)).toEqual([
      "clinic-san-roque",
      "dra-marta-gomez",
    ]);
    expect(result.providers[0]).toMatchObject({
      approximateLocationLabel: "Sopocachi, La Paz",
      categoryId: "veterinary",
      distanceMeters: 0,
      name: "Clínica Veterinaria San Roque",
    });
    expect(result.providers[0]).not.toHaveProperty("latitude");
    expect(result.providers[0]).not.toHaveProperty("longitude");
  });

  it("covers every v1 provider category and filters categories inside the radius search", async () => {
    const repository = createStaticResourceProviderRepository();

    const allCategories = await repository.searchResourceProviders(
      { kind: "visitor" },
      {
        location: boliviaSearchLocation,
        radiusMeters: 900_000,
        strategy: "postgis_radius",
      },
    );

    expect(
      new Set(allCategories.providers.map((provider) => provider.categoryId)),
    ).toEqual(
      new Set([
        "veterinary",
        "shelter",
        "groomer",
        "pet_food",
        "trainer",
        "pet_store",
        "transport",
        "other",
      ]),
    );

    const filtered = await repository.searchResourceProviders(
      { kind: "visitor" },
      {
        categoryIds: ["pet_food", "transport"],
        location: boliviaSearchLocation,
        radiusMeters: 900_000,
        strategy: "postgis_radius",
      },
    );

    expect(filtered.providers.map((provider) => provider.categoryId)).toEqual([
      "pet_food",
      "transport",
    ]);
    expect(filtered.query.categoryIds).toEqual(["pet_food", "transport"]);
  });

  it("does not treat denied or unresolved location as a valid radius search", async () => {
    const repository = createStaticResourceProviderRepository();
    const adapter = createStaticResourcesAdapter();

    await expect(
      repository.searchResourceProviders(
        { kind: "visitor" },
        {
          location: {
            kind: "denied",
          } as unknown as ResourceProviderSearchLocation,
          radiusMeters: 5_000,
          strategy: "postgis_radius",
        },
      ),
    ).rejects.toThrow(
      "La busqueda de recursos necesita una ubicacion resuelta en Bolivia para el radio PostGIS.",
    );

    await expect(
      repository.searchResourceProviders(
        { kind: "visitor" },
        {
          location: {
            countryCode: "BO",
            kind: "current",
            label: "La Paz",
            locationCellLabel: "La Paz",
          } as unknown as ResourceProviderSearchLocation,
          radiusMeters: 5_000,
          strategy: "postgis_radius",
        },
      ),
    ).rejects.toThrow(
      "La busqueda de recursos necesita una ubicacion resuelta en Bolivia para el radio PostGIS.",
    );

    await expect(
      adapter.searchProviders({
        location: {
          kind: "denied",
        },
        radiusMeters: 5_000,
        strategy: "postgis_radius",
      }),
    ).resolves.toEqual([]);
  });

  it("lets members search by current, last detected, manual place, and manual map-pin locations in Bolivia", async () => {
    const repository = createStaticResourceProviderRepository();
    const member = {
      kind: "member",
      memberId: "member-123",
    } as const;
    const searches = [
      {
        expectedProviderId: "huellas-felices",
        location: {
          coordinate: {
            latitude: -16.5405,
            longitude: -68.0889,
          },
          countryCode: "BO",
          kind: "current",
          label: "Achumani, La Paz",
          locationCellLabel: "Achumani",
        },
      },
      {
        expectedProviderId: "peludos-felices",
        location: {
          coordinate: {
            latitude: -17.7833,
            longitude: -63.1821,
          },
          countryCode: "BO",
          kind: "last",
          label: "Equipetrol, Santa Cruz",
          locationCellLabel: "Equipetrol",
        },
      },
      {
        expectedProviderId: "clinic-san-roque",
        location: sopocachiSearchLocation,
      },
      {
        expectedProviderId: "alimentos-patitas",
        location: boliviaSearchLocation,
      },
    ] satisfies {
      expectedProviderId: string;
      location: ResourceProviderSearchLocation;
    }[];

    for (const { expectedProviderId, location } of searches) {
      const result = await repository.searchResourceProviders(member, {
        location,
        radiusMeters: 2_000,
        strategy: "postgis_radius",
      });

      expect(result.searchBoundary.center.countryCode).toBe("BO");
      expect(result.searchBoundary.center.kind).toBe(location.kind);
      expect(result.providers[0]?.id).toBe(expectedProviderId);
    }
  });

  it("supports current, last detected, and manual Bolivia searches through the public adapter", async () => {
    const adapter = createStaticResourcesAdapter();
    const searches = [
      {
        expectedLocationCellLabel: "Achumani",
        expectedProviderId: "huellas-felices",
        query: {
          location: {
            coordinate: {
              latitude: -16.5405,
              longitude: -68.0889,
            },
            countryCode: "BO",
            kind: "current",
            label: "Achumani, La Paz",
            locationCellLabel: "Achumani",
          },
          radiusMeters: 2_000,
          strategy: "postgis_radius",
        },
      },
      {
        expectedLocationCellLabel: "Equipetrol",
        expectedProviderId: "peludos-felices",
        query: {
          location: {
            coordinate: {
              latitude: -17.7833,
              longitude: -63.1821,
            },
            countryCode: "BO",
            kind: "last",
            label: "Equipetrol, Santa Cruz",
            locationCellLabel: "Equipetrol",
          },
          radiusMeters: 2_000,
          strategy: "postgis_radius",
        },
      },
      {
        expectedLocationCellLabel: "Sopocachi",
        expectedProviderId: "clinic-san-roque",
        query: {
          location: {
            coordinate: sopocachiSearchLocation.coordinate,
            countryCode: "BO",
            kind: "manual",
            label: "Sopocachi, La Paz",
            locationCellLabel: "Sopocachi",
            manualLocationKind: "place",
          },
          radiusMeters: 2_000,
          strategy: "postgis_radius",
        },
      },
    ] satisfies {
      expectedLocationCellLabel: string;
      expectedProviderId: string;
      query: ResourceSearchQuery;
    }[];

    for (const {
      expectedLocationCellLabel,
      expectedProviderId,
      query,
    } of searches) {
      const providers = await adapter.searchProviders(query);

      expect(providers[0]?.id).toBe(expectedProviderId);
      expect(providers[0]?.approximateLocationLabel).toContain(
        expectedLocationCellLabel,
      );
    }
  });
});
