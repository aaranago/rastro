import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

import type {
  AlertSubscriptionNativeAdapter,
  AlertSubscriptionNativeBoundary,
  NativeLocationObject,
  NativePermissionResponse,
} from "./alert-subscription-native-adapter";
import { createAlertSubscriptionNativeAdapter } from "./alert-subscription-native-adapter";

function createExpoAlertSubscriptionNativeAdapter(): AlertSubscriptionNativeAdapter {
  return createAlertSubscriptionNativeAdapter({
    appState: AppState,
    clock: {
      now: () => new Date().toISOString(),
    },
    constants: {
      easConfig: {
        projectId: Constants.easConfig?.projectId,
      },
      expoConfig: {
        extra: {
          eas: {
            projectId: readExpoConfigProjectId(),
          },
        },
      },
    },
    location: {
      accuracy: {
        balanced: Location.Accuracy.Balanced,
      },
      getCurrentPositionAsync: async (options) =>
        (await Location.getCurrentPositionAsync(
          options as Location.LocationOptions,
        )) as NativeLocationObject,
      getForegroundPermissionsAsync: async () =>
        toNativePermissionResponse(
          await Location.getForegroundPermissionsAsync(),
        ),
      getLastKnownPositionAsync: async (options) =>
        (await Location.getLastKnownPositionAsync(
          options as Location.LocationLastKnownOptions,
        )) as NativeLocationObject | null,
      requestForegroundPermissionsAsync: async () =>
        toNativePermissionResponse(
          await Location.requestForegroundPermissionsAsync(),
        ),
    },
    notifications: {
      androidImportanceHigh: Notifications.AndroidImportance.HIGH,
      getExpoPushTokenAsync: (options) =>
        Notifications.getExpoPushTokenAsync(options),
      getPermissionsAsync: async () =>
        toNativePermissionResponse(await Notifications.getPermissionsAsync()),
      requestPermissionsAsync: async () =>
        toNativePermissionResponse(
          await Notifications.requestPermissionsAsync(),
        ),
      setNotificationChannelAsync: (channelId, channel) =>
        Notifications.setNotificationChannelAsync(
          channelId,
          channel as Notifications.NotificationChannelInput,
        ),
    },
    platform: {
      os: getNativePlatformOs(),
    },
  } satisfies AlertSubscriptionNativeBoundary);
}

export const expoAlertSubscriptionNativeAdapter =
  createExpoAlertSubscriptionNativeAdapter();

function toNativePermissionResponse(
  response: unknown,
): NativePermissionResponse {
  return response as NativePermissionResponse;
}

function getNativePlatformOs(): "android" | "ios" | "web" {
  if (Platform.OS === "android" || Platform.OS === "ios") {
    return Platform.OS;
  }

  return "web";
}

function readExpoConfigProjectId(): string | undefined {
  const extra: unknown = Constants.expoConfig?.extra;

  if (!isRecord(extra)) {
    return undefined;
  }

  const eas = extra.eas;

  if (!isRecord(eas)) {
    return undefined;
  }

  const projectId = eas.projectId;

  if (typeof projectId === "string") {
    return projectId;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
