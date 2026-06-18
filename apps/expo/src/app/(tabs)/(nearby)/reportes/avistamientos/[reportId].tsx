import { useLocalSearchParams } from "expo-router";

import { PublicSightingReportDeepLinkScreen } from "~/features/sighting-reports/public-sighting-report-deep-link-screen";

export default function PublicSightingReportDeepLinkRoute() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  return <PublicSightingReportDeepLinkScreen reportId={reportId} />;
}
