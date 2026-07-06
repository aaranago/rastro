import type { PublicSightingReportShareTarget } from "@acme/validators";
import { buildPublicSightingReportShareTarget } from "@acme/validators";

import type {
  PetProfilesSessionState,
  PetProfileType,
} from "../pet-profiles/pet-profile-types";
import type {
  PetProfileMediaAdapter,
  PetProfilePhotoAsset,
  PetProfilePhotoSource,
} from "../pet-profiles/pet-profiles";
import type {
  PublicReportLifecycle,
  ReportLifecycleStatus,
  ReportOutcome,
  UpdateReportLifecycleInput,
} from "../reports/report-lifecycle";
import type {
  SubmitTrustSafetyReportInput,
  TrustSafetyReportReceipt,
  TrustSafetyRepository,
} from "../trust-safety";
import { createLocalPetProfileMediaAdapter } from "../pet-profiles/pet-profiles";
import {
  applyReportLifecycleUpdate,
  toPublicReportLifecycle,
} from "../reports/report-lifecycle";
import {
  buildPublicReportContactOptions,
  rejectRepositoryError,
  summarizeActiveReportsWithinRadius,
  toPublicReportDetailLocation,
} from "../reports/report-repository-utils";
import { createInMemoryTrustSafetyRepository } from "../trust-safety";

export type SightingReportsSessionState = PetProfilesSessionState;
export type SightingReportOutcome = ReportOutcome;
export type SightingReportStatus = ReportLifecycleStatus;
export type SightingReportBoliviaCountryCode = "BO";
export type SightingReportSearchLocationSource = "current" | "last" | "manual";
export type SightingReportAlertRadiusKm = 5 | 10 | 20;
export type SightingReportSearchStrategy = "postgis_radius";

export interface SightingReportSearchCoordinates {
  latitude: number;
  longitude: number;
}

export interface SightingReportSearchLocation {
  coordinates: SightingReportSearchCoordinates;
  countryCode: SightingReportBoliviaCountryCode;
  label: string;
  locationCellLabel: string;
  source: SightingReportSearchLocationSource;
}

export interface SightingReportExactLocation {
  addressLabel?: string;
  countryCode: SightingReportBoliviaCountryCode;
  latitude: number;
  locationCellLabel: string;
  longitude: number;
}

export type SightingReportPublicLocation =
  | {
      kind: "approximate";
      label: string;
      locationCellLabel: string;
    }
  | {
      addressLabel?: string;
      kind: "exact";
      label: string;
      latitude: number;
      longitude: number;
    };

export type SightingReportContactOption =
  | {
      kind: "in-app-chat";
    }
  | {
      kind: "whatsapp";
      phoneNumber?: string;
    }
  | {
      kind: "both";
      phoneNumber?: string;
    };

export interface SightingReportStoredContactOption {
  kind: "both" | "in-app-chat" | "whatsapp";
  phoneNumber?: string;
}

export interface SightingReportPetSnapshot {
  breed: string;
  description: string;
  type: PetProfileType;
}

export interface PublishSightingReportInput {
  contactOption: SightingReportContactOption;
  direction: string;
  exactLocation: SightingReportExactLocation;
  idempotencyKey?: string;
  observedAt: string;
  observedCondition: string;
  pet: SightingReportPetSnapshot;
  photos: readonly PetProfilePhotoSource[];
  showExactPublicLocation?: boolean;
  sightingDescription: string;
}

export interface SightingReport {
  closedAt?: string;
  contactOption: SightingReportStoredContactOption;
  createdAt: string;
  direction: string;
  exactLocation: SightingReportExactLocation;
  id: string;
  lifecycleConfirmedAt: string;
  observedAt: string;
  observedCondition: string;
  outcome: SightingReportOutcome;
  petSnapshot: SightingReportPetSnapshot;
  photos: PetProfilePhotoAsset[];
  publicLocation: SightingReportPublicLocation;
  reporterMemberId: string;
  shareTarget: PublicSightingReportShareTarget;
  sightingDescription: string;
  status: SightingReportStatus;
  updatedAt: string;
}

export interface SearchActiveSightingReportsQuery {
  location: SightingReportSearchLocation;
  radiusKm: SightingReportAlertRadiusKm;
  strategy: SightingReportSearchStrategy;
}

export interface SightingReportSearchSummary {
  breed: string;
  coordinates: SightingReportSearchCoordinates;
  direction: string;
  distanceMeters: number;
  id: string;
  locationCellLabel: string;
  observedAt: string;
  observedCondition: string;
  petDescription: string;
  photoUrl?: string;
  publicLocation: SightingReportPublicLocation;
  shareTarget: PublicSightingReportShareTarget;
  sightingDescription: string;
  species: PetProfileType;
  title: string;
}

