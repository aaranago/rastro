import type {
  PetProfilePhoto,
  PetProfileSummary,
  PetProfileType,
} from "../pet-profiles/pet-profile-types";

export const adoptionListingPetTypeOptions = [
  "Perro",
  "Gato",
  "Ave",
  "Conejo",
  "Otro",
] as const;

export type AdoptionListingPetType =
  (typeof adoptionListingPetTypeOptions)[number];

export interface AdoptionListingPhoto {
  alt?: string;
  id: string;
  status?: "draft" | "ready" | "uploading" | "error";
  thumbUri?: string;
  uri?: string;
}

export interface AdoptionListingPetProfileOption {
  breed: string;
  description: string;
  id: string;
  name: string;
  photos: AdoptionListingPhoto[];
  type: PetProfileType;
}

export interface AdoptionListingInlinePetProfileDraft {
  breed: string;
  description: string;
  name: string;
  type: AdoptionListingPetType | "";
}

export type AdoptionListingPetSelectionMode = "existing" | "inline-create";

export interface AdoptionListingCoordinates {
  latitude: number;
  longitude: number;
}

export interface AdoptionListingCreationExactLocation {
  addressLabel: string;
  coordinates: AdoptionListingCoordinates;
  department: string;
  locationCellLabel: string;
  municipality: string;
  neighborhood?: string;
}

export interface AdoptionListingDetailsDraft {
  adoptionSummary: string;
  healthNotes: string;
  idealHome: string;
}

export interface AdoptionListingContactDraft {
  inAppChatEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappPhone: string;
}

export type AdoptionListingContactChoice = "chat" | "whatsapp" | "both";

export interface AdoptionListingDraft {
  adoptionDetails: AdoptionListingDetailsDraft;
  contact: AdoptionListingContactDraft;
  exactLocation?: AdoptionListingCreationExactLocation;
  id?: string;
  inlinePet: AdoptionListingInlinePetProfileDraft;
  petProfileId?: string;
  petSelectionMode: AdoptionListingPetSelectionMode;
  photos: AdoptionListingPhoto[];
  showExactPinPublicly: boolean;
}

export interface AdoptionListingVerificationBadgeDraft {
  label: string;
}

export type AdoptionListingCreationSession =
  | {
      kind: "visitor";
    }
  | {
      displayName?: string;
      kind: "member";
      memberId: string;
      verificationBadge?: AdoptionListingVerificationBadgeDraft;
    };

export function toAdoptionListingPetProfileOption(
  profile: AdoptionListingPetProfileOption | PetProfileSummary,
): AdoptionListingPetProfileOption {
  return {
    breed: profile.breed,
    description: profile.description,
    id: profile.id,
    name: profile.name,
    photos: profile.photos.map(toAdoptionListingPhoto),
    type: profile.type,
  };
}

function toAdoptionListingPhoto(
  photo: AdoptionListingPhoto | PetProfilePhoto,
): AdoptionListingPhoto {
  return {
    alt: photo.alt,
    id: photo.id,
    status: photo.status,
    thumbUri:
      photo.thumbUri ??
      ("thumbnail" in photo ? photo.thumbnail?.uri : undefined),
    uri: photo.uri,
  };
}
