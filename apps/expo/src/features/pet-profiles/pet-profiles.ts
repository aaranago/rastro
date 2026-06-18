import type {
  PetProfilePhoto,
  PetProfilePhotoCompressionMetadata,
  PetProfilePhotoExifMetadata,
  PetProfilePhotoThumbnailMetadata,
  PetProfilesSessionState,
  PetProfileSummary,
  PetProfileType,
} from "./pet-profile-types";
import {
  petProfilePhotoLimit,
  petProfileTypeOptions,
} from "./pet-profile-types";

export type MemberSession = PetProfilesSessionState;

export interface PetProfilePhotoSource {
  height?: number;
  id?: string;
  mimeType?: string;
  sizeBytes?: number;
  uri: string;
  width?: number;
}

export interface PetProfilePhotoAsset extends PetProfilePhoto {
  compression: PetProfilePhotoCompressionMetadata;
  exif: PetProfilePhotoExifMetadata;
  height?: number;
  mimeType: "image/jpeg";
  position: number;
  sourceUri: string;
  thumbnail: PetProfilePhotoThumbnailMetadata;
  uri: string;
  width?: number;
}

export interface CreatePetProfileInput {
  breed: string;
  description: string;
  name: string;
  photos: readonly PetProfilePhotoSource[];
  type: PetProfileType;
}

export type UpdatePetProfileInput = Partial<CreatePetProfileInput>;

export type PetProfile = Omit<PetProfileSummary, "photos"> & {
  createdAt: string;
  photos: PetProfilePhotoAsset[];
  updatedAt: string;
};

type PetProfileRepositoryErrorCode =
  | "pet_profile_not_found"
  | "unsupported_pet_profile_type"
  | "visitor_cannot_create_pet_profile"
  | "visitor_cannot_manage_pet_profiles";

class PetProfileRepositoryError extends Error {
  code: PetProfileRepositoryErrorCode;

  constructor(code: PetProfileRepositoryErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "PetProfileRepositoryError";
  }
}

export interface PetProfileMediaAdapter {
  normalizePhotos: (
    photos: readonly PetProfilePhotoSource[],
  ) => Promise<PetProfilePhotoAsset[]>;
}

export interface PetProfileRepository {
  createPetProfile: (
    session: PetProfilesSessionState,
    input: CreatePetProfileInput,
  ) => Promise<PetProfile>;
  getPetProfile: (
    session: PetProfilesSessionState,
    petProfileId: string,
  ) => Promise<PetProfile | null>;
  listPetProfiles: (session: PetProfilesSessionState) => Promise<PetProfile[]>;
  updatePetProfile: (
    session: PetProfilesSessionState,
    petProfileId: string,
    input: UpdatePetProfileInput,
  ) => Promise<PetProfile>;
}

export interface InMemoryPetProfileRepositoryOptions {
  mediaAdapter?: PetProfileMediaAdapter;
  now?: () => string;
}

export function createLocalPetProfileMediaAdapter(): PetProfileMediaAdapter {
  return {
    normalizePhotos(photos) {
      return Promise.resolve(
        photos.slice(0, petProfilePhotoLimit).map((photo, index) => {
          const assetId = photo.id ?? `pet-profile-photo-${index + 1}`;
          const normalizedUri = `${photo.uri}#rastro-compressed`;
          const thumbUri = `${photo.uri}#rastro-thumbnail`;

          return {
            alt: undefined,
            compression: {
              applied: true,
              maxDimensionPx: 1600,
              originalSizeBytes: photo.sizeBytes,
              outputMimeType: "image/jpeg",
              quality: 0.82,
            },
            exif: {
              locationStripped: true,
              stripped: true,
            },
            height: photo.height,
            id: assetId,
            mimeType: "image/jpeg",
            position: index,
            sourceUri: photo.uri,
            status: "ready",
            thumbUri,
            thumbnail: {
              generated: true,
              height: 320,
              uri: thumbUri,
              width: 320,
            },
            uri: normalizedUri,
            width: photo.width,
          };
        }),
      );
    },
  };
}

