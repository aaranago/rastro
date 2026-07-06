import type { PublicAdoptionListingShareTarget } from "@acme/validators";
import { buildPublicAdoptionListingShareTarget } from "@acme/validators";

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
import type {
  SubmitTrustSafetyReportInput,
  TrustSafetyReportReceipt,
  TrustSafetyRepository,
} from "../trust-safety";
import {
  createInMemoryPetProfileRepository,
  createLocalPetProfileMediaAdapter,
} from "../pet-profiles/pet-profiles";
import {
  buildPublicReportContactOptions,
  summarizeActiveReportsWithinRadius,
  toPublicReportDetailLocation,
} from "../reports/report-repository-utils";
import { createInMemoryTrustSafetyRepository } from "../trust-safety";

export type AdoptionListingsSessionState =
  | {
      kind: "visitor";
    }
  | {
      displayName?: string;
      kind: "member";
      memberId: string;
      verificationBadge?: AdoptionListingVerificationBadge;
    };

export interface AdoptionListingVerificationBadge {
  label: string;
}

export type AdoptionListingStatus = "active" | "closed";
export type AdoptionListingBoliviaCountryCode = "BO";
export type AdoptionListingSearchLocationSource = "current" | "last" | "manual";
export type AdoptionListingAlertRadiusKm = 5 | 10 | 20;
export type AdoptionListingSearchStrategy = "postgis_radius";

export interface AdoptionListingSearchCoordinates {
  latitude: number;
  longitude: number;
}

export interface AdoptionListingSearchLocation {
  coordinates: AdoptionListingSearchCoordinates;
  countryCode: AdoptionListingBoliviaCountryCode;
  label: string;
  locationCellLabel: string;
  source: AdoptionListingSearchLocationSource;
}

export interface AdoptionListingExactLocation {
  addressLabel?: string;
  countryCode: AdoptionListingBoliviaCountryCode;
  latitude: number;
  locationCellLabel: string;
  longitude: number;
}

export type AdoptionListingPublicLocation =
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

export type AdoptionListingContactOption =
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

export interface AdoptionListingStoredContactOption {
  kind: "both" | "in-app-chat" | "whatsapp";
  phoneNumber?: string;
}

export type AdoptionListingPetProfileSelection =
  | {
      kind: "existing";
      petProfileId: string;
      profile?: Omit<CreatePetProfileInput, "photos">;
    }
  | {
      kind: "inline";
      profile: CreatePetProfileInput;
    };

export interface PublishAdoptionListingInput {
  adoptionSummary: string;
  contactOption: AdoptionListingContactOption;
  exactLocation: AdoptionListingExactLocation;
  healthNotes?: string;
  idempotencyKey?: string;
  idealHome?: string;
  petProfile: AdoptionListingPetProfileSelection;
  photos: readonly PetProfilePhotoSource[];
  showExactPublicLocation?: boolean;
}

export interface AdoptionListingPetSnapshot {
  breed: string;
  description: string;
  name: string;
  type: PetProfileType;
}

export interface AdoptionListing {
  adoptionSummary: string;
  contactOption: AdoptionListingStoredContactOption;
  createdAt: string;
  exactLocation: AdoptionListingExactLocation;
  healthNotes?: string;
  id: string;
  idealHome?: string;
  petName: string;
  petProfileId: string;
  petSnapshot: AdoptionListingPetSnapshot;
  photos: PetProfilePhotoAsset[];
  publicLocation: AdoptionListingPublicLocation;
  shareTarget: PublicAdoptionListingShareTarget;
  status: AdoptionListingStatus;
  updatedAt: string;
  verificationBadge?: AdoptionListingVerificationBadge;
}

export interface SearchActiveAdoptionListingsQuery {
  location: AdoptionListingSearchLocation;
  radiusKm: AdoptionListingAlertRadiusKm;
  strategy: AdoptionListingSearchStrategy;
}

export interface AdoptionListingSearchSummary {
  adoptionSummary: string;
  breed: string;
  coordinates: AdoptionListingSearchCoordinates;
  distanceMeters: number;
  healthNotes?: string;
  id: string;
  idealHome?: string;
  locationCellLabel: string;
  petDescription: string;
  petName: string;
  photoUrl?: string;
  publicLocation: AdoptionListingPublicLocation;
  publishedAt: string;
  shareTarget: PublicAdoptionListingShareTarget;
  species: PetProfileType;
  verificationBadge?: AdoptionListingVerificationBadge;
}

