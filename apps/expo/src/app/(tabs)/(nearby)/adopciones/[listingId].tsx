import { useLocalSearchParams } from "expo-router";

import { createApiPublicReportDetailAdapter } from "~/features/reports/public-report-detail";
import { PublicReportDetailScreen } from "~/features/reports/public-report-detail-screen";
import { trpcClient } from "~/utils/api";

const reportDetailAdapter = createApiPublicReportDetailAdapter({
  client: trpcClient,
});

export default function PublicAdoptionListingDeepLinkRoute() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();

  return (
    <PublicReportDetailScreen
      adapter={reportDetailAdapter}
      expectedType="adoption"
      reportId={listingId}
    />
  );
}
