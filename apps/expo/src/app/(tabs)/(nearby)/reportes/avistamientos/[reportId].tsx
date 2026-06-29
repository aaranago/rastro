import { useLocalSearchParams } from "expo-router";

import { createApiPublicReportDetailAdapter } from "~/features/reports/public-report-detail";
import { PublicReportDetailScreen } from "~/features/reports/public-report-detail-screen";
import { trpcClient } from "~/utils/api";

const reportDetailAdapter = createApiPublicReportDetailAdapter({
  client: trpcClient,
});

export default function PublicSightingReportDeepLinkRoute() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  return (
    <PublicReportDetailScreen
      adapter={reportDetailAdapter}
      expectedType="sighting"
      reportId={reportId}
    />
  );
}