export interface SearchActiveAdoptionListingsResult {
  generatedAt: string;
  query: SearchActiveAdoptionListingsQuery;
  radiusMeters: number;
  listings: AdoptionListingSearchSummary[];
  searchStrategy: AdoptionListingSearchStrategy;
}

export interface PublicAdoptionListingDetail {
  adoptionSummary: string;
  contactOptions: PublicAdoptionListingContactOption[];
  healthNotes?: {
    label: string;
    value: string;
  };
  idealHome?: {
    label: string;
    value: string;
  };
  kind: "adoption-listing";
  pet: AdoptionListingPetSnapshot;
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
  shareTarget: PublicAdoptionListingShareTarget;
  statusLabel: string;
  title: string;
  verificationBadge: {
    label?: string;
    visible: boolean;
  };
}

export type PublicAdoptionListingContactOption =
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

type AdoptionListingRepositoryErrorCode =
  | "adoption_listing_photo_required"
  | "adoption_listing_summary_required"
  | "exact_location_required"
  | "pet_profile_not_found"
  | "search_location_required"
  | "visitor_cannot_publish_adoption_listing"
  | "whatsapp_phone_required";

class AdoptionListingRepositoryError extends Error {
  code: AdoptionListingRepositoryErrorCode;

  constructor(code: AdoptionListingRepositoryErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AdoptionListingRepositoryError";
  }
}

export interface AdoptionListingRepository {
  getPublicAdoptionListing: (
    session: AdoptionListingsSessionState,
    listingId: string,
  ) => Promise<PublicAdoptionListingDetail | null>;
  publishAdoptionListing: (
    session: AdoptionListingsSessionState,
    input: PublishAdoptionListingInput,
  ) => Promise<AdoptionListing>;
  searchActiveAdoptionListings: (
    session: AdoptionListingsSessionState,
    query: SearchActiveAdoptionListingsQuery,
  ) => Promise<SearchActiveAdoptionListingsResult>;
  reportAdoptionListing: (
    session: AdoptionListingsSessionState,
    input: ReportAdoptionListingInput,
  ) => Promise<TrustSafetyReportReceipt>;
}

export interface InMemoryAdoptionListingRepositoryOptions {
  listingIdFactory?: (sequence: number) => string;
  mediaAdapter?: PetProfileMediaAdapter;
  now?: () => string;
  petProfiles?: PetProfileRepository;
  publicWebBaseUrl?: string;
  trustSafety?: TrustSafetyRepository;
}

const defaultPublicWebBaseUrl = "https://rastro.bo";

export interface ReportAdoptionListingInput {
  detail?: string;
  listingId: string;
  reason: SubmitTrustSafetyReportInput["reason"];
}

