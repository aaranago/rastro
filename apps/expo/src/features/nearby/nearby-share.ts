import type {
  NearbyPublicReportKind,
  PublicReportShareTarget,
} from "./nearby-types";

export interface NearbyNativeShareSheet {
  share: (
    content: {
      message: string;
      title: string;
      url: string;
    },
    options: {
      dialogTitle: string;
      subject: string;
    },
  ) => Promise<unknown>;
}

export interface NearbyShareableLostReport {
  reportKind?: NearbyPublicReportKind;
  shareTarget: PublicReportShareTarget;
}

export function shareNearbyLostReport(
  report: NearbyShareableLostReport,
  shareSheet: NearbyNativeShareSheet,
) {
  return shareSheet.share(
    {
      message: report.shareTarget.message,
      title: report.shareTarget.title,
      url: report.shareTarget.webUrl,
    },
    {
      dialogTitle: getShareDialogTitle(report.reportKind),
      subject: report.shareTarget.title,
    },
  );
}

function getShareDialogTitle(reportKind: NearbyPublicReportKind | undefined) {
  if (reportKind === "adoption-listing") {
    return "Compartir adopción";
  }

  if (reportKind === "found-pet-report") {
    return "Compartir reporte de mascota encontrada";
  }

  if (reportKind === "sighting-report") {
    return "Compartir avistamiento";
  }

  return "Compartir reporte de mascota perdida";
}
