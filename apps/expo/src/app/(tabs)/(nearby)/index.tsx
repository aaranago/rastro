import type { Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import type { NearbyLostReportsQuery } from "~/features/nearby";
import type { ResourceProviderSummary } from "~/features/resources";
import {
  createApiNearbyLostReportsAdapter,
  createCachedNearbyLostReportsAdapter,
  NearbyScreen as NearbyFeatureScreen,
} from "~/features/nearby";
import { createInMemoryLastLoadedCache } from "~/features/resilience/last-loaded-cache";
import { buildResourceProviderProfileHref } from "~/features/resources";
import { createApiResourcesAdapter } from "~/features/resources/resources-api-adapter";
import { NearbyShellStateBridge } from "~/features/shell/shell-screens";
import { shellColors } from "~/features/shell/shell-theme";
import { trpcClient } from "~/utils/api";

const nearbyReportsAdapter = createCachedNearbyLostReportsAdapter({
  cache: createInMemoryLastLoadedCache(),
  cacheKey: buildNearbyReportsCacheKey,
  source: createApiNearbyLostReportsAdapter({ client: trpcClient }),
});

export default function NearbyRoute() {
  const router = useRouter();
  const resourcesAdapter = useMemo(
    () => createApiResourcesAdapter({ client: trpcClient }),
    [],
  );
  const [launchSponsorProviders, setLaunchSponsorProviders] = useState<
    readonly ResourceProviderSummary[]
  >([]);

  useEffect(() => {
    if (!resourcesAdapter.getActiveSponsorPlacements) {
      return;
    }

    let isActive = true;

    resourcesAdapter
      .getActiveSponsorPlacements({
        limit: 3,
        surface: "launch_home_banner",
      })
      .then((result) => {
        if (isActive) {
          setLaunchSponsorProviders(result.providers);
        }
      })
      .catch(() => {
        if (isActive) {
          setLaunchSponsorProviders([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [resourcesAdapter]);

  return (
    <View style={styles.route}>
      <NearbyShellStateBridge />
      <View style={styles.feature}>
        <NearbyFeatureScreen
          adapter={nearbyReportsAdapter}
          launchSponsorProviders={launchSponsorProviders}
          onOpenSponsorProvider={(providerId) => {
            router.push(buildResourceProviderProfileHref(providerId));
          }}
          onOpenReport={(target) => {
            router.push(target.href as Href);
          }}
          onEnableAlerts={() => {
            router.push("/(tabs)/(profile)/alertas" as Href);
          }}
          onReport={(target) => {
            router.push(`${target.href}?reportar=1` as Href);
          }}
          onRecordSponsorDelivery={(input) => {
            void resourcesAdapter
              .recordSponsorDelivery?.(input)
              .catch(() => undefined);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  feature: {
    flex: 1,
  },
  route: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
});

function buildNearbyReportsCacheKey(query: NearbyLostReportsQuery) {
  const coordinate = query.location.coordinates
    ? `${query.location.coordinates.latitude.toFixed(5)},${query.location.coordinates.longitude.toFixed(5)}`
    : "no-coordinate";

  return [
    "nearby-api-reports",
    query.radiusKm,
    query.categories?.join(",") ?? "all-categories",
    query.limit ?? "no-limit",
    query.cursor ?? "no-cursor",
    query.location.source,
    query.location.label,
    query.location.locationCellLabel,
    coordinate,
  ].join(":");
}
