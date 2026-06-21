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
        label: "Iniciar sesion para reportar avistamiento",
      },
    });
  });

  it("requires time, exact internal location, description, condition, direction, and visible pet details when no photo is present", () => {
    const viewModel = buildSightingReportCreationViewModel({
      draft: createSightingReportDraft(),
      session: { kind: "member", memberId: "member-camila" },
    });

    expect(viewModel.canPublish).toBe(false);
    expect(viewModel.photos.error).toBeUndefined();
    expect(viewModel.review.validationErrors).toEqual([
      "Selecciona donde fue visto el animal.",
      "Indica cuando fue visto.",
      "Describe la condicion observada.",
      "Indica hacia donde iba.",
      "Agrega una descripcion del avistamiento.",
      "Agrega senas visibles de la mascota vista.",
    ]);
    expect(() =>
      toPublishSightingReportInput({ draft: createSightingReportDraft() }),
    ).toThrow("Selecciona donde fue visto el animal.");
  });

  it("lets a member publish a useful no-photo Sighting Report with Spanish sighting-specific copy", () => {
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
      sightingDescription:
        "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
    });
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
      "Ingresa fecha y hora en formato ISO, por ejemplo 2026-06-18T10:15:00.000Z.",
    );
    expect(viewModel.review.validationErrors).toContain(
      "Ingresa fecha y hora en formato ISO, por ejemplo 2026-06-18T10:15:00.000Z.",
    );
    expect(() => toPublishSightingReportInput({ draft })).toThrow(
      "Ingresa fecha y hora en formato ISO",
    );
  });
});
