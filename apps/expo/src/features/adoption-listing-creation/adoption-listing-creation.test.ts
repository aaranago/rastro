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
      title: "Dar en adopcion",
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
      photos: [{ id: "adoption-photo-1", uri: "file:///nala.heic" }],
      showExactPinPublicly: false,
    };

    const publishInput = toPublishAdoptionListingInput({ draft });

    expect(publishInput).toMatchObject({
      adoptionSummary:
        "Nala busca un hogar tranquilo donde reciba tiempo y cuidado.",
      contactOption: { kind: "both", phoneNumber: "+591 70123456" },
      exactLocation: {
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
      photos: [{ id: "adoption-photo-1", uri: "file:///nala.heic" }],
      showExactPublicLocation: false,
    });
    expect(JSON.stringify(publishInput)).not.toMatch(commerceTerms);
  });
});
