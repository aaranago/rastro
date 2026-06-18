import { describe, expect, it } from "vitest";

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

  it("converts a complete found pet draft into publish input with location, timing, condition, description, and contact", () => {
    const draft = createFoundReportDraft({
      contact: {
        inAppChatEnabled: true,
        whatsappEnabled: true,
        whatsappPhone: "  +591 70123456 ",
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
        description:
          "Encontrada cerca de la fuente. No lleva collar ni identificacion visible.",
        foundAtLabel: "2026-06-18T10:30:00.000Z",
      },
      pet: {
        breed: "Husky mix",
        description: "Pelaje gris y ojos claros.",
        type: "Perro",
      },
      photos: [{ id: "found-report-photo-1", uri: "file:///husky-found.heic" }],
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
      photos: [{ id: "found-report-photo-1", uri: "file:///husky-found.heic" }],
      showExactPublicLocation: false,
    });
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
      error: "Ingresa el numero de WhatsApp que quieres mostrar.",
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
