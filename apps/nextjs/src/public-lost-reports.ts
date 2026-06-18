import type { Metadata } from "next";

import { buildPublicLostReportShareTarget } from "@acme/validators";

export interface PublicLostReportPhoto {
  alt: string;
  src: string;
}

export interface PublicLostReportPet {
  breed: string;
  name: string;
  type: string;
}

type PublicLostReportContactFixture =
  | {
      kind: "app-chat";
    }
  | {
      kind: "whatsapp";
      phoneE164: string;
    };

interface PublicLostReportFixture {
  approximateLocation: string;
  contactOptions: PublicLostReportContactFixture[];
  description: string;
  exactPublicLocationOptedIn: boolean;
  exactLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  id: string;
  lastSeen: string;
  pet: PublicLostReportPet;
  photos: [PublicLostReportPhoto, ...PublicLostReportPhoto[]];
}

export interface PublicLostReportViewModel {
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
  description: string;
  lastSeen: {
    label: string;
    value: string;
  };
  pet: PublicLostReportPet;
  photos: [PublicLostReportPhoto, ...PublicLostReportPhoto[]];
  publicLocation:
    | {
        label: string;
        privacyNote: string;
        type: "approximate";
      }
    | {
        address: string;
        coordinates: {
          latitude: number;
          longitude: number;
        };
        label: string;
        privacyNote: string;
        type: "exact";
      };
  sharePath: string;
  statusLabel: string;
  title: string;
}

const publicWebBaseUrl = "https://rastro.bo";
const appDownloadHref = `${publicWebBaseUrl}/descargar`;

const publicLostReportFixtures = new Map<string, PublicLostReportFixture>([
  [
    "lost-bruno-achumani",
    {
      approximateLocation: "Achumani, La Paz",
      contactOptions: [
        {
          kind: "whatsapp",
          phoneE164: "59176543210",
        },
        {
          kind: "app-chat",
        },
      ],
      description:
        "Es sociable, responde a su nombre y llevaba collar azul. Puede estar asustado por el trafico.",
      exactLocation: {
        address: "Calle 17 de Achumani",
        latitude: -16.53622,
        longitude: -68.07341,
      },
      exactPublicLocationOptedIn: false,
      id: "lost-bruno-achumani",
      lastSeen: "15 de junio de 2026, 18:40",
      pet: {
        breed: "Mestizo mediano",
        name: "Bruno",
        type: "Perro",
      },
      photos: [
        {
          alt: "Bruno, perro mestizo color miel",
          src: "https://images.unsplash.com/photo-1552053831-71594a27632d",
        },
        {
          alt: "Bruno con collar azul",
          src: "https://images.unsplash.com/photo-1587300003388-59208cc962cb",
        },
      ],
    },
  ],
  [
    "lost-luna-obrajes",
    {
      approximateLocation: "Obrajes, La Paz",
      contactOptions: [
        {
          kind: "app-chat",
        },
      ],
      description:
        "Es tranquila y suele esconderse cerca de jardines o garajes.",
      exactLocation: {
        address: "Calle 8 de Obrajes, La Paz",
        latitude: -16.52177,
        longitude: -68.11085,
      },
      exactPublicLocationOptedIn: true,
      id: "lost-luna-obrajes",
      lastSeen: "14 de junio de 2026, 07:15",
      pet: {
        breed: "Siames",
        name: "Luna",
        type: "Gato",
      },
      photos: [
        {
          alt: "Luna, gata siames de ojos claros",
          src: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba",
        },
      ],
    },
  ],
]);

export function getPublicLostReportViewModel(
  reportId: string,
): PublicLostReportViewModel | null {
  const report = publicLostReportFixtures.get(reportId);

  if (!report) {
    return null;
  }

  const shareTarget = buildPublicLostReportShareTarget({
    publicWebBaseUrl,
    reportId: report.id,
    title: report.pet.name,
  });

  return {
    appPrompts: {
      downloadHref: appDownloadHref,
      downloadLabel: "Descargar Rastro",
      openHref: shareTarget.appDeepLink,
      openLabel: "Abrir en la app",
    },
    contactOptions: report.contactOptions.map((contactOption) => {
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
    description: report.description,
    lastSeen: {
      label: "Visto por ultima vez",
      value: report.lastSeen,
    },
    pet: report.pet,
    photos: report.photos,
    publicLocation: report.exactPublicLocationOptedIn
      ? {
          address: report.exactLocation.address,
          coordinates: {
            latitude: report.exactLocation.latitude,
            longitude: report.exactLocation.longitude,
          },
          label: report.exactLocation.address,
          privacyNote: "Ubicacion exacta compartida por la persona cuidadora.",
          type: "exact",
        }
      : {
          label: report.approximateLocation,
          privacyNote: "Zona aproximada compartida por seguridad.",
          type: "approximate",
        },
    sharePath: shareTarget.path,
    statusLabel: "Reporte activo",
    title: `${report.pet.name} esta perdido`,
  };
}

export function buildPublicLostReportMetadata(
  reportId: string,
  publicWebBaseUrl = "https://rastro.bo",
): Metadata | null {
  const report = getPublicLostReportViewModel(reportId);

  if (!report) {
    return null;
  }

  const locationPrefix =
    report.publicLocation.type === "exact"
      ? "ubicacion compartida"
      : "zona aproximada";
  const title = `${report.pet.name} esta perdido en ${report.publicLocation.label} | Rastro`;
  const description = `Ayuda a encontrar a ${report.pet.name}, ${report.pet.type} ${report.pet.breed}. Ultima vez visto en ${locationPrefix}: ${report.publicLocation.label}.`;
  const shareTarget = buildPublicLostReportShareTarget({
    publicWebBaseUrl,
    reportId,
    title: report.pet.name,
  });
  const primaryPhoto = report.photos[0];

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
