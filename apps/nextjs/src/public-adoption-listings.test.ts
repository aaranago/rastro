import { describe, expect, it } from "vitest";

import { publicAdoptionListingPathForId } from "@acme/validators";

import {
  buildPublicAdoptionListingMetadata,
  getPublicAdoptionListingViewModel,
} from "./public-adoption-listings";

const commerceTerms = [
  "precio",
  "fee",
  "payment",
  "deposit",
  "bidding",
  "checkout",
  "compra",
  "comprar",
  "venta",
  "vender",
  "marketplace",
];

describe("public Adoption Listing page data", () => {
  it("resolves a public verified-organization adoption listing with Spanish non-monetary page data", () => {
    const listing = getPublicAdoptionListingViewModel("adopt-nala-sopocachi");

    expect(listing?.sharePath).toBe(
      publicAdoptionListingPathForId("adopt-nala-sopocachi"),
    );
    expect(listing).toMatchObject({
      appPrompts: {
        downloadHref: "https://rastro.bo/descargar",
        downloadLabel: "Descargar Rastro",
        openHref: "rastro://adopciones/adopt-nala-sopocachi",
        openLabel: "Abrir en la app",
      },
      contactOptions: [
        {
          href: "rastro://adopciones/adopt-nala-sopocachi",
          kind: "app-chat",
          label: "Enviar mensaje en Rastro",
        },
        {
          href: "https://wa.me/59171234567",
          kind: "whatsapp",
          label: "Escribir por WhatsApp",
        },
      ],
      creator: {
        displayName: "Huellitas La Paz",
        verificationBadge: {
          label: "Organizacion verificada",
          note: "Identidad verificada por Rastro.",
        },
      },
      description:
        "Es carinosa, convive bien con personas y necesita un hogar tranquilo.",
      pet: {
        breed: "Mestiza joven",
        name: "Nala",
        type: "Gato",
      },
      photos: [
        {
          alt: "Nala, gata mestiza en adopcion",
          src: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba",
        },
      ],
      publicLocation: {
        label: "Sopocachi, La Paz",
        privacyNote: "Zona aproximada compartida por seguridad.",
        type: "approximate",
      },
      statusLabel: "En adopcion",
      title: "Nala busca nuevo hogar",
    });
    expect(JSON.stringify(listing).toLowerCase()).not.toMatch(
      new RegExp(commerceTerms.join("|")),
    );
  });

  it("does not require a verification badge for a public adoption listing", () => {
    const listing = getPublicAdoptionListingViewModel("adopt-toby-calacoto");

    expect(listing).toMatchObject({
      creator: {
        displayName: "Andrea R.",
        verificationBadge: null,
      },
      sharePath: "/adopciones/adopt-toby-calacoto",
      statusLabel: "En adopcion",
      title: "Toby busca nuevo hogar",
    });
  });

  it("builds Spanish social metadata for a public adoption listing", () => {
    const metadata = buildPublicAdoptionListingMetadata(
      "adopt-nala-sopocachi",
      "https://rastro.bo/",
    );

    expect(metadata).toMatchObject({
      alternates: {
        canonical: "https://rastro.bo/adopciones/adopt-nala-sopocachi",
      },
      description:
        "Conoce a Nala, Gato Mestiza joven, en adopcion. Ubicacion: Sopocachi, La Paz.",
      openGraph: {
        description:
          "Conoce a Nala, Gato Mestiza joven, en adopcion. Ubicacion: Sopocachi, La Paz.",
        images: [
          {
            alt: "Nala, gata mestiza en adopcion",
            url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba",
          },
        ],
        locale: "es_BO",
        siteName: "Rastro",
        title: "Nala esta en adopcion en Sopocachi, La Paz | Rastro",
        type: "article",
        url: "https://rastro.bo/adopciones/adopt-nala-sopocachi",
      },
      title: "Nala esta en adopcion en Sopocachi, La Paz | Rastro",
      twitter: {
        card: "summary_large_image",
        description:
          "Conoce a Nala, Gato Mestiza joven, en adopcion. Ubicacion: Sopocachi, La Paz.",
        images: [
          "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba",
        ],
        title: "Nala esta en adopcion en Sopocachi, La Paz | Rastro",
      },
    });
    expect(JSON.stringify(metadata).toLowerCase()).not.toMatch(
      new RegExp(commerceTerms.join("|")),
    );
  });
});
