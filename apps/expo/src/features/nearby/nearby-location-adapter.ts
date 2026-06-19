import type { NearbySearchLocation } from "./nearby-types";

export type NearbyLocationPermissionStatus =
  | "denied"
  | "granted"
  | "undetermined";

export interface NearbyLocationPermissionState {
  canAskAgain?: boolean;
  granted: boolean;
  status: NearbyLocationPermissionStatus;
}

export type NearbyForegroundLocationResult =
  | {
      kind: "available";
      location: NearbySearchLocation;
      permission: NearbyLocationPermissionState;
    }
  | {
      kind: "permission-required";
      permission: NearbyLocationPermissionState;
    }
  | {
      kind: "permission-denied";
      permission: NearbyLocationPermissionState;
    }
  | {
      kind: "unavailable";
      permission: NearbyLocationPermissionState;
      reason: "location-unavailable" | "outside-bolivia";
    };

export interface NearbyForegroundLocationOptions {
  lastKnownMaxAgeMs?: number;
  requestPermission?: boolean;
}

export interface NearbyLocationAdapter {
  resolveForegroundLocation: (
    options?: NearbyForegroundLocationOptions,
  ) => Promise<NearbyForegroundLocationResult>;
}

export interface NearbyLocationNativeBoundary {
  location: {
    accuracy?: {
      balanced?: unknown;
    };
    getCurrentPositionAsync: (
      options?: NativeLocationOptions,
    ) => Promise<NativeLocationObject>;
    getForegroundPermissionsAsync: () => Promise<NativePermissionResponse>;
    getLastKnownPositionAsync: (
      options?: NativeLastKnownLocationOptions,
    ) => Promise<NativeLocationObject | null>;
    requestForegroundPermissionsAsync: () => Promise<NativePermissionResponse>;
  };
}

export interface NativeLocationOptions {
  accuracy?: unknown;
}

export interface NativeLastKnownLocationOptions {
  maxAge?: number;
}

export interface NativePermissionResponse {
  canAskAgain?: boolean;
  granted: boolean;
  status: NearbyLocationPermissionStatus;
}

export interface NativeLocationObject {
  coords: {
    accuracy?: number | null;
    latitude: number;
    longitude: number;
  };
  timestamp: number;
}

export function createNearbyLocationAdapter(
  native: NearbyLocationNativeBoundary,
): NearbyLocationAdapter {
  return {
    async resolveForegroundLocation(options = {}) {
      const permission = await resolveForegroundLocationPermission(
        native,
        options,
      );

      if (!permission.granted) {
        return permission.status === "denied"
          ? { kind: "permission-denied", permission }
          : { kind: "permission-required", permission };
      }

      const resolved = await getCurrentOrLastKnownLocation(native, options);

      if (!resolved) {
        return {
          kind: "unavailable",
          permission,
          reason: "location-unavailable",
        };
      }

      const location = toNearbySearchLocation(resolved);

      if (!location) {
        return {
          kind: "unavailable",
          permission,
          reason: "outside-bolivia",
        };
      }

      return {
        kind: "available",
        location,
        permission,
      };
    },
  };
}

async function resolveForegroundLocationPermission(
  native: NearbyLocationNativeBoundary,
  options: NearbyForegroundLocationOptions,
): Promise<NearbyLocationPermissionState> {
  const existingPermission =
    await native.location.getForegroundPermissionsAsync();

  if (
    existingPermission.granted ||
    options.requestPermission !== true ||
    existingPermission.canAskAgain === false
  ) {
    return toPermissionState(existingPermission);
  }

  return toPermissionState(
    await native.location.requestForegroundPermissionsAsync(),
  );
}

function toPermissionState(
  response: NativePermissionResponse,
): NearbyLocationPermissionState {
  return {
    canAskAgain: response.canAskAgain,
    granted: response.granted,
    status: response.status,
  };
}

async function getCurrentOrLastKnownLocation(
  native: NearbyLocationNativeBoundary,
  options: NearbyForegroundLocationOptions,
): Promise<{
  location: NativeLocationObject;
  source: "current" | "last";
} | null> {
  try {
    return {
      location: await native.location.getCurrentPositionAsync({
        accuracy: native.location.accuracy?.balanced,
      }),
      source: "current",
    };
  } catch {
    const lastKnownLocation = await native.location.getLastKnownPositionAsync({
      maxAge: options.lastKnownMaxAgeMs ?? 30 * 60 * 1000,
    });

    return lastKnownLocation
      ? { location: lastKnownLocation, source: "last" }
      : null;
  }
}

function toNearbySearchLocation({
  location,
  source,
}: {
  location: NativeLocationObject;
  source: NearbySearchLocation["source"];
}): NearbySearchLocation | undefined {
  const coordinates = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };

  if (!isBoliviaCoordinate(coordinates)) {
    return undefined;
  }

  const cell = findNearestBoliviaLocationCell(coordinates);

  return {
    coordinates,
    countryCode: "BO",
    label: cell.label,
    locationCellLabel: cell.locationCellLabel,
    source,
  };
}

function isBoliviaCoordinate(coordinates: {
  latitude: number;
  longitude: number;
}) {
  return (
    Number.isFinite(coordinates.latitude) &&
    Number.isFinite(coordinates.longitude) &&
    coordinates.latitude >= -23 &&
    coordinates.latitude <= -9 &&
    coordinates.longitude >= -70 &&
    coordinates.longitude <= -57
  );
}

function findNearestBoliviaLocationCell(coordinates: {
  latitude: number;
  longitude: number;
}) {
  return knownBoliviaLocationCells.reduce((nearest, candidate) => {
    const nearestDistance = squaredDistance(coordinates, nearest.coordinates);
    const candidateDistance = squaredDistance(
      coordinates,
      candidate.coordinates,
    );

    return candidateDistance < nearestDistance ? candidate : nearest;
  });
}

function squaredDistance(
  left: { latitude: number; longitude: number },
  right: { latitude: number; longitude: number },
) {
  return (
    (left.latitude - right.latitude) ** 2 +
    (left.longitude - right.longitude) ** 2
  );
}

const knownBoliviaLocationCells = [
  {
    coordinates: { latitude: -16.5, longitude: -68.1193 },
    label: "Zona Sur, La Paz",
    locationCellLabel: "Zona Sur",
  },
  {
    coordinates: { latitude: -16.5103, longitude: -68.1299 },
    label: "Sopocachi, La Paz",
    locationCellLabel: "Sopocachi",
  },
  {
    coordinates: { latitude: -16.5405, longitude: -68.0889 },
    label: "Achumani, La Paz",
    locationCellLabel: "Achumani",
  },
  {
    coordinates: { latitude: -17.3895, longitude: -66.1568 },
    label: "Queru Queru, Cochabamba",
    locationCellLabel: "Queru Queru",
  },
  {
    coordinates: { latitude: -17.7833, longitude: -63.1821 },
    label: "Equipetrol, Santa Cruz",
    locationCellLabel: "Equipetrol",
  },
] as const;
