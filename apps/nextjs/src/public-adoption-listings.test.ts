import { describe, expect, it, vi } from "vitest";

import { publicAdoptionListingPathForId } from "@acme/validators";

import type { PublicReportDetail } from "./public-report-detail-api-adapter";
import {
  buildPublicAdoptionListingMetadata,
  getPublicAdoptionListingViewModel,
} from "./public-adoption-listings";

const commerceTerms =
  /precio|fee|payment|deposit|bidding|checkout|compra|comprar|venta|vender|marketplace/i;

const privateCoordinateLabel = "Pin manual -16.506789, -68.123456";

function publicReportDetail(
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

describe("public Adoption Listing page data", () => {
  it("maps a persisted adoption report to Spanish non-monetary page data", async () => {
    const loadReportDetail = vi.fn().mockResolvedValue(publicReportDetail());

    const listing = await getPublicAdoptionListingViewModel(
      "adoption-nala-db",
      loadReportDetail,
    );

    expect(loadReportDetail).toHaveBeenCalledWith("adoption-nala-db");
    expect(listing?.sharePath).toBe(
      publicAdoptionListingPathForId("adoption-nala-db"),
    );
    expect(listing).toMatchObject({
      appPrompts: {
        downloadHref: "https://rastro.bo/descargar",
        downloadLabel: "Descargar Rastro",
        openHref: "rastro://adopciones/adoption-nala-db",
        openLabel: "Abrir en la app",
      },
      contactOptions: [
        {
          href: "rastro://adopciones/adoption-nala-db",
          kind: "app-chat",
          label: "Enviar mensaje en Rastro",
        },
        {
          href: "https://wa.me/59171234567",
          kind: "whatsapp",
          label: "Escribir por WhatsApp",
        },
      ],
      description:
        "Nala es carinosa, convive bien con personas y necesita un hogar tranquilo.",
      pet: {
        breed: "Mestiza joven - gris - pequena",
        name: "Nala",
        type: "Gato",
      },
      photos: [
        {
          alt: "Nala, gata mestiza en adopcion",
          src: "https://cdn.rastro.bo/reports/nala-1.jpg",
        },
      ],
      publicLocation: {
        label: "Sopocachi, La Paz",
        privacyNote: "Zona aproximada compartida por seguridad.",
        type: "approximate",
      },
      publishedAt: {
        label: "Publicado",
        value: "19 de junio de 2026, 19:15",
      },
      statusLabel: "En adopcion",
      title: "Nala busca nuevo hogar DB",
    });
    expect(JSON.stringify(listing)).not.toMatch(commerceTerms);
  });

  it("returns null for persisted reports with the wrong type", async () => {
    const listing = await getPublicAdoptionListingViewModel(
      "report-lost-bruno-db",
      () =>
        Promise.resolve(
          publicReportDetail({
            id: "report-lost-bruno-db",
            type: "lost_pet",
          }),
        ),
    );

    expect(listing).toBeNull();
  });

  it("returns null when report.detail returns null for hidden, deleted, or unknown reports", async () => {
    const listing = await getPublicAdoptionListingViewModel(
      "hidden-adoption",
      () => Promise.resolve(null),
    );

    expect(listing).toBeNull();
  });

  it("does not expose coordinate strings from public labels or public coordinates", async () => {
    const listing = await getPublicAdoptionListingViewModel(
      "adoption-nala-db",
      () =>
        Promise.resolve(
          publicReportDetail({
            location: {
              latitude: -16.506789,
              longitude: -68.123456,
              precision: "approximate",
              label: privateCoordinateLabel,
              locationCell: "bo-lpb-sopocachi",
            },
          }),
        ),
    );

    const serializedListing = JSON.stringify(listing);

    expect(listing?.publicLocation.label).toBe(
      "bo lpb sopocachi - zona aproximada",
    );
    expect(serializedListing).not.toContain(privateCoordinateLabel);
    expect(serializedListing).not.toContain("-16.506789");
    expect(serializedListing).not.toContain("-68.123456");
    expect(serializedListing).not.toContain("coordinates");
  });

  it("builds Spanish social metadata for a persisted adoption report", async () => {
    const metadata = await buildPublicAdoptionListingMetadata(
      "adoption-nala-db",
      "https://rastro.bo/",
      () => Promise.resolve(publicReportDetail()),
    );

    expect(metadata).toMatchObject({
      alternates: {
        canonical: "https://rastro.bo/adopciones/adoption-nala-db",
      },
      description:
        "Conoce a Nala, Gato Mestiza joven - gris - pequena, en adopcion. Ubicacion: Sopocachi, La Paz.",
      openGraph: {
        description:
          "Conoce a Nala, Gato Mestiza joven - gris - pequena, en adopcion. Ubicacion: Sopocachi, La Paz.",
        images: [
          {
            alt: "Nala, gata mestiza en adopcion",
            url: "https://cdn.rastro.bo/reports/nala-1.jpg",
          },
        ],
        locale: "es_BO",
        siteName: "Rastro",
        title: "Nala esta en adopcion en Sopocachi, La Paz | Rastro",
        type: "article",
        url: "https://rastro.bo/adopciones/adoption-nala-db",
      },
      title: "Nala esta en adopcion en Sopocachi, La Paz | Rastro",
      twitter: {
        card: "summary_large_image",
        description:
          "Conoce a Nala, Gato Mestiza joven - gris - pequena, en adopcion. Ubicacion: Sopocachi, La Paz.",
        images: ["https://cdn.rastro.bo/reports/nala-1.jpg"],
        title: "Nala esta en adopcion en Sopocachi, La Paz | Rastro",
      },
    });
    expect(JSON.stringify(metadata)).not.toMatch(commerceTerms);
    expect(JSON.stringify(metadata)).not.toContain("-16.506789");
    expect(JSON.stringify(metadata)).not.toContain("-68.123456");
  });
});
