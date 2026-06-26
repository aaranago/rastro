import type { Metadata } from "next";

import type { PublicReportDetail } from "./public-report-detail-api-adapter";

export interface PublicReportPagePhoto {
  alt: string;
  src: string;
}

export interface PublicReportPagePet {
  breed: string;
  name: string;
  type: string;
}

export type PublicReportPageContactOption =
  | {
      href: string;
      kind: "app-chat";
      label: string;
    }
  | {
      href: string;
      kind: "whatsapp";
      label: string;
    };

export interface PublicReportPageLocation {
  label: string;
  privacyNote: string;
  type: "approximate";
}

export const publicWebBaseUrl = "https://rastro.bo";
export const appDownloadHref = `${publicWebBaseUrl}/descargar`;

const speciesLabels = {
  bird: "Ave",
  cat: "Gato",
  dog: "Perro",
  other: "Otra mascota",
  rabbit: "Conejo",
} satisfies Record<PublicReportDetail["pet"]["species"], string>;

const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "long",
  hour12: false,
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

export function buildPublicReportArticleMetadata({
  description,
  primaryPhoto,
  title,
  webUrl,
}: {
  description: string;
  primaryPhoto?: PublicReportPagePhoto;
  title: string;
  webUrl: string;
}): Metadata {
  return {
    alternates: {
      canonical: webUrl,
    },
    description,
    openGraph: {
      description,
      images: primaryPhoto
        ? [
            {
              alt: primaryPhoto.alt,
              url: primaryPhoto.src,
            },
          ]
        : undefined,
      locale: "es_BO",
      siteName: "Rastro",
      title,
      type: "article",
      url: webUrl,
    },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: primaryPhoto ? [primaryPhoto.src] : undefined,
      title,
    },
  };
}

export function buildPublicReportPetViewModel(
  report: PublicReportDetail,
): PublicReportPagePet {
  return {
    breed: buildBreedLabel(report),
    name: readReportPetName(report),
    type: speciesLabels[report.pet.species],
  };
}

function readReportPetName(report: PublicReportDetail) {
  return readNonEmptyString(report.pet.name) ?? report.title.trim();
}

export function buildPublicReportContactOptions(
  report: PublicReportDetail,
  appDeepLink: string,
): PublicReportPageContactOption[] {
  const contactOptions: PublicReportPageContactOption[] = [];
  const seen = new Set<string>();

  for (const action of report.contact.actions) {
    const contactOption =
      action.kind === "whatsapp"
        ? {
            href: action.href,
            kind: "whatsapp" as const,
            label: "Escribir por WhatsApp",
          }
        : {
            href: action.href || appDeepLink,
            kind: "app-chat" as const,
            label: "Enviar mensaje en Rastro",
          };
    const key = `${contactOption.kind}:${contactOption.href}`;

    if (!seen.has(key)) {
      seen.add(key);
      contactOptions.push(contactOption);
    }
  }

  if (
    contactOptions.length === 0 &&
    (report.contact.preference === "in_app_chat" ||
      report.contact.preference === "both")
  ) {
    contactOptions.push({
      href: appDeepLink,
      kind: "app-chat",
      label: "Enviar mensaje en Rastro",
    });
  }

  return contactOptions;
}

export function buildPublicReportPhotos(
  report: PublicReportDetail,
  petName: string,
): PublicReportPagePhoto[] {
  return [...report.media]
    .sort((left, right) => left.position - right.position)
    .flatMap((media) => {
      if (!media.canonicalUrl) {
        return [];
      }

      return [
        {
          alt: readNonEmptyString(media.altText) ?? `${petName} en Rastro`,
          src: media.canonicalUrl,
        },
      ];
    });
}

export function buildPublicReportLocation(
  location: PublicReportDetail["location"],
): PublicReportPageLocation {
  return {
    label: formatReportLocationLabel(location),
    privacyNote: "Zona aproximada compartida por seguridad.",
    type: "approximate",
  };
}

export function formatReportDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Fecha por confirmar";
  }

  return dateFormatter.format(date);
}

function buildBreedLabel(report: PublicReportDetail) {
  return (
    uniqueTrimmedValues([
      report.pet.breed ?? undefined,
      report.pet.color,
      report.pet.size ?? undefined,
    ]).join(" - ") || "Sin detalle"
  );
}

function formatReportLocationLabel(
  location: PublicReportDetail["location"],
) {
  const locationLabel = formatSafeLocationLabel(location.label);

  if (locationLabel !== "Zona elegida") {
    return locationLabel;
  }

  const locationCell = formatSafeLocationLabel(location.locationCell);

  if (locationCell === "Zona elegida") {
    return "Zona aproximada";
  }

  return `${locationCell.replaceAll("-", " ")} - zona aproximada`;
}

function formatSafeLocationLabel(label: string) {
  const trimmed = label.trim();

  return isSafeLocationLabel(trimmed) ? trimmed : "Zona elegida";
}

function isSafeLocationLabel(trimmed: string) {
  const coordinateTextPattern =
    /-?\d{1,2}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/;

  return (
    trimmed.length > 0 &&
    !/\bpin manual\b/i.test(trimmed) &&
    !coordinateTextPattern.test(trimmed)
  );
}

function uniqueTrimmedValues(values: (string | undefined)[]) {
  const seen = new Set<string>();

  return values.flatMap((value) => {
    const trimmed = value?.trim();

    if (!trimmed) {
      return [];
    }

    const key = trimmed.toLowerCase();

    if (seen.has(key)) {
      return [];
    }

    seen.add(key);
    return [trimmed];
  });
}

function readNonEmptyString(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}
