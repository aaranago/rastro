import { useCallback } from "react";
import { useRouter } from "expo-router";

import {
  buildResourceProviderProfileHref,
  ResourcesScreen,
} from "~/features/resources";

export default function ResourcesRoute() {
  const router = useRouter();

  const handleOpenProvider = useCallback(
    (providerId: string) => {
      router.push(buildResourceProviderProfileHref(providerId));
    },
    [router],
  );

  return <ResourcesScreen onOpenProvider={handleOpenProvider} />;
}
