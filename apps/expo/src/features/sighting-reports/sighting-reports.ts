import type {
  PetProfilesSessionState,
  PetProfileType,
} from "../pet-profiles/pet-profile-types";
import type {
  PetProfileMediaAdapter,
  PetProfilePhotoAsset,
  PetProfilePhotoSource,
} from "../pet-profiles/pet-profiles";
import { createLocalPetProfileMediaAdapter } from "../pet-profiles/pet-profiles";
import {
  buildPublicReportContactOptions,
  summarizeActiveReportsWithinRadius,
  toPublicReportDetailLocation,
} from "../reports/report-repository-utils";

export type SightingReportsSessionState = PetProfilesSessionState;
export type SightingReportStatus = "active" | "closed";
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
  observedAt: string;
  observedCondition: string;
  pet: SightingReportPetSnapshot;
  photos: readonly PetProfilePhotoSource[];
  showExactPublicLocation?: boolean;
  sightingDescription: string;
}

interface PublicSightingReportShareTargetInput {
  publicWebBaseUrl: string;
  reportId: string;
  title: string;
}

export interface PublicSightingReportShareTarget {
  appDeepLink: string;
  message: string;
  path: string;
  title: string;
  webUrl: string;
}

export interface SightingReport {
  contactOption: SightingReportStoredContactOption;
  createdAt: string;
  direction: string;
  exactLocation: SightingReportExactLocation;
  id: string;
  observedAt: string;
  observedCondition: string;
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
  | "sighting_report_details_required"
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
}

export interface InMemorySightingReportRepositoryOptions {
  mediaAdapter?: PetProfileMediaAdapter;
  now?: () => string;
  publicWebBaseUrl?: string;
}

const defaultPublicWebBaseUrl = "https://rastro.bo";
const publicSightingReportPathPrefix = "/reportes/avistamientos";

function publicSightingReportPathForId(reportId: string) {
  return `${publicSightingReportPathPrefix}/${encodeURIComponent(reportId)}`;
}

function buildPublicSightingReportShareTarget({
  publicWebBaseUrl,
  reportId,
  title,
}: PublicSightingReportShareTargetInput): PublicSightingReportShareTarget {
  const path = publicSightingReportPathForId(reportId);
  const webUrl = `${publicWebBaseUrl.replace(/\/+$/, "")}${path}`;
  const shareTitle = `Avistamiento de mascota: ${title}`;

  return {
    appDeepLink: `rastro://${path.replace(/^\//, "")}`,
    message: `Ayuda a ubicar este avistamiento de ${title} en Rastro: ${webUrl}`,
    path,
    title: shareTitle,
    webUrl,
  };
}

export function createInMemorySightingReportRepository(
  options: InMemorySightingReportRepositoryOptions = {},
): SightingReportRepository {
  const mediaAdapter =
    options.mediaAdapter ?? createLocalPetProfileMediaAdapter();
  const now = options.now ?? (() => "2026-01-01T00:00:00.000Z");
  const publicWebBaseUrl = options.publicWebBaseUrl ?? defaultPublicWebBaseUrl;
  const reports: SightingReport[] = [];

  return {
    getPublicSightingReport(_session, reportId) {
      const report = reports.find(
        (candidate) =>
          candidate.id === reportId && candidate.status === "active",
      );

      return Promise.resolve(
        report ? toPublicSightingReportDetail(report) : null,
      );
    },
    async publishSightingReport(session, input) {
      assertMemberCanPublishSightingReport(session);
      assertPublishInput(input);

      const createdAt = now();
      const id = `sighting-report-${reports.length + 1}`;
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
        observedAt: input.observedAt,
        observedCondition: input.observedCondition.trim(),
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
  };
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

function assertPublishInput(input: PublishSightingReportInput) {
  if (
    !Number.isFinite(input.exactLocation.latitude) ||
    !Number.isFinite(input.exactLocation.longitude) ||
    input.exactLocation.locationCellLabel.trim().length === 0
  ) {
    throw new SightingReportRepositoryError(
      "exact_location_required",
      "An Exact Location in Bolivia is required for a Sighting Report.",
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
      "La busqueda necesita una ubicacion resuelta en Bolivia para el radio PostGIS.",
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
      label: input.exactLocation.addressLabel ?? "Ubicacion exacta",
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
  return {
    contactOptions: buildPublicContactOptions(report),
    description: report.sightingDescription,
    direction: {
      label: "Direccion",
      value: report.direction,
    },
    kind: "sighting-report",
    observedAt: {
      label: "Vista",
      value: report.observedAt,
    },
    observedCondition: {
      label: "Condicion observada",
      value: report.observedCondition,
    },
    pet: { ...report.petSnapshot },
    photos: report.photos.map(clonePhotoAsset),
    publicLocation: toPublicDetailLocation(report.publicLocation),
    reportLabel: "Reporte de avistamiento",
    shareTarget: { ...report.shareTarget },
    statusLabel: "Reporte activo",
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
    "Ubicacion exacta compartida por quien reporto el avistamiento.",
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
