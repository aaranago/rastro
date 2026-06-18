import type {
  PetProfilesSessionState,
  PetProfileType,
} from "../pet-profiles/pet-profile-types";
import type {
  PetProfileMediaAdapter,
  PetProfilePhotoAsset,
  PetProfilePhotoSource,
} from "../pet-profiles/pet-profiles";
import { findWithinRadius } from "../geo/distance";
import { createLocalPetProfileMediaAdapter } from "../pet-profiles/pet-profiles";

export type FoundReportsSessionState = PetProfilesSessionState;
export type FoundPetReportStatus = "active" | "closed";
export type FoundPetReportBoliviaCountryCode = "BO";
export type FoundPetReportSearchLocationSource = "current" | "last" | "manual";
export type FoundPetReportAlertRadiusKm = 5 | 10 | 20;
export type FoundPetReportSearchStrategy = "postgis_radius";

export interface FoundPetReportSearchCoordinates {
  latitude: number;
  longitude: number;
}

export interface FoundPetReportSearchLocation {
  coordinates: FoundPetReportSearchCoordinates;
  countryCode: FoundPetReportBoliviaCountryCode;
  label: string;
  locationCellLabel: string;
  source: FoundPetReportSearchLocationSource;
}

export interface FoundPetReportExactLocation {
  addressLabel?: string;
  countryCode: FoundPetReportBoliviaCountryCode;
  latitude: number;
  locationCellLabel: string;
  longitude: number;
}

export type FoundPetReportPublicLocation =
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

export type FoundPetReportContactOption =
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

export interface FoundPetReportStoredContactOption {
  kind: "both" | "in-app-chat" | "whatsapp";
  phoneNumber?: string;
}

export interface FoundPetReportPetSnapshot {
  breed: string;
  description: string;
  type: PetProfileType;
}

export interface PublishFoundPetReportInput {
  condition: string;
  contactOption: FoundPetReportContactOption;
  exactLocation: FoundPetReportExactLocation;
  foundAt: string;
  foundDescription: string;
  pet: FoundPetReportPetSnapshot;
  photos: readonly PetProfilePhotoSource[];
  showExactPublicLocation?: boolean;
}

interface PublicFoundReportShareTargetInput {
  publicWebBaseUrl: string;
  reportId: string;
  title: string;
}

export interface PublicFoundReportShareTarget {
  appDeepLink: string;
  message: string;
  path: string;
  title: string;
  webUrl: string;
}

export interface FoundPetReport {
  condition: string;
  contactOption: FoundPetReportStoredContactOption;
  createdAt: string;
  exactLocation: FoundPetReportExactLocation;
  foundAt: string;
  foundDescription: string;
  id: string;
  petSnapshot: FoundPetReportPetSnapshot;
  photos: PetProfilePhotoAsset[];
  publicLocation: FoundPetReportPublicLocation;
  reporterMemberId: string;
  shareTarget: PublicFoundReportShareTarget;
  status: FoundPetReportStatus;
  updatedAt: string;
}

export interface SearchActiveFoundPetReportsQuery {
  location: FoundPetReportSearchLocation;
  radiusKm: FoundPetReportAlertRadiusKm;
  strategy: FoundPetReportSearchStrategy;
}

export interface FoundPetReportSearchSummary {
  breed: string;
  condition: string;
  distanceMeters: number;
  foundAt: string;
  foundDescription: string;
  id: string;
  locationCellLabel: string;
  petDescription: string;
  photoUrl?: string;
  publicLocation: FoundPetReportPublicLocation;
  shareTarget: PublicFoundReportShareTarget;
  species: PetProfileType;
  title: string;
}

export interface SearchActiveFoundPetReportsResult {
  generatedAt: string;
  query: SearchActiveFoundPetReportsQuery;
  radiusMeters: number;
  reports: FoundPetReportSearchSummary[];
  searchStrategy: FoundPetReportSearchStrategy;
}

export interface PublicFoundPetReportDetail {
  condition: {
    label: string;
    value: string;
  };
  contactOptions: PublicFoundPetReportContactOption[];
  description: string;
  foundAt: {
    label: string;
    value: string;
  };
  kind: "found-pet-report";
  pet: FoundPetReportPetSnapshot;
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
  shareTarget: PublicFoundReportShareTarget;
  statusLabel: string;
  title: string;
}

export type PublicFoundPetReportContactOption =
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

type FoundPetReportRepositoryErrorCode =
  | "exact_location_required"
  | "found_report_photo_required"
  | "search_location_required"
  | "visitor_cannot_publish_found_report"
  | "whatsapp_phone_required";

class FoundPetReportRepositoryError extends Error {
  code: FoundPetReportRepositoryErrorCode;

  constructor(code: FoundPetReportRepositoryErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "FoundPetReportRepositoryError";
  }
}

