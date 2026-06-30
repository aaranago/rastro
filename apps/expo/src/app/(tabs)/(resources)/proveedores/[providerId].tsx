import { useLocalSearchParams } from "expo-router";

import { ResourceProviderProfileScreen } from "~/features/resources";
import { defaultApiResourcesAdapter } from "~/features/resources/resources-default-api-adapter";

export default function ResourceProviderProfileRoute() {
  const { providerId, report } = useLocalSearchParams<{
    providerId?: string;
    report?: string;
  }>();

  return (
    <ResourceProviderProfileScreen
      adapter={defaultApiResourcesAdapter}
      initiallyReportProvider={report === "1"}
      providerId={providerId}
    />
  );
}
