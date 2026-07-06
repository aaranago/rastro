import type { Metadata } from "next";

import {
  buildPublicFoundReportShareTarget,
  buildPublicSightingReportShareTarget,
} from "@acme/validators";

import type {
  PublicReportDetail,
  PublicReportDetailLoader,
} from "./public-report-detail-api-adapter";
import { getPublicReportDetail } from "./public-report-detail-api-adapter";
import type {
  PublicReportPageContactOption,
  PublicReportPageLocation,
  PublicReportPagePet,
  PublicReportPagePhoto,
} from "./public-report-detail-mapping";
import {
  appDownloadHref,
  buildPublicReportArticleMetadata,
  buildPublicReportContactOptions,
  buildPublicReportLocation,
  buildPublicReportPetViewModel,
  buildPublicReportPhotos,
  formatReportDate,
  publicWebBaseUrl,
} from "./public-report-detail-mapping";

export type PublicCommunityReportType = "found_pet" | "sighting";

export type PublicCommunityReportPhoto = PublicReportPagePhoto;
export type PublicCommunityReportPet = PublicReportPagePet;

export interface PublicCommunityReportViewModel {
  abuseReport: {
    isOwner: boolean;
    reportId: string;
  };
  appPrompts: {
    downloadHref: string;
    downloadLabel: string;
    openHref: string;
    openLabel: string;
  };
  contactOptions: PublicReportPageContactOption[];
  description: string;
  descriptionLabel: string;
  event: {
    label: string;
    value: string;
  };
  pet: PublicCommunityReportPet;
  photos: PublicCommunityReportPhoto[];
  publicLocation: PublicReportPageLocation;
  sharePath: string;
  statusLabel: string;
  title: string;
  type: PublicCommunityReportType;
}

interface PublicCommunityReportConfig {
  activeStatusLabel: string;
  descriptionLabel: string;
  eventLabel: string;
  metadataDescription: (
    report: PublicCommunityReportViewModel,
  ) => string;
  metadataTitle: (report: PublicCommunityReportViewModel) => string;
  shareTarget: (input: {
    publicWebBaseUrl: string;
    reportId: string;
    title: string;
  }) => {
    appDeepLink: string;
    path: string;
    webUrl: string;
  };
  type: PublicCommunityReportType;
}

const outcomeLabels = {
  adopted: "Adoptada",
  inactive: "Inactivo",
  reunited: "Reunido",
  still_missing: "Sigue activo",
  transferred_to_shelter: "Trasladado a refugio",
  unable_to_locate: "No se pudo ubicar",
} satisfies Record<NonNullable<PublicReportDetail["outcome"]>, string>;

const foundReportConfig = {
  activeStatusLabel: "Mascota encontrada",
  descriptionLabel: "Descripcion del encuentro",
  eventLabel: "Encontrado",
  metadataDescription: (report) =>
    `Ayuda a reunir a ${report.pet.name}, ${report.pet.type} ${report.pet.breed}. Encontrado en zona aproximada: ${report.publicLocation.label}.`,
  metadataTitle: (report) =>
    `Mascota encontrada: ${report.pet.name} en ${report.publicLocation.label} | Rastro`,
  shareTarget: buildPublicFoundReportShareTarget,
  type: "found_pet",
} satisfies PublicCommunityReportConfig;

const sightingReportConfig = {
  activeStatusLabel: "Avistamiento activo",
  descriptionLabel: "Descripcion del avistamiento",
  eventLabel: "Avistado",
  metadataDescription: (report) =>
    `Ayuda a ubicar este avistamiento de ${report.pet.name}, ${report.pet.type} ${report.pet.breed}. Visto en zona aproximada: ${report.publicLocation.label}.`,
  metadataTitle: (report) =>
    `Avistamiento de ${report.pet.name} en ${report.publicLocation.label} | Rastro`,
  shareTarget: buildPublicSightingReportShareTarget,
  type: "sighting",
} satisfies PublicCommunityReportConfig;

