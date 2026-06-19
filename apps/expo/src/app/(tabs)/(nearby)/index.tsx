import type { Href } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";

import { NearbyScreen as NearbyFeatureScreen } from "~/features/nearby";
import { NearbyShellStateBridge } from "~/features/shell/shell-screens";
import { shellColors } from "~/features/shell/shell-theme";

export default function NearbyRoute() {
  const router = useRouter();

  return (
    <View style={styles.route}>
      <NearbyShellStateBridge />
      <View style={styles.feature}>
        <NearbyFeatureScreen
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
