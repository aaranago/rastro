import { buildPublicLostReportShareTarget } from "@acme/validators";

import type {
  PublicReportLifecycleViewModelInput,
  ReportLifecycleActionId,
} from "../reports/report-lifecycle-view-model";
import { PublicReportDeepLinkScreen } from "../reports/public-report-deep-link-screen";
import { buildPublicReportLifecycleViewModel } from "../reports/report-lifecycle-view-model";
import { shellColors } from "../shell/shell-theme";

const publicWebBaseUrl = "https://rastro.bo";

export function PublicLostReportDeepLinkScreen({
  lifecycle,
  onLifecycleAction,
  reportId,
}: {
  lifecycle?: Omit<PublicReportLifecycleViewModelInput, "reportTitle"> & {
    reportTitle?: string;
  };
  onLifecycleAction?: (actionId: ReportLifecycleActionId) => void;
  reportId?: string;
}) {
  const safeReportId = reportId?.trim() ?? "reporte";
  const reportTitle = lifecycle?.reportTitle ?? "Reporte de mascota perdida";
  const shareTarget = buildPublicLostReportShareTarget({
    publicWebBaseUrl,
    reportId: safeReportId,
    title: "mascota perdida",
  });

  return (
    <PublicReportDeepLinkScreen
      accentColor={shellColors.primary}
      body="Este enlace abre el reporte compartido en la app. Si el detalle aun no esta sincronizado en tu telefono, puedes abrir la pagina publica."
      lifecycle={
        lifecycle
          ? buildPublicReportLifecycleViewModel({
              ...lifecycle,
              reportTitle,
            })
          : undefined
      }
      onLifecycleAction={onLifecycleAction}
      reportId={safeReportId}
      title="Reporte de mascota perdida"
      webUrl={shareTarget.webUrl}
    />
  );
}
