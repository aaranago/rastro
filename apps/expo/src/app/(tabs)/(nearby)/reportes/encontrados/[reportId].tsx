import { useLocalSearchParams } from "expo-router";

import { PublicFoundReportDeepLinkScreen } from "~/features/found-reports";

export default function PublicFoundReportDeepLinkRoute() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  return <PublicFoundReportDeepLinkScreen reportId={reportId} />;
}
