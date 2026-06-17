import { StyleSheet, View } from "react-native";

import { NearbyScreen as NearbyFeatureScreen } from "~/features/nearby";
import { NearbyShellStateBridge } from "~/features/shell/shell-screens";
import { shellColors } from "~/features/shell/shell-theme";

export default function NearbyRoute() {
  return (
    <View style={styles.route}>
      <NearbyShellStateBridge />
      <View style={styles.feature}>
        <NearbyFeatureScreen />
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
