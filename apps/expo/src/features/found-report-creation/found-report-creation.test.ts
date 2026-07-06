import { describe, expect, it, vi } from "vitest";

import {
  buildFoundReportCreationViewModel,
  createFoundReportDraft,
  selectFoundReportContactOption,
  toPublishFoundPetReportInput,
} from "./found-report-creation-view-model";

describe("Found Pet Report creation view model", () => {
  it("starts members with Spanish found-pet copy and requires at least one photo", () => {
    const draft = createFoundReportDraft();

    const viewModel = buildFoundReportCreationViewModel({
      draft,
      session: { kind: "member", memberId: "member-camila" },
    });

    expect(viewModel).toMatchObject({
      canPublish: false,
      kind: "member",
      title: "Reportar encontrada",
    });
    expect(viewModel.header.eyebrow).toBe("Mascota encontrada");
    expect(viewModel.photos.error).toContain("Agrega al menos una foto");
    expect(viewModel.review.publishActionLabel).toBe("Completar datos");
    expect(JSON.stringify(viewModel)).not.toMatch(/perdid|avist/i);
  });

  it("exposes canonical journey data and suppresses validation until the current found step is attempted", () => {
    const draft = createFoundReportDraft({
      contact: {
        inAppChatEnabled: false,
        whatsappEnabled: false,
        whatsappPhone: "",
      },
    });

    const quietViewModel = buildFoundReportCreationViewModel({
      draft,
      journey: {
        completedStepIds: ["chooseType"],
        currentStepId: "photos",
      },
      validationDisplay: {},
    });

    expect(quietViewModel.journey).toMatchObject({
      currentStep: {
        id: "photos",
        status: "current",
      },
      progressText: "Paso 2 de 8",
      reportType: "found",
    });
    expect(
      quietViewModel.journey.steps.filter((step) => step.status === "current"),
    ).toHaveLength(1);
    expect(quietViewModel.photos.error).toBeUndefined();
    expect(quietViewModel.foundDetails.fields.condition.error).toBeUndefined();
    expect(quietViewModel.pet.fields.description.error).toBeUndefined();
    expect(quietViewModel.contact.error).toBeUndefined();
    expect(quietViewModel.review.validationErrors).toEqual([]);

    const attemptedPhotosViewModel = buildFoundReportCreationViewModel({
      draft,
      journey: {
        completedStepIds: ["chooseType"],
        currentStepId: "photos",
      },
      validationDisplay: {
        attemptedStepId: "photos",
      },
    });

    expect(attemptedPhotosViewModel.photos.error).toBe(
      "Agrega al menos una foto.",
    );

    const attemptedDetailsViewModel = buildFoundReportCreationViewModel({
      draft,
      journey: {
        completedStepIds: ["chooseType", "photos"],
        currentStepId: "details",
      },
      validationDisplay: {
        attemptedStepId: "details",
      },
    });

    expect(attemptedDetailsViewModel.foundDetails.fields.condition.error).toBe(
      "Describe la condicion de la mascota encontrada.",
    );
    expect(
      attemptedDetailsViewModel.foundDetails.fields.description.error,
    ).toBe("Agrega una descripcion de la mascota encontrada.");
    expect(attemptedDetailsViewModel.pet.fields.description.error).toBe(
      "Agrega senas visibles de la mascota encontrada.",
    );

    const attemptedContactViewModel = buildFoundReportCreationViewModel({
      draft,
      journey: {
        completedStepIds: ["chooseType", "photos", "details", "location"],
        currentStepId: "contact",
      },
      validationDisplay: {
        attemptedStepId: "contact",
      },
    });

    expect(attemptedContactViewModel.contact.error).toBe(
      "Elige chat, WhatsApp o ambos.",
    );
  });

  it("blocks found reports with a too-short public description before publish", () => {
    const viewModel = buildFoundReportCreationViewModel({
      draft: createFoundReportDraft({
        foundDetails: {
          condition: "Esta tranquila y segura.",
          description: "sdf",
          foundAtLabel: "2026-06-18T10:50:00.000Z",
        },
        pet: {
          breed: "",
          description: "Collar rojo y patas blancas.",
          type: "Perro",
        },
      }),
      journey: {
        completedStepIds: ["chooseType", "photos"],
        currentStepId: "details",
      },
      validationDisplay: {
        attemptedStepId: "details",
      },
    });

    expect(viewModel.foundDetails.fields.description.error).toBe(
      "Escribe una descripcion de al menos 10 caracteres.",
    );
    expect(viewModel.canPublish).toBe(false);
  });

  it("converts a complete found pet draft into publish input with location, timing, condition, description, and contact", () => {
    const draft = createFoundReportDraft({
      contact: {
        inAppChatEnabled: true,
        whatsappEnabled: true,
        whatsappPhone: "  +591 70123456 ",
      },
      exactFoundLocation: {
        addressLabel: "  Jardin Botanico de La Paz  ",
        coordinates: {
          latitude: -16.5022,
          longitude: -68.1213,
        },
        department: "La Paz",
        locationCellLabel: "  Miraflores  ",
        municipality: "La Paz",
      },
      foundDetails: {
        condition: "Amigable y sin heridas visibles.",
        description:
          "Encontrada cerca de la fuente. No lleva collar ni identificacion visible.",
        foundAtLabel: "2026-06-18T10:30:00.000Z",
      },
      pet: {
        breed: "Husky mix",
        description: "Pelaje gris y ojos claros.",
        type: "Perro",
      },
      photos: [
        {
          id: "found-report-photo-1",
          mediaId: "found-ready-media-1",
          status: "ready",
          uri: "file:///husky-found.heic",
        },
      ],
      showExactPinPublicly: false,
    });

    const publishInput = toPublishFoundPetReportInput({ draft });

    expect(publishInput).toMatchObject({
      contactOption: {
        kind: "both",
        phoneNumber: "+591 70123456",
      },
      condition: "Amigable y sin heridas visibles.",
      exactLocation: {
        addressLabel: "Jardin Botanico de La Paz",
        countryCode: "BO",
        latitude: -16.5022,
        locationCellLabel: "Miraflores",
        longitude: -68.1213,
      },
      foundAt: "2026-06-18T10:30:00.000Z",
      foundDescription:
        "Encontrada cerca de la fuente. No lleva collar ni identificacion visible.",
      pet: {
        breed: "Husky mix",
        description: "Pelaje gris y ojos claros.",
        type: "Perro",
      },
      photos: [{ id: "found-ready-media-1", uri: "file:///husky-found.heic" }],
      showExactPublicLocation: false,
    });
  });

  it("normalizes a Spanish relative found-at label to ISO for publish", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-18T12:00:00.000Z"));

    const draft = createFoundReportDraft({
      contact: {
        inAppChatEnabled: true,
        whatsappEnabled: false,
        whatsappPhone: "",
      },
      exactFoundLocation: {
        addressLabel: "Jardin Botanico de La Paz",
        coordinates: {
          latitude: -16.5022,
          longitude: -68.1213,
        },
        department: "La Paz",
        locationCellLabel: "Miraflores",
        municipality: "La Paz",
      },
      foundDetails: {
        condition: "Amigable y sin heridas visibles.",
        description: "Encontrada cerca de la fuente.",
        foundAtLabel: "Hoy, hace 20 min",
      },
      pet: {
        breed: "Husky mix",
        description: "Pelaje gris y ojos claros.",
        type: "Perro",
      },
      photos: [
        {
          id: "found-report-photo-1",
          mediaId: "found-ready-media-1",
          status: "ready",
          uri: "file:///husky-found.heic",
        },
      ],
    });

    try {
      const viewModel = buildFoundReportCreationViewModel({ draft });
      const publishInput = toPublishFoundPetReportInput({ draft });

      expect(viewModel.canPublish).toBe(true);
      expect(viewModel.foundDetails.fields.foundAtLabel.value).toBe(
        "Hoy, hace 20 min",
      );
      expect(publishInput.foundAt).toBe("2026-06-18T11:40:00.000Z");
    } finally {
      vi.useRealTimers();
    }
  });

  it("blocks publish for non-parseable found-at labels with a Spanish validation error", () => {
    const draft = createFoundReportDraft({
      contact: {
        inAppChatEnabled: true,
        whatsappEnabled: false,
        whatsappPhone: "",
      },
      exactFoundLocation: {
        addressLabel: "Jardin Botanico de La Paz",
        coordinates: {
          latitude: -16.5022,
          longitude: -68.1213,
        },
        department: "La Paz",
        locationCellLabel: "Miraflores",
        municipality: "La Paz",
      },
      foundDetails: {
        condition: "Amigable y sin heridas visibles.",
        description: "Encontrada cerca de la fuente.",
        foundAtLabel: "Hoy en la manana",
      },
      pet: {
        breed: "Husky mix",
        description: "Pelaje gris y ojos claros.",
        type: "Perro",
      },
      photos: [
        {
          id: "found-report-photo-1",
          mediaId: "found-ready-media-1",
          status: "ready",
          uri: "file:///husky-found.heic",
        },
      ],
    });

    const viewModel = buildFoundReportCreationViewModel({ draft });

    expect(viewModel.canPublish).toBe(false);
    expect(viewModel.foundDetails.fields.foundAtLabel.error).toContain(
      "fecha y hora valida",
    );
    expect(viewModel.review.validationErrors).toEqual(
      expect.arrayContaining([expect.stringContaining("fecha y hora valida")]),
    );
    expect(() => toPublishFoundPetReportInput({ draft })).toThrow(
      "fecha y hora valida",
    );
  });

  it("blocks required found reports until attached media has a ready uploaded media ID", () => {
    const draft = createFoundReportDraft({
      contact: {
        inAppChatEnabled: true,
        whatsappEnabled: false,
        whatsappPhone: "",
      },
      exactFoundLocation: {
        addressLabel: "Jardin Botanico de La Paz",
        coordinates: {
          latitude: -16.5022,
          longitude: -68.1213,
        },
        department: "La Paz",
        locationCellLabel: "Miraflores",
        municipality: "La Paz",
      },
      foundDetails: {
        condition: "Amigable y sin heridas visibles.",
        description: "Encontrada cerca de la fuente.",
        foundAtLabel: "2026-06-18T10:30:00.000Z",
      },
      pet: {
        breed: "Husky mix",
        description: "Pelaje gris y ojos claros.",
        type: "Perro",
      },
      photos: [
        {
          id: "found-uploading-photo",
          progress: 0.4,
          status: "uploading",
          uri: "file:///husky-found.heic",
        },
      ],
    });

    const viewModel = buildFoundReportCreationViewModel({
      draft,
      validationDisplay: {
        attemptedStepId: "photos",
      },
    });

    expect(viewModel.canPublish).toBe(false);
    expect(viewModel.photos.error).toBe(
      "Espera a que las fotos terminen de subirse.",
    );
    expect(() => toPublishFoundPetReportInput({ draft })).toThrow(
      "Espera a que las fotos terminen de subirse.",
    );
  });

  it("rejects publishing when a found pet report has no exact location", () => {
    const draft = createFoundReportDraft({
      contact: {
        inAppChatEnabled: true,
        whatsappEnabled: false,
        whatsappPhone: "",
      },
      foundDetails: {
        condition: "Amigable y sin heridas visibles.",
        description: "Encontrada cerca de la fuente.",
        foundAtLabel: "2026-06-18T10:30:00.000Z",
      },
      pet: {
        breed: "Husky mix",
        description: "Pelaje gris y ojos claros.",
        type: "Perro",
      },
      photos: [{ id: "found-report-photo-1", uri: "file:///husky-found.heic" }],
    });

    expect(() => toPublishFoundPetReportInput({ draft })).toThrow(
      "Selecciona donde fue encontrada.",
    );
  });

  it("rejects a found pet publish location outside Bolivia", () => {
    const draft = createFoundReportDraft({
      contact: {
        inAppChatEnabled: true,
        whatsappEnabled: false,
        whatsappPhone: "",
      },
      exactFoundLocation: {
        addressLabel: "Fuera de Bolivia",
        coordinates: {
          latitude: -8.5,
          longitude: -68.1213,
        },
        department: "La Paz",
        locationCellLabel: "Miraflores",
        municipality: "La Paz",
      },
      foundDetails: {
        condition: "Amigable y sin heridas visibles.",
        description: "Encontrada cerca de la fuente.",
        foundAtLabel: "2026-06-18T10:30:00.000Z",
      },
      pet: {
        breed: "Husky mix",
        description: "Pelaje gris y ojos claros.",
        type: "Perro",
      },
      photos: [{ id: "found-report-photo-1", uri: "file:///husky-found.heic" }],
    });

    expect(() => toPublishFoundPetReportInput({ draft })).toThrow(
      "Selecciona una ubicacion dentro de Bolivia.",
    );
  });

  it("captures a reusable found pet snapshot for public browse and detail labels", () => {
    const draft = createFoundReportDraft({
      pet: {
        breed: "Mestizo",
        description: "Orejas caidas, patas blancas y collar verde.",
        type: "Perro",
      },
    });

    const viewModel = buildFoundReportCreationViewModel({ draft });

    expect(viewModel.pet.fields.breed).toMatchObject({
      label: "Raza o descripcion corta",
      value: "Mestizo",
    });
    expect(viewModel.pet.fields.description.value).toBe(
      "Orejas caidas, patas blancas y collar verde.",
    );
    expect(viewModel.pet.typeOptions.map((option) => option.label)).toEqual([
      "Perro",
      "Gato",
      "Ave",
      "Conejo",
      "Otro",
    ]);
    expect(viewModel.review.rows).toEqual(
      expect.arrayContaining([
        {
          label: "Mascota",
          value: "Perro · Mestizo",
        },
      ]),
    );
  });

  it("supports chat, WhatsApp, or both contact options with a Bolivian WhatsApp placeholder", () => {
    const draft = createFoundReportDraft();

    const initialViewModel = buildFoundReportCreationViewModel({ draft });

    expect(
      initialViewModel.contact.options.map((option) => option.label),
    ).toEqual(["Chat en Rastro", "WhatsApp", "Ambos"]);
    expect(initialViewModel.contact.currentOption).toBe("chat");
    expect(initialViewModel.contact.whatsappField).toMatchObject({
      label: "Numero de WhatsApp",
      placeholder: "+591 70000000",
      visible: false,
    });

    const whatsappDraft = selectFoundReportContactOption({
      draft,
      option: "whatsapp",
    });
    const whatsappViewModel = buildFoundReportCreationViewModel({
      draft: whatsappDraft,
    });

    expect(whatsappDraft.contact).toMatchObject({
      inAppChatEnabled: false,
      whatsappEnabled: true,
    });
    expect(whatsappViewModel.contact.currentOption).toBe("whatsapp");
    expect(whatsappViewModel.contact.whatsappField).toMatchObject({
      error: "Ingresa el número de WhatsApp que quieres mostrar.",
      visible: true,
    });

    const bothDraft = selectFoundReportContactOption({
      draft,
      option: "both",
    });

    expect(bothDraft.contact).toMatchObject({
      inAppChatEnabled: true,
      whatsappEnabled: true,
    });
  });

  it("exposes visitor sign-in handoff copy without owning sign-in behavior", () => {
    const viewModel = buildFoundReportCreationViewModel({
      draft: createFoundReportDraft(),
      session: { kind: "visitor" },
    });

    expect(viewModel).toMatchObject({
      kind: "visitor",
      visitorAction: {
        intent: "found-report",
        label: "Iniciar sesion para reportar encontrada",
      },
    });
  });
});
