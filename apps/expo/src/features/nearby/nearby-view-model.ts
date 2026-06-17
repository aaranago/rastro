import type {
  LostPetReportSummary,
  NearbyBrowseMode,
  NearbyLocationState,
  NearbyLostReportsResult,
  NearbyRadiusKm,
  NearbySearchLocation,
} from "./nearby-types";
import { nearbyRadiusOptionsKm } from "./nearby-types";

export type NearbyLostReportsLoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success"; value: NearbyLostReportsResult };

export interface NearbyLostReportsViewModelInput {
  locationState: NearbyLocationState;
  mode: NearbyBrowseMode;
  radiusKm: NearbyRadiusKm;
  result: NearbyLostReportsLoadState;
}

export interface NearbyLostReportCardViewModel {
  id: string;
  title: string;
  subtitle: string;
  photoUrl?: string;
  distanceLabel?: string;
  publicLocationLabel: string;
  lastSeenAtLabel: string;
  summary: string;
  priorityLabel: string;
}

export interface NearbyLostReportMapPinViewModel {
  id: string;
  title: string;
  label: string;
  distanceLabel?: string;
}

export interface NearbyUrgentLostPetAlertViewModel {
  title: string;
  message: string;
  reportId: string;
}

interface NearbyViewModelBase {
  mode: NearbyBrowseMode;
  radiusKm: NearbyRadiusKm;
  radiusOptionsKm: readonly NearbyRadiusKm[];
}

export type NearbyLostReportsViewModel =
  | (NearbyViewModelBase & {
      kind: "location-denied";
      title: string;
      message: string;
      manualLocationActionLabel: string;
    })
  | (NearbyViewModelBase & {
      kind: "loading";
      title: string;
      locationLabel: string;
      locationSourceLabel: string;
    })
  | (NearbyViewModelBase & {
      kind: "error";
      title: string;
      message: string;
      retryLabel: string;
    })
  | (NearbyViewModelBase & {
      kind: "empty";
      title: string;
      message: string;
      locationLabel: string;
      locationSourceLabel: string;
      radiusActionLabel: string;
    })
  | (NearbyViewModelBase & {
      kind: "ready";
      title: string;
      locationLabel: string;
      locationSourceLabel: string;
      offlineLabel?: string;
      urgentAlert?: NearbyUrgentLostPetAlertViewModel;
      cards: NearbyLostReportCardViewModel[];
      mapPins: NearbyLostReportMapPinViewModel[];
    });

export function buildNearbyLostReportsViewModel(
  input: NearbyLostReportsViewModelInput,
): NearbyLostReportsViewModel {
  const base: NearbyViewModelBase = {
    mode: input.mode,
    radiusKm: input.radiusKm,
    radiusOptionsKm: nearbyRadiusOptionsKm,
  };
  const location = resolveLocation(input.locationState);

  if (!location) {
    return {
      ...base,
      kind: "location-denied",
      manualLocationActionLabel: "Ingresar ubicacion manualmente",
      message:
        "Usa una ciudad, zona o pin manual en Bolivia para ver reportes cercanos.",
      title: "Ubicacion no disponible",
    };
  }

  if (input.result.kind === "loading") {
    return {
      ...base,
      kind: "loading",
      locationLabel: location.label,
      locationSourceLabel: formatLocationSource(location),
      title: "Buscando mascotas perdidas cerca de ti",
    };
  }

  if (input.result.kind === "error") {
    return {
      ...base,
      kind: "error",
      message: input.result.message,
      retryLabel: "Reintentar",
      title: "No pudimos cargar Cerca",
    };
  }

  const cards = input.result.value.reports.map(toLostReportCard);

  if (cards.length === 0) {
    return {
      ...base,
      kind: "empty",
      locationLabel: location.label,
      locationSourceLabel: formatLocationSource(location),
      message:
        "No hay reportes de mascotas perdidas en este radio. Prueba ampliando la busqueda.",
      radiusActionLabel: "Cambiar radio",
      title: "No hay reportes cerca",
    };
  }

  return {
    ...base,
    cards,
    kind: "ready",
    locationLabel: location.label,
    locationSourceLabel: formatLocationSource(location),
    mapPins: input.result.value.reports.map(toMapPin),
    offlineLabel: buildOfflineLabel(input.result.value),
    title: "Mascotas perdidas cerca de ti",
    urgentAlert: buildUrgentAlert(input.result.value.reports),
  };
}

function resolveLocation(
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

function formatLocationSource(location: NearbySearchLocation) {
  if (location.source === "current") {
    return "Ubicacion actual";
  }

  if (location.source === "last") {
    return "Ultima ubicacion detectada";
  }

  return "Ubicacion manual en Bolivia";
}

function toLostReportCard(
  report: LostPetReportSummary,
): NearbyLostReportCardViewModel {
  return {
    distanceLabel: formatDistance(report.distanceMeters),
    id: report.id,
    lastSeenAtLabel: report.lastSeenAtLabel,
    photoUrl: report.photoUrl,
    priorityLabel: "Perdido",
    publicLocationLabel: formatPublicLocation(report),
    subtitle: [report.breed, report.sex].filter(Boolean).join(" • "),
    summary: report.lastSeenSummary,
    title: report.petName,
  };
}

function toMapPin(
  report: LostPetReportSummary,
): NearbyLostReportMapPinViewModel {
  return {
    distanceLabel: formatDistance(report.distanceMeters),
    id: report.id,
    label: report.locationCellLabel,
    title: report.petName,
  };
}

function formatPublicLocation(report: LostPetReportSummary) {
  if (report.publicLocation.kind === "exact") {
    return report.publicLocation.label;
  }

  return `${report.locationCellLabel} · zona aproximada`;
}

function formatDistance(distanceMeters: number | undefined) {
  if (distanceMeters === undefined) {
    return undefined;
  }

  if (distanceMeters < 1000) {
    return `a ${Math.round(distanceMeters)} m`;
  }

  const kilometers = distanceMeters / 1000;
  return `a ${kilometers.toFixed(kilometers >= 10 ? 0 : 1)} km`;
}

function buildUrgentAlert(
  reports: LostPetReportSummary[],
): NearbyUrgentLostPetAlertViewModel | undefined {
  const urgent = reports.find((report) => report.alertPriority === "urgent");

  if (!urgent) {
    return undefined;
  }

  return {
    message: `${urgent.petName} fue visto ${urgent.distanceMeters ? formatDistance(urgent.distanceMeters) : "cerca"}.`,
    reportId: urgent.id,
    title: "Alerta activa",
  };
}

function buildOfflineLabel(result: NearbyLostReportsResult) {
  if (result.isOffline && result.isStale) {
    return "Sin conexion · resultados guardados";
  }

  if (result.isOffline) {
    return "Sin conexion";
  }

  if (result.isStale) {
    return "Resultados guardados";
  }

  return undefined;
}
