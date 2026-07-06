import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicReportDetail } from "./public-report-detail-api-adapter";

const publicReportDetailApi = vi.hoisted(() => ({
  getPublicReportDetail: vi.fn(),
}));

const authServer = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const navigation = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("~/public-report-detail-api-adapter", () => publicReportDetailApi);
vi.mock("~/auth/server", () => authServer);
vi.mock("next/navigation", () => navigation);

const privateCoordinateLabel = "Pin manual -16.506789, -68.123456";

function persistedReport(
  overrides: Partial<PublicReportDetail> = {},
): PublicReportDetail {
  return {
    id: "found-luna-db",
    type: "found_pet",
    status: "active",
    outcome: null,
    title: "Luna fue encontrada en Sopocachi DB",
    description:
      "Luna estaba tranquila y llevaba una pañoleta roja cerca de la plaza.",
    pet: {
      name: "Luna",
      species: "dog",
      breed: "Mestiza joven",
      color: "blanca",
      size: "mediana",
      distinguishingTraits: null,
    },
    eventOccurredAt: new Date("2026-06-19T22:40:00.000Z"),
    contact: {
      actions: [
        {
          href: "rastro://chats/report/found-luna-db",
          kind: "in_app_chat",
        },
        {
          href: "https://wa.me/59171234567",
          kind: "whatsapp",
        },
      ],
      preference: "both",
      hasWhatsapp: true,
    },
    location: {
      latitude: -16.506789,
      longitude: -68.123456,
      precision: "approximate",
      label: "Sopocachi, La Paz",
      locationCell: "bo-lpb-sopocachi",
    },
    media: [
      {
        id: "media-luna-1",
        objectKey: "reports/luna-1.jpg",
        canonicalUrl: "https://cdn.rastro.bo/reports/luna-1.jpg",
        thumbnailObjectKey: null,
        mimeType: "image/jpeg",
        width: 1200,
        height: 900,
        sizeBytes: 200000,
        altText: "Luna, perrita blanca encontrada",
        position: 0,
      },
    ],
    owner: {
      isCurrentMember: false,
    },
    createdAt: new Date("2026-06-19T23:15:00.000Z"),
    updatedAt: new Date("2026-06-19T23:15:00.000Z"),
    resolvedAt: null,
    ...overrides,
  };
}

describe("public found and sighting report pages", () => {
  beforeEach(() => {
    vi.resetModules();
    authServer.getSession.mockReset();
    authServer.getSession.mockResolvedValue(null);
    publicReportDetailApi.getPublicReportDetail.mockReset();
    navigation.notFound.mockClear();
  });

  it("renders a found report at the shared public URL without coordinate text", async () => {
    publicReportDetailApi.getPublicReportDetail.mockResolvedValue(
      persistedReport({
        location: {
          latitude: -16.506789,
          longitude: -68.123456,
          precision: "approximate",
          label: privateCoordinateLabel,
          locationCell: "bo-lpb-sopocachi",
        },
      }),
    );
    const { default: PublicFoundReportPage } = await import(
      "./app/reportes/encontrados/[reportId]/page"
    );

    const html = renderToStaticMarkup(
      await PublicFoundReportPage({
        params: Promise.resolve({
          reportId: "found-luna-db",
        }),
      }),
    );

    expect(html).toContain("Mascota encontrada");
    expect(html).toContain("Luna fue encontrada en Sopocachi DB");
    expect(html).toContain("Perro - Mestiza joven - blanca - mediana");
    expect(html).toContain("Encontrado");
    expect(html).toContain("bo lpb sopocachi - zona aproximada");
    expect(html).toContain("Descripcion del encuentro");
    expect(html).toContain("Enviar mensaje en Rastro");
    expect(html).toContain("Escribir por WhatsApp");
    expect(html).toContain("Reportar");
    expect(html).toContain(
      "/?auth=signin-required&amp;returnTo=%2Freportes%2Fencontrados%2Ffound-luna-db#auth",
    );
    expect(html).not.toContain(privateCoordinateLabel);
    expect(html).not.toContain("-16.506789");
    expect(html).not.toContain("-68.123456");
  });

  it("renders a signed-in abuse form for sighting report visitors", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        id: "member-diego",
      },
    });
    publicReportDetailApi.getPublicReportDetail.mockResolvedValue(
      persistedReport({
        id: "sighting-toby-db",
        type: "sighting",
        title: "Toby fue visto en Miraflores DB",
        description:
          "Caminaba hacia la plaza y parecía desorientado pero sin heridas visibles.",
        pet: {
          name: "Toby",
          species: "dog",
          breed: "Mediano",
          color: "cafe",
          size: "mediano",
          distinguishingTraits: null,
        },
      }),
    );
    const { default: PublicSightingReportPage } = await import(
      "./app/reportes/avistamientos/[reportId]/page"
    );

    const html = renderToStaticMarkup(
      await PublicSightingReportPage({
        params: Promise.resolve({
          reportId: "sighting-toby-db",
        }),
        searchParams: Promise.resolve({
          reportAbuse: "created",
        }),
      }),
    );

    expect(html).toContain("Avistamiento activo");
    expect(html).toContain("Toby fue visto en Miraflores DB");
    expect(html).toContain("Avistado");
    expect(html).toContain("Descripcion del avistamiento");
    expect(html).toContain("Gracias. El equipo de Rastro revisará este reporte.");
    expect(html).toContain('name="reportId" value="sighting-toby-db"');
    expect(html).toContain('name="reason"');
    expect(html).toContain("Enviar reporte");
    expect(html).not.toContain("Inicia sesión para reportar");
  });

  it("returns metadata and not-found boundaries for missing reports", async () => {
    publicReportDetailApi.getPublicReportDetail.mockResolvedValue(null);
    const { default: PublicFoundReportPage, generateMetadata } = await import(
      "./app/reportes/encontrados/[reportId]/page"
    );

    await expect(
      PublicFoundReportPage({
        params: Promise.resolve({
          reportId: "hidden-report",
        }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigation.notFound).toHaveBeenCalledOnce();

    await expect(
      generateMetadata({
        params: Promise.resolve({
          reportId: "unknown-report",
        }),
      }),
    ).resolves.toEqual({
      title: "Reporte de mascota encontrada no encontrado | Rastro",
    });
  });
});
