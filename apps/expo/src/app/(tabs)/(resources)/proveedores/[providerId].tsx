import { useLocalSearchParams } from "expo-router";

import { ResourceProviderProfileScreen } from "~/features/resources";
import { defaultApiResourcesAdapter } from "~/features/resources/resources-default-api-adapter";

export default function ResourceProviderProfileRoute() {
  const { providerId } = useLocalSearchParams<{ providerId?: string }>();

  return (
    <ResourceProviderProfileScreen
      adapter={defaultApiResourcesAdapter}
      providerId={providerId}
    />
  );
}
