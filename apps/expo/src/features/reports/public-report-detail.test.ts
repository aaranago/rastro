import { describe, expect, it, vi } from "vitest";

import type { PublicReportDetailApiReport } from "./public-report-detail";
import {
  buildPublicReportDetailViewModel,
  createApiPublicReportDetailAdapter,
} from "./public-report-detail";

describe("public report detail view model", () => {
  it("turns a Lost Pet report detail into a user-facing screen model without raw ids", () => {
    const viewModel = buildPublicReportDetailViewModel(
      createReport({
        id: "report-lost-raw-id",
        location: {
          latitude: -16.5,
          longitude: -68.12,
          precision: "approximate",
          label: "La Paz",
          locationCell: "La Paz",
        },
        media: [
          createMedia({ canonicalUrl: "https://cdn.rastro.bo/luna-2.jpg", position: 2 }),
          createMedia({ canonicalUrl: "https://cdn.rastro.bo/luna-1.jpg", position: 1 }),
        ],
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
      contactLabel: "Chat en Rastro",
      descriptionTitle: "Que paso",
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
    expect(viewModel.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Senales",
          value: "Collar rojo · Mancha blanca en el pecho",
        }),
      ]),
    );
    expect(viewModel.shareMessage).toContain(
      "https://rastro.bo/reportes/perdidos/report-lost-raw-id",
    );
    expect(JSON.stringify(viewModel)).not.toContain("reportId");
  });

  it("labels exact locations and closed outcomes in plain Spanish", () => {
    const viewModel = buildPublicReportDetailViewModel(
      createReport({
        contact: {
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
          label: "Senales",
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
      },
    };
    const adapter = createApiPublicReportDetailAdapter({ client });

    await expect(adapter.getReportDetail("report-lost-1")).resolves.toBe(report);
    expect(client.report.detail.query).toHaveBeenCalledWith({
      id: "report-lost-1",
    });
  });
});

function createReport(
  overrides: Partial<PublicReportDetailApiReport> = {},
): PublicReportDetailApiReport {
  return {
    contact: {
      hasWhatsapp: false,
      preference: "in_app_chat",
    },
    createdAt: new Date("2026-06-24T13:00:00.000Z"),
    description: "Se perdio cerca de la zona y puede estar asustada.",
    eventOccurredAt: new Date("2026-06-24T12:30:00.000Z"),
    id: "report-lost-1",
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