export function createInMemoryAdoptionListingRepository(
  options: InMemoryAdoptionListingRepositoryOptions = {},
): AdoptionListingRepository {
  const mediaAdapter =
    options.mediaAdapter ?? createLocalPetProfileMediaAdapter();
  const now = options.now ?? (() => "2026-01-01T00:00:00.000Z");
  const petProfiles =
    options.petProfiles ??
    createInMemoryPetProfileRepository({
      mediaAdapter,
      now,
    });
  const publicWebBaseUrl = options.publicWebBaseUrl ?? defaultPublicWebBaseUrl;
  const listingIdFactory =
    options.listingIdFactory ?? createSequentialAdoptionListingId;
  const trustSafety =
    options.trustSafety ?? createInMemoryTrustSafetyRepository({ now });
  const listings: AdoptionListing[] = [];

  return {
    getPublicAdoptionListing(_session, listingId) {
      const listing = listings.find(
        (candidate) =>
          candidate.id === listingId && candidate.status === "active",
      );

      return Promise.resolve(
        listing ? toPublicAdoptionListingDetail(listing) : null,
      );
    },
    async publishAdoptionListing(session, input) {
      assertMemberCanPublishAdoptionListing(session);
      assertPublishInput(input);

      const petProfile = await resolvePetProfile({
        input: input.petProfile,
        petProfiles,
        session,
      });
      const createdAt = now();
      const id = listingIdFactory(listings.length + 1);
      const listing: AdoptionListing = {
        adoptionSummary: input.adoptionSummary.trim(),
        contactOption: normalizeContactOption(input.contactOption),
        createdAt,
        exactLocation: cloneExactLocation(input.exactLocation),
        healthNotes: optionalTrimmed(input.healthNotes),
        id,
        idealHome: optionalTrimmed(input.idealHome),
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
        shareTarget: buildPublicAdoptionListingShareTarget({
          listingId: id,
          publicWebBaseUrl,
          title: petProfile.name,
        }),
        status: "active",
        updatedAt: createdAt,
        verificationBadge: session.verificationBadge
          ? { ...session.verificationBadge }
          : undefined,
      };

      listings.push(listing);

      return cloneAdoptionListing(listing);
    },
    searchActiveAdoptionListings(_session, query) {
      assertSearchQuery(query);

      const generatedAt = now();
      const radiusMeters = query.radiusKm * 1000;
      const matchingListings = summarizeActiveReportsWithinRadius({
        center: query.location.coordinates,
        getLocation: (listing) => listing.exactLocation,
        reports: listings.filter((listing) => listing.status === "active"),
        radiusMeters,
        toSummary: toAdoptionListingSearchSummary,
      });

      return Promise.resolve({
        generatedAt,
        listings: matchingListings,
        query: cloneSearchQuery(query),
        radiusMeters,
        searchStrategy: "postgis_radius",
      });
    },
    reportAdoptionListing(session, input) {
      return trustSafety.submitReport({
        detail: optionalTrimmed(input.detail),
        reason: input.reason,
        reporterMemberId:
          session.kind === "member" ? session.memberId : undefined,
        targetId: input.listingId,
        targetType: "adoption_listing",
      });
    },
  };
}

function createSequentialAdoptionListingId(sequence: number) {
  return `22222222-2222-4222-8222-${String(sequence).padStart(12, "0")}`;
}

function assertMemberCanPublishAdoptionListing(
  session: AdoptionListingsSessionState,
): asserts session is Extract<
  AdoptionListingsSessionState,
  { kind: "member" }
> {
  if (session.kind === "visitor") {
    throw new AdoptionListingRepositoryError(
      "visitor_cannot_publish_adoption_listing",
      "Visitors cannot publish Adoption Listings.",
    );
  }
}

function assertPublishInput(input: PublishAdoptionListingInput) {
  if (
    !Number.isFinite(input.exactLocation.latitude) ||
    !Number.isFinite(input.exactLocation.longitude) ||
    input.exactLocation.locationCellLabel.trim().length === 0
  ) {
    throw new AdoptionListingRepositoryError(
      "exact_location_required",
      "Se necesita una ubicación exacta interna en Bolivia para publicar la adopción.",
    );
  }

  if (input.photos.length === 0) {
    throw new AdoptionListingRepositoryError(
      "adoption_listing_photo_required",
      "At least one photo is required to publish an Adoption Listing.",
    );
  }

  if (input.adoptionSummary.trim().length === 0) {
    throw new AdoptionListingRepositoryError(
      "adoption_listing_summary_required",
      "A care-focused adoption summary is required.",
    );
  }

  if (
    contactOptionNeedsWhatsappNumber(input.contactOption) &&
    !input.contactOption.phoneNumber?.trim()
  ) {
    throw new AdoptionListingRepositoryError(
      "whatsapp_phone_required",
      "WhatsApp number is required when WhatsApp Contact Option is selected.",
    );
  }
}

function assertSearchQuery(query: SearchActiveAdoptionListingsQuery) {
  if (
    !Number.isFinite(query.location.coordinates.latitude) ||
    !Number.isFinite(query.location.coordinates.longitude)
  ) {
    throw new AdoptionListingRepositoryError(
      "search_location_required",
      "La búsqueda necesita una ubicación resuelta en Bolivia para calcular el radio.",
    );
  }
}

async function resolvePetProfile({
  input,
  petProfiles,
  session,
}: {
  input: AdoptionListingPetProfileSelection;
  petProfiles: PetProfileRepository;
  session: Extract<AdoptionListingsSessionState, { kind: "member" }>;
}) {
  const petProfileSession: PetProfilesSessionState = {
    displayName: session.displayName,
    kind: "member",
    memberId: session.memberId,
  };

  if (input.kind === "inline") {
    return petProfiles.createPetProfile(petProfileSession, input.profile);
  }

  const petProfile = await petProfiles.getPetProfile(
    petProfileSession,
    input.petProfileId,
  );

  if (!petProfile) {
    throw new AdoptionListingRepositoryError(
      "pet_profile_not_found",
      "Pet Profile was not found for this Member.",
    );
  }

  return petProfile;
}

