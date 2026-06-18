import { describe, expect, it, vi } from "vitest";

import { createAlertSubscriptionNativeAdapter } from "./alert-subscription-native-adapter";

describe("Alert Subscription native adapter", () => {
  it("does not prompt for foreground location when taking a passive snapshot", async () => {
    const native = createNativeBoundary({
      foregroundLocationPermission: {
        canAskAgain: true,
        granted: false,
        status: "undetermined",
      },
    });
    const adapter = createAlertSubscriptionNativeAdapter(native);

    const snapshot = await adapter.getForegroundLocationSnapshot();

    expect(snapshot).toMatchObject({
      kind: "permission-required",
      permission: {
        canAskAgain: true,
        granted: false,
        status: "undetermined",
      },
    });
    expect(
      native.location.requestForegroundPermissionsAsync,
    ).not.toHaveBeenCalled();
    expect(native.location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it("falls back to the last detected location when current foreground location is unavailable", async () => {
    const native = createNativeBoundary();
    native.location.getCurrentPositionAsync.mockRejectedValueOnce(
      new Error("GPS timeout"),
    );
    native.location.getLastKnownPositionAsync.mockResolvedValueOnce({
      coords: {
        accuracy: 80,
        latitude: -16.5103,
        longitude: -68.1299,
      },
      timestamp: Date.parse("2026-06-18T11:58:00.000Z"),
    });
    const adapter = createAlertSubscriptionNativeAdapter(native);

    const snapshot = await adapter.getForegroundLocationSnapshot();

    expect(snapshot).toMatchObject({
      coordinates: {
        accuracyMeters: 80,
        capturedAt: "2026-06-18T11:58:00.000Z",
        latitude: -16.5103,
        longitude: -68.1299,
      },
      kind: "available",
      source: "last-detected",
    });
    expect(native.location.getLastKnownPositionAsync).toHaveBeenCalled();
  });

  it("registers an Expo push token after notification permission is granted", async () => {
    const native = createNativeBoundary({
      notificationPermission: {
        canAskAgain: true,
        granted: false,
        status: "undetermined",
      },
      platformOs: "android",
      projectId: "eas-project-id",
      requestedNotificationPermission: {
        canAskAgain: true,
        granted: true,
        status: "granted",
      },
    });
    native.notifications.getExpoPushTokenAsync.mockResolvedValueOnce({
      data: "ExponentPushToken[abc123]",
    });
    const adapter = createAlertSubscriptionNativeAdapter(native);

    const registration = await adapter.registerForPushNotifications();

    expect(registration).toMatchObject({
      kind: "registered",
      permission: {
        granted: true,
        status: "granted",
      },
      projectId: "eas-project-id",
      token: "ExponentPushToken[abc123]",
    });
    expect(native.notifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(
      native.notifications.setNotificationChannelAsync,
    ).toHaveBeenCalledWith(
      "lost-pet-alerts",
      expect.objectContaining({
        name: "Alertas de mascotas perdidas",
      }),
    );
    expect(native.notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: "eas-project-id",
    });
  });

  it("emits app-open and foreground refresh triggers without starting a location watcher", () => {
    const native = createNativeBoundary();
    const adapter = createAlertSubscriptionNativeAdapter(native);
    const triggers: unknown[] = [];

    const unsubscribe = adapter.subscribeToRefreshTriggers((trigger) => {
      triggers.push(trigger);
    });

    native.emitAppStateChange("inactive");
    native.emitAppStateChange("active");
    native.emitAppStateChange("active");
    native.emitAppStateChange("background");
    native.emitAppStateChange("active");
    unsubscribe();

    expect(triggers).toEqual([
      {
        reason: "app-open",
        triggeredAt: "2026-06-18T12:00:00.000Z",
      },
      {
        reason: "foreground",
        triggeredAt: "2026-06-18T12:00:00.000Z",
      },
      {
        reason: "foreground",
        triggeredAt: "2026-06-18T12:00:00.000Z",
      },
    ]);
    expect(native.location.watchPositionAsync).not.toHaveBeenCalled();
    expect(native.removeAppStateListener).toHaveBeenCalled();
  });
});

function createNativeBoundary({
  foregroundLocationPermission = {
    canAskAgain: true,
    granted: true,
    status: "granted",
  },
  notificationPermission = {
    canAskAgain: true,
    granted: true,
    status: "granted",
  },
  platformOs = "ios",
  projectId,
  requestedNotificationPermission = notificationPermission,
}: {
  foregroundLocationPermission?: {
    canAskAgain?: boolean;
    granted: boolean;
    status: "denied" | "granted" | "undetermined";
  };
  notificationPermission?: {
    canAskAgain?: boolean;
    granted: boolean;
    status: "denied" | "granted" | "undetermined";
  };
  platformOs?: "android" | "ios" | "web";
  projectId?: string;
  requestedNotificationPermission?: {
    canAskAgain?: boolean;
    granted: boolean;
    status: "denied" | "granted" | "undetermined";
  };
} = {}) {
  const appStateListeners: ((
    state: "active" | "background" | "inactive",
  ) => void)[] = [];
  const removeAppStateListener = vi.fn();

  return {
    emitAppStateChange(state: "active" | "background" | "inactive") {
      for (const listener of appStateListeners) {
        listener(state);
      }
    },
    removeAppStateListener,
    appState: {
      addEventListener: vi.fn(
        (
          _eventName: "change",
          listener: (state: "active" | "background" | "inactive") => void,
        ) => {
          appStateListeners.push(listener);

          return { remove: removeAppStateListener };
        },
      ),
      currentState: "active" as const,
    },
    clock: {
      now: () => "2026-06-18T12:00:00.000Z",
    },
    constants: {
      easConfig: projectId ? { projectId } : undefined,
    },
    location: {
      accuracy: {
        balanced: "balanced",
      },
      getCurrentPositionAsync: vi.fn(),
      getForegroundPermissionsAsync: vi.fn(() =>
        Promise.resolve(foregroundLocationPermission),
      ),
      getLastKnownPositionAsync: vi.fn(),
      watchPositionAsync: vi.fn(),
      requestForegroundPermissionsAsync: vi.fn(),
    },
    notifications: {
      getExpoPushTokenAsync: vi.fn(),
      getPermissionsAsync: vi.fn(() => Promise.resolve(notificationPermission)),
      requestPermissionsAsync: vi.fn(() =>
        Promise.resolve(requestedNotificationPermission),
      ),
      setNotificationChannelAsync: vi.fn(),
    },
    platform: {
      os: platformOs,
    },
  };
}
