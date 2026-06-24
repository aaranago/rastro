import { useLocalSearchParams } from "expo-router";

import { PublicSightingReportDeepLinkScreen } from "~/features/sighting-reports/public-sighting-report-deep-link-screen";
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
      fallback={<PublicSightingReportDeepLinkScreen reportId={reportId} />}
      reportId={reportId}
    />
  );
}
