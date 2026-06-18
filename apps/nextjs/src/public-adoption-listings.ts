import type { Metadata } from "next";

import { buildPublicAdoptionListingShareTarget } from "@acme/validators";

export interface PublicAdoptionListingPhoto {
  alt: string;
  src: string;
}

export interface PublicAdoptionListingPet {
  breed: string;
  name: string;
  type: string;
}

type PublicAdoptionListingContactFixture =
  | {
      kind: "app-chat";
    }
  | {
      kind: "whatsapp";
      phoneE164: string;
    };

interface PublicAdoptionListingFixture {
  approximateLocation: string;
  contactOptions: PublicAdoptionListingContactFixture[];
  creator: {
    displayName: string;
    verificationBadge: {
      label: string;
      note: string;
    } | null;
  };
  description: string;
  id: string;
  pet: PublicAdoptionListingPet;
  photos: [PublicAdoptionListingPhoto, ...PublicAdoptionListingPhoto[]];
}

export interface PublicAdoptionListingViewModel {
  appPrompts: {
    downloadHref: string;
    downloadLabel: string;
    openHref: string;
    openLabel: string;
  };
  contactOptions: (
    | {
        href: string;
        kind: "app-chat";
        label: string;
      }
    | {
        href: string;
        kind: "whatsapp";
        label: string;
      }
  )[];
  creator: {
    displayName: string;
    verificationBadge: {
      label: string;
      note: string;
    } | null;
  };
  description: string;
  pet: PublicAdoptionListingPet;
  photos: [PublicAdoptionListingPhoto, ...PublicAdoptionListingPhoto[]];
  publicLocation: {
    label: string;
    privacyNote: string;
    type: "approximate";
  };
  sharePath: string;
  statusLabel: string;
  title: string;
}

const publicWebBaseUrl = "https://rastro.bo";
const appDownloadHref = `${publicWebBaseUrl}/descargar`;

const publicAdoptionListingFixtures = new Map<
  string,
  PublicAdoptionListingFixture
>([
  [
    "adopt-nala-sopocachi",
    {
      approximateLocation: "Sopocachi, La Paz",
      contactOptions: [
        {
          kind: "app-chat",
        },
        {
          kind: "whatsapp",
          phoneE164: "59171234567",
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
      id: "adopt-nala-sopocachi",
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
    },
  ],
  [
    "adopt-toby-calacoto",
    {
      approximateLocation: "Calacoto, La Paz",
      contactOptions: [
        {
          kind: "app-chat",
        },
      ],
      creator: {
        displayName: "Andrea R.",
        verificationBadge: null,
      },
      description:
        "Es jugueton, esta acostumbrado a paseos cortos y busca una familia paciente.",
      id: "adopt-toby-calacoto",
      pet: {
        breed: "Mestizo pequeno",
        name: "Toby",
        type: "Perro",
      },
      photos: [
        {
          alt: "Toby, perro mestizo pequeno en adopcion",
          src: "https://images.unsplash.com/photo-1587300003388-59208cc962cb",
        },
      ],
    },
  ],
]);

export function getPublicAdoptionListingViewModel(
  listingId: string,
): PublicAdoptionListingViewModel | null {
  const listing = publicAdoptionListingFixtures.get(listingId);

  if (!listing) {
    return null;
  }

  const shareTarget = buildPublicAdoptionListingShareTarget({
    listingId: listing.id,
    publicWebBaseUrl,
    title: listing.pet.name,
  });

  return {
    appPrompts: {
      downloadHref: appDownloadHref,
      downloadLabel: "Descargar Rastro",
      openHref: shareTarget.appDeepLink,
      openLabel: "Abrir en la app",
    },
    contactOptions: listing.contactOptions.map((contactOption) => {
      if (contactOption.kind === "whatsapp") {
        return {
          href: `https://wa.me/${contactOption.phoneE164}`,
          kind: "whatsapp",
          label: "Escribir por WhatsApp",
        };
      }

      return {
        href: shareTarget.appDeepLink,
        kind: "app-chat",
        label: "Enviar mensaje en Rastro",
      };
    }),
    creator: listing.creator,
    description: listing.description,
    pet: listing.pet,
    photos: listing.photos,
    publicLocation: {
      label: listing.approximateLocation,
      privacyNote: "Zona aproximada compartida por seguridad.",
      type: "approximate",
    },
    sharePath: shareTarget.path,
    statusLabel: "En adopcion",
    title: `${listing.pet.name} busca nuevo hogar`,
  };
}

export function buildPublicAdoptionListingMetadata(
  listingId: string,
  publicWebBaseUrl = "https://rastro.bo",
): Metadata | null {
  const listing = getPublicAdoptionListingViewModel(listingId);

  if (!listing) {
    return null;
  }

  const title = `${listing.pet.name} esta en adopcion en ${listing.publicLocation.label} | Rastro`;
  const description = `Conoce a ${listing.pet.name}, ${listing.pet.type} ${listing.pet.breed}, en adopcion. Ubicacion: ${listing.publicLocation.label}.`;
  const shareTarget = buildPublicAdoptionListingShareTarget({
    listingId,
    publicWebBaseUrl,
    title: listing.pet.name,
  });
  const primaryPhoto = listing.photos[0];

  return {
    alternates: {
      canonical: shareTarget.webUrl,
    },
    description,
    openGraph: {
      description,
      images: [
        {
          alt: primaryPhoto.alt,
          url: primaryPhoto.src,
        },
      ],
      locale: "es_BO",
      siteName: "Rastro",
      title,
      type: "article",
      url: shareTarget.webUrl,
    },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [primaryPhoto.src],
      title,
    },
  };
}
