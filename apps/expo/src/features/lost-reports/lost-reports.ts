import type {
  PetProfilesSessionState,
  PetProfileType,
} from "../pet-profiles/pet-profile-types";
import type {
  CreatePetProfileInput,
  PetProfileMediaAdapter,
  PetProfilePhotoAsset,
  PetProfilePhotoSource,
  PetProfileRepository,
} from "../pet-profiles/pet-profiles";
import {
  createInMemoryPetProfileRepository,
  createLocalPetProfileMediaAdapter,
} from "../pet-profiles/pet-profiles";

export type LostReportsSessionState = PetProfilesSessionState;
export type LostPetReportOutcome = "still-missing";
export type LostPetReportStatus = "active" | "closed";
export type LostPetReportBoliviaCountryCode = "BO";
export type LostPetReportSearchLocationSource = "current" | "last" | "manual";
export type LostPetReportAlertRadiusKm = 5 | 10 | 20;
export type LostPetReportSearchStrategy = "postgis_radius";

export interface LostPetReportSearchCoordinates {
  latitude: number;
  longitude: number;
}

export interface LostPetReportSearchLocation {
  coordinates: LostPetReportSearchCoordinates;
  countryCode: LostPetReportBoliviaCountryCode;
  label: string;
  locationCellLabel: string;
  source: LostPetReportSearchLocationSource;
}

export interface LostPetReportExactLocation {
  addressLabel?: string;
  countryCode: LostPetReportBoliviaCountryCode;
  latitude: number;
  locationCellLabel: string;
  longitude: number;
}

export type LostPetReportPublicLocation =
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

export type LostPetReportContactOption =
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

export interface LostPetReportStoredContactOption {
  kind: "both" | "in-app-chat" | "whatsapp";
  phoneNumber?: string;
}

export type LostPetReportPetProfileSelection =
  | {
      kind: "existing";
      petProfileId: string;
    }
  | {
      kind: "inline";
      profile: CreatePetProfileInput;
    };

export interface PublishLostPetReportInput {
  contactOption: LostPetReportContactOption;
  exactLocation: LostPetReportExactLocation;
  lastSeenAt: string;
  lastSeenDescription: string;
  petProfile: LostPetReportPetProfileSelection;
  photos: readonly PetProfilePhotoSource[];
  shareExactLocation?: boolean;
  showExactPublicLocation?: boolean;
}

export interface LostPetReportPetSnapshot {
  breed: string;
  description: string;
  name: string;
  type: PetProfileType;
}

export interface LostPetReport {
  caretakerMemberId: string;
  contactOption: LostPetReportStoredContactOption;
  createdAt: string;
  exactLocation: LostPetReportExactLocation;
  id: string;
  lastSeenAt: string;
  lastSeenDescription: string;
  outcome: LostPetReportOutcome;
  petName: string;
  petProfileId: string;
  petSnapshot: LostPetReportPetSnapshot;
  photos: PetProfilePhotoAsset[];
  publicLocation: LostPetReportPublicLocation;
  status: LostPetReportStatus;
  updatedAt: string;
}

export interface SearchActiveLostPetReportsQuery {
  location: LostPetReportSearchLocation;
  radiusKm: LostPetReportAlertRadiusKm;
  strategy: LostPetReportSearchStrategy;
}

export interface LostPetReportSearchSummary {
  alertPriority: "standard" | "urgent";
  breed: string;
  distanceMeters: number;
  id: string;
  lastSeenAt: string;
  lastSeenDescription: string;
  locationCellLabel: string;
  petName: string;
  photoUrl?: string;
  publicLocation: LostPetReportPublicLocation;
  species: PetProfileType;
}

export interface SearchActiveLostPetReportsResult {
  generatedAt: string;
  query: SearchActiveLostPetReportsQuery;
  radiusMeters: number;
  reports: LostPetReportSearchSummary[];
  searchStrategy: LostPetReportSearchStrategy;
}

type LostPetReportRepositoryErrorCode =
  | "exact_location_required"
  | "lost_report_photo_required"
  | "pet_profile_not_found"
  | "search_location_required"
  | "visitor_cannot_publish_lost_report"
  | "whatsapp_phone_required";

class LostPetReportRepositoryError extends Error {
  code: LostPetReportRepositoryErrorCode;

  constructor(code: LostPetReportRepositoryErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "LostPetReportRepositoryError";
  }
}

