import {
  buildPublicAdoptionListingShareTarget,
  buildPublicFoundReportShareTarget,
  buildPublicLostReportShareTarget,
  buildPublicSightingReportShareTarget,
} from "@acme/validators";

import type { RouterOutputs } from "../../utils/api";
import type { TrustSafetyReportReason } from "../trust-safety";
import type { PublicReportContactOption } from "./report-repository-utils";

export type PublicReportDetailApiReport = RouterOutputs["report"]["detail"];
export type PublicReportAbuseReportResult =
  RouterOutputs["report"]["reportAbuse"];

export interface PublicReportDetailApiClient {
  report: {
    detail: {
      query: (input: { id: string }) => Promise<PublicReportDetailApiReport>;
    };
    reportAbuse: {
      mutate: (
        input: PublicReportAbuseReportInput,
      ) => Promise<PublicReportAbuseReportResult>;
    };
  };
}

export interface PublicReportDetailAdapter {
  getReportDetail: (reportId: string) => Promise<PublicReportDetailApiReport>;
  reportAbuse: (
    input: PublicReportAbuseReportInput,
  ) => Promise<PublicReportAbuseReportResult>;
}

export type PublicReportDetailType = PublicReportDetailApiReport["type"];
export type PublicReportDetailLoadFailureKind = "error" | "unavailable";
export type PublicReportDetailStatusTone = "active" | "closed" | "review";

export interface PublicReportDetailViewModel {
  accentColor: string;
  accentSoftColor: string;
  abuseReportAction: PublicReportDetailAbuseReportAction | null;
  appPath: string;
  contactActions: PublicReportContactOption[];
  contactLabel: string;
  description: string;
  descriptionTitle: string;
  eventLabel: string;
  eventValue: string;
  facts: PublicReportDetailFact[];
  heroIconName: string;
  isCurrentMember: boolean;
  locationAction: PublicReportDetailLocationAction;
  locationLabel: string;
  locationPrivacyLabel: string;
  ownerNotice: PublicReportDetailOwnerNotice | null;
  photoUrls: string[];
  publicPageLabel: string;
  shareMessage: string;
  shareTitle: string;
  shareUrl: string;
  statusLabel: string;
  statusTone: PublicReportDetailStatusTone;
  subtitle: string;
  title: string;
  type: PublicReportDetailType;
  typeLabel: string;
}

export interface PublicReportAbuseReportInput {
  detail: string;
  reason: TrustSafetyReportReason;
  reportId: string;
}

export interface PublicReportDetailAbuseReportAction {
  body: string;
  detailHelper: string;
  detailLabel: string;
  detailPlaceholder: string;
  label: string;
  reportId: string;
  submitLabel: string;
  successAlreadyReported: string;
  successCreated: string;
  title: string;
  visitorCtaLabel: string;
}

export interface PublicReportDetailFact {
  iconName: string;
  label: string;
  value: string;
}

export interface PublicReportDetailLocationAction {
  label: string;
  url: string;
}

export interface PublicReportDetailOwnerNotice {
  body: string;
  title: string;
  tone: "default" | "review";
}

const publicWebBaseUrl = "https://rastro.bo";
const inAppChatActionLabel = "Enviar mensaje en Rastro";
const whatsappActionLabel = "Escribir por WhatsApp";

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
    descriptionTitle: "Perfil de adopción",
    eventLabel: "Publicado",
    heroIconName: "heart.fill",
    publicPageLabel: "Abrir adopción pública",
    typeLabel: "Mascota en adopción",
  },
  found_pet: {
    accentColor: "#1D7A52",
    accentSoftColor: "#E5F2EC",
    descriptionTitle: "Dónde fue encontrada",
    eventLabel: "Encontrada",
    heroIconName: "cross.case.fill",
    publicPageLabel: "Abrir página pública",
    typeLabel: "Mascota encontrada",
  },
  lost_pet: {
    accentColor: "#D6453D",
    accentSoftColor: "#FBE8E6",
    descriptionTitle: "Qué pasó",
    eventLabel: "Pérdida",
    heroIconName: "megaphone.fill",
    publicPageLabel: "Abrir página pública",
    typeLabel: "Mascota perdida",
  },
  sighting: {
    accentColor: "#2E6D9E",
    accentSoftColor: "#E7F0F7",
    descriptionTitle: "Detalle del avistamiento",
    eventLabel: "Vista",
    heroIconName: "eye.fill",
    publicPageLabel: "Abrir avistamiento público",
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
    reportAbuse(input) {
      return client.report.reportAbuse.mutate(input);
    },
  };
}

