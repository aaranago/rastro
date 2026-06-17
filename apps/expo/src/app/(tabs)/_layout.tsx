import { StyleSheet, View } from "react-native";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

import { ShellFabHost } from "~/features/shell/shell-overlays";
import {
  RastroShellProvider,
  useRastroShell,
} from "~/features/shell/shell-provider";
import { shellColors } from "~/features/shell/shell-theme";

export const unstable_settings = {
  anchor: "(nearby)",
};

export default function TabLayout() {
  return (
    <RastroShellProvider>
      <RastroTabs />
    </RastroShellProvider>
  );
}

function RastroTabs() {
  const { model } = useRastroShell();

  return (
    <View style={styles.container}>
      <NativeTabs
        backgroundColor={shellColors.surface}
        iconColor={{
          default: shellColors.muted,
          selected: shellColors.primary,
        }}
        labelStyle={{
          default: {
            color: shellColors.muted,
            fontSize: 12,
            fontWeight: "600",
          },
          selected: {
            color: shellColors.primary,
            fontSize: 12,
            fontWeight: "800",
          },
        }}
        minimizeBehavior="onScrollDown"
        tintColor={shellColors.primary}
      >
        {model.tabs.map((tab) => (
          <NativeTabs.Trigger key={tab.key} name={tab.routeName}>
            <Icon
              drawable={tab.icon.drawable}
              sf={
                {
                  default: tab.icon.sf,
                  selected: tab.icon.selectedSf,
                } as never
              }
            />
            <Label>{tab.label}</Label>
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
      <ShellFabHost />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
});
