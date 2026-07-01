import { describe, expect, it } from "vitest";

import type { PetProfileRepository } from "../pet-profile-repository";
import { appRouter } from "../root";

const profileId = "11111111-1111-4111-8111-111111111111";
const now = "2026-07-01T12:00:00.000Z";

function createCaller(context: unknown) {
  return appRouter.createCaller(context as never);
}

describe("pet profiles router", () => {
  it("rejects unauthenticated pet profile reads before repository work", async () => {
    let read = false;
    const caller = createCaller({
      authApi: {},
      db: {},
      petProfileRepository: {
        list: () => {
          read = true;
          return Promise.reject(new Error("Should not read without auth."));
        },
      },
      session: null,
    });

    await expect(caller.petProfiles.list({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(read).toBe(false);
  });

  it("uses the session member for list, create, get, and update", async () => {
    const repository = createFakePetProfileRepository();
    const caller = createCaller({
      authApi: {},
      db: {},
      petProfileRepository: repository,
      session: {
        user: {
          id: "member-camila",
        },
      },
    });

    await expect(caller.petProfiles.list({})).resolves.toEqual([]);
    await expect(
      caller.petProfiles.create({
        breed: "Mestiza",
        description: "Collar rojo",
        name: "Luna",
        photos: [
          {
            id: "photo-1",
            status: "ready",
            thumbUri: "file://luna-thumb.jpg",
            uri: "file://luna.jpg",
          },
        ],
        type: "Perro",
      }),
    ).resolves.toMatchObject({
      breed: "Mestiza",
      caretakerMemberId: "member-camila",
      id: profileId,
      name: "Luna",
      type: "Perro",
    });
    await expect(caller.petProfiles.get({ id: profileId })).resolves.toEqual(
      expect.objectContaining({
        caretakerMemberId: "member-camila",
        id: profileId,
      }),
    );
    await expect(
      caller.petProfiles.update({
        description: "Collar rojo y mancha blanca",
        id: profileId,
        name: "Luna QA",
      }),
    ).resolves.toMatchObject({
      description: "Collar rojo y mancha blanca",
      name: "Luna QA",
    });

    expect(repository.inputs).toEqual([
      { kind: "list", memberId: "member-camila" },
      { kind: "create", memberId: "member-camila", name: "Luna" },
      { kind: "get", memberId: "member-camila", profileId },
      { kind: "update", memberId: "member-camila", profileId },
    ]);
  });
});

type FakePetProfileRepository = PetProfileRepository & {
  inputs: (
    | { kind: "create"; memberId: string; name: string }
    | { kind: "get"; memberId: string; profileId: string }
    | { kind: "list"; memberId: string }
    | { kind: "update"; memberId: string; profileId: string }
  )[];
};

function createFakePetProfileRepository(): FakePetProfileRepository {
  let savedProfile: Awaited<ReturnType<PetProfileRepository["create"]>> | null =
    null;
  const inputs: FakePetProfileRepository["inputs"] = [];

  return {
    inputs,
    create({ memberId, profile }) {
      inputs.push({ kind: "create", memberId, name: profile.name });
      savedProfile = {
        breed: profile.breed,
        caretakerMemberId: memberId,
        createdAt: now,
        description: profile.description,
        id: profileId,
        name: profile.name,
        photos: profile.photos,
        relatedRecords: [],
        type: profile.type,
        updatedAt: now,
      };

      return Promise.resolve(savedProfile);
    },
    get({ memberId, profileId: nextProfileId }) {
      inputs.push({ kind: "get", memberId, profileId: nextProfileId });

      return Promise.resolve(savedProfile);
    },
    list({ memberId }) {
      inputs.push({ kind: "list", memberId });

      return Promise.resolve(savedProfile ? [savedProfile] : []);
    },
    update({ memberId, profile, profileId: nextProfileId }) {
      inputs.push({ kind: "update", memberId, profileId: nextProfileId });

      if (!savedProfile) {
        return Promise.reject(new Error("Expected profile to exist."));
      }

      savedProfile = {
        ...savedProfile,
        ...profile,
        updatedAt: now,
      };

      return Promise.resolve(savedProfile);
    },
  };
}
