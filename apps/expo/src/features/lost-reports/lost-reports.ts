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
export type BoliviaCountryCode = "BO";

export interface LostPetReportExactLocation {
  addressLabel?: string;
  countryCode: BoliviaCountryCode;
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

type LostPetReportRepositoryErrorCode =
  | "exact_location_required"
  | "lost_report_photo_required"
  | "pet_profile_not_found"
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
