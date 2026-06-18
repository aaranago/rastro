import { useLocalSearchParams } from "expo-router";

import { ResourceProviderProfileScreen } from "~/features/resources";

export default function ResourceProviderProfileRoute() {
  const { providerId } = useLocalSearchParams<{ providerId?: string }>();

  return <ResourceProviderProfileScreen providerId={providerId} />;
}
