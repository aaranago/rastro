import type { NearbySearchLocation } from "./nearby-types";

const nearbyBoliviaLocations = {
  current: {
    coordinates: { latitude: -16.5405, longitude: -68.0889 },
    countryCode: "BO",
    label: "Achumani, La Paz",
    locationCellLabel: "Achumani",
    source: "current",
  },
  lastDetected: {
    coordinates: { latitude: -16.5, longitude: -68.1193 },
    countryCode: "BO",
    label: "Zona Sur, La Paz",
    locationCellLabel: "Zona Sur",
    source: "last",
  },
  manualZonaSur: {
    coordinates: { latitude: -16.5, longitude: -68.1193 },
    countryCode: "BO",
    label: "Zona Sur, La Paz",
    locationCellLabel: "Zona Sur",
    manualLocationKind: "place",
    source: "manual",
  },
  manualSopocachi: {
    coordinates: { latitude: -16.5103, longitude: -68.1299 },
    countryCode: "BO",
    label: "Sopocachi, La Paz",
    locationCellLabel: "Sopocachi",
    manualLocationKind: "place",
    source: "manual",
  },
  manualCochabamba: {
    coordinates: { latitude: -17.3895, longitude: -66.1568 },
    countryCode: "BO",
    label: "Queru Queru, Cochabamba",
    locationCellLabel: "Queru Queru",
    manualLocationKind: "place",
    source: "manual",
  },
  manualMapPin: {
    countryCode: "BO",
    label: "Elegir punto en el mapa",
    locationCellLabel: "Punto elegido",
    manualLocationKind: "map-pin",
    source: "manual",
  },
} satisfies Record<string, NearbySearchLocation>;

export const nearbyManualLocationOptions = [
  nearbyBoliviaLocations.manualZonaSur,
  nearbyBoliviaLocations.manualSopocachi,
  nearbyBoliviaLocations.manualCochabamba,
  nearbyBoliviaLocations.manualMapPin,
] as const;
