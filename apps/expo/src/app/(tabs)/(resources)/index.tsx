import { useCallback } from "react";
import { useRouter } from "expo-router";

import {
  buildResourceProviderProfileHref,
  ResourcesScreen,
} from "~/features/resources";
import { defaultResourceSearchLocation } from "~/features/resources/resource-location-options";
import { defaultApiResourcesAdapter } from "~/features/resources/resources-default-api-adapter";

export default function ResourcesRoute() {
  const router = useRouter();
  const adapter = defaultApiResourcesAdapter;

  const handleOpenProvider = useCallback(
    (providerId: string) => {
      router.push(buildResourceProviderProfileHref(providerId));
    },
    [router],
  );

  const handleReportProvider = useCallback(
    (providerId: string) => {
      router.push(buildResourceProviderProfileHref(providerId, { report: true }));
    },
    [router],
  );

  return (
    <ResourcesScreen
      adapter={adapter}
      initialLocation={defaultResourceSearchLocation}
      onOpenProvider={handleOpenProvider}
      onReportProvider={handleReportProvider}
    />
  );
}
