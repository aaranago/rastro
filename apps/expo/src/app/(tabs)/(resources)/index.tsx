import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";

import {
  buildResourceProviderProfileHref,
  createStaticResourcesAdapter,
  ResourcesScreen,
} from "~/features/resources";

export default function ResourcesRoute() {
  const router = useRouter();
  const adapter = useMemo(() => createStaticResourcesAdapter(), []);

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
