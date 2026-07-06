import type { Metadata } from "next";

import { buildPublicLostReportShareTarget } from "@acme/validators";

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
  buildAppDownloadHref,
  buildPublicReportArticleMetadata,
  buildPublicReportContactOptions,
  buildPublicReportLocation,
  buildPublicReportPetViewModel,
  buildPublicReportPhotos,
  formatReportDate,
  publicWebBaseUrl,
} from "./public-report-detail-mapping";

export type PublicLostReportPhoto = PublicReportPagePhoto;
export type PublicLostReportPet = PublicReportPagePet;

export interface PublicLostReportViewModel {
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
  lastSeen: {
    label: string;
    value: string;
  };
  pet: PublicLostReportPet;
  photos: PublicLostReportPhoto[];
  publicLocation: PublicReportPageLocation;
  sharePath: string;
  statusLabel: string;
  title: string;
}

const outcomeLabels = {
  adopted: "Adoptada",
  inactive: "Inactivo",
  reunited: "Reunido",
  still_missing: "Sigue perdido",
  transferred_to_shelter: "Trasladado a refugio",
  unable_to_locate: "No se pudo ubicar",
} satisfies Record<NonNullable<PublicReportDetail["outcome"]>, string>;

export async function getPublicLostReportViewModel(
  reportId: string,
  loadReportDetail: PublicReportDetailLoader = getPublicReportDetail,
): Promise<PublicLostReportViewModel | null> {
  const report = await loadReportDetail(reportId);

  if (report?.type !== "lost_pet") {
    return null;
  }

  return buildPublicLostReportViewModel(report);
}

export async function buildPublicLostReportMetadata(
  reportId: string,
  webBaseUrl = "https://rastro.bo",
  loadReportDetail: PublicReportDetailLoader = getPublicReportDetail,
): Promise<Metadata | null> {
  const report = await getPublicLostReportViewModel(reportId, loadReportDetail);

  if (!report) {
    return null;
  }

  const title = `${report.pet.name} esta perdido en ${report.publicLocation.label} | Rastro`;
  const description = `Ayuda a encontrar a ${report.pet.name}, ${report.pet.type} ${report.pet.breed}. Ultima vez visto en zona aproximada: ${report.publicLocation.label}.`;
  const shareTarget = buildPublicLostReportShareTarget({
    publicWebBaseUrl: webBaseUrl,
    reportId,
    title: report.pet.name,
  });

  return buildPublicReportArticleMetadata({
    description,
    primaryPhoto: report.photos[0],
    title,
    webUrl: shareTarget.webUrl,
  });
}

function buildPublicLostReportViewModel(
  report: PublicReportDetail,
): PublicLostReportViewModel {
  const pet = buildPublicReportPetViewModel(report);
  const shareTarget = buildPublicLostReportShareTarget({
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
      downloadHref: buildAppDownloadHref({
        context: "report",
        returnTo: shareTarget.path,
        target: shareTarget.appDeepLink,
      }),
      downloadLabel: "Instalar o abrir Rastro",
      openHref: shareTarget.appDeepLink,
      openLabel: "Abrir en la app",
    },
    contactOptions: buildPublicReportContactOptions(
      report,
      shareTarget.appDeepLink,
    ),
    description: report.description.trim(),
    lastSeen: {
      label: "Visto por ultima vez",
      value: formatReportDate(report.eventOccurredAt),
    },
    pet,
    photos: buildPublicReportPhotos(report, pet.name),
    publicLocation: buildPublicReportLocation(report.location),
    sharePath: shareTarget.path,
    statusLabel: buildStatusLabel(report),
    title: report.title.trim(),
  };
}

function buildStatusLabel(report: PublicReportDetail) {
  if (report.status === "closed") {
    return report.outcome ? outcomeLabels[report.outcome] : "Reporte cerrado";
  }

  return "Reporte activo";
}
