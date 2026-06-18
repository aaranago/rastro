import Stack from "expo-router/stack";

import { shellColors } from "~/features/shell/shell-theme";
import { getShellCopy } from "~/i18n";

const copy = getShellCopy();

export default function NearbyStackLayout() {
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
      <Stack.Screen name="index" options={{ title: copy.tabs.nearby }} />
      <Stack.Screen
        name="reportes/perdidos/[reportId]"
        options={{ title: "Reporte perdido" }}
      />
      <Stack.Screen
        name="reportes/avistamientos/[reportId]"
        options={{ title: "Avistamiento" }}
      />
      <Stack.Screen
        name="adopciones/[listingId]"
        options={{ title: "Adopcion" }}
      />
    </Stack>
  );
}
