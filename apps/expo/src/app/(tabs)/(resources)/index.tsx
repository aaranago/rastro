import { useCallback } from "react";
import { useRouter } from "expo-router";

import {
  buildResourceProviderProfileHref,
  ResourcesScreen,
} from "~/features/resources";
import { defaultCachedResourcesAdapter } from "~/features/resources/default-resources-adapter";

export default function ResourcesRoute() {
  const router = useRouter();
  const adapter = defaultCachedResourcesAdapter;

  const handleOpenProvider = useCallback(
    (providerId: string) => {
      router.push(buildResourceProviderProfileHref(providerId));
    },
    [router],
  );

  const handleReportProvider = useCallback(
    (providerId: string) => {
      void adapter.reportProvider({
        detail: "Reporte enviado desde la lista de Recursos.",
        providerId,
        reason: "other",
      });
    },
    [adapter],
  );

  return (
    <ResourcesScreen
      adapter={adapter}
      onOpenProvider={handleOpenProvider}
      onReportProvider={handleReportProvider}
    />
  );
}
