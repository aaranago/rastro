export type AlertSubscriptionPermissionStatus =
  | "denied"
  | "granted"
  | "undetermined";

export type AlertSubscriptionLocationPrecision =
  | "approximate"
  | "precise"
  | "unknown";

export interface AlertSubscriptionNativePermissionState {
  canAskAgain?: boolean;
  granted: boolean;
  precision: AlertSubscriptionLocationPrecision;
  status: AlertSubscriptionPermissionStatus;
}

export interface AlertSubscriptionNativeNotificationPermissionState {
  canAskAgain?: boolean;
  granted: boolean;
  status: AlertSubscriptionPermissionStatus;
}

export interface AlertSubscriptionNativeCoordinates {
  accuracyMeters?: number;
  capturedAt: string;
  latitude: number;
  longitude: number;
}

export type AlertSubscriptionNativeLocationSnapshot =
  | {
      coordinates: AlertSubscriptionNativeCoordinates;
      kind: "available";
      permission: AlertSubscriptionNativePermissionState;
      source: "current" | "last-detected";
    }
  | {
      kind: "permission-required";
      permission: AlertSubscriptionNativePermissionState;
    }
  | {
      kind: "permission-denied";
      permission: AlertSubscriptionNativePermissionState;
    }
  | {
      kind: "unavailable";
      permission: AlertSubscriptionNativePermissionState;
      reason: "location-unavailable";
    };

export interface ForegroundLocationSnapshotOptions {
  lastKnownMaxAgeMs?: number;
  requestPermission?: boolean;
}

export interface RegisterForPushNotificationsOptions {
  androidChannelId?: string;
  projectId?: string;
  requestPermission?: boolean;
}

export type AlertSubscriptionRefreshReason = "app-open" | "foreground";

export interface AlertSubscriptionRefreshTrigger {
  reason: AlertSubscriptionRefreshReason;
  triggeredAt: string;
}

export interface SubscribeToRefreshTriggersOptions {
  emitAppOpen?: boolean;
}

export type AlertSubscriptionPushRegistrationResult =
  | {
      kind: "registered";
      permission: AlertSubscriptionNativeNotificationPermissionState;
      platform: "android" | "ios" | "web";
      projectId: string;
      token: string;
    }
  | {
      kind: "permission-required";
      permission: AlertSubscriptionNativeNotificationPermissionState;
    }
  | {
      kind: "permission-denied";
      permission: AlertSubscriptionNativeNotificationPermissionState;
    }
  | {
      kind: "missing-project-id";
      permission: AlertSubscriptionNativeNotificationPermissionState;
    };

export interface AlertSubscriptionNativeAdapter {
  getForegroundLocationSnapshot: (
    options?: ForegroundLocationSnapshotOptions,
  ) => Promise<AlertSubscriptionNativeLocationSnapshot>;
  registerForPushNotifications: (
    options?: RegisterForPushNotificationsOptions,
  ) => Promise<AlertSubscriptionPushRegistrationResult>;
  subscribeToRefreshTriggers: (
    listener: (trigger: AlertSubscriptionRefreshTrigger) => void,
    options?: SubscribeToRefreshTriggersOptions,
  ) => () => void;
}

export interface AlertSubscriptionNativeBoundary {
  appState: {
    addEventListener: (
      eventName: "change",
      listener: (state: NativeAppStateStatus) => void,
    ) => NativeAppStateSubscription;
    currentState: NativeAppStateStatus;
  };
  clock?: {
    now: () => string;
  };
  constants?: {
    easConfig?: {
      projectId?: string;
    };
    expoConfig?: {
      extra?: {
        eas?: {
          projectId?: string;
        };
      };
    };
  };
  location: {
    accuracy?: {
      balanced?: unknown;
    };
    getForegroundPermissionsAsync: () => Promise<NativePermissionResponse>;
    getCurrentPositionAsync: (
      options?: NativeLocationOptions,
    ) => Promise<NativeLocationObject>;
    getLastKnownPositionAsync: (
      options?: NativeLastKnownLocationOptions,
    ) => Promise<NativeLocationObject | null>;
    requestForegroundPermissionsAsync: () => Promise<NativePermissionResponse>;
  };
  notifications: {
    androidImportanceHigh?: unknown;
    getExpoPushTokenAsync: (
      options: NativeExpoPushTokenOptions,
    ) => Promise<NativeExpoPushTokenResponse>;
    getPermissionsAsync: () => Promise<NativePermissionResponse>;
    requestPermissionsAsync: () => Promise<NativePermissionResponse>;
    setNotificationChannelAsync?: (
      channelId: string,
      channel: NativeNotificationChannel,
    ) => Promise<unknown>;
  };
  platform: {
    os: "android" | "ios" | "web";
  };
}

