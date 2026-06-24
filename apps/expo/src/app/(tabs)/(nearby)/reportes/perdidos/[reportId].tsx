import { useLocalSearchParams } from "expo-router";

import { PublicLostReportDeepLinkScreen } from "~/features/lost-reports/public-lost-report-deep-link-screen";
import { createApiPublicReportDetailAdapter } from "~/features/reports/public-report-detail";
import { PublicReportDetailScreen } from "~/features/reports/public-report-detail-screen";
import { trpcClient } from "~/utils/api";

const reportDetailAdapter = createApiPublicReportDetailAdapter({
  client: trpcClient,
});

export default function PublicLostReportDeepLinkRoute() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  return (
    <PublicReportDetailScreen
      adapter={reportDetailAdapter}
      expectedType="lost_pet"
      fallback={<PublicLostReportDeepLinkScreen reportId={reportId} />}
      reportId={reportId}
    />
  );
}