export interface SearchActiveSightingReportsResult {
  generatedAt: string;
  query: SearchActiveSightingReportsQuery;
  radiusMeters: number;
  reports: SightingReportSearchSummary[];
  searchStrategy: SightingReportSearchStrategy;
}

export interface PublicSightingReportDetail {
  contactOptions: PublicSightingReportContactOption[];
  description: string;
  direction: {
    label: string;
    value: string;
  };
  kind: "sighting-report";
  observedAt: {
    label: string;
    value: string;
  };
  observedCondition: {
    label: string;
    value: string;
  };
  pet: SightingReportPetSnapshot;
  photos: PetProfilePhotoAsset[];
  publicLocation:
    | {
        label: string;
        privacyNote: string;
        type: "approximate";
      }
    | {
        address?: string;
        coordinates: {
          latitude: number;
          longitude: number;
        };
        label: string;
        privacyNote: string;
        type: "exact";
      };
  lifecycle: PublicReportLifecycle;
  outcomeLabel: string;
  reportLabel: string;
  shareTarget: PublicSightingReportShareTarget;
  statusLabel: string;
  title: string;
}

export type PublicSightingReportContactOption =
  | {
      href: string;
      kind: "in-app-chat";
      label: string;
    }
  | {
      href: string;
      kind: "whatsapp";
      label: string;
      phoneNumber: string;
    };

type SightingReportRepositoryErrorCode =
  | "exact_location_required"
  | "search_location_required"
  | "sighting_report_not_found"
  | "sighting_report_details_required"
  | "visitor_cannot_manage_sighting_report"
  | "visitor_cannot_publish_sighting_report"
  | "whatsapp_phone_required";

class SightingReportRepositoryError extends Error {
  code: SightingReportRepositoryErrorCode;

  constructor(code: SightingReportRepositoryErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "SightingReportRepositoryError";
  }
}

export interface SightingReportRepository {
  getPublicSightingReport: (
    session: SightingReportsSessionState,
    reportId: string,
  ) => Promise<PublicSightingReportDetail | null>;
  publishSightingReport: (
    session: SightingReportsSessionState,
    input: PublishSightingReportInput,
  ) => Promise<SightingReport>;
  searchActiveSightingReports: (
    session: SightingReportsSessionState,
    query: SearchActiveSightingReportsQuery,
  ) => Promise<SearchActiveSightingReportsResult>;
  updateSightingReportLifecycle: (
    session: SightingReportsSessionState,
    reportId: string,
    input: UpdateReportLifecycleInput,
  ) => Promise<SightingReport>;
  reportSightingReport: (
    session: SightingReportsSessionState,
    input: ReportSightingReportInput,
  ) => Promise<TrustSafetyReportReceipt>;
}

export interface InMemorySightingReportRepositoryOptions {
  mediaAdapter?: PetProfileMediaAdapter;
  now?: () => string;
  publicWebBaseUrl?: string;
  reportIdFactory?: (sequence: number) => string;
  trustSafety?: TrustSafetyRepository;
}

const defaultPublicWebBaseUrl = "https://rastro.bo";

export interface ReportSightingReportInput {
  detail?: string;
  reason: SubmitTrustSafetyReportInput["reason"];
  reportId: string;
}

