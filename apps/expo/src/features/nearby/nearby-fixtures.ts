import {
  buildPublicAdoptionListingShareTarget,
  buildPublicLostReportShareTarget,
} from "@acme/validators";

import type {
  AdoptionListingSummary,
  LostPetReportSummary,
  NearbyLostReportsQuery,
  NearbySearchLocation,
  SightingReportSummary,
} from "./nearby-types";
import { createInMemoryLastLoadedCache } from "../resilience/last-loaded-cache";
import { createCachedNearbyLostReportsAdapter } from "./nearby-stale-cache-adapter";
import { createStaticNearbyLostReportsAdapter } from "./nearby-static-adapter";

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
  manualSantaCruz: {
    coordinates: { latitude: -17.7833, longitude: -63.1821 },
    countryCode: "BO",
    label: "Pin en Equipetrol, Santa Cruz",
    locationCellLabel: "Equipetrol",
    manualLocationKind: "map-pin",
    source: "manual",
  },
} satisfies Record<string, NearbySearchLocation>;

export const nearbyManualLocationOptions = [
  nearbyBoliviaLocations.manualZonaSur,
  nearbyBoliviaLocations.manualSopocachi,
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
    shareTarget: buildFixtureShareTarget("lost-bruno-achumani", "Bruno"),
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
    shareTarget: buildFixtureShareTarget("lost-nina-irpavi", "Nina"),
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
    shareTarget: buildFixtureShareTarget("lost-coco-calacoto", "Coco"),
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
    shareTarget: buildFixtureShareTarget("lost-toby-mallasa", "Toby"),
    sex: "Macho",
    species: "Perro",
  },
] satisfies LostPetReportSummary[];

const nearbySightingReportFixtures = [
  {
    breed: "Mestizo",
    direction: "Caminaba hacia la avenida Ballivian.",
    distanceMeters: 1_100,
    id: "sighting-dog-calacoto",
    locationCellLabel: "Calacoto",
    observedAtLabel: "Hace 25 min",
    observedCondition: "Asustado, sin heridas visibles.",
    photoUrl:
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=80",
    publicLocation: { kind: "approximate" },
    reportKind: "sighting-report",
    shareTarget: buildSightingFixtureShareTarget(
      "sighting-dog-calacoto",
      "Perro",
    ),
    sightingSummary:
      "Fue visto cruzando cerca de una plaza. No se dejo acercar ni asegurar.",
    species: "Perro",
    title: "Avistamiento de perro",
  },
] satisfies SightingReportSummary[];

const nearbyAdoptionListingFixtures = [
  {
    adoptionSummary:
      "Nala busca un hogar tranquilo donde reciba tiempo, cuidado y carino.",
    breed: "Mestizo",
    distanceMeters: 3_100,
    healthNotes: "Vacunada y desparasitada.",
    id: "adoption-nala-sopocachi",
    idealHome: "Familia paciente y ambiente seguro.",
    locationCellLabel: "Sopocachi",
    petName: "Nala",
    photoUrl: "file:///adoption-nala-thumb.jpg",
    publicLocation: { kind: "approximate" },
    publishedAtLabel: "Hoy",
    reportKind: "adoption-listing",
    shareTarget: buildAdoptionFixtureShareTarget(
      "adoption-nala-sopocachi",
      "Nala",
    ),
    species: "Gato",
    verificationBadge: {
      label: "Organizacion verificada",
      visible: true,
    },
  },
] satisfies AdoptionListingSummary[];

function buildFixtureShareTarget(reportId: string, title: string) {
  return buildPublicLostReportShareTarget({
    publicWebBaseUrl: "https://rastro.bo",
    reportId,
    title,
  });
}

function buildSightingFixtureShareTarget(reportId: string, title: string) {
  const path = `/reportes/avistamientos/${encodeURIComponent(reportId)}`;
  const webUrl = `https://rastro.bo${path}`;

  return {
    appDeepLink: `rastro://${path.replace(/^\//, "")}`,
    message: `Avistamiento de ${title} en Rastro: ${webUrl}`,
    path,
    title: `Avistamiento de mascota: ${title}`,
    webUrl,
  };
}

function buildAdoptionFixtureShareTarget(listingId: string, title: string) {
  return buildPublicAdoptionListingShareTarget({
    listingId,
    publicWebBaseUrl: "https://rastro.bo",
    title,
  });
}

const defaultStaticNearbyLostReportsAdapter =
  createStaticNearbyLostReportsAdapter({
    generatedAt: "2026-06-17T00:00:00.000Z",
    reports: [
      ...nearbyLostReportFixtures,
      ...nearbySightingReportFixtures,
      ...nearbyAdoptionListingFixtures,
    ],
  });

export const defaultNearbyLostReportsAdapter =
  createCachedNearbyLostReportsAdapter({
    cache: createInMemoryLastLoadedCache(),
    cacheKey: buildNearbyLostReportsCacheKey,
    source: defaultStaticNearbyLostReportsAdapter,
  });

function buildNearbyLostReportsCacheKey(query: NearbyLostReportsQuery) {
  const coordinate = query.location.coordinates
    ? `${query.location.coordinates.latitude.toFixed(5)},${query.location.coordinates.longitude.toFixed(5)}`
    : "no-coordinate";

  return [
    "nearby-lost-reports",
    query.radiusKm,
    query.categories?.join(",") ?? "all-categories",
    query.limit ?? "no-limit",
    query.cursor ?? "no-cursor",
    query.location.source,
    query.location.label,
    query.location.locationCellLabel,
    coordinate,
  ].join(":");
}
