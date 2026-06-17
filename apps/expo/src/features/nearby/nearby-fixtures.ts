import type {
  LostPetReportSummary,
  NearbySearchLocation,
} from "./nearby-types";
import { createStaticNearbyLostReportsAdapter } from "./nearby-static-adapter";

export const nearbyBoliviaLocations = {
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
  manualCochabamba: {
    coordinates: { latitude: -17.3895, longitude: -66.1568 },
    countryCode: "BO",
    label: "Queru Queru, Cochabamba",
    locationCellLabel: "Queru Queru",
    source: "manual",
  },
  manualSantaCruz: {
    coordinates: { latitude: -17.7833, longitude: -63.1821 },
    countryCode: "BO",
    label: "Equipetrol, Santa Cruz",
    locationCellLabel: "Equipetrol",
    source: "manual",
  },
} satisfies Record<string, NearbySearchLocation>;

export const nearbyManualLocationOptions = [
  nearbyBoliviaLocations.lastDetected,
  nearbyBoliviaLocations.manualCochabamba,
  nearbyBoliviaLocations.manualSantaCruz,
] as const;

export const nearbyLostReportFixtures = [
  {
    alertPriority: "urgent",
    breed: "Golden Retriever",
    distanceMeters: 300,
    id: "lost-bruno-achumani",
    lastSeenAtLabel: "Hace 40 min",
    lastSeenSummary:
      "Lleva collar azul con plaquita. Fue visto cerca del parque central.",
    locationCellLabel: "Achumani",
    petName: "Bruno",
    photoUrl:
      "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=80",
    publicLocation: { kind: "approximate" },
    sex: "Macho",
    species: "Perro",
  },
  {
    alertPriority: "standard",
    breed: "Criollo",
    distanceMeters: 2_400,
    id: "lost-nina-irpavi",
    lastSeenAtLabel: "Hace 2 h",
    lastSeenSummary:
      "Es pequena y nerviosa. Su cuidadora pide avisar si alguien la ve.",
    locationCellLabel: "Irpavi",
    petName: "Nina",
    photoUrl:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=900&q=80",
    publicLocation: { kind: "approximate" },
    sex: "Hembra",
    species: "Perro",
  },
  {
    alertPriority: "standard",
    breed: "Mestizo",
    distanceMeters: 8_700,
    id: "lost-coco-calacoto",
    lastSeenAtLabel: "Ayer",
    lastSeenSummary:
      "Responde a Coco. Puede acercarse si le ofrecen comida con calma.",
    locationCellLabel: "Calacoto",
    petName: "Coco",
    photoUrl:
      "https://images.unsplash.com/photo-1561037404-61cd46aa615b?auto=format&fit=crop&w=900&q=80",
    publicLocation: { kind: "approximate" },
    sex: "Macho",
    species: "Perro",
  },
  {
    alertPriority: "standard",
    breed: "Pastor mix",
    distanceMeters: 15_800,
    id: "lost-toby-mallasa",
    lastSeenAtLabel: "Hace 3 dias",
    lastSeenSummary:
      "Se alejo durante una visita familiar. Tiene una mancha blanca en el pecho.",
    locationCellLabel: "Mallasa",
    petName: "Toby",
    photoUrl:
      "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=900&q=80",
    publicLocation: { kind: "approximate" },
    sex: "Macho",
    species: "Perro",
  },
] satisfies LostPetReportSummary[];

export const defaultNearbyLostReportsAdapter =
  createStaticNearbyLostReportsAdapter({
    generatedAt: "2026-06-17T00:00:00.000Z",
    reports: nearbyLostReportFixtures,
  });