export interface NativePermissionResponse {
  android?: {
    accuracy?: "coarse" | "fine" | "none";
  };
  canAskAgain?: boolean;
  granted: boolean;
  ios?: {
    accuracy?: "full" | "reduced";
  };
  status: AlertSubscriptionPermissionStatus;
}

export interface NativeLocationOptions {
  accuracy?: unknown;
}

export interface NativeLastKnownLocationOptions {
  maxAge?: number;
}

export interface NativeExpoPushTokenOptions {
  projectId: string;
}

export interface NativeExpoPushTokenResponse {
  data: string;
}

export interface NativeNotificationChannel {
  importance?: unknown;
  name: string;
  sound?: string;
}

export type NativeAppStateStatus =
  | "active"
  | "background"
  | "extension"
  | "inactive"
  | "unknown";

export interface NativeAppStateSubscription {
  remove: () => void;
}

export interface NativeLocationObject {
  coords: {
    accuracy?: number | null;
    latitude: number;
    longitude: number;
  };
  timestamp: number;
}

export function createAlertSubscriptionNativeAdapter(
  native: AlertSubscriptionNativeBoundary,
): AlertSubscriptionNativeAdapter {
  return {
    async getForegroundLocationSnapshot(options = {}) {
      const permission = await resolveForegroundLocationPermission(
        native,
        options,
      );

      if (!permission.granted) {
        return permission.status === "denied"
          ? { kind: "permission-denied", permission }
          : { kind: "permission-required", permission };
      }

      const currentLocation = await getCurrentOrLastDetectedLocation(
        native,
        options,
      );

      if (!currentLocation) {
        return {
          kind: "unavailable",
          permission,
          reason: "location-unavailable",
        };
      }

      return {
        coordinates: toAlertSubscriptionCoordinates(currentLocation.location),
        kind: "available",
        permission,
        source: currentLocation.source,
      };
    },
    async registerForPushNotifications(options = {}) {
      const permission = await resolveNotificationPermission(native, options);

      if (!permission.granted) {
        return permission.status === "denied"
          ? { kind: "permission-denied", permission }
          : { kind: "permission-required", permission };
      }

      const projectId = resolveExpoProjectId(native, options);

      if (!projectId) {
        return {
          kind: "missing-project-id",
          permission,
        };
      }

      await ensureAndroidNotificationChannel(native, options);

      const token = await native.notifications.getExpoPushTokenAsync({
        projectId,
      });

      return {
        kind: "registered",
        permission,
        platform: native.platform.os,
        projectId,
        token: token.data,
      };
    },
    subscribeToRefreshTriggers(listener, options = {}) {
      let previousState = native.appState.currentState;

      if (options.emitAppOpen !== false && previousState === "active") {
        listener({
          reason: "app-open",
          triggeredAt: getCurrentTimestamp(native),
        });
      }

      const subscription = native.appState.addEventListener(
        "change",
        (nextState) => {
          const wasActive = previousState === "active";
          previousState = nextState;

          if (nextState === "active" && !wasActive) {
            listener({
              reason: "foreground",
              triggeredAt: getCurrentTimestamp(native),
            });
          }
        },
      );

      return () => {
        subscription.remove();
      };
    },
  };
}

