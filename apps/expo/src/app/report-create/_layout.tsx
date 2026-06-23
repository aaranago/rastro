import Stack from "expo-router/stack";

import { shellColors } from "~/features/shell/shell-theme";

export default function ReportCreateLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: shellColors.background,
        },
        gestureEnabled: true,
        headerShown: false,
        presentation: "card",
      }}
    >
      <Stack.Screen name="lost" />
      <Stack.Screen name="found" />
      <Stack.Screen name="sighting" />
      <Stack.Screen name="adoption" />
    </Stack>
  );
}
