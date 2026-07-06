import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PublicReportDetail } from "./public-report-detail-api-adapter";

const commerceTerms =
  /precio|fee|payment|deposit|bidding|checkout|compra|comprar|venta|vender|marketplace/i;

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

function persistedAdoptionReport(
  overrides: Partial<PublicReportDetail> = {},
): PublicReportDetail {
  return {
    id: "adoption-nala-db",
    type: "adoption",
    status: "active",
    outcome: null,
    title: "Nala busca nuevo hogar DB",
    description:
      "Nala es carinosa, convive bien con personas y necesita un hogar tranquilo.",
    pet: {
      name: "Nala",
      species: "cat",
      breed: "Mestiza joven",
      color: "gris",
      size: "pequena",
      distinguishingTraits: null,
    },
    eventOccurredAt: new Date("2026-06-19T22:40:00.000Z"),
    contact: {
      actions: [
        {
          href: "rastro://adopciones/adoption-nala-db",
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
        id: "media-nala-1",
        objectKey: "reports/nala-1.jpg",
        canonicalUrl: "https://cdn.rastro.bo/reports/nala-1.jpg",
        thumbnailObjectKey: null,
        mimeType: "image/jpeg",
        width: 1200,
        height: 900,
        sizeBytes: 200000,
        altText: "Nala, gata mestiza en adopcion",
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

describe("public Adoption Listing page", () => {
  beforeEach(() => {
    vi.resetModules();
    authServer.getSession.mockReset();
    authServer.getSession.mockResolvedValue(null);
    publicReportDetailApi.getPublicReportDetail.mockReset();
    navigation.notFound.mockClear();
  });

  it("renders persisted Spanish non-monetary adoption report details without coordinate text", async () => {
    publicReportDetailApi.getPublicReportDetail.mockResolvedValue(
      persistedAdoptionReport({
        location: {
          latitude: -16.506789,
          longitude: -68.123456,
          precision: "approximate",
          label: privateCoordinateLabel,
          locationCell: "bo-lpb-sopocachi",
        },
      }),
    );
    const { default: PublicAdoptionListingPage } = await import(
      "./app/adopciones/[listingId]/page"
    );

    const html = renderToStaticMarkup(
      await PublicAdoptionListingPage({
        params: Promise.resolve({
          listingId: "adoption-nala-db",
        }),
      }),
    );

    expect(html).toContain("En adopcion");
    expect(html).toContain("Nala busca nuevo hogar DB");
    expect(html).toContain("Gato - Mestiza joven - gris - pequena");
    expect(html).toContain("Publicado");
    expect(html).toContain("19 de junio de 2026, 19:15");
    expect(html).toContain("bo lpb sopocachi - zona aproximada");
    expect(html).toContain("Enviar mensaje en Rastro");
    expect(html).toContain("Escribir por WhatsApp");
    expect(html).toContain(
      'href="https://rastro.bo/descargar?context=adoption',
    );
    expect(html).toContain("Instalar o abrir Rastro");
    expect(html).toContain("Reportar");
    expect(html).toContain("Inicia sesión para reportar");
    expect(html).toContain(
      "/?auth=signin-required&amp;returnTo=%2Fadopciones%2Fadoption-nala-db#auth",
    );
    expect(html).toContain("Imagen no disponible");
    expect(html).not.toMatch(commerceTerms);
    expect(html).not.toContain(privateCoordinateLabel);
    expect(html).not.toContain("-16.506789");
    expect(html).not.toContain("-68.123456");
    expect(html).not.toContain("Coordenadas");
  });

  it("renders a signed-in abuse report form for non-owner adoption visitors", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        id: "member-diego",
      },
    });
    publicReportDetailApi.getPublicReportDetail.mockResolvedValue(
      persistedAdoptionReport(),
    );
    const { default: PublicAdoptionListingPage } = await import(
      "./app/adopciones/[listingId]/page"
    );

    const html = renderToStaticMarkup(
      await PublicAdoptionListingPage({
        params: Promise.resolve({
          listingId: "adoption-nala-db",
        }),
        searchParams: Promise.resolve({
          reportAbuse: "already_reported",
        }),
      }),
    );

    expect(html).toContain("Ya recibimos tu reporte sobre este motivo.");
    expect(html).toContain('name="reportId" value="adoption-nala-db"');
    expect(html).toContain('name="reason"');
    expect(html).toContain("Enviar reporte");
    expect(html).not.toContain("Inicia sesión para reportar");
  });

  it("suppresses the abuse report card for the adoption owner", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        id: "member-camila",
      },
    });
    publicReportDetailApi.getPublicReportDetail.mockResolvedValue(
      persistedAdoptionReport({
        owner: {
          isCurrentMember: true,
        },
      }),
    );
    const { default: PublicAdoptionListingPage } = await import(
      "./app/adopciones/[listingId]/page"
    );

    const html = renderToStaticMarkup(
      await PublicAdoptionListingPage({
        params: Promise.resolve({
          listingId: "adoption-nala-db",
        }),
      }),
    );

    expect(html).not.toContain("Inicia sesión para reportar");
    expect(html).not.toContain("Enviar reporte");
  });

  it("returns route metadata for persisted adoption reports without coordinates", async () => {
    publicReportDetailApi.getPublicReportDetail.mockResolvedValue(
      persistedAdoptionReport(),
    );
    const { generateMetadata } = await import(
      "./app/adopciones/[listingId]/page"
    );

    const metadata = await generateMetadata({
      params: Promise.resolve({
        listingId: "adoption-nala-db",
      }),
    });

    expect(metadata).toMatchObject({
      alternates: {
        canonical: "https://rastro.bo/adopciones/adoption-nala-db",
      },
      openGraph: {
        locale: "es_BO",
        siteName: "Rastro",
        title: "Nala esta en adopcion en Sopocachi, La Paz | Rastro",
        type: "article",
      },
      title: "Nala esta en adopcion en Sopocachi, La Paz | Rastro",
    });
    expect(JSON.stringify(metadata)).not.toMatch(commerceTerms);
    expect(JSON.stringify(metadata)).not.toContain("-16.506789");
    expect(JSON.stringify(metadata)).not.toContain("-68.123456");
  });

  it("renders the not-found boundary for hidden adoption reports", async () => {
    publicReportDetailApi.getPublicReportDetail.mockResolvedValue(null);
    const { default: PublicAdoptionListingPage } = await import(
      "./app/adopciones/[listingId]/page"
    );

    await expect(
      PublicAdoptionListingPage({
        params: Promise.resolve({
          listingId: "hidden-adoption",
        }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigation.notFound).toHaveBeenCalledOnce();
  });

  it("returns fallback metadata for unknown adoption reports", async () => {
    publicReportDetailApi.getPublicReportDetail.mockResolvedValue(null);
    const { generateMetadata } = await import(
      "./app/adopciones/[listingId]/page"
    );

    await expect(
      generateMetadata({
        params: Promise.resolve({
          listingId: "unknown-adoption",
        }),
      }),
    ).resolves.toEqual({
      title: "Adopcion no encontrada | Rastro",
    });
  });
});
