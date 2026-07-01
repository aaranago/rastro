import type { RouterInputs, RouterOutputs } from "../../utils/api";
import type {
  PetProfilePhoto,
  PetProfileRelatedRecord,
  PetProfilesSessionState,
  PetProfileType,
} from "./pet-profile-types";
import type {
  CreatePetProfileInput,
  PetProfile,
  PetProfilePhotoAsset,
  PetProfileRepository,
  UpdatePetProfileInput,
} from "./pet-profiles";
import { petProfilePhotoLimit } from "./pet-profile-types";
import { createLocalPetProfileMediaAdapter } from "./pet-profiles";

interface ExpectedPetProfileRouterInputs {
  create: {
    breed?: string;
    description?: string;
    name: string;
    photos?: readonly PetProfilePhoto[];
    type: PetProfileType;
  };
  get: {
    id: string;
  };
  list: Record<string, never>;
  update: {
    breed?: string;
    description?: string;
    id: string;
    name?: string;
    photos?: readonly PetProfilePhoto[];
    type?: PetProfileType;
  };
}

interface ExpectedPetProfileRouterOutputs {
  create: ApiPetProfile;
  get: ApiPetProfile | null;
  list: ApiPetProfile[];
  update: ApiPetProfile;
}

type PetProfileRouterInputs = RouterInputs extends { petProfiles: infer TPet }
  ? TPet
  : ExpectedPetProfileRouterInputs;

type PetProfileRouterOutputs = RouterOutputs extends { petProfiles: infer TPet }
  ? TPet
  : ExpectedPetProfileRouterOutputs;

type PetProfileProcedureInput<
  TProcedure extends keyof ExpectedPetProfileRouterInputs,
> = TProcedure extends keyof PetProfileRouterInputs
  ? PetProfileRouterInputs[TProcedure]
  : ExpectedPetProfileRouterInputs[TProcedure];

type PetProfileProcedureOutput<
  TProcedure extends keyof ExpectedPetProfileRouterOutputs,
> = TProcedure extends keyof PetProfileRouterOutputs
  ? PetProfileRouterOutputs[TProcedure]
  : ExpectedPetProfileRouterOutputs[TProcedure];

interface ApiPetProfile {
  breed: string;
  caretakerMemberId: string;
  createdAt: Date | string;
  description: string;
  id: string;
  name: string;
  photos: readonly PetProfilePhoto[];
  relatedRecords: readonly PetProfileRelatedRecord[];
  type: PetProfileType;
  updatedAt: Date | string;
}

interface ApiPetProfileClient {
  petProfiles: {
    create: {
      mutate: (
        input: PetProfileProcedureInput<"create">,
      ) => Promise<PetProfileProcedureOutput<"create">>;
    };
    get: {
      query: (
        input: PetProfileProcedureInput<"get">,
      ) => Promise<PetProfileProcedureOutput<"get">>;
    };
    list: {
      query: (
        input: PetProfileProcedureInput<"list">,
      ) => Promise<PetProfileProcedureOutput<"list">>;
    };
    update: {
      mutate: (
        input: PetProfileProcedureInput<"update">,
      ) => Promise<PetProfileProcedureOutput<"update">>;
    };
  };
}

const localMediaAdapter = createLocalPetProfileMediaAdapter();

export function createApiPetProfileRepository({
  client,
}: {
  client: unknown;
}): PetProfileRepository {
  return {
    async createPetProfile(session, input) {
      assertMemberSession(session);

      const photos = await normalizePhotoInput(input);

      return getPetProfileClient(client)
        .create.mutate({
          breed: input.breed,
          description: input.description,
          name: input.name,
          photos,
          type: input.type,
        } as PetProfileProcedureInput<"create">)
        .then(normalizeApiPetProfile);
    },
    async getPetProfile(session, petProfileId) {
      assertMemberSession(session);

      return getPetProfileClient(client)
        .get.query({ id: petProfileId } as PetProfileProcedureInput<"get">)
        .then((profile) => (profile ? normalizeApiPetProfile(profile) : null));
    },
    listPetProfiles(session) {
      assertMemberSession(session);

      return getPetProfileClient(client)
        .list.query({} as PetProfileProcedureInput<"list">)
        .then((profiles) => profiles.map(normalizeApiPetProfile));
    },
    async updatePetProfile(session, petProfileId, input) {
      assertMemberSession(session);

      const photos =
        input.photos === undefined
          ? undefined
          : await normalizePhotoInput(input);

      return getPetProfileClient(client)
        .update.mutate({
          ...input,
          id: petProfileId,
          photos,
        } as PetProfileProcedureInput<"update">)
        .then(normalizeApiPetProfile);
    },
  };
}

