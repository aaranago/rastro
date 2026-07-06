import { useLocalSearchParams } from "expo-router";

import { createApiPublicReportDetailAdapter } from "~/features/reports/public-report-detail";
import { PublicReportDetailScreen } from "~/features/reports/public-report-detail-screen";
import { trpcClient } from "~/utils/api";

const reportDetailAdapter = createApiPublicReportDetailAdapter({
  client: trpcClient,
});

export default function PublicAdoptionListingDeepLinkRoute() {
  const { listingId, reportar } = useLocalSearchParams<{
    listingId: string;
    reportar?: string;
  }>();

  return (
    <PublicReportDetailScreen
      adapter={reportDetailAdapter}
      expectedType="adoption"
      openReportAbuseOnLoad={reportar === "1"}
      reportId={listingId}
    />
  );
}
