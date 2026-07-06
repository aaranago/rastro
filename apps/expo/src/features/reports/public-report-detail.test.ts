import { describe, expect, it, vi } from "vitest";

import type { PublicReportDetailApiReport } from "./public-report-detail";
import {
  buildPublicReportDetailViewModel,
  classifyPublicReportDetailLoadFailure,
  createApiPublicReportDetailAdapter,
} from "./public-report-detail";

const publicReportIds = {
  defaultLost: "11111111-1111-4111-8111-000000000001",
  lostDetail: "11111111-1111-4111-8111-000000000101",
} as const;

describe("public report detail view model", () => {
  it("turns a Lost Pet report detail into a user-facing screen model without raw ids", () => {
    const viewModel = buildPublicReportDetailViewModel(
      createReport({
        id: publicReportIds.lostDetail,
        location: {
          latitude: -16.5,
          longitude: -68.12,
          precision: "approximate",
          label: "La Paz",
          locationCell: "La Paz",
        },
        media: [
          createMedia({
            canonicalUrl: "https://cdn.rastro.bo/luna-2.jpg",
            position: 2,
          }),
          createMedia({
            canonicalUrl: "https://cdn.rastro.bo/luna-1.jpg",
            position: 1,
          }),
        ],
        owner: {
          isCurrentMember: false,
        },
        pet: {
          breed: "Siames",
          color: "Collar rojo",
          distinguishingTraits: "Mancha blanca en el pecho",
          name: "Luna",
          size: null,
          species: "cat",
        },
        title: "Luna perdida en La Paz",
        type: "lost_pet",
      }),
    );

    expect(viewModel).toMatchObject({
      contactActions: [
        {
          href: `rastro://chats/report/${publicReportIds.lostDetail}`,
          kind: "in-app-chat",
          label: "Enviar mensaje en Rastro",
        },
      ],
      abuseReportAction: {
        label: "Reportar",
        title: "Reportar este reporte",
      },
      contactLabel: "Chat en Rastro",
      descriptionTitle: "Qué pasó",
      locationAction: {
        label: "Ver zona en mapa",
        url: "https://www.google.com/maps/search/?api=1&query=-16.5%2C-68.12",
      },
      locationPrivacyLabel: "Mostramos una zona aproximada por seguridad.",
      photoUrls: [
        "https://cdn.rastro.bo/luna-1.jpg",
        "https://cdn.rastro.bo/luna-2.jpg",
      ],
      statusLabel: "Activo",
      subtitle: "Gato · Siames",
      title: "Se busca a Luna",
      typeLabel: "Mascota perdida",
    });
    expect(JSON.stringify(viewModel)).not.toContain("/report-create/sighting");
    expect(viewModel.facts).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Contacto",
        }),
      ]),
    );
    expect(viewModel.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Señales",
          value: "Collar rojo · Mancha blanca en el pecho",
        }),
      ]),
    );
    expect(viewModel.shareMessage).toContain(
      `https://rastro.bo/reportes/perdidos/${publicReportIds.lostDetail}`,
    );
    expect(
      JSON.stringify({
        contactActions: viewModel.contactActions,
        facts: viewModel.facts,
        shareMessage: viewModel.shareMessage,
        shareTitle: viewModel.shareTitle,
      }),
    ).not.toContain("reportId");
  });

  it("labels exact locations and closed outcomes in plain Spanish", () => {
    const viewModel = buildPublicReportDetailViewModel(
      createReport({
        contact: {
          actions: [],
          hasWhatsapp: true,
          preference: "both",
        },
        location: {
          latitude: -16.5,
          longitude: -68.12,
          precision: "exact",
          label: "Calle 8 de Obrajes",
          locationCell: "Obrajes",
        },
        outcome: "reunited",
        status: "closed",
      }),
    );

    expect(viewModel.contactLabel).toBe("Chat en Rastro y WhatsApp");
    expect(viewModel.locationPrivacyLabel).toBe(
      "Pin exacto compartido por la persona cuidadora.",
    );
    expect(viewModel.statusLabel).toBe("Reunida");
    expect(viewModel.statusTone).toBe("closed");
  });

  it("shows owner-facing pending-review copy without visitor contact actions", () => {
    const viewModel = buildPublicReportDetailViewModel(
      createReport({
        status: "pending_review",
      }),
    );

    expect(viewModel.contactActions).toEqual([]);
    expect(viewModel.ownerNotice).toEqual({
      body: "El equipo de Rastro lo está revisando antes de mostrarlo públicamente. Puedes verlo aquí porque es tu reporte.",
      title: "Reporte en revisión",
      tone: "review",
    });
    expect(viewModel.statusLabel).toBe("En revisión");
    expect(viewModel.statusTone).toBe("review");
  });

  it("classifies not-found detail failures as unavailable instead of retryable network failures", () => {
    expect(
      classifyPublicReportDetailLoadFailure({
        data: {
          code: "NOT_FOUND",
        },
      }),
    ).toBe("unavailable");
    expect(
      classifyPublicReportDetailLoadFailure(
        new Error("TRPCClientError: NOT_FOUND"),
      ),
    ).toBe("unavailable");
    expect(
      classifyPublicReportDetailLoadFailure(
        new Error("Network request failed"),
      ),
    ).toBe("error");
  });

  it("preserves five ready media URLs in display order", () => {
    const viewModel = buildPublicReportDetailViewModel(
      createReport({
        media: [4, 2, 5, 1, 3].map((position) =>
          createMedia({
            canonicalUrl: `https://cdn.rastro.bo/asdf-${position}.jpg`,
            id: `media-${position}`,
            position,
          }),
        ),
      }),
    );

    expect(viewModel.photoUrls).toEqual([
      "https://cdn.rastro.bo/asdf-1.jpg",
      "https://cdn.rastro.bo/asdf-2.jpg",
      "https://cdn.rastro.bo/asdf-3.jpg",
      "https://cdn.rastro.bo/asdf-4.jpg",
      "https://cdn.rastro.bo/asdf-5.jpg",
    ]);
  });

  it("replaces raw manual-pin location labels with safe approximate wording", () => {
    const viewModel = buildPublicReportDetailViewModel(
      createReport({
        location: {
          latitude: -16.4882,
          longitude: -68.1287,
          precision: "approximate",
          label: "Pin manual -16.4882, -68.1287",
          locationCell: "La Paz",
        },
      }),
    );

    expect(viewModel.locationLabel).toBe("La Paz · zona aproximada");
    expect(viewModel.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Ubicación",
          value: "La Paz · zona aproximada",
        }),
      ]),
    );
  });

  it("uses API-provided contact actions without displaying raw phone data", () => {
    const viewModel = buildPublicReportDetailViewModel(
      createReport({
        contact: createContactWithActions({
          actions: [
            {
              href: "https://wa.me/59170123456?text=Hola",
              kind: "whatsapp",
              label: "+591 70123456",
              phoneNumber: "+591 70123456",
            },
            {
              href: "rastro://chats/conversation-1",
              kind: "in_app_chat",
              label: "Chat con Camila",
            },
            {
              href: "https://example.com/not-whatsapp",
              kind: "whatsapp",
              label: "Invalida",
            },
          ],
          hasWhatsapp: true,
          preference: "both",
        }),
        owner: {
          isCurrentMember: false,
        },
      }),
    );

    expect(viewModel.contactActions).toEqual([
      {
        href: "https://wa.me/59170123456?text=Hola",
        kind: "whatsapp",
        label: "Escribir por WhatsApp",
        phoneNumber: "",
      },
      {
        href: "rastro://chats/conversation-1",
        kind: "in-app-chat",
        label: "Enviar mensaje en Rastro",
      },
    ]);
    expect(viewModel.contactLabel).toBe("Chat en Rastro y WhatsApp");
    expect(JSON.stringify(viewModel)).not.toContain("+591 70123456");
  });

  it("keeps visitor contact actions off the owner's own detail page", () => {
    const viewModel = buildPublicReportDetailViewModel(createReport());

    expect(viewModel.contactActions).toEqual([]);
    expect(viewModel.abuseReportAction).toBe(null);
  });

  it("does not repeat identical pet detail text from API color and traits fields", () => {
    const viewModel = buildPublicReportDetailViewModel(
      createReport({
        pet: {
          breed: "Mestiza",
          color: "Collar rojo y mancha blanca visible",
          distinguishingTraits: "Collar rojo y mancha blanca visible",
          name: "Luna",
          size: null,
          species: "cat",
        },
      }),
    );

    expect(viewModel.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Señales",
          value: "Collar rojo y mancha blanca visible",
        }),
      ]),
    );
  });

  it("uses the detail adapter to query the backend by report id", async () => {
    const report = createReport();
    const client = {
      report: {
        detail: {
          query: vi.fn().mockResolvedValue(report),
        },
        reportAbuse: {
          mutate: vi.fn().mockResolvedValue({
            reviewItem: {
              id: "moderation-review-1",
              reason: "scam",
              reportId: "report-lost-1",
              status: "pending",
            },
            status: "created",
          }),
        },
      },
    };
    const adapter = createApiPublicReportDetailAdapter({ client });

    await expect(adapter.getReportDetail("report-lost-1")).resolves.toBe(
      report,
    );
    expect(client.report.detail.query).toHaveBeenCalledWith({
      id: "report-lost-1",
    });
    await expect(
      adapter.reportAbuse({
        detail: "El reporte parece fraudulento.",
        reason: "scam",
        reportId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toMatchObject({
      status: "created",
    });
    expect(client.report.reportAbuse.mutate).toHaveBeenCalledWith({
      detail: "El reporte parece fraudulento.",
      reason: "scam",
      reportId: "11111111-1111-4111-8111-111111111111",
    });
  });
});

function createReport(
  overrides: Partial<PublicReportDetailApiReport> = {},
): PublicReportDetailApiReport {
  return {
    contact: {
      actions: [],
      hasWhatsapp: false,
      preference: "in_app_chat",
    },
    createdAt: new Date("2026-06-24T13:00:00.000Z"),
    description: "Se perdio cerca de la zona y puede estar asustada.",
    eventOccurredAt: new Date("2026-06-24T12:30:00.000Z"),
    id: publicReportIds.defaultLost,
    location: {
      latitude: -16.5,
      longitude: -68.12,
      precision: "approximate",
      label: "La Paz",
      locationCell: "La Paz",
    },
    media: [],
    outcome: null,
    owner: {
      isCurrentMember: true,
    },
    pet: {
      breed: "Siames",
      color: "Collar rojo",
      distinguishingTraits: "Mancha blanca en el pecho",
      name: "Luna",
      size: null,
      species: "cat",
    },
    resolvedAt: null,
    status: "active",
    title: "Luna perdida en La Paz",
    type: "lost_pet",
    updatedAt: new Date("2026-06-24T13:00:00.000Z"),
    ...overrides,
  };
}

function createContactWithActions({
  actions,
  hasWhatsapp,
  preference,
}: PublicReportDetailApiReport["contact"] & {
  actions: unknown[];
}): PublicReportDetailApiReport["contact"] {
  return {
    actions,
    hasWhatsapp,
    preference,
  } as PublicReportDetailApiReport["contact"];
}

function createMedia(
  overrides: Partial<PublicReportDetailApiReport["media"][number]> = {},
): PublicReportDetailApiReport["media"][number] {
  return {
    altText: null,
    canonicalUrl: "https://cdn.rastro.bo/luna.jpg",
    height: 1200,
    id: "media-1",
    mimeType: "image/jpeg",
    objectKey: "reports/luna.jpg",
    position: 1,
    sizeBytes: 320_000,
    thumbnailObjectKey: "reports/luna-thumb.jpg",
    width: 1200,
    ...overrides,
  };
}
