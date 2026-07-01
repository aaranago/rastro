import Stack from "expo-router/stack";

import { shellColors } from "~/features/shell/shell-theme";
import { getShellCopy } from "~/i18n";

const copy = getShellCopy();

export default function ProfileStackLayout() {
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
        options={{ headerShown: false, title: copy.tabs.profile }}
      />
      <Stack.Screen name="mis-mascotas" options={{ title: "" }} />
      <Stack.Screen name="mis-reportes" options={{ title: "Mis reportes" }} />
      <Stack.Screen
        name="mis-conversaciones"
        options={{ title: "Mis conversaciones" }}
      />
      <Stack.Screen name="alertas" options={{ title: "Alertas" }} />
      <Stack.Screen name="ajustes" options={{ title: "Ajustes" }} />
    </Stack>
  );
}