export async function getPublicFoundReportViewModel(
  reportId: string,
  loadReportDetail: PublicReportDetailLoader = getPublicReportDetail,
): Promise<PublicCommunityReportViewModel | null> {
  return getPublicCommunityReportViewModel(
    reportId,
    foundReportConfig,
    loadReportDetail,
  );
}

export async function getPublicSightingReportViewModel(
  reportId: string,
  loadReportDetail: PublicReportDetailLoader = getPublicReportDetail,
): Promise<PublicCommunityReportViewModel | null> {
  return getPublicCommunityReportViewModel(
    reportId,
    sightingReportConfig,
    loadReportDetail,
  );
}

export async function buildPublicFoundReportMetadata(
  reportId: string,
  webBaseUrl = "https://rastro.bo",
  loadReportDetail: PublicReportDetailLoader = getPublicReportDetail,
): Promise<Metadata | null> {
  return buildPublicCommunityReportMetadata(
    reportId,
    webBaseUrl,
    foundReportConfig,
    loadReportDetail,
  );
}

export async function buildPublicSightingReportMetadata(
  reportId: string,
  webBaseUrl = "https://rastro.bo",
  loadReportDetail: PublicReportDetailLoader = getPublicReportDetail,
): Promise<Metadata | null> {
  return buildPublicCommunityReportMetadata(
    reportId,
    webBaseUrl,
    sightingReportConfig,
    loadReportDetail,
  );
}

async function getPublicCommunityReportViewModel(
  reportId: string,
  config: PublicCommunityReportConfig,
  loadReportDetail: PublicReportDetailLoader,
): Promise<PublicCommunityReportViewModel | null> {
  const report = await loadReportDetail(reportId);

  if (report?.type !== config.type) {
    return null;
  }

  return buildPublicCommunityReportViewModel(report, config);
}

async function buildPublicCommunityReportMetadata(
  reportId: string,
  webBaseUrl: string,
  config: PublicCommunityReportConfig,
  loadReportDetail: PublicReportDetailLoader,
): Promise<Metadata | null> {
  const report = await getPublicCommunityReportViewModel(
    reportId,
    config,
    loadReportDetail,
  );

  if (!report) {
    return null;
  }

  const shareTarget = config.shareTarget({
    publicWebBaseUrl: webBaseUrl,
    reportId,
    title: report.pet.name,
  });

  return buildPublicReportArticleMetadata({
    description: config.metadataDescription(report),
    primaryPhoto: report.photos[0],
    title: config.metadataTitle(report),
    webUrl: shareTarget.webUrl,
  });
}

function buildPublicCommunityReportViewModel(
  report: PublicReportDetail,
  config: PublicCommunityReportConfig,
): PublicCommunityReportViewModel {
  const pet = buildPublicReportPetViewModel(report);
  const shareTarget = config.shareTarget({
    publicWebBaseUrl,
    reportId: report.id,
    title: pet.name,
  });

  return {
    abuseReport: {
      isOwner: report.owner.isCurrentMember,
      reportId: report.id,
    },
    appPrompts: {
      downloadHref: appDownloadHref,
      downloadLabel: "Descargar Rastro",
      openHref: shareTarget.appDeepLink,
      openLabel: "Abrir en la app",
    },
    contactOptions: buildPublicReportContactOptions(
      report,
      shareTarget.appDeepLink,
    ),
    description: report.description.trim(),
    descriptionLabel: config.descriptionLabel,
    event: {
      label: config.eventLabel,
      value: formatReportDate(report.eventOccurredAt),
    },
    pet,
    photos: buildPublicReportPhotos(report, pet.name),
    publicLocation: buildPublicReportLocation(report.location),
    sharePath: shareTarget.path,
    statusLabel: buildStatusLabel(report, config),
    title: report.title.trim(),
    type: config.type,
  };
}

function buildStatusLabel(
  report: PublicReportDetail,
  config: PublicCommunityReportConfig,
) {
  if (report.status === "closed") {
    return report.outcome ? outcomeLabels[report.outcome] : "Reporte cerrado";
  }

  return config.activeStatusLabel;
}
