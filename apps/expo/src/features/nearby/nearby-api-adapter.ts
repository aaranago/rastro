import type { RouterInputs, RouterOutputs } from "@acme/api";
import {
  buildPublicAdoptionListingShareTarget,
  buildPublicFoundReportShareTarget,
  buildPublicLostReportShareTarget,
  buildPublicSightingReportShareTarget,
} from "@acme/validators";

import type {
  ReportLifecycleStatus,
  ReportOutcome,
} from "../reports/report-lifecycle";
import type {
  AdoptionListingSummary,
  FoundPetReportSummary,
  LostPetReportSummary,
  NearbyLostReportsAdapter,
  NearbyLostReportsRequestOptions,
  NearbyPublicReportKind,
  NearbyPublicReportSummary,
  PublicLocation,
  SightingReportSummary,
} from "./nearby-types";
import { calculateDistanceMeters } from "../geo/distance";

export type ReportNearbyInput = RouterInputs["report"]["nearby"];
export type ReportNearbyOutput = RouterOutputs["report"]["nearby"];
type ApiNearbyReport = ReportNearbyOutput["results"][number];
type ApiReportType = NonNullable<ReportNearbyInput["types"]>[number];

export interface ReportNearbyApiClient {
  report: {
    nearby: {
      query: (
        input: ReportNearbyInput,
        options?: NearbyLostReportsRequestOptions,
      ) => Promise<ReportNearbyOutput>;
    };
  };
}

export interface ApiNearbyLostReportsAdapterOptions {
  client: ReportNearbyApiClient;
  now?: () => Date | string;
  publicWebBaseUrl?: string;
}

const defaultPublicWebBaseUrl = "https://rastro.bo";

const reportTypesByCategory = {
  "adoption-listing": "adoption",
  "found-pet-report": "found_pet",
  "lost-pet-report": "lost_pet",
  "sighting-report": "sighting",
} satisfies Record<NearbyPublicReportKind, ApiReportType>;

const speciesLabels = {
  bird: "Ave",
  cat: "Gato",
  dog: "Perro",
  other: "Otra",
  rabbit: "Conejo",
} satisfies Record<ApiNearbyReport["pet"]["species"], string>;

const outcomeByApiOutcome = {
  inactive: "inactive",
  reunited: "reunited",
  still_missing: "still-missing",
  transferred_to_shelter: "transferred-to-shelter",
  unable_to_locate: "unable-to-locate",
} satisfies Partial<
  Record<NonNullable<ApiNearbyReport["outcome"]>, ReportOutcome>
>;

export function createApiNearbyLostReportsAdapter({
  client,
  now = () => new Date(),
  publicWebBaseUrl = defaultPublicWebBaseUrl,
}: ApiNearbyLostReportsAdapterOptions): NearbyLostReportsAdapter {
  return {
    async searchLostPetReports(query, options) {
      const coordinates = query.location.coordinates;

      if (!coordinates) {
        throw new Error(
          "La busqueda necesita una ciudad, zona o pin resuelto en Bolivia.",
        );
      }

      const generatedAt = toIsoString(now());
      const response = await client.report.nearby.query(
        {
          latitude: coordinates.latitude,
          limit: query.limit,
          longitude: coordinates.longitude,
          radiusMeters: query.radiusKm * 1000,
          types: toApiReportTypes(query.categories),
        },
        options,
      );

      return {
        generatedAt,
        query,
        reports: response.results.map((report) =>
          toNearbyReportSummary({
            generatedAt,
            origin: coordinates,
            publicWebBaseUrl,
            report,
          }),
        ),
        searchBoundary: {
          center: query.location,
          engine: "rastro-postgis-radius",
          owner: "rastro",
          publicLocationPrecision: "location-cell",
          radiusKm: query.radiusKm,
        },
      };
    },
  };
}

function toApiReportTypes(
  categories: readonly NearbyPublicReportKind[] | undefined,
): ReportNearbyInput["types"] | undefined {
  if (!categories || categories.length === 0) {
    return undefined;
  }

  return categories.map(
    (category): ApiReportType => reportTypesByCategory[category],
  );
}

