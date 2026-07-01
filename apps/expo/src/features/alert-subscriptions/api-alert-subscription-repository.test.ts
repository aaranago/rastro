import { describe, expect, it, vi } from "vitest";

import type {
  AlertSubscriptionLocationSnapshot,
  AlertSubscriptionsMemberSession,
} from "./alert-subscriptions";
import type { ApiAlertSubscription } from "./api-alert-subscription-repository";
import { createApiAlertSubscriptionRepository } from "./api-alert-subscription-repository";

const member: AlertSubscriptionsMemberSession = {
  displayName: "Camila",
  kind: "member",
  memberId: "member-camila",
};

const currentLocation: AlertSubscriptionLocationSnapshot = {
  coordinates: {
    latitude: -16.5103,
    longitude: -68.1299,
  },
  countryCode: "BO",
  detectedAt: "2026-06-30T13:00:00.000Z",
  label: "Ubicacion actual en Sopocachi",
  locationCellLabel: "Sopocachi",
  source: "current",
};

describe("API alert subscription repository", () => {
  it("maps API output into the local AlertSubscription model", async () => {
    const client = createApiAlertSubscriptionClient({
      get: createApiSubscription(),
    });
    const repository = createApiAlertSubscriptionRepository({ client });

    await expect(
      repository.getAlertSubscription(member),
    ).resolves.toMatchObject({
      createdAt: "2026-06-30T13:00:00.000Z",
      dynamicAlertArea: {
        location: {
          countryCode: "BO",
          detectedAt: "2026-06-30T13:02:00.000Z",
          label: "Ubicacion actual en Sopocachi",
        },
        reason: "manual-refresh",
        resolvedAt: "2026-06-30T13:02:00.000Z",
      },
      enabled: true,
      locationUpdatePolicy: {
        alwaysOnSocket: false,
        continuousPolling: false,
        locationWatcher: false,
      },
      memberId: "member-camila",
      movingAlerts: {
        backgroundTracking: "not-started",
        enabled: false,
        label: "Alertas mientras me muevo",
      },
      radiusKm: 10,
      updatedAt: "2026-06-30T13:03:00.000Z",
    });
    expect(client.alerts.get.query).toHaveBeenCalledWith({});
  });

  it("maps repository methods to alerts router calls without forwarding spoofable memberId", async () => {
    const client = createApiAlertSubscriptionClient();
    const repository = createApiAlertSubscriptionRepository({ client });
    const spoofableSession = {
      ...member,
      memberId: "member-spoofed",
    };

    await repository.enableAlertSubscription(spoofableSession, {
      currentLocation,
      radiusKm: 10,
      reason: "manual-refresh",
    });
    await repository.recordAlertAreaLocation(spoofableSession, {
      currentLocation,
      reason: "foreground",
    });
    await repository.pauseAlertSubscription(spoofableSession);
    await repository.unsubscribeAlertSubscription(spoofableSession);
    await repository.registerPushToken(spoofableSession, {
      permissionStatus: "granted",
      platform: "android",
      projectId: "eas-project-id",
      token: "ExponentPushToken[abc123]",
    });

    expect(client.alerts.upsertSettings.mutate).toHaveBeenCalledWith({
      categories: ["lost_pet"],
      radiusMeters: 10000,
    });
    expect(client.alerts.recordLocation.mutate).toHaveBeenCalledWith({
      label: "Ubicacion actual en Sopocachi",
      latitude: -16.5103,
      locationCell: "Sopocachi",
      longitude: -68.1299,
    });
    expect(client.alerts.pause.mutate).toHaveBeenCalledWith({
      pausedUntil: "9999-12-31T23:59:59.999Z",
    });
    expect(client.alerts.unsubscribe.mutate).toHaveBeenCalledWith({});
    expect(client.alerts.registerPushToken.mutate).toHaveBeenCalledWith({
      deviceId: "eas-project-id",
      platform: "android",
      token: "ExponentPushToken[abc123]",
    });

    expect(
      JSON.stringify(client.alerts.upsertSettings.mutate.mock.calls),
    ).not.toContain("member-spoofed");
    expect(
      JSON.stringify(client.alerts.recordLocation.mutate.mock.calls),
    ).not.toContain("member-spoofed");
    expect(
      JSON.stringify(client.alerts.registerPushToken.mutate.mock.calls),
    ).not.toContain("member-spoofed");
  });

  it("keeps disableAlertSubscription as a pause compatibility alias", async () => {
    const client = createApiAlertSubscriptionClient();
    const repository = createApiAlertSubscriptionRepository({ client });

    await repository.disableAlertSubscription(member);

    expect(client.alerts.pause.mutate).toHaveBeenCalledWith({
      pausedUntil: "9999-12-31T23:59:59.999Z",
    });
  });
});

function createApiAlertSubscriptionClient(
  overrides: Partial<{
    get: ApiAlertSubscription | null;
    pause: ApiAlertSubscription;
    recordLocation: ApiAlertSubscription;
    unsubscribe: ApiAlertSubscription | null;
    upsertSettings: ApiAlertSubscription;
  }> = {},
) {
  const fallbackSubscription = createApiSubscription();

  return {
    alerts: {
      get: {
        query: vi.fn(() =>
          Promise.resolve(
            overrides.get === undefined
              ? { pushTokens: [], subscription: fallbackSubscription }
              : { pushTokens: [], subscription: overrides.get },
          ),
        ),
      },
      pause: {
        mutate: vi.fn(() =>
          Promise.resolve(overrides.pause ?? fallbackSubscription),
        ),
      },
      recordLocation: {
        mutate: vi.fn(() =>
          Promise.resolve(overrides.recordLocation ?? fallbackSubscription),
        ),
      },
      registerPushToken: {
        mutate: vi.fn(() => Promise.resolve({ status: "registered" as const })),
      },
      unsubscribe: {
        mutate: vi.fn(() =>
          Promise.resolve(
            overrides.unsubscribe === undefined ? null : overrides.unsubscribe,
          ),
        ),
      },
      upsertSettings: {
        mutate: vi.fn(() =>
          Promise.resolve(overrides.upsertSettings ?? fallbackSubscription),
        ),
      },
    },
  };
}

function createApiSubscription(): ApiAlertSubscription {
  return {
    createdAt: new Date("2026-06-30T13:00:00.000Z"),
    categories: ["lost_pet"],
    id: "alert-subscription-1",
    location: {
      label: "Ubicacion actual en Sopocachi",
      latitude: -16.5103,
      locationCell: "Sopocachi",
      longitude: -68.1299,
      recordedAt: new Date("2026-06-30T13:02:00.000Z"),
    },
    pausedUntil: null,
    radiusMeters: 10000,
    status: "active",
    unsubscribedAt: null,
    updatedAt: new Date("2026-06-30T13:03:00.000Z"),
  };
}
