import { useLocalSearchParams } from "expo-router";

import { PublicFoundReportDeepLinkScreen } from "~/features/found-reports";
import { createApiPublicReportDetailAdapter } from "~/features/reports/public-report-detail";
import { PublicReportDetailScreen } from "~/features/reports/public-report-detail-screen";
import { trpcClient } from "~/utils/api";

const reportDetailAdapter = createApiPublicReportDetailAdapter({
  client: trpcClient,
});

export default function PublicFoundReportDeepLinkRoute() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  return (
    <PublicReportDetailScreen
      adapter={reportDetailAdapter}
      expectedType="found_pet"
      fallback={<PublicFoundReportDeepLinkScreen reportId={reportId} />}
      reportId={reportId}
    />
  );
}
