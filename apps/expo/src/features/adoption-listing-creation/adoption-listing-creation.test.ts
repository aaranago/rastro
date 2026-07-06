import { describe, expect, it } from "vitest";

import type { PetProfileSummary } from "../pet-profiles/pet-profile-types";
import {
  buildAdoptionListingCreationViewModel,
  createInitialAdoptionListingDraft,
  toPublishAdoptionListingInput,
} from "./adoption-listing-creation-view-model";

const commerceTerms =
  /\b(?:precio|fee|payment|deposit|bidding|checkout|compra|comprar|venta|vender|marketplace)\b/i;

const profiles: PetProfileSummary[] = [
  {
    breed: "Mestizo",
    caretakerMemberId: "member-camila",
    description: "Tranquila, sociable y vacunada.",
    id: "pet-nala",
    name: "Nala",
    photos: [],
    relatedRecords: [],
    type: "Gato",
  },
  {
    breed: "Mestizo",
    caretakerMemberId: "member-camila",
    description: "Cariñoso y vacunado.",
    id: "pet-max",
    name: "Max",
    photos: [],
    relatedRecords: [],
    type: "Perro",
  },
];

describe("Adoption Listing creation view model", () => {
  it("starts members on an existing Pet Profile with Spanish non-monetary adoption requirements", () => {
    const draft = createInitialAdoptionListingDraft({ petProfiles: profiles });

    const viewModel = buildAdoptionListingCreationViewModel({
      draft,
      petProfiles: profiles,
      session: { kind: "member", memberId: "member-camila" },
    });

    expect(viewModel).toMatchObject({
      canPublish: false,
      kind: "member",
      title: "Dar en adopción",
    });
    expect(viewModel.petProfile.selectedLabel).toBe("Nala · Gato");
    expect(viewModel.photos.error).toContain("Agrega al menos una foto");
    expect(viewModel.review.publishActionLabel).toBe("Completar datos");
    expect(viewModel.verificationBadge).toMatchObject({
      required: false,
      visible: false,
    });
    expect(viewModel.contact.options.map((option) => option.label)).toEqual([
      "Chat en Rastro",
      "WhatsApp",
      "Ambos",
    ]);
    expect(JSON.stringify(viewModel)).not.toMatch(commerceTerms);
  });

  it("starts from the selected Pet Profile when profile creation launches adoption", () => {
    const draft = createInitialAdoptionListingDraft({
      petProfiles: profiles,
      selectedPetProfileId: "pet-max",
    });

    const viewModel = buildAdoptionListingCreationViewModel({
      draft,
      petProfiles: profiles,
      session: { kind: "member", memberId: "member-camila" },
    });

    expect(draft).toMatchObject({
      petProfileId: "pet-max",
      petSelectionMode: "existing",
    });
    expect(viewModel.petProfile.selectedLabel).toBe("Max · Perro");
  });

  it("falls back to the first Pet Profile when a requested Pet Profile is unavailable", () => {
    const draft = createInitialAdoptionListingDraft({
      petProfiles: profiles,
      selectedPetProfileId: "pet-missing",
    });

    expect(draft).toMatchObject({
      petProfileId: "pet-nala",
      petSelectionMode: "existing",
    });
  });

  it("exposes canonical journey data and suppresses adoption validation until the current step is attempted", () => {
    const draft = {
      ...createInitialAdoptionListingDraft({ petProfiles: profiles }),
      adoptionDetails: {
        adoptionSummary: "",
        healthNotes: "",
        idealHome: "",
      },
      contact: {
        inAppChatEnabled: false,
        whatsappEnabled: false,
        whatsappPhone: "",
      },
    };

    const quietViewModel = buildAdoptionListingCreationViewModel({
      draft,
      journey: {
        completedStepIds: ["chooseType"],
        currentStepId: "photos",
      },
      petProfiles: profiles,
      validationDisplay: {},
    });

    expect(quietViewModel.journey).toMatchObject({
      currentStep: {
        id: "photos",
        status: "current",
      },
      progressText: "Paso 2 de 8",
      reportType: "adoption",
    });
    expect(
      quietViewModel.journey.steps.filter((step) => step.status === "current"),
    ).toHaveLength(1);
    expect(quietViewModel.photos.error).toBeUndefined();
    expect(
      quietViewModel.adoptionDetails.fields.adoptionSummary.error,
    ).toBeUndefined();
    expect(quietViewModel.contact.error).toBeUndefined();
    expect(quietViewModel.review.validationErrors).toEqual([]);

    const attemptedPhotosViewModel = buildAdoptionListingCreationViewModel({
      draft,
      journey: {
        completedStepIds: ["chooseType"],
        currentStepId: "photos",
      },
      petProfiles: profiles,
      validationDisplay: {
        attemptedStepId: "photos",
      },
    });

    expect(attemptedPhotosViewModel.photos.error).toBe(
      "Agrega al menos una foto.",
    );

    const attemptedDetailsViewModel = buildAdoptionListingCreationViewModel({
      draft,
      journey: {
        completedStepIds: ["chooseType", "photos"],
        currentStepId: "details",
      },
      petProfiles: profiles,
      validationDisplay: {
        attemptedStepId: "details",
      },
    });

    expect(
      attemptedDetailsViewModel.adoptionDetails.fields.adoptionSummary.error,
    ).toBe("Cuenta que tipo de hogar necesita.");

    const attemptedContactViewModel = buildAdoptionListingCreationViewModel({
      draft,
      journey: {
        completedStepIds: ["chooseType", "photos", "details", "location"],
        currentStepId: "contact",
      },
      petProfiles: profiles,
      validationDisplay: {
        attemptedStepId: "contact",
      },
    });

    expect(attemptedContactViewModel.contact.error).toBe(
      "Elige chat, WhatsApp o ambos.",
    );
  });

  it("blocks adoption listings with a too-short summary before publish", () => {
    const viewModel = buildAdoptionListingCreationViewModel({
      draft: {
        ...createInitialAdoptionListingDraft({ petProfiles: profiles }),
        adoptionDetails: {
          adoptionSummary: "sdf",
          healthNotes: "",
          idealHome: "",
        },
      },
      journey: {
        completedStepIds: ["chooseType", "photos"],
        currentStepId: "details",
      },
      petProfiles: profiles,
      validationDisplay: {
        attemptedStepId: "details",
      },
    });

    expect(viewModel.adoptionDetails.fields.adoptionSummary.error).toBe(
      "Describe la adopción con al menos 10 caracteres.",
    );
    expect(viewModel.canPublish).toBe(false);
  });

  it("converts a complete inline Pet Profile draft into a non-monetary Adoption Listing publish input", () => {
    const draft = {
      ...createInitialAdoptionListingDraft({ petProfiles: [] }),
      adoptionDetails: {
        adoptionSummary:
          "Nala busca un hogar tranquilo donde reciba tiempo y cuidado.",
        healthNotes: "Vacunada y desparasitada.",
        idealHome: "Familia paciente, departamento seguro y ventanas cerradas.",
      },
      contact: {
        inAppChatEnabled: true,
        whatsappEnabled: true,
        whatsappPhone: "+591 70123456",
      },
      exactLocation: {
        addressLabel: "  Calle 21 de Calacoto  ",
        coordinates: {
          latitude: -16.5406,
          longitude: -68.0772,
        },
        department: "La Paz",
        locationCellLabel: "  Calacoto  ",
        municipality: "La Paz",
      },
      inlinePet: {
        breed: "Mestizo",
        description: "Gatita tranquila, sociable y de interior.",
        name: "Nala",
        type: "Gato" as const,
      },
      photos: [
        {
          id: "adoption-photo-1",
          mediaId: "adoption-media-1",
          status: "ready" as const,
          uri: "file:///nala.heic",
        },
      ],
      showExactPinPublicly: false,
    };

    const publishInput = toPublishAdoptionListingInput({ draft });

    expect(publishInput).toMatchObject({
      adoptionSummary:
        "Nala busca un hogar tranquilo donde reciba tiempo y cuidado.",
      contactOption: { kind: "both", phoneNumber: "+591 70123456" },
      exactLocation: {
        addressLabel: "Calle 21 de Calacoto",
        countryCode: "BO",
        latitude: -16.5406,
        locationCellLabel: "Calacoto",
        longitude: -68.0772,
      },
      petProfile: {
        kind: "inline",
        profile: {
          name: "Nala",
          type: "Gato",
        },
      },
      photos: [{ id: "adoption-media-1", uri: "file:///nala.heic" }],
      showExactPublicLocation: false,
    });
    expect(JSON.stringify(publishInput)).not.toMatch(commerceTerms);
  });

  it("keeps adoption blocked until required media are ready and publishes ready media IDs in draft order", () => {
    const draft = {
      ...createInitialAdoptionListingDraft({ petProfiles: [] }),
      adoptionDetails: {
        adoptionSummary:
          "Nala busca un hogar tranquilo donde reciba tiempo y cuidado.",
        healthNotes: "",
        idealHome: "",
      },
      contact: {
        inAppChatEnabled: true,
        whatsappEnabled: false,
        whatsappPhone: "",
      },
      exactLocation: {
        addressLabel: "Calle 21 de Calacoto",
        coordinates: {
          latitude: -16.5406,
          longitude: -68.0772,
        },
        department: "La Paz",
        locationCellLabel: "Calacoto",
        municipality: "La Paz",
      },
      inlinePet: {
        breed: "Mestizo",
        description: "Gatita tranquila, sociable y de interior.",
        name: "Nala",
        type: "Gato" as const,
      },
      photos: [
        {
          id: "adoption-local-2",
          mediaId: "adoption-media-2",
          status: "ready" as const,
          uri: "file:///nala-2.heic",
        },
        {
          id: "adoption-uploading-1",
          progress: 0.6,
          status: "uploading" as const,
          uri: "file:///nala-uploading.heic",
        },
        {
          id: "adoption-local-1",
          mediaId: "adoption-media-1",
          status: "ready" as const,
          uri: "file:///nala-1.heic",
        },
      ],
      showExactPinPublicly: false,
    };

    const viewModel = buildAdoptionListingCreationViewModel({
      draft,
      petProfiles: [],
      validationDisplay: {
        attemptedStepId: "photos",
      },
    });

    expect(viewModel.canPublish).toBe(false);
    expect(viewModel.photos.error).toBe(
      "Espera a que las fotos terminen de subirse.",
    );

    const readyDraft = {
      ...draft,
      photos: draft.photos.filter((photo) => photo.status === "ready"),
    };

    expect(toPublishAdoptionListingInput({ draft: readyDraft }).photos).toEqual(
      [
        { id: "adoption-media-2", uri: "file:///nala-2.heic" },
        { id: "adoption-media-1", uri: "file:///nala-1.heic" },
      ],
    );
  });

  it("rejects publishing when an adoption listing has no exact location", () => {
    const draft = {
      ...createInitialAdoptionListingDraft({ petProfiles: [] }),
      adoptionDetails: {
        adoptionSummary:
          "Nala busca un hogar tranquilo donde reciba tiempo y cuidado.",
        healthNotes: "Vacunada y desparasitada.",
        idealHome: "Familia paciente, departamento seguro y ventanas cerradas.",
      },
      contact: {
        inAppChatEnabled: true,
        whatsappEnabled: false,
        whatsappPhone: "",
      },
      inlinePet: {
        breed: "Mestizo",
        description: "Gatita tranquila, sociable y de interior.",
        name: "Nala",
        type: "Gato" as const,
      },
      photos: [{ id: "adoption-photo-1", uri: "file:///nala.heic" }],
    };

    expect(() => toPublishAdoptionListingInput({ draft })).toThrow(
      "Selecciona la Exact Location interna.",
    );
  });

  it("rejects an adoption listing publish location outside Bolivia", () => {
    const draft = {
      ...createInitialAdoptionListingDraft({ petProfiles: [] }),
      adoptionDetails: {
        adoptionSummary:
          "Nala busca un hogar tranquilo donde reciba tiempo y cuidado.",
        healthNotes: "Vacunada y desparasitada.",
        idealHome: "Familia paciente, departamento seguro y ventanas cerradas.",
      },
      contact: {
        inAppChatEnabled: true,
        whatsappEnabled: false,
        whatsappPhone: "",
      },
      exactLocation: {
        addressLabel: "Fuera de Bolivia",
        coordinates: {
          latitude: -16.5406,
          longitude: -56.5,
        },
        department: "La Paz",
        locationCellLabel: "Calacoto",
        municipality: "La Paz",
      },
      inlinePet: {
        breed: "Mestizo",
        description: "Gatita tranquila, sociable y de interior.",
        name: "Nala",
        type: "Gato" as const,
      },
      photos: [{ id: "adoption-photo-1", uri: "file:///nala.heic" }],
    };

    expect(() => toPublishAdoptionListingInput({ draft })).toThrow(
      "Selecciona una ubicacion dentro de Bolivia.",
    );
  });
});
