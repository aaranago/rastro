import type { PublicLostReportShareTarget } from "@acme/validators";

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
  shareTarget: PublicLostReportShareTarget;
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
      dialogTitle: "Compartir reporte de mascota perdida",
      subject: report.shareTarget.title,
    },
  );
}
