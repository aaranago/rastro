import { describe, expect, it } from "vitest";

import {
  buildSightingReportCreationViewModel,
  createSightingReportDraft,
  toPublishSightingReportInput,
} from "./sighting-report-creation-view-model";

describe("Sighting Report creation view model", () => {
  it("starts visitors with sign-in handoff data for Reportar avistamiento", () => {
    const viewModel = buildSightingReportCreationViewModel({
      draft: createSightingReportDraft(),
      session: { kind: "visitor" },
    });

    expect(viewModel).toMatchObject({
      canPublish: false,
      kind: "visitor",
      title: "Reportar avistamiento",
      visitorAction: {
        intent: "sighting-report",
        label: "Iniciar sesión para reportar avistamiento",
      },
    });
  });

  it("exposes canonical journey data and suppresses sighting validation until the details or contact step is attempted", () => {
    const draft = createSightingReportDraft({
      contact: {
        inAppChatEnabled: false,
        whatsappEnabled: false,
        whatsappPhone: "",
      },
    });

    const quietViewModel = buildSightingReportCreationViewModel({
      draft,
      journey: {
        completedStepIds: ["chooseType", "photos"],
        currentStepId: "details",
      },
      validationDisplay: {},
    });

    expect(quietViewModel.journey).toMatchObject({
      currentStep: {
        id: "details",
        status: "current",
      },
      progressText: "Paso 3 de 8",
      reportType: "sighting",
    });
    expect(
      quietViewModel.journey.steps.filter((step) => step.status === "current"),
    ).toHaveLength(1);
    expect(
      quietViewModel.sightingDetails.fields.observedAtLabel.error,
    ).toBeUndefined();
    expect(quietViewModel.pet.fields.description.error).toBeUndefined();
    expect(quietViewModel.contact.error).toBeUndefined();
    expect(quietViewModel.review.validationErrors).toEqual([]);

    const attemptedDetailsViewModel = buildSightingReportCreationViewModel({
      draft,
      journey: {
        completedStepIds: ["chooseType", "photos"],
        currentStepId: "details",
      },
      validationDisplay: {
        attemptedStepId: "details",
      },
    });

    expect(
      attemptedDetailsViewModel.sightingDetails.fields.observedAtLabel.error,
    ).toBe("Indica cuándo fue visto.");
    expect(
      attemptedDetailsViewModel.sightingDetails.fields.description.error,
    ).toBe("Agrega una descripción del avistamiento.");
    expect(attemptedDetailsViewModel.pet.fields.description.error).toBe(
      "Agrega señas visibles de la mascota vista.",
    );

    const attemptedContactViewModel = buildSightingReportCreationViewModel({
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

  it("blocks sighting reports with a too-short public description before publish", () => {
    const viewModel = buildSightingReportCreationViewModel({
      draft: createSightingReportDraft({
        pet: {
          breed: "",
          description: "Collar verde y patas blancas.",
          type: "Perro",
        },
        sightingDetails: {
          description: "sdf",
          direction: "Hacia la avenida.",
          observedAtLabel: "2026-06-18T10:50:00.000Z",
          observedCondition: "Asustada pero caminando.",
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

    expect(viewModel.sightingDetails.fields.description.error).toBe(
      "Escribe una descripción de al menos 10 caracteres.",
    );
    expect(viewModel.canPublish).toBe(false);
  });

  it("requires time, exact internal location, description, condition, direction, and visible pet details when no photo is present", () => {
    const viewModel = buildSightingReportCreationViewModel({
      draft: createSightingReportDraft(),
      session: { kind: "member", memberId: "member-camila" },
    });

    expect(viewModel.canPublish).toBe(false);
    expect(viewModel.photos.error).toBeUndefined();
    expect(viewModel.review.validationErrors).toEqual([
      "Selecciona dónde fue visto el animal.",
      "Indica cuándo fue visto.",
      "Describe la condición observada.",
      "Indica hacia dónde iba.",
      "Agrega una descripción del avistamiento.",
      "Agrega señas visibles de la mascota vista.",
    ]);
    expect(() =>
      toPublishSightingReportInput({ draft: createSightingReportDraft() }),
    ).toThrow("Selecciona dónde fue visto el animal.");
  });

  it("lets a member publish a useful no-photo Sighting Report with Spanish sighting-specific copy", () => {
    const draft = createSightingReportDraft({
      exactSightingLocation: {
        addressLabel: "  Plaza Abaroa, La Paz  ",
        coordinates: {
          latitude: -16.5103,
          longitude: -68.1299,
        },
        department: "La Paz",
        locationCellLabel: "  Sopocachi  ",
        municipality: "La Paz",
      },
      pet: {
        breed: "Mestizo",
        description: "Patas blancas, collar verde y orejas caidas.",
        type: "Perro",
      },
      sightingDetails: {
        description:
          "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
        direction: "Iba hacia la avenida 20 de Octubre.",
        observedAtLabel: "2026-06-18T10:15:00.000Z",
        observedCondition: "Asustado, caminando rapido, sin heridas visibles.",
      },
      showExactPinPublicly: true,
    });

    const viewModel = buildSightingReportCreationViewModel({
      draft,
      session: { kind: "member", memberId: "member-camila" },
    });
    const publishInput = toPublishSightingReportInput({ draft });

    expect(viewModel).toMatchObject({
      canPublish: true,
      kind: "member",
      title: "Reportar avistamiento",
    });
    expect(viewModel.header.eyebrow).toBe("Avistamiento de mascota");
    expect(viewModel.photos.error).toBeUndefined();
    expect(viewModel.review.publishActionLabel).toBe("Publicar avistamiento");
    expect(JSON.stringify(viewModel)).not.toMatch(/encontrad|asegurad/i);
    expect(publishInput).toMatchObject({
      direction: "Iba hacia la avenida 20 de Octubre.",
      exactLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      observedAt: "2026-06-18T10:15:00.000Z",
      observedCondition: "Asustado, caminando rapido, sin heridas visibles.",
      photos: [],
      showExactPublicLocation: true,
      sightingDescription:
        "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
    });
  });

  it("keeps sighting photos optional while publishing only ready uploaded media IDs", () => {
    const draft = createSightingReportDraft({
      exactSightingLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        coordinates: {
          latitude: -16.5103,
          longitude: -68.1299,
        },
        department: "La Paz",
        locationCellLabel: "Sopocachi",
        municipality: "La Paz",
      },
      pet: {
        breed: "Mestizo",
        description: "Patas blancas, collar verde y orejas caidas.",
        type: "Perro",
      },
      photos: [
        {
          id: "sighting-uploading-1",
          progress: 0.5,
          status: "uploading",
          uri: "file:///sighting-uploading.heic",
        },
        {
          id: "sighting-local-1",
          mediaId: "sighting-media-1",
          status: "ready",
          uri: "file:///sighting-ready.heic",
        },
      ],
      sightingDetails: {
        description:
          "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
        direction: "Iba hacia la avenida 20 de Octubre.",
        observedAtLabel: "2026-06-18T10:15:00.000Z",
        observedCondition: "Asustado, caminando rapido, sin heridas visibles.",
      },
    });

    const viewModel = buildSightingReportCreationViewModel({
      draft,
      validationDisplay: {
        attemptedStepId: "photos",
      },
    });
    const publishInput = toPublishSightingReportInput({ draft });

    expect(viewModel.canPublish).toBe(true);
    expect(viewModel.photos.error).toBe(
      "Espera a que las fotos terminen de subirse.",
    );
    expect(publishInput.photos).toEqual([
      { id: "sighting-media-1", uri: "file:///sighting-ready.heic" },
    ]);
  });

  it("rejects a sighting report publish location outside Bolivia", () => {
    const draft = createSightingReportDraft({
      exactSightingLocation: {
        addressLabel: "Fuera de Bolivia",
        coordinates: {
          latitude: -24,
          longitude: -68.1299,
        },
        department: "La Paz",
        locationCellLabel: "Sopocachi",
        municipality: "La Paz",
      },
      pet: {
        breed: "Mestizo",
        description: "Patas blancas, collar verde y orejas caidas.",
        type: "Perro",
      },
      sightingDetails: {
        description: "Paso por la esquina de la plaza.",
        direction: "Iba hacia la avenida 20 de Octubre.",
        observedAtLabel: "2026-06-18T10:15:00.000Z",
        observedCondition: "Asustado, caminando rapido.",
      },
    });

    expect(() => toPublishSightingReportInput({ draft })).toThrow(
      "Selecciona una ubicación dentro de Bolivia.",
    );
  });

  it("carries the same draft idempotency key into repeated publish attempts", () => {
    const draft = createSightingReportDraft({
      exactSightingLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        coordinates: {
          latitude: -16.5103,
          longitude: -68.1299,
        },
        department: "La Paz",
        locationCellLabel: "Sopocachi",
        municipality: "La Paz",
      },
      idempotencyKey: "sighting-draft-stable-key-1",
      pet: {
        breed: "Mestizo",
        description: "Patas blancas, collar verde y orejas caidas.",
        type: "Perro",
      },
      sightingDetails: {
        description:
          "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
        direction: "Iba hacia la avenida 20 de Octubre.",
        observedAtLabel: "2026-06-18T10:15:00.000Z",
        observedCondition: "Asustado, caminando rapido, sin heridas visibles.",
      },
    });

    const firstPublishInput = toPublishSightingReportInput({ draft });
    const retryPublishInput = toPublishSightingReportInput({ draft });

    expect(firstPublishInput.idempotencyKey).toBe(
      "sighting-draft-stable-key-1",
    );
    expect(retryPublishInput.idempotencyKey).toBe(
      firstPublishInput.idempotencyKey,
    );
  });

  it("does not enable backend publish for free-text sighting dates", () => {
    const draft = createSightingReportDraft({
      exactSightingLocation: {
        addressLabel: "Plaza Abaroa, La Paz",
        coordinates: {
          latitude: -16.5103,
          longitude: -68.1299,
        },
        department: "La Paz",
        locationCellLabel: "Sopocachi",
        municipality: "La Paz",
      },
      idempotencyKey: "sighting-draft-stable-key-1",
      pet: {
        breed: "Mestizo",
        description: "Patas blancas, collar verde y orejas caidas.",
        type: "Perro",
      },
      sightingDetails: {
        description:
          "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
        direction: "Iba hacia la avenida 20 de Octubre.",
        observedAtLabel: "Hoy en la mañana",
        observedCondition: "Asustado, caminando rapido, sin heridas visibles.",
      },
    });
    const viewModel = buildSightingReportCreationViewModel({
      draft,
      session: { kind: "member", memberId: "member-camila" },
    });

    expect(viewModel.canPublish).toBe(false);
    expect(viewModel.sightingDetails.fields.observedAtLabel.error).toBe(
      "Selecciona una fecha y hora valida.",
    );
    expect(viewModel.review.validationErrors).toContain(
      "Selecciona una fecha y hora valida.",
    );
    expect(() => toPublishSightingReportInput({ draft })).toThrow(
      "Selecciona una fecha y hora valida",
    );
  });
});
