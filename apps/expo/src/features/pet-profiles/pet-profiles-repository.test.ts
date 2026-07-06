import { describe, expect, it } from "vitest";

import type {
  CreatePetProfileInput,
  MemberSession,
  PetProfilePhotoSource,
} from "./pet-profiles";
import type { MisMascotasViewModel } from "./pet-profiles-view-model";
import { petProfileTypeOptions } from "./pet-profile-types";
import {
  createInMemoryPetProfileRepository,
  createLocalPetProfileMediaAdapter,
} from "./pet-profiles";
import { buildMisMascotasViewModel } from "./pet-profiles-view-model";

const member: MemberSession = {
  displayName: "Camila",
  kind: "member",
  memberId: "member-camila",
};

describe("Pet Profile repository", () => {
  it("lets a member create a Pet Profile with the exact v1 pet type options", async () => {
    expect(petProfileTypeOptions).toEqual([
      "Perro",
      "Gato",
      "Ave",
      "Conejo",
      "Otro",
    ]);

    const repository = createInMemoryPetProfileRepository();
    const input: CreatePetProfileInput = {
      breed: "Cruce de labrador",
      description: "Mancha blanca en el pecho y collar rojo.",
      name: "Bruno",
      photos: [],
      type: "Perro",
    };

    const created = await repository.createPetProfile(member, input);

    expect(created).toMatchObject({
      breed: "Cruce de labrador",
      caretakerMemberId: member.memberId,
      description: "Mancha blanca en el pecho y collar rojo.",
      name: "Bruno",
      relatedRecords: [],
      type: "Perro",
    });
  });

  it("blocks visitors from creating Pet Profiles through the public repository API", async () => {
    const repository = createInMemoryPetProfileRepository();

    await expect(
      repository.createPetProfile(
        { kind: "visitor" },
        {
          breed: "Mestizo",
          description: "Orejas negras.",
          name: "Sombra",
          photos: [],
          type: "Perro",
        },
      ),
    ).rejects.toMatchObject({
      code: "visitor_cannot_create_pet_profile",
    });
  });

  it("caps photos at five and records local media processing metadata", async () => {
    const repository = createInMemoryPetProfileRepository({
      mediaAdapter: createLocalPetProfileMediaAdapter(),
    });

    const created = await repository.createPetProfile(member, {
      breed: "Siamés",
      description: "Ojos claros y cola oscura.",
      name: "Luna",
      photos: buildPhotoSources(6),
      type: "Gato",
    });

    expect(created.photos).toHaveLength(5);
    expect(created.photos[0]).toMatchObject({
      compression: {
        applied: true,
        maxDimensionPx: 1600,
        outputMimeType: "image/jpeg",
        quality: 0.82,
      },
      exif: {
        locationStripped: true,
        stripped: true,
      },
      thumbnail: {
        generated: true,
        height: 320,
        width: 320,
      },
    });
    expect(created.photos.map((photo) => photo.position)).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });

  it("lets Mis mascotas list, select, view, and edit a member's profiles", async () => {
    const repository = createInMemoryPetProfileRepository();
    const otherMember: MemberSession = {
      kind: "member",
      memberId: "member-diego",
    };

    const bruno = await repository.createPetProfile(member, {
      breed: "Cruce de labrador",
      description: "Mancha blanca en el pecho.",
      name: "Bruno",
      photos: buildPhotoSources(1),
      type: "Perro",
    });
    await repository.createPetProfile(otherMember, {
      breed: "Angora",
      description: "Orejas pequenas.",
      name: "Nube",
      photos: [],
      type: "Conejo",
    });

    expect(await repository.listPetProfiles(member)).toMatchObject([
      {
        id: bruno.id,
        name: "Bruno",
      },
    ]);
    expect(await repository.getPetProfile(member, bruno.id)).toMatchObject({
      id: bruno.id,
      name: "Bruno",
    });

    const updated = await repository.updatePetProfile(member, bruno.id, {
      breed: "Labrador mestizo",
      description: "Mancha blanca en el pecho y collar rojo.",
      name: "Bruno actualizado",
      photos: buildPhotoSources(2),
      type: "Perro",
    });
    const viewModel = buildMisMascotasViewModel({
      profiles: await repository.listPetProfiles(member),
      selectedProfileId: updated.id,
      session: member,
    });

    expect(updated).toMatchObject({
      breed: "Labrador mestizo",
      description: "Mancha blanca en el pecho y collar rojo.",
      name: "Bruno actualizado",
    });
    expect(viewModel).toMatchObject({
      canCreate: true,
      kind: "member",
      selectedProfile: {
        breedLabel: "Labrador mestizo",
        description: "Mancha blanca en el pecho y collar rojo.",
        id: updated.id,
        name: "Bruno actualizado",
        typeLabel: "Perro",
      },
      title: "Mis mascotas",
    });
    assertMisMascotasKind(viewModel, "member");
    expect(viewModel.cards.map((card) => card.name)).toEqual([
      "Bruno actualizado",
    ]);
  });
});

function assertMisMascotasKind<K extends MisMascotasViewModel["kind"]>(
  viewModel: MisMascotasViewModel,
  kind: K,
): asserts viewModel is Extract<MisMascotasViewModel, { kind: K }> {
  expect(viewModel.kind).toBe(kind);
}

function buildPhotoSources(count: number): PetProfilePhotoSource[] {
  return Array.from({ length: count }, (_, index) => ({
    height: 1200,
    id: `source-${index + 1}`,
    mimeType: "image/heic",
    sizeBytes: 2_000_000 + index,
    uri: `file:///pet-${index + 1}.heic`,
    width: 1600,
  }));
}