function toNearbyReportSummary({
  generatedAt,
  origin,
  publicWebBaseUrl,
  report,
}: {
  generatedAt: string;
  origin: { latitude: number; longitude: number };
  publicWebBaseUrl: string;
  report: ApiNearbyReport;
}): NearbyPublicReportSummary {
  switch (report.type) {
    case "adoption":
      return toAdoptionListingSummary({
        generatedAt,
        origin,
        publicWebBaseUrl,
        report,
      });
    case "found_pet":
      return toFoundPetReportSummary({
        generatedAt,
        origin,
        publicWebBaseUrl,
        report,
      });
    case "lost_pet":
      return toLostPetReportSummary({
        generatedAt,
        origin,
        publicWebBaseUrl,
        report,
      });
    case "sighting":
      return toSightingReportSummary({
        generatedAt,
        origin,
        publicWebBaseUrl,
        report,
      });
  }
}

function toAdoptionListingSummary({
  generatedAt,
  origin,
  publicWebBaseUrl,
  report,
}: {
  generatedAt: string;
  origin: { latitude: number; longitude: number };
  publicWebBaseUrl: string;
  report: ApiNearbyReport;
}): AdoptionListingSummary {
  return {
    adoptionSummary: report.description,
    breed: report.pet.breed ?? undefined,
    coordinates: getReportCoordinates(report),
    distanceMeters: getDistanceMeters(origin, report),
    healthNotes: report.pet.distinguishingTraits ?? undefined,
    id: report.id,
    locationCellLabel: report.location.label,
    petName: report.pet.name ?? report.title,
    photoUrl: getPrimaryPhotoUrl(report),
    publicLocation: toPublicLocation(report),
    publishedAtLabel: formatEventAt(report.createdAt, generatedAt),
    reportKind: "adoption-listing",
    shareTarget: buildPublicAdoptionListingShareTarget({
      listingId: report.id,
      publicWebBaseUrl,
      title: report.pet.name ?? report.title,
    }),
    species: speciesLabels[report.pet.species],
  };
}

function toFoundPetReportSummary({
  generatedAt,
  origin,
  publicWebBaseUrl,
  report,
}: {
  generatedAt: string;
  origin: { latitude: number; longitude: number };
  publicWebBaseUrl: string;
  report: ApiNearbyReport;
}): FoundPetReportSummary {
  return {
    breed: report.pet.breed ?? undefined,
    condition: report.pet.distinguishingTraits ?? report.pet.color,
    coordinates: getReportCoordinates(report),
    distanceMeters: getDistanceMeters(origin, report),
    foundAtLabel: formatEventAt(report.eventOccurredAt, generatedAt),
    foundSummary: report.description,
    id: report.id,
    locationCellLabel: report.location.label,
    photoUrl: getPrimaryPhotoUrl(report),
    publicLocation: toPublicLocation(report),
    reportKind: "found-pet-report",
    shareTarget: buildPublicFoundReportShareTarget({
      publicWebBaseUrl,
      reportId: report.id,
      title: report.title,
    }),
    species: speciesLabels[report.pet.species],
    title: report.title,
    ...toLifecycleFields(report),
  };
}

function toLostPetReportSummary({
  generatedAt,
  origin,
  publicWebBaseUrl,
  report,
}: {
  generatedAt: string;
  origin: { latitude: number; longitude: number };
  publicWebBaseUrl: string;
  report: ApiNearbyReport;
}): LostPetReportSummary {
  const petName = report.pet.name ?? report.title;

  return {
    alertPriority: isUrgentReport(report, generatedAt) ? "urgent" : "standard",
    breed: report.pet.breed ?? undefined,
    coordinates: getReportCoordinates(report),
    distanceMeters: getDistanceMeters(origin, report),
    id: report.id,
    lastSeenAtLabel: formatEventAt(report.eventOccurredAt, generatedAt),
    lastSeenSummary: report.description,
    locationCellLabel: report.location.label,
    petName,
    photoUrl: getPrimaryPhotoUrl(report),
    publicLocation: toPublicLocation(report),
    reportKind: "lost-pet-report",
    shareTarget: buildPublicLostReportShareTarget({
      publicWebBaseUrl,
      reportId: report.id,
      title: petName,
    }),
    species: speciesLabels[report.pet.species],
    ...toLifecycleFields(report),
  };
}

