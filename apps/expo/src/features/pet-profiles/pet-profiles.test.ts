import { describe, expect, it } from "vitest";

import type { PetProfileSummary } from "./pet-profile-types";
import type { MisMascotasViewModel } from "./pet-profiles-view-model";
import {
  buildMisMascotasViewModel,
  buildPetProfileFormViewModel,
  createPetProfileFromDraft,
  isPetProfileType,
  petProfilePhotoLimit,
  petProfileTypeOptions,
} from "./pet-profiles-view-model";

const memberSession = {
  kind: "member",
  memberId: "member-camila",
  displayName: "Camila",
} as const;

const profiles: PetProfileSummary[] = [
  {
    id: "pet-luna",
    caretakerMemberId: "member-camila",
    name: "Luna",
    type: "Gato",
    breed: "Siames",
    description: "Mancha blanca en el pecho y collar rojo.",
    photos: [
      {
        id: "photo-luna-1",
        uri: "https://example.com/luna.jpg",
        thumbUri: "https://example.com/luna-thumb.jpg",
      },
    ],
    relatedRecords: [
      {
        id: "lost-luna",
        kind: "lost-report",
        title: "Luna perdida en Sopocachi",
        status: "active",
      },
      {
        id: "closed-luna",
        kind: "found-report",
        title: "Luna reunida",
        status: "closed",
      },
    ],
    updatedAtLabel: "Actualizado hoy",
  },
];

describe("Mis mascotas Pet Profile view models", () => {
  it("lets visitors read the explanation but not create Pet Profiles", () => {
    const viewModel = buildMisMascotasViewModel({
      profiles: [],
      session: { kind: "visitor" },
    });

    expect(viewModel).toMatchObject({
      kind: "visitor",
      canCreate: false,
      title: "Mis mascotas",
    });
    assertMisMascotasKind(viewModel, "visitor");
    expect(viewModel.explanationBody).toContain("visitante");
    expect(viewModel.explanationBody).not.toMatch(/Pet Profiles/i);
    expect(viewModel.createActionLabel).toBe("Inicia sesion para crear");
  });

  it("shows an empty member state with creation enabled", () => {
    const viewModel = buildMisMascotasViewModel({
      profiles: [],
      session: memberSession,
    });

    expect(viewModel).toMatchObject({
      kind: "member",
      canCreate: true,
      state: "empty",
      createActionLabel: "Crear perfil de mascota",
    });
    assertMisMascotasKind(viewModel, "member");
    expect(viewModel.emptyState?.title).toBe("Aun no tienes mascotas");
    expect(viewModel.emptyState?.body).toContain("reportes");
  });

  it("builds reusable Pet Profile cards with thumbnails and related report context", () => {
    const viewModel = buildMisMascotasViewModel({
      profiles,
      selectedProfileId: "pet-luna",
      session: memberSession,
    });

    expect(viewModel.kind).toBe("member");
    assertMisMascotasKind(viewModel, "member");
    expect(viewModel.state).toBe("ready");
    expect(viewModel.cards).toHaveLength(1);
    expect(viewModel.cards[0]).toMatchObject({
      id: "pet-luna",
      name: "Luna",
      typeLabel: "Gato",
      breedLabel: "Siames",
      photoCountLabel: "1/5",
      thumbnailUri: "https://example.com/luna-thumb.jpg",
      relatedSummaryLabel: "1 reporte activo · 1 cerrado",
    });
    expect(viewModel.selectedProfile?.name).toBe("Luna");
  });

  it("keeps pet type controlled, breed free text, and disables photo add at 5/5", () => {
    const viewModel = buildPetProfileFormViewModel({
      draft: {
        name: "  Coco  ",
        type: "Conejo",
        breed: "Cabeza de leon mix",
        description: "Oreja izquierda mas oscura.",
        photos: Array.from({ length: petProfilePhotoLimit }, (_, index) => ({
          id: `photo-${index}`,
          uri: `https://example.com/photo-${index}.jpg`,
        })),
      },
      mode: "create",
    });

    expect(petProfileTypeOptions).toEqual([
      "Perro",
      "Gato",
      "Ave",
      "Conejo",
      "Otro",
    ]);
    expect(isPetProfileType("Conejo")).toBe(true);
    expect(isPetProfileType("Hamster")).toBe(false);
    expect(viewModel.photoCountLabel).toBe("5/5");
    expect(viewModel.canAddPhoto).toBe(false);
    expect(
      viewModel.typeOptions.find((option) => option.value === "Conejo")
        ?.isSelected,
    ).toBe(true);
    expect(viewModel.fields.breed.value).toBe("Cabeza de leon mix");
  });

  it("normalizes a valid draft for a caretaker member", () => {
    const profile = createPetProfileFromDraft({
      caretakerMemberId: "member-camila",
      draft: {
        name: "  Tito ",
        type: "Perro",
        breed: " Mestizo ",
        description: "  Patas blancas y hocico negro. ",
        photos: [
          {
            id: "source-tito-1",
            uri: "file:///tito.heic",
          },
        ],
      },
      id: "pet-tito",
    });

    expect(profile).toMatchObject({
      id: "pet-tito",
      caretakerMemberId: "member-camila",
      name: "Tito",
      type: "Perro",
      breed: "Mestizo",
      description: "Patas blancas y hocico negro.",
      relatedRecords: [],
    });
    expect(profile.photos).toHaveLength(1);
    expect(profile.photos[0]).toMatchObject({
      compression: {
        applied: true,
        outputMimeType: "image/jpeg",
      },
      exif: {
        locationStripped: true,
        stripped: true,
      },
      status: "ready",
      thumbnail: {
        generated: true,
      },
      thumbUri: "file:///tito.heic#rastro-thumbnail",
      uri: "file:///tito.heic#rastro-compressed",
    });
  });
});

function assertMisMascotasKind<K extends MisMascotasViewModel["kind"]>(
  viewModel: MisMascotasViewModel,
  kind: K,
): asserts viewModel is Extract<MisMascotasViewModel, { kind: K }> {
  expect(viewModel.kind).toBe(kind);
}