export function classifyPublicReportDetailLoadFailure(
  error: unknown,
): PublicReportDetailLoadFailureKind {
  const code = readPublicReportDetailErrorCode(error);

  if (code === "BAD_REQUEST" || code === "NOT_FOUND") {
    return "unavailable";
  }

  return "error";
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
  const locationLabel = formatReportLocationLabel(report.location);
  const contactActions = getContactActions(report);
  const contactLabel = formatContactLabel(report.contact, contactActions);
  const statusTone = getReportStatusTone(report.status);
  const statusLabel = getReportStatusLabel(report);
  const details = uniqueTrimmedValues([
    report.pet.size?.trim(),
    report.pet.color.trim(),
    report.pet.distinguishingTraits?.trim(),
  ]);

  return {
    accentColor: config.accentColor,
    accentSoftColor: config.accentSoftColor,
    abuseReportAction: report.owner.isCurrentMember
      ? null
      : buildAbuseReportAction(report.id),
    appPath: shareTarget.path,
    contactActions,
    contactLabel,
    description: report.description.trim(),
    descriptionTitle: config.descriptionTitle,
    eventLabel: config.eventLabel,
    eventValue: formatDate(eventDate),
    facts: [
      {
        iconName: "location.fill",
        label: "Ubicación",
        value: locationLabel,
      },
      {
        iconName: "hourglass",
        label: config.eventLabel,
        value: formatDate(eventDate),
      },
      ...(details.length > 0
        ? [
            {
              iconName: "pawprint.fill",
              label: "Señales",
              value: details.join(" · "),
            },
          ]
        : []),
    ],
    heroIconName: config.heroIconName,
    isCurrentMember: report.owner.isCurrentMember,
    locationAction: buildLocationAction(report.location),
    locationLabel,
    locationPrivacyLabel:
      report.location.precision === "exact"
        ? "Pin exacto compartido por la persona cuidadora."
        : "Mostramos una zona aproximada por seguridad.",
    ownerNotice: buildOwnerNotice(report),
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

function buildAbuseReportAction(
  reportId: string,
): PublicReportDetailAbuseReportAction {
  return {
    body: "Cuéntanos qué problema ves. El equipo de Rastro revisará el reporte antes de tomar acción.",
    detailHelper: "Describe el problema con al menos 10 caracteres.",
    detailLabel: "Detalle",
    detailPlaceholder: "Describe el problema con este reporte",
    label: "Reportar",
    reportId,
    submitLabel: "Enviar reporte",
    successAlreadyReported: "Ya recibimos tu reporte sobre este motivo.",
    successCreated: "Gracias. El equipo de Rastro revisará este reporte.",
    title: "Reportar este reporte",
    visitorCtaLabel: "Inicia sesión para reportar",
  };
}

function readPublicReportDetailErrorCode(error: unknown) {
  const directCode = readErrorCodeValue(error);

  if (directCode) {
    return directCode;
  }

  if (isRecord(error)) {
    const dataCode = readErrorCodeValue(error.data);

    if (dataCode) {
      return dataCode;
    }

    if (isRecord(error.shape)) {
      const shapeDataCode = readErrorCodeValue(error.shape.data);

      if (shapeDataCode) {
        return shapeDataCode;
      }
    }
  }

  if (error instanceof Error) {
    const codeMatch = /\b(BAD_REQUEST|NOT_FOUND)\b/.exec(error.message);

    return codeMatch?.[1];
  }

  return undefined;
}

function readErrorCodeValue(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const code = readNonEmptyString(value.code)?.toUpperCase();

  return code === "BAD_REQUEST" || code === "NOT_FOUND" ? code : undefined;
}

function getReportStatusTone(
  status: PublicReportDetailApiReport["status"],
): PublicReportDetailStatusTone {
  if (status === "closed") {
    return "closed";
  }

  if (status === "pending_review") {
    return "review";
  }

  return "active";
}

function getReportStatusLabel(report: PublicReportDetailApiReport) {
  if (report.status === "closed") {
    return report.outcome ? outcomeLabels[report.outcome] : "Cerrado";
  }

  if (report.status === "pending_review") {
    return "En revisión";
  }

  return "Activo";
}

function buildOwnerNotice(
  report: PublicReportDetailApiReport,
): PublicReportDetailOwnerNotice | null {
  if (!report.owner.isCurrentMember) {
    return null;
  }

  if (report.status === "pending_review") {
    return {
      body: "El equipo de Rastro lo está revisando antes de mostrarlo públicamente. Puedes verlo aquí porque es tu reporte.",
      title: "Reporte en revisión",
      tone: "review",
    };
  }

  return {
    body: "Comparte el enlace para que más personas cerca de la zona puedan verlo.",
    title: "Es tu reporte",
    tone: "default",
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
      return buildPublicFoundReportShareTarget({
        publicWebBaseUrl,
        reportId: report.id,
        title,
      });
    case "lost_pet":
      return buildPublicLostReportShareTarget({
        publicWebBaseUrl,
        reportId: report.id,
        title,
      });
    case "sighting":
      return buildPublicSightingReportShareTarget({
        publicWebBaseUrl,
        reportId: report.id,
        title,
      });
  }
}

function getContactActions(
  report: PublicReportDetailApiReport,
): PublicReportContactOption[] {
  if (report.owner.isCurrentMember) {
    return [];
  }

  const apiActions = readApiContactActions(report.contact);

  if (apiActions.length > 0) {
    return apiActions;
  }

  if (
    report.contact.preference === "in_app_chat" ||
    report.contact.preference === "both"
  ) {
    return [
      {
        href: buildReportChatDeepLink(report.id),
        kind: "in-app-chat",
        label: inAppChatActionLabel,
      },
    ];
  }

  return [];
}

function buildReportChatDeepLink(reportId: string) {
  return `rastro://chats/report/${encodeURIComponent(reportId)}`;
}

function readApiContactActions(
  contact: PublicReportDetailApiReport["contact"],
): PublicReportContactOption[] {
  const contactWithActions =
    contact as PublicReportDetailApiReport["contact"] & {
      actions?: unknown;
    };

  if (!Array.isArray(contactWithActions.actions)) {
    return [];
  }

  const actions: PublicReportContactOption[] = [];
  const seen = new Set<string>();

  for (const action of contactWithActions.actions) {
    const normalizedAction = normalizeApiContactAction(action);

    if (!normalizedAction) {
      continue;
    }

    const key = `${normalizedAction.kind}:${normalizedAction.href}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    actions.push(normalizedAction);
  }

  return actions;
}

function normalizeApiContactAction(
  action: unknown,
): PublicReportContactOption | null {
  if (!isRecord(action)) {
    return null;
  }

  const href = readNonEmptyString(action.href);

  if (!href) {
    return null;
  }

  if (action.kind === "in-app-chat" || action.kind === "in_app_chat") {
    return {
      href,
      kind: "in-app-chat",
      label: inAppChatActionLabel,
    };
  }

  if (action.kind === "whatsapp" && isWhatsappContactHref(href)) {
    return {
      href,
      kind: "whatsapp",
      label: whatsappActionLabel,
      phoneNumber: "",
    };
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function isWhatsappContactHref(href: string) {
  return /^https:\/\/wa\.me\/\d+(?:[?#].*)?$/.test(href);
}

function buildLocationAction(
  location: PublicReportDetailApiReport["location"],
): PublicReportDetailLocationAction {
  return {
    label:
      location.precision === "exact" ? "Abrir ubicación" : "Ver zona en mapa",
    url: buildMapSearchUrl(location.latitude, location.longitude),
  };
}

function buildMapSearchUrl(latitude: number, longitude: number) {
  const coordinates = `${latitude},${longitude}`;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    coordinates,
  )}`;
}

function formatContactLabel(
  contact: PublicReportDetailApiReport["contact"],
  actions: readonly PublicReportContactOption[] = [],
) {
  const hasChatAction = actions.some((action) => action.kind === "in-app-chat");
  const hasWhatsappAction = actions.some(
    (action) => action.kind === "whatsapp",
  );

  if (hasChatAction && hasWhatsappAction) {
    return "Chat en Rastro y WhatsApp";
  }

  if (hasWhatsappAction) {
    return "WhatsApp";
  }

  if (hasChatAction) {
    return "Chat en Rastro";
  }

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

function formatReportLocationLabel(
  location: PublicReportDetailApiReport["location"],
) {
  const locationLabel = formatSafeLocationLabel(location.label);

  if (location.precision === "exact" || locationLabel !== "Zona elegida") {
    return locationLabel;
  }

  const locationCell = formatSafeLocationLabel(location.locationCell);

  if (locationCell === "Zona elegida") {
    return "Zona aproximada";
  }

  return `${locationCell} · zona aproximada`;
}

function formatSafeLocationLabel(label: string) {
  const trimmed = label.trim();

  if (
    trimmed.length === 0 ||
    /\bpin manual\b/i.test(trimmed) ||
    /-?\d{1,2}\.\d{3,}\s*,\s*-?\d{1,3}\.\d{3,}/.test(trimmed)
  ) {
    return "Zona elegida";
  }

  return trimmed;
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
