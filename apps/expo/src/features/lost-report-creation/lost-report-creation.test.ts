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

  it("exposes canonical journey data and shows missing-photo validation only after the photos step is attempted", () => {
    const draft = createInitialLostReportDraft({ petProfiles: profiles });

    const initialViewModel = buildLostReportCreationViewModel({
      draft,
      journey: {
        completedStepIds: ["chooseType"],
        currentStepId: "photos",
      },
      petProfiles: profiles,
      validationDisplay: {},
    });

    expect(initialViewModel.journey).toMatchObject({
      currentStep: {
        id: "photos",
        status: "current",
      },
      progressText: "Paso 2 de 8",
      reportType: "lost",
    });
    expect(
      initialViewModel.journey.steps.filter(
        (step) => step.status === "current",
      ),
    ).toHaveLength(1);
    expect(initialViewModel.photos.error).toBeUndefined();

    const attemptedPhotosViewModel = buildLostReportCreationViewModel({
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
  });

  it("suppresses lost details and contact validation until those steps are attempted", () => {
    const draft = {
      ...createInitialLostReportDraft({ petProfiles: [] }),
      contact: {
        inAppChatEnabled: false,
        whatsappEnabled: false,
        whatsappPhone: "",
      },
      lostDetails: {
        circumstances: "",
        lastSeenAtLabel: "",
        markings: "",
      },
    };

    const quietViewModel = buildLostReportCreationViewModel({
      draft,
      journey: {
        completedStepIds: ["chooseType", "photos"],
        currentStepId: "details",
      },
      petProfiles: [],
      validationDisplay: {},
    });

    expect(
      quietViewModel.petSelection.inlineForm.fields.name.error,
    ).toBeUndefined();
    expect(
      quietViewModel.lostDetails.fields.lastSeenAtLabel.error,
    ).toBeUndefined();
    expect(quietViewModel.contact.error).toBeUndefined();
    expect(quietViewModel.review.validationErrors).toEqual([]);

    const attemptedDetailsViewModel = buildLostReportCreationViewModel({
      draft,
      journey: {
        completedStepIds: ["chooseType", "photos"],
        currentStepId: "details",
      },
      petProfiles: [],
      validationDisplay: {
        attemptedStepId: "details",
      },
    });

    expect(
      attemptedDetailsViewModel.petSelection.inlineForm.fields.name.error,
    ).toBe("Ingresa el nombre de la mascota.");
    expect(
      attemptedDetailsViewModel.lostDetails.fields.lastSeenAtLabel.error,
    ).toBe("Indica cuando la viste por ultima vez.");

    const attemptedContactViewModel = buildLostReportCreationViewModel({
      draft,
      journey: {
        completedStepIds: ["chooseType", "photos", "details", "location"],
        currentStepId: "contact",
      },
      petProfiles: [],
      validationDisplay: {
        attemptedStepId: "contact",
      },
    });

    expect(attemptedContactViewModel.contact.error).toBe(
      "Elige chat, WhatsApp o ambos.",
    );
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
      photos: [
        {
          id: "report-photo-1",
          mediaId: "ready-media-1",
          status: "ready" as const,
          uri: "file:///luna-lost.heic",
        },
      ],
      showExactPublicLocation: true,
      showExactPinPublicly: true,
    };

    const publishInput = toPublishLostPetReportInput({ draft });

    expect(publishInput).toMatchObject({
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
          name: "Luna",
          type: "Gato",
        },
      },
      showExactPublicLocation: true,
    });
  });

  it("blocks publishing when the photo step only has local media without a ready uploaded media ID", () => {
    const draft = {
      ...createInitialLostReportDraft({ petProfiles: [] }),
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
      photos: [
        {
          id: "local-photo-1",
          status: "ready" as const,
          uri: "file:///luna-lost.heic",
        },
      ],
    };

    const viewModel = buildLostReportCreationViewModel({
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
    expect(() => toPublishLostPetReportInput({ draft })).toThrow(
      "Espera a que las fotos terminen de subirse.",
    );
  });

  it("rejects publishing when a lost report has no exact location", () => {
    const draft = {
      ...createInitialLostReportDraft({ petProfiles: [] }),
      contact: {
        inAppChatEnabled: true,
        whatsappEnabled: false,
        whatsappPhone: "",
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
    };

    expect(() => toPublishLostPetReportInput({ draft })).toThrow(
      "Selecciona la Exact Location interna.",
    );
  });

  it("rejects a lost report publish location outside Bolivia", () => {
    const draft = {
      ...createInitialLostReportDraft({ petProfiles: [] }),
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
    };

    expect(() => toPublishLostPetReportInput({ draft })).toThrow(
      "Selecciona una ubicacion dentro de Bolivia.",
    );
  });

  it("surfaces a sponsored local care resource after publishing without recovery priority language", () => {
    const draft = createInitialLostReportDraft({ petProfiles: profiles });

    const viewModel = buildLostReportCreationViewModel({
      draft,
      petProfiles: profiles,
      session: { kind: "member", memberId: "member-camila" },
    });

    expect(viewModel.success.localSponsorPlacement).toMatchObject({
      actionLabel: "Ver recurso",
      categoryLabel: "Veterinaria",
      paidDisclosure: "Colocacion pagada",
      reportActionLabel: "Reportar",
      sponsorLabel: "Patrocinado",
      title: "Recurso local cercano",
    });
    expect(viewModel.success.localSponsorPlacement?.body).toContain(
      "orientacion local",
    );
    expect(
      viewModel.success.localSponsorPlacement?.recoveryPriorityDisclosure,
    ).toContain("No cambia la prioridad de tu reporte");

    const renderedCopy = JSON.stringify(
      viewModel.success.localSponsorPlacement,
    ).toLowerCase();

    for (const forbiddenCopy of [
      "destacado",
      "mas visible",
      "notificacion",
      "promocion",
      "push",
      "ranking",
      "urgente",
    ]) {
      expect(renderedCopy).not.toContain(forbiddenCopy);
    }
  });
});
