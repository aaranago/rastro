import { PublicReportDeepLinkScreen } from "../reports/public-report-deep-link-screen";
import { shellColors } from "../shell/shell-theme";

const publicWebBaseUrl = "https://rastro.bo";

function buildPublicSightingReportWebUrl(reportId: string) {
  return `${publicWebBaseUrl}/reportes/avistamientos/${encodeURIComponent(
    reportId,
  )}`;
}

export function PublicSightingReportDeepLinkScreen({
  reportId,
}: {
  reportId?: string;
}) {
  const safeReportId = reportId?.trim() ?? "avistamiento";

  return (
    <PublicReportDeepLinkScreen
      accentColor={shellColors.sighting}
      body="Este enlace abre un reporte de avistamiento compartido en la app. Si el detalle aun no esta sincronizado en tu telefono, puedes abrir la pagina publica."
      reportId={safeReportId}
      title="Reporte de avistamiento"
      webUrl={buildPublicSightingReportWebUrl(safeReportId)}
    />
  );
}