export function createInMemorySightingReportRepository(
  options: InMemorySightingReportRepositoryOptions = {},
): SightingReportRepository {
  const mediaAdapter =
    options.mediaAdapter ?? createLocalPetProfileMediaAdapter();
  const now = options.now ?? (() => "2026-01-01T00:00:00.000Z");
  const publicWebBaseUrl = options.publicWebBaseUrl ?? defaultPublicWebBaseUrl;
  const reportIdFactory =
    options.reportIdFactory ?? createSequentialSightingReportId;
  const trustSafety =
    options.trustSafety ?? createInMemoryTrustSafetyRepository({ now });
  const reports: SightingReport[] = [];

  return {
    getPublicSightingReport(_session, reportId) {
      const report = reports.find((candidate) => candidate.id === reportId);

      return Promise.resolve(
        report ? toPublicSightingReportDetail(report) : null,
      );
    },
    async publishSightingReport(session, input) {
      assertMemberCanPublishSightingReport(session);
      assertPublishInput(input);

      const createdAt = now();
      const id = reportIdFactory(reports.length + 1);
      const petSnapshot = {
        breed: input.pet.breed.trim(),
        description: input.pet.description.trim(),
        type: input.pet.type,
      };
      const report: SightingReport = {
        contactOption: normalizeContactOption(input.contactOption),
        createdAt,
        direction: input.direction.trim(),
        exactLocation: cloneExactLocation(input.exactLocation),
        id,
        lifecycleConfirmedAt: createdAt,
        observedAt: input.observedAt,
        observedCondition: input.observedCondition.trim(),
        outcome: "still-missing",
        petSnapshot,
        photos: await mediaAdapter.normalizePhotos(input.photos),
        publicLocation: buildPublicLocation(input),
        reporterMemberId: session.memberId,
        shareTarget: buildPublicSightingReportShareTarget({
          publicWebBaseUrl,
          reportId: id,
          title: petSnapshot.type,
        }),
        sightingDescription: input.sightingDescription.trim(),
        status: "active",
        updatedAt: createdAt,
      };

      reports.push(report);

      return cloneSightingReport(report);
    },
    searchActiveSightingReports(_session, query) {
      assertSearchQuery(query);

      const generatedAt = now();
      const radiusMeters = query.radiusKm * 1000;
      const matchingReports = summarizeActiveReportsWithinRadius({
        center: query.location.coordinates,
        getLocation: (report) => report.exactLocation,
        reports: reports.filter((report) => report.status === "active"),
        radiusMeters,
        toSummary: toSightingReportSearchSummary,
      });

      return Promise.resolve({
        generatedAt,
        query: cloneSearchQuery(query),
        radiusMeters,
        reports: matchingReports,
        searchStrategy: "postgis_radius",
      });
    },
    updateSightingReportLifecycle(session, reportId, input) {
      try {
        assertMemberCanManageSightingReport(session);

        const reportIndex = reports.findIndex(
          (candidate) =>
            candidate.id === reportId &&
            candidate.reporterMemberId === session.memberId,
        );

        if (reportIndex === -1) {
          throw new SightingReportRepositoryError(
            "sighting_report_not_found",
            "Sighting Report was not found for this Member.",
          );
        }

        const current = reports[reportIndex];

        if (!current) {
          throw new SightingReportRepositoryError(
            "sighting_report_not_found",
            "Sighting Report was not found for this Member.",
          );
        }

        const next: SightingReport = {
          ...current,
          ...applyReportLifecycleUpdate({
            input,
            updatedAt: now(),
          }),
        };

        reports[reportIndex] = next;

        return Promise.resolve(cloneSightingReport(next));
      } catch (error) {
        return rejectRepositoryError<SightingReport>(error);
      }
    },
    reportSightingReport(session, input) {
      return trustSafety.submitReport({
        detail: optionalTrimmed(input.detail),
        reason: input.reason,
        reporterMemberId:
          session.kind === "member" ? session.memberId : undefined,
        targetId: input.reportId,
        targetType: "sighting_report",
      });
    },
  };
}

function createSequentialSightingReportId(sequence: number) {
  return `44444444-4444-4444-8444-${String(sequence).padStart(12, "0")}`;
}

function assertMemberCanPublishSightingReport(
  session: SightingReportsSessionState,
): asserts session is Extract<SightingReportsSessionState, { kind: "member" }> {
  if (session.kind === "visitor") {
    throw new SightingReportRepositoryError(
      "visitor_cannot_publish_sighting_report",
      "Visitors cannot publish Sighting Reports.",
    );
  }
}

function assertMemberCanManageSightingReport(
  session: SightingReportsSessionState,
): asserts session is Extract<SightingReportsSessionState, { kind: "member" }> {
  if (session.kind === "visitor") {
    throw new SightingReportRepositoryError(
      "visitor_cannot_manage_sighting_report",
      "Visitors cannot manage Sighting Reports.",
    );
  }
}

function assertPublishInput(input: PublishSightingReportInput) {
  if (
    !Number.isFinite(input.exactLocation.latitude) ||
    !Number.isFinite(input.exactLocation.longitude) ||
    input.exactLocation.locationCellLabel.trim().length === 0
  ) {
    throw new SightingReportRepositoryError(
      "exact_location_required",
      "Se necesita una ubicación exacta interna en Bolivia para publicar el avistamiento.",
    );
  }

  if (
    input.observedAt.trim().length === 0 ||
    input.observedCondition.trim().length === 0 ||
    input.direction.trim().length === 0 ||
    input.sightingDescription.trim().length === 0 ||
    input.pet.description.trim().length === 0
  ) {
    throw new SightingReportRepositoryError(
      "sighting_report_details_required",
      "Time, condition, direction, description, and visible pet details are required for a Sighting Report.",
    );
  }

  if (
    contactOptionNeedsWhatsappNumber(input.contactOption) &&
    !input.contactOption.phoneNumber?.trim()
  ) {
    throw new SightingReportRepositoryError(
      "whatsapp_phone_required",
      "WhatsApp number is required when WhatsApp Contact Option is selected.",
    );
  }
}

function assertSearchQuery(query: SearchActiveSightingReportsQuery) {
  if (
    !Number.isFinite(query.location.coordinates.latitude) ||
    !Number.isFinite(query.location.coordinates.longitude)
  ) {
    throw new SightingReportRepositoryError(
      "search_location_required",
      "La búsqueda necesita una ubicación resuelta en Bolivia para el radio PostGIS.",
    );
  }
}

