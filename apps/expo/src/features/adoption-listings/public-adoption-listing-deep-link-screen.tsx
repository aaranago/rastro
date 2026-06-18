import { buildPublicAdoptionListingShareTarget } from "@acme/validators";

import { PublicReportDeepLinkScreen } from "../reports/public-report-deep-link-screen";
import { shellColors } from "../shell/shell-theme";

const publicWebBaseUrl = "https://rastro.bo";

export function PublicAdoptionListingDeepLinkScreen({
  listingId,
  onReport,
}: {
  listingId?: string;
  onReport?: (listingId: string) => void;
}) {
  const safeListingId = listingId?.trim() ?? "adopcion";
  const shareTarget = buildPublicAdoptionListingShareTarget({
    listingId: safeListingId,
    publicWebBaseUrl,
    title: "mascota en adopcion",
  });

  return (
    <PublicReportDeepLinkScreen
      accentColor={shellColors.adoption}
      body="Este enlace abre una adopcion compartida en la app. Si el detalle aun no esta sincronizado en tu telefono, puedes abrir la pagina publica."
      onReport={onReport}
      reportId={safeListingId}
      title="Mascota en adopcion"
      webUrl={shareTarget.webUrl}
    />
  );
}
