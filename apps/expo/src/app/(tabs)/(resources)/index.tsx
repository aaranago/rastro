import { useCallback } from "react";
import { useRouter } from "expo-router";

import {
  buildResourceProviderProfileHref,
  ResourcesScreen,
} from "~/features/resources";
import { defaultApiResourcesAdapter } from "~/features/resources/resources-default-api-adapter";
import type { ResourceSearchLocation } from "~/features/resources/resource-types";

const defaultResourcesSearchLocation: ResourceSearchLocation = {
  coordinate: {
    latitude: -16.510231,
    longitude: -68.123881,
  },
  countryCode: "BO",
  kind: "manual",
  label: "Sopocachi, La Paz",
  locationCellLabel: "bo-lpb-sopocachi",
  manualLocationKind: "place",
};

export default function ResourcesRoute() {
  const router = useRouter();
  const adapter = defaultApiResourcesAdapter;

  const handleOpenProvider = useCallback(
    (providerId: string) => {
      router.push(buildResourceProviderProfileHref(providerId));
    },
    [router],
  );

  return (
    <ResourcesScreen
      adapter={adapter}
      initialLocation={defaultResourcesSearchLocation}
      onOpenProvider={handleOpenProvider}
    />
  );
}
