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

const privateCoordinateLabel = "Pin manual -16.536229, -68.073419";

function persistedLostReport(
  overrides: Partial<PublicReportDetail> = {},
): PublicReportDetail {
  return {
    id: "11111111-1111-4111-8111-111111110001",
    type: "lost_pet",
    status: "active",
    outcome: null,
    title: "Bruno esta perdido en Achumani DB",
    description:
      "Bruno responde a su nombre y llevaba collar azul. Puede estar asustado por el trafico.",
    pet: {
      name: "Bruno",
      species: "dog",
      breed: "Mestizo",
      color: "miel",
      size: "mediano",
      distinguishingTraits: null,
    },
    eventOccurredAt: new Date("2026-06-19T22:40:00.000Z"),
    contact: {
      actions: [
        {
          href: "https://wa.me/59176543210",
          kind: "whatsapp",
        },
        {
          href: "rastro://reportes/perdidos/11111111-1111-4111-8111-111111110001",
          kind: "in_app_chat",
        },
      ],
      preference: "both",
      hasWhatsapp: true,
    },
    location: {
      latitude: -16.536229,
      longitude: -68.073419,
      precision: "approximate",
      label: "Achumani, La Paz",
      locationCell: "bo-lpb-achumani",
    },
    media: [
      {
        id: "media-bruno-1",
        objectKey: "reports/bruno-1.jpg",
        canonicalUrl: "https://cdn.rastro.bo/reports/bruno-1.jpg",
        thumbnailObjectKey: null,
        mimeType: "image/jpeg",
        width: 1200,
        height: 900,
        sizeBytes: 200000,
        altText: "Bruno, perro mestizo color miel",
        position: 0,
      },
    ],
    owner: {
      isCurrentMember: false,
    },
    createdAt: new Date("2026-06-19T22:45:00.000Z"),
    updatedAt: new Date("2026-06-19T22:45:00.000Z"),
    resolvedAt: null,
    ...overrides,
  };
}

describe("public Lost Pet Report page", () => {
  beforeEach(() => {
    vi.resetModules();
    authServer.getSession.mockReset();
    authServer.getSession.mockResolvedValue(null);
    publicReportDetailApi.getPublicReportDetail.mockReset();
    navigation.notFound.mockClear();
  });

  it("renders persisted lost report detail without coordinate text", async () => {
    publicReportDetailApi.getPublicReportDetail.mockResolvedValue(
      persistedLostReport({
        location: {
          latitude: -16.536229,
          longitude: -68.073419,
          precision: "approximate",
          label: privateCoordinateLabel,
          locationCell: "bo-lpb-achumani",
        },
      }),
    );
    const { default: PublicLostReportPage } = await import(
      "./app/reportes/perdidos/[reportId]/page"
    );

    const html = renderToStaticMarkup(
      await PublicLostReportPage({
        params: Promise.resolve({
          reportId: "11111111-1111-4111-8111-111111110001",
        }),
      }),
    );

    expect(html).toContain("Reporte activo");
    expect(html).toContain("Bruno esta perdido en Achumani DB");
    expect(html).toContain("Perro - Mestizo - miel - mediano");
    expect(html).toContain("bo lpb achumani - zona aproximada");
    expect(html).toContain("Escribir por WhatsApp");
    expect(html).toContain("Enviar mensaje en Rastro");
    expect(html).toContain('href="https://rastro.bo/descargar?context=report');
    expect(html).toContain("Instalar o abrir Rastro");
    expect(html).toContain("Reportar");
    expect(html).toContain("Inicia sesión para reportar");
    expect(html).toContain(
      "/?auth=signin-required&amp;returnTo=%2Freportes%2Fperdidos%2F11111111-1111-4111-8111-111111110001#auth",
    );
    expect(html).toContain("Imagen no disponible");
    expect(html).not.toContain(privateCoordinateLabel);
    expect(html).not.toContain("-16.536229");
    expect(html).not.toContain("-68.073419");
    expect(html).not.toContain("Coordenadas");
  });

  it("renders a signed-in abuse report form for non-owner visitors", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        id: "member-diego",
      },
    });
    publicReportDetailApi.getPublicReportDetail.mockResolvedValue(
      persistedLostReport(),
    );
    const { default: PublicLostReportPage } = await import(
      "./app/reportes/perdidos/[reportId]/page"
    );

    const html = renderToStaticMarkup(
      await PublicLostReportPage({
        params: Promise.resolve({
          reportId: "11111111-1111-4111-8111-111111110001",
        }),
        searchParams: Promise.resolve({
          reportAbuse: "created",
        }),
      }),
    );

    expect(html).toContain(
      "Gracias. El equipo de Rastro revisará este reporte.",
    );
    expect(html).toContain(
      'name="reportId" value="11111111-1111-4111-8111-111111110001"',
    );
    expect(html).toContain('name="reason"');
    expect(html).toContain("Enviar reporte");
    expect(html).not.toContain("Inicia sesión para reportar");
  });

  it("suppresses the abuse report card for the report owner", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        id: "member-camila",
      },
    });
    publicReportDetailApi.getPublicReportDetail.mockResolvedValue(
      persistedLostReport({
        owner: {
          isCurrentMember: true,
        },
      }),
    );
    const { default: PublicLostReportPage } = await import(
      "./app/reportes/perdidos/[reportId]/page"
    );

    const html = renderToStaticMarkup(
      await PublicLostReportPage({
        params: Promise.resolve({
          reportId: "11111111-1111-4111-8111-111111110001",
        }),
      }),
    );

    expect(html).not.toContain("Inicia sesión para reportar");
    expect(html).not.toContain("Enviar reporte");
  });

  it("returns route metadata for persisted lost reports without coordinates", async () => {
    publicReportDetailApi.getPublicReportDetail.mockResolvedValue(
      persistedLostReport(),
    );
    const { generateMetadata } = await import(
      "./app/reportes/perdidos/[reportId]/page"
    );

    const metadata = await generateMetadata({
      params: Promise.resolve({
        reportId: "11111111-1111-4111-8111-111111110001",
      }),
    });

    expect(metadata).toMatchObject({
      alternates: {
        canonical:
          "https://rastro.bo/reportes/perdidos/11111111-1111-4111-8111-111111110001",
      },
      openGraph: {
        locale: "es_BO",
        siteName: "Rastro",
        title: "Bruno esta perdido en Achumani, La Paz | Rastro",
        type: "article",
      },
      title: "Bruno esta perdido en Achumani, La Paz | Rastro",
    });
    expect(JSON.stringify(metadata)).not.toContain("-16.536229");
    expect(JSON.stringify(metadata)).not.toContain("-68.073419");
  });

  it("renders the not-found boundary for hidden public reports", async () => {
    publicReportDetailApi.getPublicReportDetail.mockResolvedValue(null);
    const { default: PublicLostReportPage } = await import(
      "./app/reportes/perdidos/[reportId]/page"
    );

    await expect(
      PublicLostReportPage({
        params: Promise.resolve({
          reportId: "55555555-5555-4555-8555-555555550001",
        }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigation.notFound).toHaveBeenCalledOnce();
  });

  it("returns fallback metadata for unknown reports", async () => {
    publicReportDetailApi.getPublicReportDetail.mockResolvedValue(null);
    const { generateMetadata } = await import(
      "./app/reportes/perdidos/[reportId]/page"
    );

    await expect(
      generateMetadata({
        params: Promise.resolve({
          reportId: "55555555-5555-4555-8555-555555550002",
        }),
      }),
    ).resolves.toEqual({
      title: "Reporte no encontrado | Rastro",
    });
  });
});
