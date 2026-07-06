import { buildPublicAdoptionListingShareTarget } from "@acme/validators";

import { PublicReportDeepLinkScreen } from "../reports/public-report-deep-link-screen";
import { shellColors } from "../shell/shell-theme";

const publicWebBaseUrl = "https://rastro.bo";
const fallbackPublicAdoptionListingId = "00000000-0000-4000-8000-000000000000";

export function PublicAdoptionListingDeepLinkScreen({
  listingId,
  onReport,
}: {
  listingId?: string;
  onReport?: (listingId: string) => void;
}) {
  const safeListingId = listingId?.trim() ?? fallbackPublicAdoptionListingId;
  const shareTarget = buildPublicAdoptionListingShareTarget({
    listingId: safeListingId,
    publicWebBaseUrl,
    title: "mascota en adopción",
  });

  return (
    <PublicReportDeepLinkScreen
      accentColor={shellColors.adoption}
      body="Este enlace abre una adopción compartida en la app. Si el detalle aún no está sincronizado en tu teléfono, puedes abrir la página pública."
      onReport={onReport}
      reportId={safeListingId}
      title="Mascota en adopción"
      webUrl={shareTarget.webUrl}
    />
  );
}