function buildPublicLocation(
  input: PublishSightingReportInput,
): SightingReportPublicLocation {
  if (input.showExactPublicLocation === true) {
    return {
      addressLabel: input.exactLocation.addressLabel,
      kind: "exact",
      label: input.exactLocation.addressLabel ?? "Ubicación exacta",
      latitude: input.exactLocation.latitude,
      longitude: input.exactLocation.longitude,
    };
  }

  return {
    kind: "approximate",
    label: input.exactLocation.locationCellLabel,
    locationCellLabel: input.exactLocation.locationCellLabel,
  };
}

function normalizeContactOption(
  contactOption: SightingReportContactOption,
): SightingReportStoredContactOption {
  if (contactOption.kind === "in-app-chat") {
    return {
      kind: "in-app-chat",
    };
  }

  return {
    kind: contactOption.kind,
    phoneNumber: contactOption.phoneNumber?.trim(),
  };
}

function toPublicSightingReportDetail(
  report: SightingReport,
): PublicSightingReportDetail {
  const lifecycle = toPublicReportLifecycle(report);

  return {
    contactOptions: buildPublicContactOptions(report),
    description: report.sightingDescription,
    direction: {
      label: "Dirección",
      value: report.direction,
    },
    kind: "sighting-report",
    observedAt: {
      label: "Vista",
      value: report.observedAt,
    },
    observedCondition: {
      label: "Condición observada",
      value: report.observedCondition,
    },
    pet: { ...report.petSnapshot },
    photos: report.photos.map(clonePhotoAsset),
    publicLocation: toPublicDetailLocation(report.publicLocation),
    lifecycle,
    outcomeLabel: lifecycle.outcomeLabel,
    reportLabel: "Reporte de avistamiento",
    shareTarget: { ...report.shareTarget },
    statusLabel: lifecycle.statusLabel,
    title: `${report.petSnapshot.type} visto`,
  };
}

function toSightingReportSearchSummary({
  distanceMeters,
  report,
}: {
  distanceMeters: number;
  report: SightingReport;
}): SightingReportSearchSummary {
  const primaryPhoto = report.photos[0];

  return {
    breed: report.petSnapshot.breed,
    coordinates: {
      latitude: report.exactLocation.latitude,
      longitude: report.exactLocation.longitude,
    },
    direction: report.direction,
    distanceMeters: Math.round(distanceMeters),
    id: report.id,
    locationCellLabel: report.exactLocation.locationCellLabel,
    observedAt: report.observedAt,
    observedCondition: report.observedCondition,
    petDescription: report.petSnapshot.description,
    photoUrl: primaryPhoto?.thumbnail.uri ?? primaryPhoto?.uri,
    publicLocation: { ...report.publicLocation },
    shareTarget: { ...report.shareTarget },
    sightingDescription: report.sightingDescription,
    species: report.petSnapshot.type,
    title: `${report.petSnapshot.type} visto`,
  };
}

function buildPublicContactOptions(
  report: SightingReport,
): PublicSightingReportContactOption[] {
  return buildPublicReportContactOptions({
    contactOption: report.contactOption,
    shareTarget: report.shareTarget,
  });
}

function toPublicDetailLocation(
  publicLocation: SightingReportPublicLocation,
): PublicSightingReportDetail["publicLocation"] {
  return toPublicReportDetailLocation(
    publicLocation,
    "Ubicación exacta compartida por quien reportó el avistamiento.",
  );
}

function cloneSightingReport(report: SightingReport): SightingReport {
  return {
    ...report,
    contactOption: { ...report.contactOption },
    exactLocation: cloneExactLocation(report.exactLocation),
    petSnapshot: { ...report.petSnapshot },
    photos: report.photos.map(clonePhotoAsset),
    publicLocation: { ...report.publicLocation },
    shareTarget: { ...report.shareTarget },
  };
}

function cloneSearchQuery(
  query: SearchActiveSightingReportsQuery,
): SearchActiveSightingReportsQuery {
  return {
    ...query,
    location: {
      ...query.location,
      coordinates: { ...query.location.coordinates },
    },
  };
}

function cloneExactLocation(
  location: SightingReportExactLocation,
): SightingReportExactLocation {
  return { ...location };
}

function clonePhotoAsset(photo: PetProfilePhotoAsset): PetProfilePhotoAsset {
  return {
    ...photo,
    compression: { ...photo.compression },
    exif: { ...photo.exif },
    thumbnail: { ...photo.thumbnail },
  };
}

function contactOptionNeedsWhatsappNumber(
  contactOption: SightingReportContactOption,
) {
  return contactOption.kind === "whatsapp" || contactOption.kind === "both";
}

function optionalTrimmed(value: string | undefined) {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : undefined;
}
