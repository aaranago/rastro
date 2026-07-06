import type { Metadata } from "next";

import { buildPublicAdoptionListingShareTarget } from "@acme/validators";

import type {
  PublicReportDetail,
  PublicReportDetailLoader,
} from "./public-report-detail-api-adapter";
import type {
  PublicReportPageContactOption,
  PublicReportPageLocation,
  PublicReportPagePet,
  PublicReportPagePhoto,
} from "./public-report-detail-mapping";
import { getPublicReportDetail } from "./public-report-detail-api-adapter";
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

export type PublicAdoptionListingPhoto = PublicReportPagePhoto;
export type PublicAdoptionListingPet = PublicReportPagePet;

export interface PublicAdoptionListingViewModel {
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
  pet: PublicAdoptionListingPet;
  photos: PublicAdoptionListingPhoto[];
  publicLocation: PublicReportPageLocation;
  publishedAt: {
    label: string;
    value: string;
  };
  sharePath: string;
  statusLabel: string;
  title: string;
}

const outcomeLabels = {
  adopted: "Adoptada",
  inactive: "Inactiva",
  reunited: "Reunida",
  still_missing: "Sigue activa",
  transferred_to_shelter: "Trasladada a refugio",
  unable_to_locate: "No se pudo ubicar",
} satisfies Record<NonNullable<PublicReportDetail["outcome"]>, string>;

export async function getPublicAdoptionListingViewModel(
  listingId: string,
  loadReportDetail: PublicReportDetailLoader = getPublicReportDetail,
): Promise<PublicAdoptionListingViewModel | null> {
  const report = await loadReportDetail(listingId);

  if (report?.type !== "adoption") {
    return null;
  }

  return buildPublicAdoptionListingViewModel(report);
}

export async function buildPublicAdoptionListingMetadata(
  listingId: string,
  webBaseUrl = "https://rastro.bo",
  loadReportDetail: PublicReportDetailLoader = getPublicReportDetail,
): Promise<Metadata | null> {
  const listing = await getPublicAdoptionListingViewModel(
    listingId,
    loadReportDetail,
  );

  if (!listing) {
    return null;
  }

  const title = `${listing.pet.name} está en adopción en ${listing.publicLocation.label} | Rastro`;
  const description = `Conoce a ${listing.pet.name}, ${listing.pet.type} ${listing.pet.breed}, en adopción. Ubicación: ${listing.publicLocation.label}.`;
  const shareTarget = buildPublicAdoptionListingShareTarget({
    listingId,
    publicWebBaseUrl: webBaseUrl,
    title: listing.pet.name,
  });

  return buildPublicReportArticleMetadata({
    description,
    primaryPhoto: listing.photos[0],
    title,
    webUrl: shareTarget.webUrl,
  });
}

function buildPublicAdoptionListingViewModel(
  report: PublicReportDetail,
): PublicAdoptionListingViewModel {
  const pet = buildPublicReportPetViewModel(report);
  const shareTarget = buildPublicAdoptionListingShareTarget({
    listingId: report.id,
    publicWebBaseUrl,
    title: pet.name,
  });
  const appHandoffHref = buildAppDownloadHref({
    context: "adoption",
    returnTo: shareTarget.path,
    target: shareTarget.appDeepLink,
  });

  return {
    abuseReport: {
      isOwner: report.owner.isCurrentMember,
      reportId: report.id,
    },
    appPrompts: {
      downloadHref: appHandoffHref,
      downloadLabel: "Instalar o abrir Rastro",
      openHref: appHandoffHref,
      openLabel: "Abrir en la app",
    },
    contactOptions: buildPublicReportContactOptions(report, {
      context: "adoption",
      fallbackHref: appHandoffHref,
      returnTo: shareTarget.path,
    }),
    description: report.description.trim(),
    pet,
    photos: buildPublicReportPhotos(report, pet.name),
    publicLocation: buildPublicReportLocation(report.location),
    publishedAt: {
      label: "Publicado",
      value: formatReportDate(report.createdAt),
    },
    sharePath: shareTarget.path,
    statusLabel: buildStatusLabel(report),
    title: report.title.trim(),
  };
}

function buildStatusLabel(report: PublicReportDetail) {
  if (report.status === "closed") {
    return report.outcome ? outcomeLabels[report.outcome] : "Adopción cerrada";
  }

  return "En adopción";
}
