import type { Database } from "@acme/db/client";
import type {
  CreatePetProfileInput,
  PetProfile as PersistedPetProfile,
  PetProfilePhoto,
  PetProfileRelatedRecord,
  PetProfileType,
  UpdatePetProfileInput,
} from "@acme/validators";
import { and, desc, eq } from "@acme/db";
import { PetProfile, user } from "@acme/db/schema";

export type PetProfileRepositoryErrorCode =
  | "pet_profile_not_found"
  | "pet_profile_user_not_found";

export class PetProfileRepositoryError extends Error {
  code: PetProfileRepositoryErrorCode;

  constructor(code: PetProfileRepositoryErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "PetProfileRepositoryError";
  }
}

export interface PetProfileRepository {
  create(input: {
    memberId: string;
    profile: CreatePetProfileInput;
  }): Promise<PersistedPetProfile>;
  get(input: {
    memberId: string;
    profileId: string;
  }): Promise<PersistedPetProfile | null>;
  list(input: { memberId: string }): Promise<PersistedPetProfile[]>;
  update(input: {
    memberId: string;
    profile: UpdatePetProfileInput;
    profileId: string;
  }): Promise<PersistedPetProfile>;
}

export function createDrizzlePetProfileRepository(
  db: Database,
): PetProfileRepository {
  return {
    create: async ({ memberId, profile }) => {
      await assertMemberExists(db, memberId);

      const normalized = normalizeCreatePetProfile(profile);
      const now = new Date();
      const [created] = await db
        .insert(PetProfile)
        .values({
          ...normalized,
          caretakerMemberId: memberId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!created) {
        throw new Error("Pet profile could not be persisted.");
      }

      return toPersistedPetProfile(created);
    },
    get: async ({ memberId, profileId }) => {
      const profile = await db.query.PetProfile.findFirst({
        where: and(
          eq(PetProfile.id, profileId),
          eq(PetProfile.caretakerMemberId, memberId),
        ),
      });

      return profile ? toPersistedPetProfile(profile) : null;
    },
    list: async ({ memberId }) => {
      const profiles = await db.query.PetProfile.findMany({
        orderBy: [desc(PetProfile.updatedAt)],
        where: eq(PetProfile.caretakerMemberId, memberId),
      });

      return profiles.map(toPersistedPetProfile);
    },
    update: async ({ memberId, profile, profileId }) => {
      const normalized = normalizeUpdatePetProfile(profile);

      const [updated] = await db
        .update(PetProfile)
        .set({
          ...normalized,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(PetProfile.id, profileId),
            eq(PetProfile.caretakerMemberId, memberId),
          ),
        )
        .returning();

      if (!updated) {
        throw new PetProfileRepositoryError(
          "pet_profile_not_found",
          "No encontramos esta mascota para tu cuenta.",
        );
      }

      return toPersistedPetProfile(updated);
    },
  };
}

async function assertMemberExists(db: Database, memberId: string) {
  const member = await db.query.user.findFirst({
    columns: { id: true },
    where: eq(user.id, memberId),
  });

  if (!member) {
    throw new PetProfileRepositoryError(
      "pet_profile_user_not_found",
      "No encontramos el perfil de este miembro.",
    );
  }
}

function normalizeCreatePetProfile(input: CreatePetProfileInput) {
  return {
    breed: input.breed.trim(),
    description: input.description.trim(),
    name: input.name.trim(),
    photos: normalizePhotos(input.photos),
    relatedRecords: [] satisfies PetProfileRelatedRecord[],
    type: input.type,
  };
}

function normalizeUpdatePetProfile(input: UpdatePetProfileInput) {
  return {
    ...(input.breed === undefined ? {} : { breed: input.breed.trim() }),
    ...(input.description === undefined
      ? {}
      : { description: input.description.trim() }),
    ...(input.name === undefined ? {} : { name: input.name.trim() }),
    ...(input.photos === undefined
      ? {}
      : { photos: normalizePhotos(input.photos) }),
    ...(input.type === undefined ? {} : { type: input.type }),
  };
}

function normalizePhotos(
  photos: readonly PetProfilePhoto[],
): PetProfilePhoto[] {
  return photos.slice(0, 5).map((photo, position) => ({
    ...photo,
    position,
    status: photo.status ?? "ready",
  }));
}

function toPersistedPetProfile(row: typeof PetProfile.$inferSelect) {
  return {
    breed: row.breed,
    caretakerMemberId: row.caretakerMemberId,
    createdAt: row.createdAt.toISOString(),
    description: row.description,
    id: row.id,
    name: row.name,
    photos: normalizePhotos(row.photos),
    relatedRecords: normalizeRelatedRecords(row.relatedRecords),
    type: row.type as PetProfileType,
    updatedAt: row.updatedAt.toISOString(),
  } satisfies PersistedPetProfile;
}

function normalizeRelatedRecords(
  relatedRecords: readonly PetProfileRelatedRecord[],
): PetProfileRelatedRecord[] {
  return relatedRecords.map((record) => ({ ...record }));
}
