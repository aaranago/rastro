import {
  buildPublicAdoptionListingShareTarget,
  buildPublicLostReportShareTarget,
} from "@acme/validators";

import type { RouterOutputs } from "../../utils/api";

export type PublicReportDetailApiReport = RouterOutputs["report"]["detail"];

export interface PublicReportDetailApiClient {
  report: {
    detail: {
      query: (input: { id: string }) => Promise<PublicReportDetailApiReport>;
    };
  };
}

export interface PublicReportDetailAdapter {
  getReportDetail: (reportId: string) => Promise<PublicReportDetailApiReport>;
}

export type PublicReportDetailType = PublicReportDetailApiReport["type"];

export interface PublicReportDetailViewModel {
  accentColor: string;
  accentSoftColor: string;
  contactLabel: string;
  description: string;
  descriptionTitle: string;
  eventLabel: string;
  eventValue: string;
  facts: PublicReportDetailFact[];
  heroIconName: string;
  isCurrentMember: boolean;
  locationLabel: string;
  locationPrivacyLabel: string;
  photoUrls: string[];
  publicPageLabel: string;
  shareMessage: string;
  shareTitle: string;
  shareUrl: string;
  statusLabel: string;
  statusTone: "active" | "closed";
  subtitle: string;
  title: string;
  type: PublicReportDetailType;
  typeLabel: string;
}

export interface PublicReportDetailFact {
  iconName: string;
  label: string;
  value: string;
}

const publicWebBaseUrl = "https://rastro.bo";

const speciesLabels = {
  bird: "Ave",
  cat: "Gato",
  dog: "Perro",
  other: "Otra mascota",
  rabbit: "Conejo",
} satisfies Record<PublicReportDetailApiReport["pet"]["species"], string>;

const outcomeLabels = {
  adopted: "Adoptada",
  inactive: "Inactiva",
  reunited: "Reunida",
  still_missing: "Sigue activa",
  transferred_to_shelter: "Trasladada a refugio",
  unable_to_locate: "No se pudo ubicar",
} satisfies Record<NonNullable<PublicReportDetailApiReport["outcome"]>, string>;

const dateFormatter = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

const typeConfigs = {
  adoption: {
    accentColor: "#9D4F66",
    accentSoftColor: "#F7E8EE",
    descriptionTitle: "Perfil de adopcion",
    eventLabel: "Publicado",
    heroIconName: "heart.fill",
    publicPageLabel: "Abrir adopcion publica",
    typeLabel: "Mascota en adopcion",
  },
  found_pet: {
    accentColor: "#1D7A52",
    accentSoftColor: "#E5F2EC",
    descriptionTitle: "Donde fue encontrada",
    eventLabel: "Encontrada",
    heroIconName: "cross.case.fill",
    publicPageLabel: "Abrir pagina publica",
    typeLabel: "Mascota encontrada",
  },
  lost_pet: {
    accentColor: "#D6453D",
    accentSoftColor: "#FBE8E6",
    descriptionTitle: "Que paso",
    eventLabel: "Perdida",
    heroIconName: "megaphone.fill",
    publicPageLabel: "Abrir pagina publica",
    typeLabel: "Mascota perdida",
  },
  sighting: {
    accentColor: "#2E6D9E",
    accentSoftColor: "#E7F0F7",
    descriptionTitle: "Detalle del avistamiento",
    eventLabel: "Vista",
    heroIconName: "eye.fill",
    publicPageLabel: "Abrir avistamiento publico",
    typeLabel: "Avistamiento",
  },
} satisfies Record<
  PublicReportDetailType,
  {
    accentColor: string;
    accentSoftColor: string;
    descriptionTitle: string;
    eventLabel: string;
    heroIconName: string;
    publicPageLabel: string;
    typeLabel: string;
  }
>;

export function createApiPublicReportDetailAdapter({
  client,
}: {
  client: PublicReportDetailApiClient;
}): PublicReportDetailAdapter {
  return {
    getReportDetail(reportId) {
      return client.report.detail.query({ id: reportId });
    },
  };
}

