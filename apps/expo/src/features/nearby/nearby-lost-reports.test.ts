import { describe, expect, it } from "vitest";

import type {
  LostPetReportSummary,
  NearbySearchLocation,
} from "./nearby-types";
import type { NearbyLostReportsViewModel } from "./nearby-view-model";
import { createInMemoryLostPetReportRepository } from "../lost-reports/lost-reports";
import { createNearbyLostReportRepositoryAdapter } from "./nearby-lost-report-repository-adapter";
import { createStaticNearbyLostReportsAdapter } from "./nearby-static-adapter";
import { buildNearbyLostReportsViewModel } from "./nearby-view-model";

const manualLocation: NearbySearchLocation = {
  countryCode: "BO",
  label: "Zona Sur, La Paz",
  locationCellLabel: "Zona Sur",
  source: "manual",
};

const reports: LostPetReportSummary[] = [
  {
    id: "lost-bruno",
    petName: "Bruno",
    species: "Perro",
    breed: "Golden Retriever",
    sex: "Macho",
    photoUrl: "https://example.com/bruno.jpg",
    distanceMeters: 300,
    locationCellLabel: "Achumani",
    publicLocation: { kind: "approximate" },
    lastSeenAtLabel: "Hace 40 min",
    lastSeenSummary: "Collar azul con plaquita, visto cerca del parque.",
    alertPriority: "urgent",
  },
  {
    id: "lost-luna",
    petName: "Luna",
    species: "Gato",
    breed: "Siamés",
    sex: "Hembra",
    photoUrl: "https://example.com/luna.jpg",
    distanceMeters: 12_400,
    locationCellLabel: "Sopocachi",
    publicLocation: { kind: "approximate" },
    lastSeenAtLabel: "Ayer",
    lastSeenSummary: "Se escapó durante la lluvia.",
    alertPriority: "standard",
  },
];

