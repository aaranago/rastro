import { describe, expect, it } from "vitest";

import type {
  LostPetReportSummary,
  NearbySearchLocation,
} from "./nearby-types";
import type { NearbyLostReportsViewModel } from "./nearby-view-model";
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