export function buildPublicReportDetailViewModel(
  report: PublicReportDetailApiReport,
): PublicReportDetailViewModel {
  const config = typeConfigs[report.type];
  const petName = report.pet.name?.trim();
  const speciesLabel = speciesLabels[report.pet.species];
  const breedLabel = report.pet.breed?.trim();
  const subtitle = [speciesLabel, breedLabel].filter(Boolean).join(" · ");
  const shareTarget = buildShareTarget(report);
  const eventDate =
    report.type === "adoption" ? report.createdAt : report.eventOccurredAt;
  const locationLabel = report.location.label.trim();
  const contactLabel = formatContactLabel(report.contact);
  const statusTone = report.status === "closed" ? "closed" : "active";
  const statusLabel =
    report.status === "closed"
      ? (report.outcome ? outcomeLabels[report.outcome] : "Cerrado")
      : "Activo";
  const details = uniqueTrimmedValues([
    report.pet.size?.trim(),
    report.pet.color.trim(),
    report.pet.distinguishingTraits?.trim(),
  ]);

  return {
    accentColor: config.accentColor,
    accentSoftColor: config.accentSoftColor,
    contactLabel,
    description: report.description.trim(),
    descriptionTitle: config.descriptionTitle,
    eventLabel: config.eventLabel,
    eventValue: formatDate(eventDate),
    facts: [
      {
        iconName: "location.fill",
        label: "Ubicacion",
        value: locationLabel,
      },
      {
        iconName: "hourglass",
        label: config.eventLabel,
        value: formatDate(eventDate),
      },
      {
        iconName: "message.fill",
        label: "Contacto",
        value: contactLabel,
      },
      ...(details.length > 0
        ? [
            {
              iconName: "pawprint.fill",
              label: "Senales",
              value: details.join(" · "),
            },
          ]
        : []),
    ],
    heroIconName: config.heroIconName,
    isCurrentMember: report.owner.isCurrentMember,
    locationLabel,
    locationPrivacyLabel:
      report.location.precision === "exact"
        ? "Pin exacto compartido por la persona cuidadora."
        : "Mostramos una zona aproximada por seguridad.",
    photoUrls: getPhotoUrls(report),
    publicPageLabel: config.publicPageLabel,
    shareMessage: shareTarget.message,
    shareTitle: shareTarget.title,
    shareUrl: shareTarget.webUrl,
    statusLabel,
    statusTone,
    subtitle,
    title: buildTitle({ petName, report }),
    type: report.type,
    typeLabel: config.typeLabel,
  };
}

function buildTitle({
  petName,
  report,
}: {
  petName?: string;
  report: PublicReportDetailApiReport;
}) {
  if (report.type === "lost_pet" && petName) {
    return `Se busca a ${petName}`;
  }

  if (report.type === "adoption" && petName) {
    return `${petName} busca hogar`;
  }

  return report.title.trim();
}

function buildShareTarget(report: PublicReportDetailApiReport) {
  const petName = report.pet.name?.trim();
  const title = petName && petName.length > 0 ? petName : report.title.trim();

  switch (report.type) {
    case "adoption":
      return buildPublicAdoptionListingShareTarget({
        listingId: report.id,
        publicWebBaseUrl,
        title,
      });
    case "found_pet":
      return buildReportShareTarget({
        messagePrefix: "Ayuda a reunir a",
        pathPrefix: "/reportes/encontrados",
        reportId: report.id,
        title,
        titlePrefix: "Mascota encontrada",
      });
    case "lost_pet":
      return buildPublicLostReportShareTarget({
        publicWebBaseUrl,
        reportId: report.id,
        title,
      });
    case "sighting":
      return buildReportShareTarget({
        messagePrefix: "Ayuda a ubicar este avistamiento de",
        pathPrefix: "/reportes/avistamientos",
        reportId: report.id,
        title,
        titlePrefix: "Avistamiento de mascota",
      });
  }
}

function buildReportShareTarget({
  messagePrefix,
  pathPrefix,
  reportId,
  title,
  titlePrefix,
}: {
  messagePrefix: string;
  pathPrefix: string;
  reportId: string;
  title: string;
  titlePrefix: string;
}) {
  const path = `${pathPrefix}/${encodeURIComponent(reportId)}`;
  const webUrl = `${publicWebBaseUrl}${path}`;

  return {
    appDeepLink: `rastro://${path.replace(/^\//, "")}`,
    message: `${messagePrefix} ${title} en Rastro: ${webUrl}`,
    path,
    title: `${titlePrefix}: ${title}`,
    webUrl,
  };
}

function formatContactLabel(
  contact: PublicReportDetailApiReport["contact"],
) {
  if (contact.preference === "both") {
    return contact.hasWhatsapp ? "Chat en Rastro y WhatsApp" : "Chat en Rastro";
  }

  if (contact.preference === "whatsapp") {
    return contact.hasWhatsapp ? "WhatsApp" : "Contacto por confirmar";
  }

  return "Chat en Rastro";
}

function getPhotoUrls(report: PublicReportDetailApiReport) {
  return [...report.media]
    .sort((left, right) => left.position - right.position)
    .map((media) => media.canonicalUrl)
    .filter((url): url is string => Boolean(url));
}

function uniqueTrimmedValues(values: (string | undefined)[]) {
  const uniqueValues: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const trimmed = value?.trim() ?? "";
    const key = trimmed.toLowerCase();

    if (!trimmed || seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueValues.push(trimmed);
  }

  return uniqueValues;
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Fecha por confirmar";
  }

  return dateFormatter.format(date);
}