export interface LostPetReportRepository {
  publishLostPetReport: (
    session: LostReportsSessionState,
    input: PublishLostPetReportInput,
  ) => Promise<LostPetReport>;
  searchActiveLostPetReports: (
    session: LostReportsSessionState,
    query: SearchActiveLostPetReportsQuery,
  ) => Promise<SearchActiveLostPetReportsResult>;
}

export interface InMemoryLostPetReportRepositoryOptions {
  mediaAdapter?: PetProfileMediaAdapter;
  now?: () => string;
  petProfiles?: PetProfileRepository;
}

export function createInMemoryLostPetReportRepository(
  options: InMemoryLostPetReportRepositoryOptions = {},
): LostPetReportRepository {
  const mediaAdapter =
    options.mediaAdapter ?? createLocalPetProfileMediaAdapter();
  const now = options.now ?? (() => "2026-01-01T00:00:00.000Z");
  const petProfiles =
    options.petProfiles ??
    createInMemoryPetProfileRepository({
      mediaAdapter,
      now,
    });
  const reports: LostPetReport[] = [];

  return {
    async publishLostPetReport(session, input) {
      assertMemberCanPublishLostPetReport(session);
      assertPublishInput(input);

      const petProfile = await resolvePetProfile({
        input: input.petProfile,
        petProfiles,
        session,
      });
      const createdAt = now();
      const report: LostPetReport = {
        caretakerMemberId: petProfile.caretakerMemberId,
        contactOption: normalizeContactOption(input.contactOption),
        createdAt,
        exactLocation: cloneExactLocation(input.exactLocation),
        id: `lost-report-${reports.length + 1}`,
        lastSeenAt: input.lastSeenAt,
        lastSeenDescription: input.lastSeenDescription.trim(),
        outcome: "still-missing",
        petName: petProfile.name,
        petProfileId: petProfile.id,
        petSnapshot: {
          breed: petProfile.breed,
          description: petProfile.description,
          name: petProfile.name,
          type: petProfile.type,
        },
        photos: await mediaAdapter.normalizePhotos(input.photos),
        publicLocation: buildPublicLocation(input),
        status: "active",
        updatedAt: createdAt,
      };

      reports.push(report);

      return cloneLostPetReport(report);
    },
    searchActiveLostPetReports(_session, query) {
      assertSearchQuery(query);

      const generatedAt = now();
      const radiusMeters = query.radiusKm * 1000;
      const matchingReports = reports
        .filter((report) => report.status === "active")
        .map((report) => ({
          distanceMeters: calculateDistanceMeters(
            query.location.coordinates,
            report.exactLocation,
          ),
          report,
        }))
        .filter((match) => match.distanceMeters <= radiusMeters)
        .sort(createLostPetReportSearchComparator(generatedAt))
        .map(({ distanceMeters, report }) =>
          toLostPetReportSearchSummary({
            distanceMeters,
            generatedAt,
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

function assertMemberCanPublishLostPetReport(
  session: LostReportsSessionState,
): asserts session is Extract<LostReportsSessionState, { kind: "member" }> {
  if (session.kind === "visitor") {
    throw new LostPetReportRepositoryError(
      "visitor_cannot_publish_lost_report",
      "Visitors cannot publish Lost Pet Reports.",
    );
  }
}

function assertPublishInput(input: PublishLostPetReportInput) {
  if (
    !Number.isFinite(input.exactLocation.latitude) ||
    !Number.isFinite(input.exactLocation.longitude) ||
    input.exactLocation.locationCellLabel.trim().length === 0
  ) {
    throw new LostPetReportRepositoryError(
      "exact_location_required",
      "An Exact Location in Bolivia is required for a Lost Pet Report.",
    );
  }

  if (input.photos.length === 0) {
    throw new LostPetReportRepositoryError(
      "lost_report_photo_required",
      "At least one photo is required to publish a Lost Pet Report.",
    );
  }

  if (
    contactOptionNeedsWhatsappNumber(input.contactOption) &&
    !input.contactOption.phoneNumber?.trim()
  ) {
    throw new LostPetReportRepositoryError(
      "whatsapp_phone_required",
      "WhatsApp number is required when WhatsApp Contact Option is selected.",
    );
  }
}

function assertSearchQuery(query: SearchActiveLostPetReportsQuery) {
  if (
    !Number.isFinite(query.location.coordinates.latitude) ||
    !Number.isFinite(query.location.coordinates.longitude)
  ) {
    throw new LostPetReportRepositoryError(
      "search_location_required",
      "La busqueda necesita una ubicacion resuelta en Bolivia para el radio PostGIS.",
    );
  }
}

async function resolvePetProfile({
  input,
  petProfiles,
  session,
}: {
  input: LostPetReportPetProfileSelection;
  petProfiles: PetProfileRepository;
  session: Extract<LostReportsSessionState, { kind: "member" }>;
}) {
  if (input.kind === "inline") {
    return petProfiles.createPetProfile(session, input.profile);
  }

  const petProfile = await petProfiles.getPetProfile(
    session,
    input.petProfileId,
  );

  if (!petProfile) {
    throw new LostPetReportRepositoryError(
      "pet_profile_not_found",
      "Pet Profile was not found for this Member.",
    );
  }

  return petProfile;
}

function buildPublicLocation(
  input: PublishLostPetReportInput,
): LostPetReportPublicLocation {
  if (
    input.showExactPublicLocation === true ||
    input.shareExactLocation === true
  ) {
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
  contactOption: LostPetReportContactOption,
): LostPetReportStoredContactOption {
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

function cloneLostPetReport(report: LostPetReport): LostPetReport {
  return {
    ...report,
    contactOption: { ...report.contactOption },
    exactLocation: cloneExactLocation(report.exactLocation),
    petSnapshot: { ...report.petSnapshot },
    photos: report.photos.map(clonePhotoAsset),
    publicLocation: { ...report.publicLocation },
  };
}

function cloneSearchQuery(
  query: SearchActiveLostPetReportsQuery,
): SearchActiveLostPetReportsQuery {
  return {
    ...query,
    location: {
      ...query.location,
      coordinates: { ...query.location.coordinates },
    },
  };
}

function toLostPetReportSearchSummary({
  distanceMeters,
  generatedAt,
  report,
}: {
  distanceMeters: number;
  generatedAt: string;
  report: LostPetReport;
}): LostPetReportSearchSummary {
  const primaryPhoto = report.photos[0];

  return {
    alertPriority: getAlertPriority(report, generatedAt),
    breed: report.petSnapshot.breed,
    distanceMeters: Math.round(distanceMeters),
    id: report.id,
    lastSeenAt: report.lastSeenAt,
    lastSeenDescription: report.lastSeenDescription,
    locationCellLabel: report.exactLocation.locationCellLabel,
    petName: report.petName,
    photoUrl: primaryPhoto?.thumbnail.uri ?? primaryPhoto?.uri,
    publicLocation: { ...report.publicLocation },
    species: report.petSnapshot.type,
  };
}

function createLostPetReportSearchComparator(generatedAt: string) {
  return (
    left: { distanceMeters: number; report: LostPetReport },
    right: { distanceMeters: number; report: LostPetReport },
  ) => {
    const priority =
      getAlertPriorityScore(right.report, generatedAt) -
      getAlertPriorityScore(left.report, generatedAt);

    if (priority !== 0) {
      return priority;
    }

    return left.distanceMeters - right.distanceMeters;
  };
}

function getAlertPriority(report: LostPetReport, generatedAt: string) {
  return isUrgentLostPetReport(report, generatedAt) ? "urgent" : "standard";
}

function getAlertPriorityScore(report: LostPetReport, generatedAt: string) {
  return isUrgentLostPetReport(report, generatedAt) ? 1 : 0;
}

function isUrgentLostPetReport(report: LostPetReport, generatedAt: string) {
  const lastSeenAtMs = Date.parse(report.lastSeenAt);
  const generatedAtMs = Date.parse(generatedAt);

  if (!Number.isFinite(lastSeenAtMs) || !Number.isFinite(generatedAtMs)) {
    return false;
  }

  const oneDayMs = 24 * 60 * 60 * 1000;

  const ageMs = generatedAtMs - lastSeenAtMs;

  return ageMs >= 0 && ageMs <= oneDayMs;
}

function calculateDistanceMeters(
  from: LostPetReportSearchCoordinates,
  to: LostPetReportExactLocation,
) {
  const earthRadiusMeters = 6_371_000;
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const centralAngle =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusMeters * centralAngle;
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function cloneExactLocation(
  location: LostPetReportExactLocation,
): LostPetReportExactLocation {
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
  contactOption: LostPetReportContactOption,
) {
  return contactOption.kind === "whatsapp" || contactOption.kind === "both";
}