export interface FoundPetReportRepository {
  getPublicFoundPetReport: (
    session: FoundReportsSessionState,
    reportId: string,
  ) => Promise<PublicFoundPetReportDetail | null>;
  publishFoundPetReport: (
    session: FoundReportsSessionState,
    input: PublishFoundPetReportInput,
  ) => Promise<FoundPetReport>;
  searchActiveFoundPetReports: (
    session: FoundReportsSessionState,
    query: SearchActiveFoundPetReportsQuery,
  ) => Promise<SearchActiveFoundPetReportsResult>;
}

export interface InMemoryFoundPetReportRepositoryOptions {
  mediaAdapter?: PetProfileMediaAdapter;
  now?: () => string;
  publicWebBaseUrl?: string;
}

const defaultPublicWebBaseUrl = "https://rastro.bo";
const publicFoundReportPathPrefix = "/reportes/encontrados";

function publicFoundReportPathForId(reportId: string) {
  return `${publicFoundReportPathPrefix}/${encodeURIComponent(reportId)}`;
}

function buildPublicFoundReportShareTarget({
  publicWebBaseUrl,
  reportId,
  title,
}: PublicFoundReportShareTargetInput): PublicFoundReportShareTarget {
  const path = publicFoundReportPathForId(reportId);
  const webUrl = `${publicWebBaseUrl.replace(/\/+$/, "")}${path}`;
  const shareTitle = `Mascota encontrada: ${title}`;

  return {
    appDeepLink: `rastro://${path.replace(/^\//, "")}`,
    message: `Ayuda a reunir a ${title} en Rastro: ${webUrl}`,
    path,
    title: shareTitle,
    webUrl,
  };
}