export function createInMemoryPetProfileRepository(
  options: InMemoryPetProfileRepositoryOptions = {},
): PetProfileRepository {
  const mediaAdapter =
    options.mediaAdapter ?? createLocalPetProfileMediaAdapter();
  const now = options.now ?? (() => "2026-01-01T00:00:00.000Z");
  const profiles: PetProfile[] = [];

  return {
    async createPetProfile(session, input) {
      if (session.kind === "visitor") {
        throw new PetProfileRepositoryError(
          "visitor_cannot_create_pet_profile",
          "Visitors cannot create Pet Profiles.",
        );
      }

      const createdAt = now();
      const profile: PetProfile = {
        breed: input.breed.trim(),
        caretakerMemberId: session.memberId,
        createdAt,
        description: input.description.trim(),
        id: `pet-profile-${profiles.length + 1}`,
        name: input.name.trim(),
        photos: await mediaAdapter.normalizePhotos(input.photos),
        relatedRecords: [],
        type: getPetProfileType(input.type),
        updatedAt: createdAt,
      };

      profiles.push(profile);

      return clonePetProfile(profile);
    },
    getPetProfile(session, petProfileId) {
      assertMemberCanManagePetProfiles(session);

      const profile = profiles.find(
        (candidate) =>
          candidate.id === petProfileId &&
          candidate.caretakerMemberId === session.memberId,
      );

      return Promise.resolve(profile ? clonePetProfile(profile) : null);
    },
    listPetProfiles(session) {
      assertMemberCanManagePetProfiles(session);

      return Promise.resolve(
        profiles
          .filter((profile) => profile.caretakerMemberId === session.memberId)
          .map(clonePetProfile),
      );
    },
    async updatePetProfile(session, petProfileId, input) {
      assertMemberCanManagePetProfiles(session);

      const profileIndex = profiles.findIndex(
        (candidate) =>
          candidate.id === petProfileId &&
          candidate.caretakerMemberId === session.memberId,
      );

      if (profileIndex === -1) {
        throw new PetProfileRepositoryError(
          "pet_profile_not_found",
          "Pet Profile was not found for this Member.",
        );
      }

      const current = profiles[profileIndex];

      if (!current) {
        throw new PetProfileRepositoryError(
          "pet_profile_not_found",
          "Pet Profile was not found for this Member.",
        );
      }

      const next: PetProfile = {
        ...current,
        breed: input.breed === undefined ? current.breed : input.breed.trim(),
        description:
          input.description === undefined
            ? current.description
            : input.description.trim(),
        name: input.name === undefined ? current.name : input.name.trim(),
        photos:
          input.photos === undefined
            ? current.photos
            : await mediaAdapter.normalizePhotos(input.photos),
        type:
          input.type === undefined
            ? current.type
            : getPetProfileType(input.type),
        updatedAt: now(),
      };

      profiles[profileIndex] = next;

      return clonePetProfile(next);
    },
  };
}

function getPetProfileType(type: PetProfileType): PetProfileType {
  if (!petProfileTypeOptions.includes(type)) {
    throw new PetProfileRepositoryError(
      "unsupported_pet_profile_type",
      "Pet Profile type must be one of the supported options.",
    );
  }

  return type;
}

function assertMemberCanManagePetProfiles(
  session: PetProfilesSessionState,
): asserts session is Extract<PetProfilesSessionState, { kind: "member" }> {
  if (session.kind === "visitor") {
    throw new PetProfileRepositoryError(
      "visitor_cannot_manage_pet_profiles",
      "Visitors cannot manage Mis mascotas.",
    );
  }
}

function clonePetProfile(profile: PetProfile): PetProfile {
  return {
    ...profile,
    photos: profile.photos.map((photo) => ({
      ...photo,
      compression: { ...photo.compression },
      exif: { ...photo.exif },
      thumbnail: { ...photo.thumbnail },
    })),
    relatedRecords: profile.relatedRecords.map((record) => ({ ...record })),
  };
}
