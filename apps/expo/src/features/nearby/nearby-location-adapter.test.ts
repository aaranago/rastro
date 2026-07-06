import { describe, expect, it, vi } from "vitest";

import { createNearbyLocationAdapter } from "./nearby-location-adapter";
import {
  applyManualNearbySearchLocation,
  buildNearbySearchQuery,
  getNearbyManualLocationOptionLabel,
  toNearbyLocationState,
} from "./nearby-location-state";
import {
  boliviaDepartmentLocationOptions,
  nearbyManualLocationOptions,
} from "./nearby-locations";

describe("Nearby foreground location adapter", () => {
  it("resolves explicit foreground location actions from current or last-known coordinates without watchers", async () => {
    const native = createNativeBoundary();
    native.location.getCurrentPositionAsync.mockResolvedValueOnce({
      coords: {
        accuracy: 25,
        latitude: -16.5002,
        longitude: -68.1195,
      },
      timestamp: Date.parse("2026-06-18T12:01:00.000Z"),
    });
    const adapter = createNearbyLocationAdapter(native);

    const current = await adapter.resolveForegroundLocation({
      requestPermission: true,
    });

    expect(current).toMatchObject({
      kind: "available",
      location: {
        coordinates: {
          latitude: -16.5002,
          longitude: -68.1195,
        },
        countryCode: "BO",
        department: "La Paz",
        label: "La Paz",
        locationCellLabel: "La Paz",
        municipality: "La Paz",
        source: "current",
      },
    });
    expect(native.location.getForegroundPermissionsAsync).toHaveBeenCalledTimes(
      1,
    );
    expect(
      native.location.requestForegroundPermissionsAsync,
    ).not.toHaveBeenCalled();
    expect(native.location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    expect(native.location.watchPositionAsync).not.toHaveBeenCalled();
    expect(
      native.location.requestBackgroundPermissionsAsync,
    ).not.toHaveBeenCalled();
    expect(native.location.startLocationUpdatesAsync).not.toHaveBeenCalled();

    native.location.getCurrentPositionAsync.mockRejectedValueOnce(
      new Error("GPS timeout"),
    );
    native.location.getLastKnownPositionAsync.mockResolvedValueOnce({
      coords: {
        accuracy: 65,
        latitude: -17.3896,
        longitude: -66.1568,
      },
      timestamp: Date.parse("2026-06-18T12:00:00.000Z"),
    });

    const lastKnown = await adapter.resolveForegroundLocation({
      requestPermission: true,
    });

    expect(lastKnown).toMatchObject({
      kind: "available",
      location: {
        coordinates: {
          latitude: -17.3896,
          longitude: -66.1568,
        },
        countryCode: "BO",
        department: "Cochabamba",
        label: "Cochabamba",
        locationCellLabel: "Cochabamba",
        municipality: "Cochabamba",
        source: "last",
      },
    });
    expect(native.location.getLastKnownPositionAsync).toHaveBeenCalledWith({
      maxAge: 30 * 60 * 1000,
    });
    expect(native.location.watchPositionAsync).not.toHaveBeenCalled();
    expect(native.location.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it("turns an explicit foreground result into the Cerca search query state", async () => {
    const native = createNativeBoundary();
    native.location.getCurrentPositionAsync.mockResolvedValueOnce({
      coords: {
        accuracy: 25,
        latitude: -16.5002,
        longitude: -68.1195,
      },
      timestamp: Date.parse("2026-06-18T12:01:00.000Z"),
    });
    const adapter = createNearbyLocationAdapter(native);

    const result = await adapter.resolveForegroundLocation({
      requestPermission: true,
    });
    const locationState = toNearbyLocationState(result);
    const query = buildNearbySearchQuery({
      categories: ["lost-pet-report"],
      locationState,
      radiusKm: 5,
    });

    expect(locationState).toMatchObject({
      kind: "ready",
      location: {
        label: "La Paz",
        source: "current",
      },
    });
    expect(query).toMatchObject({
      location: {
        label: "La Paz",
        source: "current",
      },
      radiusKm: 5,
      categories: ["lost-pet-report"],
    });
  });

  it("keeps denied or unavailable device location usable through manual Bolivia place selection", async () => {
    const deniedNative = createNativeBoundary({
      foregroundLocationPermission: {
        canAskAgain: false,
        granted: false,
        status: "denied",
      },
    });
    const deniedAdapter = createNearbyLocationAdapter(deniedNative);

    const deniedState = toNearbyLocationState(
      await deniedAdapter.resolveForegroundLocation({
        requestPermission: true,
      }),
    );

    expect(deniedState).toEqual({ kind: "denied" });
    expect(
      deniedNative.location.getCurrentPositionAsync,
    ).not.toHaveBeenCalled();
    expect(
      buildNearbySearchQuery({ locationState: deniedState, radiusKm: 5 }),
    ).toBeUndefined();

    const unavailableNative = createNativeBoundary();
    unavailableNative.location.getCurrentPositionAsync.mockRejectedValueOnce(
      new Error("GPS unavailable"),
    );
    unavailableNative.location.getLastKnownPositionAsync.mockResolvedValueOnce(
      null,
    );
    const unavailableAdapter = createNearbyLocationAdapter(unavailableNative);

    const unavailableState = toNearbyLocationState(
      await unavailableAdapter.resolveForegroundLocation({
        requestPermission: true,
      }),
    );

    expect(unavailableState).toEqual({ kind: "unavailable" });

    expect(
      boliviaDepartmentLocationOptions.map((option) => option.department),
    ).toEqual([
      "La Paz",
      "Santa Cruz",
      "Cochabamba",
      "Chuquisaca",
      "Tarija",
      "Oruro",
      "Potosí",
      "Beni",
      "Pando",
    ]);
    expect(
      nearbyManualLocationOptions.map(getNearbyManualLocationOptionLabel),
    ).toEqual([
      "La Paz",
      "Santa Cruz de la Sierra",
      "Cochabamba",
      "Sucre",
      "Tarija",
      "Oruro",
      "Potosí",
      "Trinidad",
      "Cobija",
      "Elegir punto en el mapa",
    ]);

    const selectedManualLocation = nearbyManualLocationOptions.find(
      (option) => option.label === "Santa Cruz de la Sierra",
    );

    if (!selectedManualLocation) {
      throw new Error("Expected Santa Cruz manual location option.");
    }

    const manualState = applyManualNearbySearchLocation(selectedManualLocation);
    const manualQuery = buildNearbySearchQuery({
      locationState: manualState,
      radiusKm: 10,
    });

    expect(manualState).toMatchObject({
      kind: "ready",
      location: {
        countryCode: "BO",
        department: "Santa Cruz",
        label: "Santa Cruz de la Sierra",
        locationCellLabel: "Santa Cruz de la Sierra",
        manualLocationKind: "place",
        municipality: "Santa Cruz de la Sierra",
        source: "manual",
      },
    });
    expect(manualQuery).toMatchObject({
      location: {
        label: "Santa Cruz de la Sierra",
        source: "manual",
      },
      radiusKm: 10,
    });
  });
});

function createNativeBoundary({
  foregroundLocationPermission = {
    canAskAgain: true,
    granted: true,
    status: "granted",
  },
}: {
  foregroundLocationPermission?: {
    canAskAgain?: boolean;
    granted: boolean;
    status: "denied" | "granted" | "undetermined";
  };
} = {}) {
  return {
    location: {
      accuracy: {
        balanced: "balanced",
      },
      getCurrentPositionAsync: vi.fn(),
      getForegroundPermissionsAsync: vi.fn(() =>
        Promise.resolve(foregroundLocationPermission),
      ),
      getLastKnownPositionAsync: vi.fn(),
      requestBackgroundPermissionsAsync: vi.fn(),
      requestForegroundPermissionsAsync: vi.fn(),
      startLocationUpdatesAsync: vi.fn(),
      watchPositionAsync: vi.fn(),
    },
  };
}