export function createInMemoryFoundPetReportRepository(
  options: InMemoryFoundPetReportRepositoryOptions = {},
): FoundPetReportRepository {
  const mediaAdapter =
    options.mediaAdapter ?? createLocalPetProfileMediaAdapter();
  const now = options.now ?? (() => "2026-01-01T00:00:00.000Z");
  const publicWebBaseUrl = options.publicWebBaseUrl ?? defaultPublicWebBaseUrl;
  const reports: FoundPetReport[] = [];

  return {
    getPublicFoundPetReport(_session, reportId) {
      const report = reports.find(
        (candidate) =>
          candidate.id === reportId && candidate.status === "active",
      );

      return Promise.resolve(
        report ? toPublicFoundPetReportDetail(report) : null,
      );
    },
    async publishFoundPetReport(session, input) {
      assertMemberCanPublishFoundPetReport(session);
      assertPublishInput(input);

      const createdAt = now();
      const id = `found-report-${reports.length + 1}`;
      const petSnapshot = {
        breed: input.pet.breed.trim(),
        description: input.pet.description.trim(),
        type: input.pet.type,
      };
      const report: FoundPetReport = {
        condition: input.condition.trim(),
        contactOption: normalizeContactOption(input.contactOption),
        createdAt,
        exactLocation: cloneExactLocation(input.exactLocation),
        foundAt: input.foundAt,
        foundDescription: input.foundDescription.trim(),
        id,
        petSnapshot,
        photos: await mediaAdapter.normalizePhotos(input.photos),
        publicLocation: buildPublicLocation(input),
        reporterMemberId: session.memberId,
        shareTarget: buildPublicFoundReportShareTarget({
          publicWebBaseUrl,
          reportId: id,
          title: petSnapshot.type,
        }),
        status: "active",
        updatedAt: createdAt,
      };

      reports.push(report);

      return cloneFoundPetReport(report);
    },
    searchActiveFoundPetReports(_session, query) {
      assertSearchQuery(query);

      const generatedAt = now();
      const radiusMeters = query.radiusKm * 1000;
      const matchingReports = findWithinRadius({
        center: query.location.coordinates,
        getLocation: (report) => report.exactLocation,
        items: reports.filter((report) => report.status === "active"),
        radiusMeters,
      })
        .sort((left, right) => left.distanceMeters - right.distanceMeters)
        .map(({ distanceMeters, report }) =>
          toFoundPetReportSearchSummary({
            distanceMeters,
            report,
          }),
        );

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

function assertMemberCanPublishFoundPetReport(
  session: FoundReportsSessionState,
): asserts session is Extract<FoundReportsSessionState, { kind: "member" }> {
  if (session.kind === "visitor") {
    throw new FoundPetReportRepositoryError(
      "visitor_cannot_publish_found_report",
      "Visitors cannot publish Found Pet Reports.",
    );
  }
}

function assertPublishInput(input: PublishFoundPetReportInput) {
  if (
    !Number.isFinite(input.exactLocation.latitude) ||
    !Number.isFinite(input.exactLocation.longitude) ||
    input.exactLocation.locationCellLabel.trim().length === 0
  ) {
    throw new FoundPetReportRepositoryError(
      "exact_location_required",
      "An Exact Location in Bolivia is required for a Found Pet Report.",
    );
  }

  if (input.photos.length === 0) {
    throw new FoundPetReportRepositoryError(
      "found_report_photo_required",
      "At least one photo is required to publish a Found Pet Report.",
    );
  }

  if (
    contactOptionNeedsWhatsappNumber(input.contactOption) &&
    !input.contactOption.phoneNumber?.trim()
  ) {
    throw new FoundPetReportRepositoryError(
      "whatsapp_phone_required",
      "WhatsApp number is required when WhatsApp Contact Option is selected.",
    );
  }
}

function assertSearchQuery(query: SearchActiveFoundPetReportsQuery) {
  if (
    !Number.isFinite(query.location.coordinates.latitude) ||
    !Number.isFinite(query.location.coordinates.longitude)
  ) {
    throw new FoundPetReportRepositoryError(
      "search_location_required",
      "La busqueda necesita una ubicacion resuelta en Bolivia para el radio PostGIS.",
    );
  }
}

function buildPublicLocation(
  input: PublishFoundPetReportInput,
): FoundPetReportPublicLocation {
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
  contactOption: FoundPetReportContactOption,
): FoundPetReportStoredContactOption {
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

function toPublicFoundPetReportDetail(
  report: FoundPetReport,
): PublicFoundPetReportDetail {
  return {
    condition: {
      label: "Condicion",
      value: report.condition,
    },
    contactOptions: buildPublicContactOptions(report),
    description: report.foundDescription,
    foundAt: {
      label: "Encontrada",
      value: report.foundAt,
    },
    kind: "found-pet-report",
    pet: { ...report.petSnapshot },
    photos: report.photos.map(clonePhotoAsset),
    publicLocation: toPublicDetailLocation(report.publicLocation),
    reportLabel: "Reporte de mascota encontrada",
    shareTarget: { ...report.shareTarget },
    statusLabel: "Reporte activo",
    title: `${report.petSnapshot.type} encontrado`,
  };
}

function toFoundPetReportSearchSummary({
  distanceMeters,
  report,
}: {
  distanceMeters: number;
  report: FoundPetReport;
}): FoundPetReportSearchSummary {
  const primaryPhoto = report.photos[0];

  return {
    breed: report.petSnapshot.breed,
    condition: report.condition,
    distanceMeters: Math.round(distanceMeters),
    foundAt: report.foundAt,
    foundDescription: report.foundDescription,
    id: report.id,
    locationCellLabel: report.exactLocation.locationCellLabel,
    petDescription: report.petSnapshot.description,
    photoUrl: primaryPhoto?.thumbnail.uri ?? primaryPhoto?.uri,
    publicLocation: { ...report.publicLocation },
    shareTarget: { ...report.shareTarget },
    species: report.petSnapshot.type,
    title: `${report.petSnapshot.type} encontrado`,
  };
}

function buildPublicContactOptions(
  report: FoundPetReport,
): PublicFoundPetReportContactOption[] {
  const options: PublicFoundPetReportContactOption[] = [];

  if (
    report.contactOption.kind === "in-app-chat" ||
    report.contactOption.kind === "both"
  ) {
    options.push({
      href: report.shareTarget.appDeepLink,
      kind: "in-app-chat",
      label: "Enviar mensaje en Rastro",
    });
  }

  if (
    report.contactOption.kind === "whatsapp" ||
    report.contactOption.kind === "both"
  ) {
    const phoneNumber = report.contactOption.phoneNumber ?? "";

    options.push({
      href: `https://wa.me/${phoneNumber.replace(/\D/g, "")}`,
      kind: "whatsapp",
      label: "Escribir por WhatsApp",
      phoneNumber,
    });
  }

  return options;
}

function toPublicDetailLocation(
  publicLocation: FoundPetReportPublicLocation,
): PublicFoundPetReportDetail["publicLocation"] {
  if (publicLocation.kind === "exact") {
    return {
      address: publicLocation.addressLabel,
      coordinates: {
        latitude: publicLocation.latitude,
        longitude: publicLocation.longitude,
      },
      label: publicLocation.label,
      privacyNote: "Ubicacion exacta compartida por quien encontro la mascota.",
      type: "exact",
    };
  }

  return {
    label: publicLocation.label,
    privacyNote: "Zona aproximada compartida por seguridad.",
    type: "approximate",
  };
}

function cloneFoundPetReport(report: FoundPetReport): FoundPetReport {
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
  query: SearchActiveFoundPetReportsQuery,
): SearchActiveFoundPetReportsQuery {
  return {
    ...query,
    location: {
      ...query.location,
      coordinates: { ...query.location.coordinates },
    },
  };
}

function cloneExactLocation(
  location: FoundPetReportExactLocation,
): FoundPetReportExactLocation {
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
  contactOption: FoundPetReportContactOption,
) {
  return contactOption.kind === "whatsapp" || contactOption.kind === "both";
}
