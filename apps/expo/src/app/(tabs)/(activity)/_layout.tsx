import Stack from "expo-router/stack";

import { shellColors } from "~/features/shell/shell-theme";
import { getShellCopy } from "~/i18n";

const copy = getShellCopy();

export default function ActivityStackLayout() {
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
        options={{ headerShown: false, title: copy.tabs.activity }}
      />
      <Stack.Screen
        name="chats/report/[reportId]"
        options={{ title: "Chat" }}
      />
      <Stack.Screen name="chats/[conversationId]" options={{ title: "Chat" }} />
    </Stack>
  );
}