function assertMemberSession(
  session: PetProfilesSessionState,
): asserts session is Extract<PetProfilesSessionState, { kind: "member" }> {
  if (session.kind === "visitor") {
    throw new Error("Inicia sesión para administrar tus mascotas.");
  }
}

async function normalizePhotoInput(
  input: Pick<CreatePetProfileInput | UpdatePetProfileInput, "photos">,
) {
  return (await localMediaAdapter.normalizePhotos(input.photos ?? []))
    .slice(0, petProfilePhotoLimit)
    .map(toApiPhoto);
}

function toApiPhoto(photo: PetProfilePhotoAsset): PetProfilePhoto {
  return {
    alt: photo.alt,
    height: photo.height,
    id: photo.id,
    mimeType: photo.mimeType,
    position: photo.position,
    sourceUri: photo.sourceUri,
    status: photo.status,
    thumbUri: photo.thumbUri,
    uri: photo.uri,
    width: photo.width,
  };
}

function normalizeApiPetProfile(profile: ApiPetProfile): PetProfile {
  return {
    breed: profile.breed,
    caretakerMemberId: profile.caretakerMemberId,
    createdAt: normalizeDate(profile.createdAt),
    description: profile.description,
    id: profile.id,
    name: profile.name,
    photos: profile.photos.map(normalizeApiPhoto),
    relatedRecords: profile.relatedRecords.map((record) => ({ ...record })),
    type: profile.type,
    updatedAt: normalizeDate(profile.updatedAt),
  };
}

function normalizeApiPhoto(
  photo: PetProfilePhoto,
  index: number,
): PetProfilePhotoAsset {
  const sourceUri = resolveSourceUri(photo);
  const uri = resolvePhotoUri(photo, sourceUri);
  const thumbUri = resolveThumbUri(photo, uri);

  return {
    ...photo,
    compression: resolveCompression(photo),
    exif: resolveExif(photo),
    id: photo.id,
    mimeType: "image/jpeg",
    position: resolvePhotoPosition(photo, index),
    sourceUri,
    status: resolvePhotoStatus(photo),
    thumbUri,
    thumbnail: resolveThumbnail(photo, thumbUri),
    uri,
  };
}

function resolveSourceUri(photo: PetProfilePhoto) {
  return photo.sourceUri ?? photo.uri ?? "";
}

function resolvePhotoUri(photo: PetProfilePhoto, sourceUri: string) {
  return photo.uri ?? sourceUri;
}

function resolveThumbUri(photo: PetProfilePhoto, uri: string) {
  return photo.thumbUri ?? photo.thumbnail?.uri ?? uri;
}

function resolveCompression(photo: PetProfilePhoto) {
  return (
    photo.compression ?? {
      applied: true,
      maxDimensionPx: 1600,
      outputMimeType: "image/jpeg",
      quality: 0.82,
    }
  );
}

function resolveExif(photo: PetProfilePhoto) {
  return (
    photo.exif ?? {
      locationStripped: true,
      stripped: true,
    }
  );
}

function resolvePhotoPosition(photo: PetProfilePhoto, index: number) {
  return photo.position ?? index;
}

function resolvePhotoStatus(photo: PetProfilePhoto) {
  return photo.status ?? "ready";
}

function resolveThumbnail(photo: PetProfilePhoto, thumbUri: string) {
  return (
    photo.thumbnail ?? {
      generated: true,
      height: 320,
      uri: thumbUri,
      width: 320,
    }
  );
}

function normalizeDate(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function getPetProfileClient(
  client: unknown,
): ApiPetProfileClient["petProfiles"] {
  const petProfiles = (client as Partial<ApiPetProfileClient>).petProfiles;

  if (!petProfiles) {
    throw new Error("Pet profile API client is not available.");
  }

  return petProfiles;
}
