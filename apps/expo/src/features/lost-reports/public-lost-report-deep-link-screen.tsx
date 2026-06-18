import { buildPublicLostReportShareTarget } from "@acme/validators";

import { PublicReportDeepLinkScreen } from "../reports/public-report-deep-link-screen";
import { shellColors } from "../shell/shell-theme";

const publicWebBaseUrl = "https://rastro.bo";

export function PublicLostReportDeepLinkScreen({
  reportId,
}: {
  reportId?: string;
}) {
  const safeReportId = reportId?.trim() ?? "reporte";
  const shareTarget = buildPublicLostReportShareTarget({
    publicWebBaseUrl,
    reportId: safeReportId,
    title: "mascota perdida",
  });

  return (
    <PublicReportDeepLinkScreen
      accentColor={shellColors.primary}
      body="Este enlace abre el reporte compartido en la app. Si el detalle aun no esta sincronizado en tu telefono, puedes abrir la pagina publica."
      reportId={safeReportId}
      title="Reporte de mascota perdida"
      webUrl={shareTarget.webUrl}
    />
  );
}