function toSightingReportSummary({
  generatedAt,
  origin,
  publicWebBaseUrl,
  report,
}: {
  generatedAt: string;
  origin: { latitude: number; longitude: number };
  publicWebBaseUrl: string;
  report: ApiNearbyReport;
}): SightingReportSummary {
  return {
    breed: report.pet.breed ?? undefined,
    coordinates: getReportCoordinates(report),
    distanceMeters: getDistanceMeters(origin, report),
    direction: report.location.label,
    id: report.id,
    locationCellLabel: report.location.label,
    observedAtLabel: formatEventAt(report.eventOccurredAt, generatedAt),
    observedCondition: report.pet.distinguishingTraits ?? report.pet.color,
    photoUrl: getPrimaryPhotoUrl(report),
    publicLocation: toPublicLocation(report),
    reportKind: "sighting-report",
    shareTarget: buildPublicSightingReportShareTarget({
      publicWebBaseUrl,
      reportId: report.id,
      title: report.title,
    }),
    sightingSummary: report.description,
    species: speciesLabels[report.pet.species],
    title: report.title,
    ...toLifecycleFields(report),
  };
}

function toLifecycleFields(report: ApiNearbyReport) {
  const outcome = normalizeOutcome(report.outcome);

  return {
    ...(outcome ? { outcome } : {}),
    status: toLifecycleStatus(report.status),
  };
}

function toLifecycleStatus(
  status: ApiNearbyReport["status"],
): ReportLifecycleStatus {
  return status === "closed" ? "closed" : "active";
}

function normalizeOutcome(
  outcome: ApiNearbyReport["outcome"],
): ReportOutcome | undefined {
  if (!outcome || outcome === "adopted") {
    return undefined;
  }

  return outcomeByApiOutcome[outcome];
}

function toPublicLocation(report: ApiNearbyReport): PublicLocation {
  if (report.location.precision === "exact") {
    return {
      kind: "exact",
      label: report.location.label,
    };
  }

  return { kind: "approximate" };
}

function getPrimaryPhotoUrl(report: ApiNearbyReport) {
  return (
    report.media.find((media) => media.canonicalUrl)?.canonicalUrl ?? undefined
  );
}

function getDistanceMeters(
  origin: { latitude: number; longitude: number },
  report: ApiNearbyReport,
) {
  return calculateDistanceMeters(origin, {
    latitude: report.location.latitude,
    longitude: report.location.longitude,
  });
}

function getReportCoordinates(report: ApiNearbyReport) {
  return {
    latitude: report.location.latitude,
    longitude: report.location.longitude,
  };
}

function formatEventAt(eventAt: Date, generatedAt: string) {
  const eventAtMs = eventAt.getTime();
  const generatedAtMs = Date.parse(generatedAt);

  if (!Number.isFinite(eventAtMs) || !Number.isFinite(generatedAtMs)) {
    return "Fecha por confirmar";
  }

  const minutes = Math.max(0, Math.round((generatedAtMs - eventAtMs) / 60_000));

  if (minutes < 60) {
    return minutes <= 1 ? "Hace 1 min" : `Hace ${minutes} min`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return hours === 1 ? "Hace 1 h" : `Hace ${hours} h`;
  }

  const days = Math.round(hours / 24);

  if (days === 1) {
    return "Ayer";
  }

  return `Hace ${days} días`;
}

function isUrgentReport(report: ApiNearbyReport, generatedAt: string) {
  if (report.status === "closed") {
    return false;
  }

  const eventAtMs = report.eventOccurredAt.getTime();
  const generatedAtMs = Date.parse(generatedAt);

  if (!Number.isFinite(eventAtMs) || !Number.isFinite(generatedAtMs)) {
    return false;
  }

  const ageMs = generatedAtMs - eventAtMs;
  const oneDayMs = 24 * 60 * 60 * 1000;

  return ageMs >= 0 && ageMs <= oneDayMs;
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}
