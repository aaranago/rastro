import type { Href } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import type { NearbyLostReportsQuery } from "~/features/nearby";
import {
  createApiNearbyLostReportsAdapter,
  createCachedNearbyLostReportsAdapter,
  NearbyScreen as NearbyFeatureScreen,
} from "~/features/nearby";
import { createInMemoryLastLoadedCache } from "~/features/resilience/last-loaded-cache";
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

  return (
    <View style={styles.route}>
      <NearbyShellStateBridge />
      <View style={styles.feature}>
        <NearbyFeatureScreen
          adapter={nearbyReportsAdapter}
          onOpenReport={(target) => {
            router.push(target.href as Href);
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
