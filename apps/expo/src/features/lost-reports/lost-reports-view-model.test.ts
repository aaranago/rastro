import { describe, expect, it } from "vitest";

import {
  buildLostPetReportPublishViewModel,
  createLostPetReportDraft,
} from "./lost-reports-view-model";

const memberSession = {
  displayName: "Camila",
  kind: "member",
  memberId: "member-camila",
} as const;

describe("Lost Pet Report publish view model", () => {
  it("keeps Spanish-first validation and location privacy copy behind the view model", () => {
    const draft = createLostPetReportDraft({
      contactOption: {
        kind: "whatsapp",
        phoneNumber: "",
      },
      exactLocation: {
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      lastSeenAt: "2026-06-18T09:45:00.000Z",
      lastSeenDescription: "Se escapo cerca de la plaza.",
      petProfile: {
        kind: "inline",
        profile: {
          breed: "Mestizo",
          description: "Patas blancas y collar rojo.",
          name: "Toby",
          photos: [{ id: "pet-photo-1", uri: "file:///toby-profile.heic" }],
          type: "Perro",
        },
      },
      photos: [],
    });

    const viewModel = buildLostPetReportPublishViewModel({
      draft,
      session: memberSession,
    });

    expect(viewModel).toMatchObject({
      canPublish: false,
      contactOptions: [
        { isSelected: false, label: "Chat en Rastro", value: "in-app-chat" },
        { isSelected: true, label: "WhatsApp", value: "whatsapp" },
        { isSelected: false, label: "Ambos", value: "both" },
      ],
      kind: "member",
      locationPrivacyLabel: "Sopocachi · zona aproximada",
      publishActionLabel: "Publicar reporte",
      title: "Reportar perdida",
    });
    expect(viewModel.blockers).toEqual([
      "Agrega al menos una foto.",
      "Ingresa un numero de WhatsApp.",
    ]);
  });
});