function buildPublicLocation(
  input: PublishAdoptionListingInput,
): AdoptionListingPublicLocation {
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
  contactOption: AdoptionListingContactOption,
): AdoptionListingStoredContactOption {
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

function toPublicAdoptionListingDetail(
  listing: AdoptionListing,
): PublicAdoptionListingDetail {
  return {
    adoptionSummary: listing.adoptionSummary,
    contactOptions: buildPublicContactOptions(listing),
    healthNotes: listing.healthNotes
      ? {
          label: "Salud y cuidados",
          value: listing.healthNotes,
        }
      : undefined,
    idealHome: listing.idealHome
      ? {
          label: "Hogar ideal",
          value: listing.idealHome,
        }
      : undefined,
    kind: "adoption-listing",
    pet: { ...listing.petSnapshot },
    photos: listing.photos.map(clonePhotoAsset),
    publicLocation: toPublicDetailLocation(listing.publicLocation),
    shareTarget: { ...listing.shareTarget },
    statusLabel: "Adopción activa",
    title: `${listing.petName} busca un hogar`,
    verificationBadge: {
      label: listing.verificationBadge?.label,
      visible: Boolean(listing.verificationBadge),
    },
  };
}

function toAdoptionListingSearchSummary({
  distanceMeters,
  report: listing,
}: {
  distanceMeters: number;
  report: AdoptionListing;
}): AdoptionListingSearchSummary {
  const primaryPhoto = listing.photos[0];

  return {
    adoptionSummary: listing.adoptionSummary,
    breed: listing.petSnapshot.breed,
    coordinates: {
      latitude: listing.exactLocation.latitude,
      longitude: listing.exactLocation.longitude,
    },
    distanceMeters: Math.round(distanceMeters),
    healthNotes: listing.healthNotes,
    id: listing.id,
    idealHome: listing.idealHome,
    locationCellLabel: listing.exactLocation.locationCellLabel,
    petDescription: listing.petSnapshot.description,
    petName: listing.petName,
    photoUrl: primaryPhoto?.thumbnail.uri ?? primaryPhoto?.uri,
    publicLocation: { ...listing.publicLocation },
    publishedAt: listing.createdAt,
    shareTarget: { ...listing.shareTarget },
    species: listing.petSnapshot.type,
    verificationBadge: listing.verificationBadge
      ? { ...listing.verificationBadge }
      : undefined,
  };
}

function buildPublicContactOptions(
  listing: AdoptionListing,
): PublicAdoptionListingContactOption[] {
  return buildPublicReportContactOptions({
    contactOption: listing.contactOption,
    shareTarget: listing.shareTarget,
  });
}

function toPublicDetailLocation(
  publicLocation: AdoptionListingPublicLocation,
): PublicAdoptionListingDetail["publicLocation"] {
  return toPublicReportDetailLocation(
    publicLocation,
    "Ubicación exacta compartida por quien publica la adopción.",
  );
}

function cloneAdoptionListing(listing: AdoptionListing): AdoptionListing {
  return {
    ...listing,
    contactOption: { ...listing.contactOption },
    exactLocation: cloneExactLocation(listing.exactLocation),
    petSnapshot: { ...listing.petSnapshot },
    photos: listing.photos.map(clonePhotoAsset),
    publicLocation: { ...listing.publicLocation },
    shareTarget: { ...listing.shareTarget },
    verificationBadge: listing.verificationBadge
      ? { ...listing.verificationBadge }
      : undefined,
  };
}

function cloneExactLocation(
  location: AdoptionListingExactLocation,
): AdoptionListingExactLocation {
  return { ...location };
}

function cloneSearchQuery(
  query: SearchActiveAdoptionListingsQuery,
): SearchActiveAdoptionListingsQuery {
  return {
    ...query,
    location: {
      ...query.location,
      coordinates: { ...query.location.coordinates },
    },
  };
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
  contactOption: AdoptionListingContactOption,
) {
  return contactOption.kind === "whatsapp" || contactOption.kind === "both";
}

function optionalTrimmed(value: string | undefined) {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : undefined;
}
