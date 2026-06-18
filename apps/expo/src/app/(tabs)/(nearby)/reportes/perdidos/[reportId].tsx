import { useLocalSearchParams } from "expo-router";

import { PublicLostReportDeepLinkScreen } from "~/features/lost-reports/public-lost-report-deep-link-screen";

export default function PublicLostReportDeepLinkRoute() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  return <PublicLostReportDeepLinkScreen reportId={reportId} />;
}
