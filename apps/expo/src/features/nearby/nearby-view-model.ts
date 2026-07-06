import type {
  ReportLifecycleSummaryViewModel,
  ReportUrgency,
} from "../reports/report-lifecycle-view-model";
import type { NearbyReportRouteTarget } from "./nearby-navigation";
import type {
  LostPetReportSummary,
  NearbyBrowseAudience,
  NearbyBrowseMode,
  NearbyCoordinates,
  NearbyLocationState,
  NearbyLostReportsResult,
  NearbyPublicReportKind,
  NearbyPublicReportSummary,
  NearbyRadiusKm,
  NearbySearchBoundary,
  NearbySearchLocation,
  PublicReportShareTarget,
} from "./nearby-types";
import {
  buildReportLifecycleSummary,
  getReportUrgency,
  isClosedReportLifecycle,
} from "../reports/report-lifecycle-view-model";
import { buildNearbyReportRouteTarget } from "./nearby-navigation";
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

export interface NearbyPublicLostReportSummaryViewModel {
  coordinates?: NearbyCoordinates;
  reportKind: NearbyPublicReportKind;
  id: string;
  title: string;
  subtitle: string;
  photoUrl?: string;
  distanceLabel?: string;
  publicLocationLabel: string;
  eventAtLabel: string;
  lastSeenAtLabel: string;
  lifecycle?: ReportLifecycleSummaryViewModel;
  summary: string;
  priorityLabel: string;
  routeTarget: NearbyReportRouteTarget;
  shareTarget: PublicReportShareTarget;
  urgency: ReportUrgency;
  verificationBadge?: {
    label: string;
    visible: boolean;
  };
}

export interface NearbyLostReportCardViewModel
  extends NearbyPublicLostReportSummaryViewModel {
  publicSummaryId: string;
  reportActionLabel: string;
}

export interface NearbyLostReportMapPinViewModel {
  coordinates: NearbyCoordinates;
  id: string;
  publicSummaryId: string;
  reportKind: NearbyPublicReportKind;
  routeTarget: NearbyReportRouteTarget;
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
  accessPolicy: {
    audiences: readonly NearbyBrowseAudience[];
    requiresSignIn: false;
  };
  mode: NearbyBrowseMode;
  radiusKm: NearbyRadiusKm;
  radiusOptionsKm: readonly NearbyRadiusKm[];
}

export type NearbyLostReportsViewModel =
  | (NearbyViewModelBase & {
      kind: "location-needed";
      title: string;
      message: string;
      manualLocationActionLabel: string;
      useCurrentLocationActionLabel: string;
    })
  | (NearbyViewModelBase & {
      kind: "location-denied";
      title: string;
      message: string;
      manualLocationActionLabel: string;
      useCurrentLocationActionLabel: string;
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
      offlineLabel?: string;
      radiusActionLabel: string;
      searchBoundaryLabel: string;
    })
  | (NearbyViewModelBase & {
      kind: "ready";
      title: string;
      locationLabel: string;
      locationSourceLabel: string;
      offlineLabel?: string;
      publicSummaries: NearbyPublicLostReportSummaryViewModel[];
      searchBoundaryLabel: string;
      urgentAlert?: NearbyUrgentLostPetAlertViewModel;
      cards: NearbyLostReportCardViewModel[];
      mapPins: NearbyLostReportMapPinViewModel[];
    });

const nearbyAccessPolicy: NearbyViewModelBase["accessPolicy"] = {
  audiences: ["visitor", "member"],
  requiresSignIn: false,
};

