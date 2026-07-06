import { useLocalSearchParams } from "expo-router";

import { createApiPublicReportDetailAdapter } from "~/features/reports/public-report-detail";
import { PublicReportDetailScreen } from "~/features/reports/public-report-detail-screen";
import { trpcClient } from "~/utils/api";

const reportDetailAdapter = createApiPublicReportDetailAdapter({
  client: trpcClient,
});

export default function PublicLostReportDeepLinkRoute() {
  const { reportId, reportar } = useLocalSearchParams<{
    reportar?: string;
    reportId: string;
  }>();

  return (
    <PublicReportDetailScreen
      adapter={reportDetailAdapter}
      expectedType="lost_pet"
      openReportAbuseOnLoad={reportar === "1"}
      reportId={reportId}
    />
  );
}
