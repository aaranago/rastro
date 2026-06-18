import { describe, expect, it } from "vitest";

import type { PetProfileSummary } from "../pet-profiles/pet-profile-types";
import {
  buildLostReportCreationViewModel,
  createInitialLostReportDraft,
  toPublishLostPetReportInput,
} from "./lost-report-creation-view-model";

const profiles: PetProfileSummary[] = [
  {
    breed: "Mestizo",
    caretakerMemberId: "member-camila",
    description: "Patas blancas y collar rojo.",
    id: "pet-toby",
    name: "Toby",
    photos: [],
    relatedRecords: [],
    type: "Perro",
  },
];

describe("Lost Pet Report creation view model", () => {
  it("starts members on an existing Pet Profile with Spanish privacy and photo requirements", () => {
    const draft = createInitialLostReportDraft({ petProfiles: profiles });

    const viewModel = buildLostReportCreationViewModel({
      draft,
      petProfiles: profiles,
      session: { kind: "member", memberId: "member-camila" },
    });

    expect(viewModel).toMatchObject({
      canPublish: false,
      kind: "member",
      title: "Reportar perdida",
    });
    expect(viewModel.petProfile.selectedLabel).toBe("Toby · Perro");
    expect(viewModel.photos.error).toContain("Agrega al menos una foto");
    expect(viewModel.location.publicPrecisionLabel).toBe(
      "Zona aproximada por defecto",
    );
    expect(viewModel.location.exactPinOptInLabel).toBe(
      "Mostrar pin exacto publicamente",
    );
    expect(viewModel.contact.options.map((option) => option.label)).toEqual([
      "Chat en Rastro",
      "WhatsApp",
      "Ambos",
    ]);
  });

  it("converts a complete inline Pet Profile draft into publish input", () => {
    const draft = {
      ...createInitialLostReportDraft({ petProfiles: [] }),
      contactOption: { kind: "both" as const, phoneNumber: "+591 70123456" },
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
        breed: "Siames",
        description: "Mancha blanca en el pecho.",
        name: "Luna",
        type: "Gato" as const,
      },
      lostDetails: {
        circumstances: "Salio por la puerta principal.",
        lastSeenAtLabel: "2026-06-18T10:50:00.000Z",
        markings: "Mancha blanca en el pecho.",
      },
      photos: [{ id: "report-photo-1", uri: "file:///luna-lost.heic" }],
      showExactPublicLocation: true,
      showExactPinPublicly: true,
    };

    const publishInput = toPublishLostPetReportInput({ draft });

    expect(publishInput).toMatchObject({
      contactOption: { kind: "both", phoneNumber: "+591 70123456" },
      petProfile: {
        kind: "inline",
        profile: {
          name: "Luna",
          type: "Gato",
        },
      },
      showExactPublicLocation: true,
    });
  });
});
