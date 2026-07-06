import { PublicReportDeepLinkScreen } from "../reports/public-report-deep-link-screen";
import { shellColors } from "../shell/shell-theme";

const publicWebBaseUrl = "https://rastro.bo";

function buildPublicFoundReportWebUrl(reportId: string) {
  return `${publicWebBaseUrl}/reportes/encontrados/${encodeURIComponent(
    reportId,
  )}`;
}

export function PublicFoundReportDeepLinkScreen({
  onReport,
  reportId,
}: {
  onReport?: (reportId: string) => void;
  reportId?: string;
}) {
  const safeReportId = reportId?.trim() ?? "encontrada";

  return (
    <PublicReportDeepLinkScreen
      accentColor={shellColors.found}
      body="Este enlace abre un reporte de mascota encontrada compartido en la app. Si el detalle aún no está sincronizado en tu teléfono, puedes abrir la página pública."
      onReport={onReport}
      reportId={safeReportId}
      title="Reporte de mascota encontrada"
      webUrl={buildPublicFoundReportWebUrl(safeReportId)}
    />
  );
}
