import { describe, expect, it, vi } from "vitest";

import type { NearbyLocationAdapter } from "../nearby/nearby-location-adapter";
import { boliviaDepartmentLocationOptions } from "../nearby/nearby-locations";
import { createReportLocationPickerAdapter } from "./report-location-picker-adapter";

describe("Report location picker adapter", () => {
  it("does not resolve or request foreground location when constructed", () => {
    const nearbyLocationAdapter = createNearbyLocationAdapterBoundary();

    createReportLocationPickerAdapter(nearbyLocationAdapter);

    expect(
      nearbyLocationAdapter.resolveForegroundLocation,
    ).not.toHaveBeenCalled();
  });

  it("converts coordinate-bearing nearby locations into report location drafts", () => {
    const pickerAdapter = createReportLocationPickerAdapter(
      createNearbyLocationAdapterBoundary(),
    );

    expect(
      pickerAdapter.selectLocation({
        coordinates: { latitude: -19.0196, longitude: -65.2619 },
        countryCode: "BO",
        department: "Chuquisaca",
        label: "Sucre",
        locationCellLabel: "Sucre",
        municipality: "Sucre",
        source: "manual",
      }),
    ).toEqual({
      kind: "selected",
      location: {
        addressLabel: "Sucre",
        coordinates: { latitude: -19.0196, longitude: -65.2619 },
        department: "Chuquisaca",
        locationCellLabel: "Sucre",
        municipality: "Sucre",
      },
    });
  });

  it("resolves current location only through an explicit permission-requesting action", async () => {
    const nearbyLocationAdapter = createNearbyLocationAdapterBoundary();
    nearbyLocationAdapter.resolveForegroundLocation.mockResolvedValueOnce({
      kind: "available",
      location: {
        coordinates: { latitude: -17.3895, longitude: -66.1568 },
        countryCode: "BO",
        department: "Cochabamba",
        label: "Cochabamba",
        locationCellLabel: "Cochabamba",
        municipality: "Cochabamba",
        source: "current",
      },
      permission: {
        granted: true,
        status: "granted",
      },
    });
    const pickerAdapter = createReportLocationPickerAdapter(
      nearbyLocationAdapter,
    );

    await expect(pickerAdapter.resolveCurrentLocation()).resolves.toEqual({
      kind: "selected",
      location: {
        addressLabel: "Cochabamba",
        coordinates: { latitude: -17.3895, longitude: -66.1568 },
        department: "Cochabamba",
        locationCellLabel: "Cochabamba",
        municipality: "Cochabamba",
      },
    });
    expect(
      nearbyLocationAdapter.resolveForegroundLocation,
    ).toHaveBeenCalledWith({ requestPermission: true });
  });

  it("accepts every Bolivia department manual option as a report location", () => {
    const pickerAdapter = createReportLocationPickerAdapter(
      createNearbyLocationAdapterBoundary(),
    );

    for (const option of boliviaDepartmentLocationOptions) {
      expect(pickerAdapter.selectLocation(option)).toMatchObject({
        kind: "selected",
        location: {
          department: option.department,
          locationCellLabel: option.locationCellLabel,
          municipality: option.municipality,
        },
      });
    }
  });

  it("keeps coordinate-less manual map options recoverable until a pin is selected", () => {
    const pickerAdapter = createReportLocationPickerAdapter(
      createNearbyLocationAdapterBoundary(),
    );

    expect(
      pickerAdapter.selectLocation({
        countryCode: "BO",
        label: "Elegir punto en el mapa",
        locationCellLabel: "Punto elegido",
        manualLocationKind: "map-pin",
        source: "manual",
      }),
    ).toEqual({
      kind: "recoverable",
      message:
        "Elige un punto en el mapa o una zona con coordenadas para continuar.",
      title: "Falta elegir un punto",
    });
  });

  it("keeps out-of-Bolivia manual map pins recoverable", () => {
    const pickerAdapter = createReportLocationPickerAdapter(
      createNearbyLocationAdapterBoundary(),
    );

    expect(
      pickerAdapter.selectLocation({
        coordinates: { latitude: -34.6037, longitude: -58.3816 },
        countryCode: "BO",
        label: "Pin manual -34.6037, -58.3816",
        locationCellLabel: "Punto elegido",
        manualLocationKind: "map-pin",
        source: "manual",
      }),
    ).toEqual({
      kind: "recoverable",
      message:
        "Elige una ubicacion dentro de Bolivia para continuar con el reporte.",
      title: "Elige una ubicacion en Bolivia",
    });
  });

  it("keeps manual map pins inside the bounding box but outside Bolivia recoverable", () => {
    const pickerAdapter = createReportLocationPickerAdapter(
      createNearbyLocationAdapterBoundary(),
    );

    expect(
      pickerAdapter.selectLocation({
        coordinates: { latitude: -18.0066, longitude: -70.2463 },
        countryCode: "BO",
        label: "Tacna, Peru",
        locationCellLabel: "Tacna",
        manualLocationKind: "map-pin",
        source: "manual",
      }),
    ).toEqual({
      kind: "recoverable",
      message:
        "Elige una ubicacion dentro de Bolivia para continuar con el reporte.",
      title: "Elige una ubicacion en Bolivia",
    });
  });

  it("turns denied and unavailable current-location results into manual fallback copy", async () => {
    const deniedNearbyLocationAdapter = createNearbyLocationAdapterBoundary();
    deniedNearbyLocationAdapter.resolveForegroundLocation.mockResolvedValueOnce(
      {
        kind: "permission-denied",
        permission: {
          canAskAgain: false,
          granted: false,
          status: "denied",
        },
      },
    );

    await expect(
      createReportLocationPickerAdapter(
        deniedNearbyLocationAdapter,
      ).resolveCurrentLocation(),
    ).resolves.toEqual({
      kind: "recoverable",
      message:
        "No tenemos permiso para usar tu ubicacion. Puedes elegir una ciudad, un departamento o un punto manual.",
      title: "Permiso de ubicacion denegado",
    });

    const unavailableNearbyLocationAdapter =
      createNearbyLocationAdapterBoundary();
    unavailableNearbyLocationAdapter.resolveForegroundLocation.mockResolvedValueOnce(
      {
        kind: "unavailable",
        permission: {
          granted: true,
          status: "granted",
        },
        reason: "outside-bolivia",
      },
    );

    await expect(
      createReportLocationPickerAdapter(
        unavailableNearbyLocationAdapter,
      ).resolveCurrentLocation(),
    ).resolves.toEqual({
      kind: "recoverable",
      message:
        "No pudimos ubicarte dentro de Bolivia. Puedes elegir una ciudad, un departamento o un punto manual.",
      title: "Elige una ubicacion manual",
    });
  });
});

function createNearbyLocationAdapterBoundary() {
  return {
    resolveForegroundLocation: vi.fn<
      NearbyLocationAdapter["resolveForegroundLocation"]
    >(() => {
      throw new Error("Current location was not requested.");
    }),
  };
}
