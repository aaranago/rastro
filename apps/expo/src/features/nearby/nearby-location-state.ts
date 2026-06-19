import type { NearbyForegroundLocationResult } from "./nearby-location-adapter";
import type {
  NearbyLocationState,
  NearbyLostReportsQuery,
  NearbyPublicReportKind,
  NearbyRadiusKm,
  NearbySearchLocation,
} from "./nearby-types";

export function toNearbyLocationState(
  result: NearbyForegroundLocationResult,
): NearbyLocationState {
  if (result.kind === "available") {
    return {
      kind: "ready",
      location: result.location,
    };
  }

  if (result.kind === "permission-denied") {
    return { kind: "denied" };
  }

  if (result.kind === "unavailable") {
    return { kind: "unavailable" };
  }

  return { kind: "not-requested" };
}

export function buildNearbySearchQuery({
  categories,
  locationState,
  radiusKm,
}: {
  categories?: readonly NearbyPublicReportKind[];
  locationState: NearbyLocationState;
  radiusKm: NearbyRadiusKm;
}): NearbyLostReportsQuery | undefined {
  const location = getNearbySearchLocation(locationState);

  if (!location) {
    return undefined;
  }

  return {
    categories,
    location,
    radiusKm,
  };
}

export function applyManualNearbySearchLocation(
  location: NearbySearchLocation,
): NearbyLocationState {
  return {
    kind: "ready",
    location,
  };
}

export function getNearbySearchLocation(
  locationState: NearbyLocationState,
): NearbySearchLocation | undefined {
  if (locationState.kind === "ready") {
    return locationState.location;
  }

  if (locationState.kind === "denied" || locationState.kind === "unavailable") {
    return locationState.manualLocation;
  }

  return undefined;
}

export function getNearbyManualLocationOptionLabel(
  location: NearbySearchLocation,
) {
  if (location.manualLocationKind === "map-pin") {
    return "Elegir punto en el mapa";
  }

  return location.label;
}