export function buildNearbyLostReportsViewModel(
  input: NearbyLostReportsViewModelInput,
): NearbyLostReportsViewModel {
  const base: NearbyViewModelBase = {
    accessPolicy: nearbyAccessPolicy,
    mode: input.mode,
    radiusKm: input.radiusKm,
    radiusOptionsKm: nearbyRadiusOptionsKm,
  };
  const location = resolveLocation(input.locationState);

  if (input.locationState.kind === "not-requested") {
    return {
      ...base,
      kind: "location-needed",
      manualLocationActionLabel: "Elegir una zona",
      message:
        "Usa tu ubicación solo cuando lo pidas o elige una ciudad, zona o punto en el mapa.",
      title: "Busca reportes cerca",
      useCurrentLocationActionLabel: "Usar mi ubicación",
    };
  }

  if (!location) {
    return {
      ...base,
      kind: "location-denied",
      manualLocationActionLabel: "Elegir una zona",
      message:
        "Usa una ciudad, zona o punto en el mapa en Bolivia para ver reportes cercanos.",
      title: "Ubicación no disponible",
      useCurrentLocationActionLabel: "Usar mi ubicación",
    };
  }

  if (input.result.kind === "loading") {
    return {
      ...base,
      kind: "loading",
      locationLabel: location.label,
      locationSourceLabel: formatLocationSource(location),
      title: "Buscando reportes cerca",
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

  const publicSummaries = input.result.value.reports.map(toPublicSummary);
  const cards = publicSummaries.map(toLostReportCard);
  const searchBoundaryLabel = formatSearchBoundary(
    input.result.value.searchBoundary,
  );

  if (cards.length === 0) {
    const isMaxRadius = isMaxNearbyRadius(input.radiusKm);

    return {
      ...base,
      kind: "empty",
      locationLabel: location.label,
      locationSourceLabel: formatLocationSource(location),
      message: isMaxRadius
        ? "No hay reportes de mascotas perdidas en este radio. Prueba con otra zona de búsqueda."
        : "No hay reportes de mascotas perdidas en este radio. Prueba ampliando la búsqueda.",
      offlineLabel: buildOfflineLabel(input.result.value),
      radiusActionLabel: isMaxRadius ? "Cambiar zona" : "Ampliar radio",
      searchBoundaryLabel,
      title: "No hay reportes cerca",
    };
  }

  return {
    ...base,
    cards,
    kind: "ready",
    locationLabel: location.label,
    locationSourceLabel: formatLocationSource(location),
    mapPins: publicSummaries.flatMap(toMapPin),
    offlineLabel: buildOfflineLabel(input.result.value),
    publicSummaries,
    searchBoundaryLabel,
    title: "Reportes cerca de ti",
    urgentAlert: buildUrgentAlert(input.result.value.reports),
  };
}

function isMaxNearbyRadius(radiusKm: NearbyRadiusKm) {
  return radiusKm === nearbyRadiusOptionsKm[nearbyRadiusOptionsKm.length - 1];
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
    return "Ubicación actual";
  }

  if (location.source === "last") {
    return "Última ubicación detectada";
  }

  if (location.manualLocationKind === "map-pin") {
    return "Punto elegido";
  }

  return "Zona elegida";
}

function toPublicSummary(
  report: NearbyPublicReportSummary,
): NearbyPublicLostReportSummaryViewModel {
  if (isAdoptionListingSummary(report)) {
    return {
      coordinates: report.coordinates,
      distanceLabel: formatDistance(report.distanceMeters),
      eventAtLabel: report.publishedAtLabel,
      id: report.id,
      lastSeenAtLabel: report.publishedAtLabel,
      photoUrl: report.photoUrl,
      priorityLabel: "Adopción",
      publicLocationLabel: formatPublicLocation(report),
      reportKind: "adoption-listing",
      routeTarget: buildNearbyReportRouteTarget({
        id: report.id,
        reportKind: "adoption-listing",
      }),
      shareTarget: report.shareTarget,
      subtitle: [report.species, report.breed].filter(Boolean).join(" • "),
      summary: report.adoptionSummary,
      title: report.petName,
      urgency: "normal",
      verificationBadge: report.verificationBadge,
    };
  }

  if (isFoundPetReportSummary(report)) {
    const lifecycle = buildReportLifecycleSummary(report);

    return {
      coordinates: report.coordinates,
      distanceLabel: formatDistance(report.distanceMeters),
      eventAtLabel: report.foundAtLabel,
      id: report.id,
      lastSeenAtLabel: report.foundAtLabel,
      lifecycle,
      photoUrl: report.photoUrl,
      priorityLabel: formatReportPriority("Encontrada", lifecycle),
      publicLocationLabel: formatPublicLocation(report),
      reportKind: "found-pet-report",
      routeTarget: buildNearbyReportRouteTarget({
        id: report.id,
        reportKind: "found-pet-report",
      }),
      shareTarget: report.shareTarget,
      subtitle: [report.breed, report.condition].filter(Boolean).join(" • "),
      summary: report.foundSummary,
      title: report.title,
      urgency: getReportUrgency(report),
    };
  }

  if (isSightingReportSummary(report)) {
    const lifecycle = buildReportLifecycleSummary(report);

    return {
      coordinates: report.coordinates,
      distanceLabel: formatDistance(report.distanceMeters),
      eventAtLabel: report.observedAtLabel,
      id: report.id,
      lastSeenAtLabel: report.observedAtLabel,
      lifecycle,
      photoUrl: report.photoUrl,
      priorityLabel: formatReportPriority("Avistamiento", lifecycle),
      publicLocationLabel: formatPublicLocation(report),
      reportKind: "sighting-report",
      routeTarget: buildNearbyReportRouteTarget({
        id: report.id,
        reportKind: "sighting-report",
      }),
      shareTarget: report.shareTarget,
      subtitle: [report.breed, report.observedCondition]
        .filter(Boolean)
        .join(" • "),
      summary: report.sightingSummary,
      title: report.title,
      urgency: getReportUrgency(report),
    };
  }

  const lifecycle = buildReportLifecycleSummary(report);

  return {
    coordinates: report.coordinates,
    distanceLabel: formatDistance(report.distanceMeters),
    eventAtLabel: report.lastSeenAtLabel,
    id: report.id,
    lastSeenAtLabel: report.lastSeenAtLabel,
    lifecycle,
    photoUrl: report.photoUrl,
    priorityLabel: formatReportPriority("Perdido", lifecycle),
    publicLocationLabel: formatPublicLocation(report),
    reportKind: "lost-pet-report",
    routeTarget: buildNearbyReportRouteTarget({
      id: report.id,
      reportKind: "lost-pet-report",
    }),
    shareTarget: report.shareTarget,
    subtitle: [report.breed, report.sex].filter(Boolean).join(" • "),
    summary: report.lastSeenSummary,
    title: report.petName,
    urgency: getReportUrgency(report),
  };
}

function formatReportPriority(
  activeLabel: string,
  lifecycle: ReportLifecycleSummaryViewModel,
) {
  if (lifecycle.status === "closed") {
    return `${lifecycle.statusLabel} · ${lifecycle.outcomeLabel}`;
  }

  return activeLabel;
}

function toMapPin(
  summary: NearbyPublicLostReportSummaryViewModel,
): NearbyLostReportMapPinViewModel[] {
  if (!summary.coordinates) {
    return [];
  }

  return [
    {
      coordinates: summary.coordinates,
      distanceLabel: summary.distanceLabel,
      id: summary.id,
      label: summary.publicLocationLabel,
      publicSummaryId: summary.id,
      reportKind: summary.reportKind,
      routeTarget: summary.routeTarget,
      title: summary.title,
    } satisfies NearbyLostReportMapPinViewModel,
  ];
}

function toLostReportCard(
  summary: NearbyPublicLostReportSummaryViewModel,
): NearbyLostReportCardViewModel {
  return {
    ...summary,
    publicSummaryId: summary.id,
    reportActionLabel: "Reportar",
  };
}

function formatPublicLocation(report: NearbyPublicReportSummary) {
  if (report.publicLocation.kind === "exact") {
    return formatPublicLocationCellLabel(report.publicLocation.label);
  }

  const locationCellLabel = formatPublicLocationCellLabel(
    report.locationCellLabel,
  );

  if (locationCellLabel === "Zona elegida") {
    return "Zona aproximada";
  }

  return `${locationCellLabel} · zona aproximada`;
}

function formatPublicLocationCellLabel(label: string) {
  const trimmed = label.trim();

  if (
    trimmed.length === 0 ||
    /\bpin manual\b/i.test(trimmed) ||
    /-?\d{1,2}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/.test(trimmed)
  ) {
    return "Zona elegida";
  }

  return trimmed;
}

function formatSearchBoundary(boundary: NearbySearchBoundary) {
  return `Radio de ${boundary.radiusKm} km · ${boundary.center.locationCellLabel}`;
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
  reports: NearbyPublicReportSummary[],
): NearbyUrgentLostPetAlertViewModel | undefined {
  const urgent = reports.find(
    (report): report is LostPetReportSummary =>
      isLostPetReportSummary(report) &&
      report.alertPriority === "urgent" &&
      !isClosedReportLifecycle(report),
  );

  if (!urgent) {
    return undefined;
  }

  return {
    message: `${urgent.petName} fue visto ${urgent.distanceMeters ? formatDistance(urgent.distanceMeters) : "cerca"}.`,
    reportId: urgent.id,
    title: "Alerta activa",
  };
}

function isFoundPetReportSummary(
  report: NearbyPublicReportSummary,
): report is Extract<
  NearbyPublicReportSummary,
  { reportKind: "found-pet-report" }
> {
  return report.reportKind === "found-pet-report";
}

function isAdoptionListingSummary(
  report: NearbyPublicReportSummary,
): report is Extract<
  NearbyPublicReportSummary,
  { reportKind: "adoption-listing" }
> {
  return report.reportKind === "adoption-listing";
}

function isSightingReportSummary(
  report: NearbyPublicReportSummary,
): report is Extract<
  NearbyPublicReportSummary,
  { reportKind: "sighting-report" }
> {
  return report.reportKind === "sighting-report";
}

function isLostPetReportSummary(
  report: NearbyPublicReportSummary,
): report is LostPetReportSummary {
  return (
    report.reportKind === undefined || report.reportKind === "lost-pet-report"
  );
}

function buildOfflineLabel(result: NearbyLostReportsResult) {
  if (result.isOffline && result.isStale) {
    return "Sin conexión · resultados guardados";
  }

  if (result.isOffline) {
    return "Sin conexión";
  }

  if (result.isStale) {
    return "Resultados guardados";
  }

  return undefined;
}
