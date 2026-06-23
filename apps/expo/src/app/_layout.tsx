import Stack from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";

import { RastroShellProvider } from "~/features/shell/shell-provider";
import { shellColors } from "~/features/shell/shell-theme";
import { queryClient } from "~/utils/api";

import "../styles.css";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RastroShellProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: shellColors.background,
            },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/callback" />
          <Stack.Screen
            name="report-create"
            options={{
              contentStyle: {
                backgroundColor: shellColors.background,
              },
              gestureEnabled: true,
              headerShown: false,
              presentation: "card",
            }}
          />
        </Stack>
        <StatusBar style="dark" />
      </RastroShellProvider>
    </QueryClientProvider>
  );
}
