import Stack from "expo-router/stack";

import { shellColors } from "~/features/shell/shell-theme";
import { getShellCopy } from "~/i18n";

const copy = getShellCopy();

export default function ResourcesStackLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: shellColors.background },
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: shellColors.background },
        headerTintColor: shellColors.primary,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerShown: false, title: copy.tabs.resources }}
      />
      <Stack.Screen
        name="proveedores/[providerId]"
        options={{ title: "Proveedor local" }}
      />
    </Stack>
  );
}