describe("nearby Lost Pet Report discovery", () => {
  it("browses Lost Pet Reports published through the Rastro-owned search boundary without signing in", async () => {
    const repository = createInMemoryLostPetReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });
    const adapter = createNearbyLostReportRepositoryAdapter({ repository });
    const location: NearbySearchLocation = {
      coordinates: { latitude: -16.5103, longitude: -68.1299 },
      countryCode: "BO",
      label: "Sopocachi, La Paz",
      locationCellLabel: "Sopocachi",
      manualLocationKind: "place",
      source: "manual",
    };

    await repository.publishLostPetReport(
      {
        displayName: "Camila",
        kind: "member",
        memberId: "member-camila",
      },
      {
        contactOption: { kind: "in-app-chat" },
        exactLocation: {
          addressLabel: "Plaza Abaroa, La Paz",
          countryCode: "BO",
          latitude: -16.5103,
          locationCellLabel: "Sopocachi",
          longitude: -68.1299,
        },
        lastSeenAt: "2026-06-18T11:30:00.000Z",
        lastSeenDescription: "Collar rojo, visto cerca de la plaza.",
        petProfile: {
          kind: "inline",
          profile: {
            breed: "Mestizo",
            description: "Patas blancas y collar rojo.",
            name: "Toby",
            photos: [{ id: "pet-photo-1", uri: "file:///toby.heic" }],
            type: "Perro",
          },
        },
        photos: [{ id: "report-photo-1", uri: "file:///toby-lost.heic" }],
      },
    );

    const result = await adapter.searchLostPetReports({
      location,
      radiusKm: 5,
    });
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location },
      mode: "list",
      radiusKm: 5,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(result.searchBoundary).toMatchObject({
      engine: "rastro-postgis-radius",
      owner: "rastro",
      publicLocationPrecision: "location-cell",
      radiusKm: 5,
    });
    expect(viewModel.accessPolicy.requiresSignIn).toBe(false);
    expect(viewModel.cards).toHaveLength(1);
    expect(viewModel.cards[0]).toMatchObject({
      publicLocationLabel: "Sopocachi · zona aproximada",
      title: "Toby",
    });
    expect(viewModel.cards[0]?.distanceLabel).toBe("a 0 m");
  });

  it("builds a radius-limited browse model with an urgent alert and approximate public locations", async () => {
    const adapter = createStaticNearbyLostReportsAdapter({ reports });

    const result = await adapter.searchLostPetReports({
      location: manualLocation,
      radiusKm: 5,
    });

    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: manualLocation },
      mode: "list",
      radiusKm: 5,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(viewModel.cards).toHaveLength(1);
    expect(viewModel.cards[0]?.title).toBe("Bruno");
    expect(viewModel.cards[0]?.publicLocationLabel).toContain(
      "zona aproximada",
    );
    expect(viewModel.urgentAlert?.title).toBe("Alerta activa");
    expect(viewModel.urgentAlert?.message).toContain("Bruno");
    expect(viewModel.locationLabel).toBe("Zona Sur, La Paz");
  });

  it("exposes a sign-in-free Rastro/PostGIS browse contract shared by list and map states", async () => {
    const currentLocation: NearbySearchLocation = {
      coordinates: { latitude: -16.5405, longitude: -68.0889 },
      countryCode: "BO",
      label: "Achumani, La Paz",
      locationCellLabel: "Achumani",
      source: "current",
    };
    const adapter = createStaticNearbyLostReportsAdapter({ reports });

    const result = await adapter.searchLostPetReports({
      location: currentLocation,
      radiusKm: 10,
    });

    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: currentLocation },
      mode: "map",
      radiusKm: 10,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(result.searchBoundary).toMatchObject({
      engine: "rastro-postgis-radius",
      owner: "rastro",
      radiusKm: 10,
    });
    expect(result.searchBoundary.center.source).toBe("current");
    expect(viewModel.accessPolicy).toEqual({
      audiences: ["visitor", "member"],
      requiresSignIn: false,
    });
    expect(viewModel.searchBoundaryLabel).toContain("Rastro");
    expect(viewModel.searchBoundaryLabel).toContain("10 km");
    expect(viewModel.publicSummaries.map((summary) => summary.id)).toEqual(
      viewModel.cards.map((card) => card.publicSummaryId),
    );
    expect(viewModel.publicSummaries.map((summary) => summary.id)).toEqual(
      viewModel.mapPins.map((pin) => pin.publicSummaryId),
    );
    expect(viewModel.publicSummaries[0]?.publicLocationLabel).toContain(
      "zona aproximada",
    );
  });

  it("uses a manual Bolivia location when device location is denied", async () => {
    const adapter = createStaticNearbyLostReportsAdapter({ reports });

    const result = await adapter.searchLostPetReports({
      location: manualLocation,
      radiusKm: 10,
    });

    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "denied", manualLocation },
      mode: "map",
      radiusKm: 10,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(viewModel.locationLabel).toBe("Zona Sur, La Paz");
    expect(viewModel.locationSourceLabel).toBe("Ubicacion manual en Bolivia");
    expect(viewModel.mode).toBe("map");
  });

  it("labels current, last detected, manual place, and manual map-pin searches in Bolivia", async () => {
    const searchLocations = [
      {
        expectedSourceLabel: "Ubicacion actual",
        location: {
          coordinates: { latitude: -16.5405, longitude: -68.0889 },
          countryCode: "BO",
          label: "Achumani, La Paz",
          locationCellLabel: "Achumani",
          source: "current",
        },
      },
      {
        expectedSourceLabel: "Ultima ubicacion detectada",
        location: {
          coordinates: { latitude: -16.5, longitude: -68.1193 },
          countryCode: "BO",
          label: "Zona Sur, La Paz",
          locationCellLabel: "Zona Sur",
          source: "last",
        },
      },
      {
        expectedSourceLabel: "Ubicacion manual en Bolivia",
        location: {
          countryCode: "BO",
          label: "Queru Queru, Cochabamba",
          locationCellLabel: "Queru Queru",
          manualLocationKind: "place",
          source: "manual",
        },
      },
      {
        expectedSourceLabel: "Pin manual en Bolivia",
        location: {
          coordinates: { latitude: -17.7833, longitude: -63.1821 },
          countryCode: "BO",
          label: "Pin en Equipetrol, Santa Cruz",
          locationCellLabel: "Equipetrol",
          manualLocationKind: "map-pin",
          source: "manual",
        },
      },
    ] satisfies {
      expectedSourceLabel: string;
      location: NearbySearchLocation;
    }[];
    const adapter = createStaticNearbyLostReportsAdapter({ reports });

    for (const { expectedSourceLabel, location } of searchLocations) {
      const result = await adapter.searchLostPetReports({
        location,
        radiusKm: 5,
      });

      const viewModel = buildNearbyLostReportsViewModel({
        locationState: { kind: "ready", location },
        mode: "list",
        radiusKm: 5,
        result: { kind: "success", value: result },
      });

      assertNearbyViewModelKind(viewModel, "ready");
      expect(result.searchBoundary.center.countryCode).toBe("BO");
      expect(result.searchBoundary.center.source).toBe(location.source);
      expect(viewModel.locationSourceLabel).toBe(expectedSourceLabel);
    }
  });

  it("shows a Spanish empty state when no nearby lost reports match the radius", async () => {
    const adapter = createStaticNearbyLostReportsAdapter({
      reports: reports.slice(1),
    });

    const result = await adapter.searchLostPetReports({
      location: manualLocation,
      radiusKm: 5,
    });

    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: manualLocation },
      mode: "list",
      radiusKm: 5,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "empty");
    expect(viewModel.title).toBe("No hay reportes cerca");
    expect(viewModel.message).toContain("mascotas perdidas");
    expect(viewModel.message).not.toContain("Lost Pet Reports");
  });

  it("marks stale cached results while preserving compact radius options", async () => {
    const adapter = createStaticNearbyLostReportsAdapter({
      isOffline: true,
      isStale: true,
      reports,
    });

    const result = await adapter.searchLostPetReports({
      location: manualLocation,
      radiusKm: 20,
    });

    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: manualLocation },
      mode: "list",
      radiusKm: 20,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(viewModel.offlineLabel).toBe("Sin conexion · resultados guardados");
    expect(viewModel.radiusOptionsKm).toEqual([5, 10, 20]);
    expect(viewModel.cards.map((card) => card.title)).toEqual([
      "Bruno",
      "Luna",
    ]);
  });

  it("shows a manual-search fallback when location is denied and no manual place is selected", () => {
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "denied" },
      mode: "list",
      radiusKm: 5,
      result: { kind: "loading" },
    });

    assertNearbyViewModelKind(viewModel, "location-denied");
    expect(viewModel.title).toBe("Ubicacion no disponible");
    expect(viewModel.manualLocationActionLabel).toBe(
      "Ingresar ubicacion manualmente",
    );
    expect(viewModel.message).toContain("Bolivia");
  });
});

function assertNearbyViewModelKind<
  K extends NearbyLostReportsViewModel["kind"],
>(
  viewModel: NearbyLostReportsViewModel,
  kind: K,
): asserts viewModel is Extract<NearbyLostReportsViewModel, { kind: K }> {
  expect(viewModel.kind).toBe(kind);
}