function getCurrentTimestamp(native: AlertSubscriptionNativeBoundary) {
  return native.clock?.now() ?? new Date().toISOString();
}

async function resolveForegroundLocationPermission(
  native: AlertSubscriptionNativeBoundary,
  options: ForegroundLocationSnapshotOptions,
): Promise<AlertSubscriptionNativePermissionState> {
  const existingPermission =
    await native.location.getForegroundPermissionsAsync();

  if (
    existingPermission.granted ||
    options.requestPermission !== true ||
    existingPermission.canAskAgain === false
  ) {
    return toPermissionState(existingPermission);
  }

  return toPermissionState(
    await native.location.requestForegroundPermissionsAsync(),
  );
}

function toPermissionState(
  response: NativePermissionResponse,
): AlertSubscriptionNativePermissionState {
  return {
    canAskAgain: response.canAskAgain,
    granted: response.granted,
    precision: getLocationPrecision(response),
    status: response.status,
  };
}

async function resolveNotificationPermission(
  native: AlertSubscriptionNativeBoundary,
  options: RegisterForPushNotificationsOptions,
): Promise<AlertSubscriptionNativeNotificationPermissionState> {
  const existingPermission = await native.notifications.getPermissionsAsync();

  if (
    existingPermission.granted ||
    options.requestPermission === false ||
    existingPermission.canAskAgain === false
  ) {
    return toNotificationPermissionState(existingPermission);
  }

  return toNotificationPermissionState(
    await native.notifications.requestPermissionsAsync(),
  );
}

function toNotificationPermissionState(
  response: NativePermissionResponse,
): AlertSubscriptionNativeNotificationPermissionState {
  return {
    canAskAgain: response.canAskAgain,
    granted: response.granted,
    status: response.status,
  };
}

function resolveExpoProjectId(
  native: AlertSubscriptionNativeBoundary,
  options: RegisterForPushNotificationsOptions,
): string | undefined {
  return (
    options.projectId ??
    native.constants?.easConfig?.projectId ??
    native.constants?.expoConfig?.extra?.eas?.projectId
  );
}

async function ensureAndroidNotificationChannel(
  native: AlertSubscriptionNativeBoundary,
  options: RegisterForPushNotificationsOptions,
) {
  if (
    native.platform.os !== "android" ||
    !native.notifications.setNotificationChannelAsync
  ) {
    return;
  }

  await native.notifications.setNotificationChannelAsync(
    options.androidChannelId ?? "lost-pet-alerts",
    {
      importance: native.notifications.androidImportanceHigh,
      name: "Alertas de mascotas perdidas",
      sound: "default",
    },
  );
}

function getLocationPrecision(
  response: NativePermissionResponse,
): AlertSubscriptionLocationPrecision {
  if (response.ios?.accuracy === "reduced") {
    return "approximate";
  }

  if (response.android?.accuracy === "coarse") {
    return "approximate";
  }

  if (
    response.ios?.accuracy === "full" ||
    response.android?.accuracy === "fine"
  ) {
    return "precise";
  }

  return "unknown";
}

async function getCurrentOrLastDetectedLocation(
  native: AlertSubscriptionNativeBoundary,
  options: ForegroundLocationSnapshotOptions,
): Promise<{
  location: NativeLocationObject;
  source: "current" | "last-detected";
} | null> {
  try {
    return {
      location: await native.location.getCurrentPositionAsync({
        accuracy: native.location.accuracy?.balanced,
      }),
      source: "current",
    };
  } catch {
    const lastDetectedLocation =
      await native.location.getLastKnownPositionAsync({
        maxAge: options.lastKnownMaxAgeMs ?? 30 * 60 * 1000,
      });

    return lastDetectedLocation
      ? { location: lastDetectedLocation, source: "last-detected" }
      : null;
  }
}

function toAlertSubscriptionCoordinates(
  location: NativeLocationObject,
): AlertSubscriptionNativeCoordinates {
  return {
    accuracyMeters: location.coords.accuracy ?? undefined,
    capturedAt: new Date(location.timestamp).toISOString(),
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}
