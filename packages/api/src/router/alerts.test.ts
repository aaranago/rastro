import { describe, expect, it } from "vitest";

import type {
  AlertRepository,
  PersistedAlertPushToken,
  PersistedAlertState,
  PersistedAlertSubscription,
} from "../alert-repository";
import { AlertRepositoryError } from "../alert-repository";
import { appRouter } from "../root";

const subscriptionId = "11111111-1111-4111-8111-111111111111";
const pushTokenId = "22222222-2222-4222-8222-222222222222";
const now = "2026-07-01T12:00:00.000Z";

function createCaller(context: unknown) {
  return appRouter.createCaller(context as never);
}

describe("alerts router", () => {
  it("rejects unauthenticated alert access before repository work", async () => {
    let read = false;
    const caller = createCaller({
      alertRepository: {
        get: () => {
          read = true;
          return Promise.reject(new Error("Should not read without auth."));
        },
      },
      authApi: {},
      db: {},
      session: null,
    });

    await expect(caller.alerts.get({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(read).toBe(false);
  });

  it("uses the session member for settings, location, moving alerts, and token registration", async () => {
    const repository = createFakeAlertRepository();
    const caller = createCaller({
      alertRepository: repository,
      authApi: {},
      db: {},
      session: {
        user: {
          id: "member-camila",
        },
      },
    });

    await caller.alerts.upsertSettings({
      categories: ["lost_pet"],
      radiusMeters: 3500,
    });
    await caller.alerts.recordLocation({
      latitude: -16.510231,
      longitude: -68.123881,
      label: "Sopocachi, La Paz",
      locationCell: "bo-lpb-sopocachi",
    });
    await caller.alerts.updateMovingAlerts({
      enabled: true,
      permissionState: "not-requested",
    });
    await caller.alerts.registerPushToken({
      platform: "ios",
      token: "ExponentPushToken[abc_123-XYZ]",
    });

    expect(repository.inputs).toEqual([
      {
        kind: "upsertSettings",
        memberId: "member-camila",
        radiusMeters: 3500,
      },
      {
        kind: "recordLocation",
        memberId: "member-camila",
      },
      {
        enabled: true,
        kind: "updateMovingAlerts",
        memberId: "member-camila",
        permissionState: "not-requested",
      },
      {
        kind: "registerPushToken",
        memberId: "member-camila",
        token: "ExponentPushToken[abc_123-XYZ]",
      },
    ]);
  });

  it("rejects client-supplied member ids before repository work", async () => {
    const repository = createFakeAlertRepository();
    const caller = createCaller({
      alertRepository: repository,
      authApi: {},
      db: {},
      session: {
        user: {
          id: "member-camila",
        },
      },
    });

    await expect(
      caller.alerts.upsertSettings({
        memberId: "member-attacker",
        radiusMeters: 3500,
      } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.alerts.recordLocation({
        latitude: -16.510231,
        longitude: -68.123881,
        memberId: "member-attacker",
      } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.alerts.registerPushToken({
        memberId: "member-attacker",
        token: "ExponentPushToken[abc_123-XYZ]",
      } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.alerts.updateMovingAlerts({
        enabled: true,
        memberId: "member-attacker",
        permissionState: "not-requested",
      } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(repository.inputs).toEqual([]);
  });

  it("maps repository errors to tRPC codes with Spanish messages", async () => {
    const caller = createCaller({
      alertRepository: createFakeAlertRepository({ missingSubscription: true }),
      authApi: {},
      db: {},
      session: {
        user: {
          id: "member-camila",
        },
      },
    });

    await expect(
      caller.alerts.pause({ pausedUntil: "2026-07-02T12:00:00.000Z" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "No encontramos una suscripcion de alertas para este miembro.",
    });
  });
});

type FakeAlertRepository = AlertRepository & {
  inputs: (
    | { kind: "recordLocation"; memberId: string }
    | { kind: "registerPushToken"; memberId: string; token: string }
    | {
        enabled: boolean;
        kind: "updateMovingAlerts";
        memberId: string;
        permissionState: PersistedAlertSubscription["movingAlerts"]["permissionState"];
      }
    | { kind: "upsertSettings"; memberId: string; radiusMeters: number }
  )[];
};

function createFakeAlertRepository(
  options: { missingSubscription?: boolean } = {},
): FakeAlertRepository {
  const inputs: FakeAlertRepository["inputs"] = [];
  const subscription = createSubscription();
  const token = createPushToken();

  return {
    inputs,
    createLostPetReportCreatedDeliveries: () => Promise.resolve([]),
    disablePushToken: () => Promise.resolve(null),
    get: () =>
      Promise.resolve({
        pushTokens: [token],
        subscription,
      } satisfies PersistedAlertState),
    listMemberDeliveryHistory: () => Promise.resolve([]),
    listPendingDeliveries: () => Promise.resolve([]),
    markDeliveryFailed: () => Promise.resolve(null),
    markDeliverySent: () => Promise.resolve(null),
    markDeliverySkipped: () => Promise.resolve(null),
    pause: () => {
      if (options.missingSubscription) {
        throw new AlertRepositoryError(
          "alert_subscription_not_found",
          "No encontramos una suscripcion de alertas para este miembro.",
        );
      }

      return Promise.resolve({
        ...subscription,
        pausedUntil: "2026-07-02T12:00:00.000Z",
        status: "paused",
      });
    },
    recordLocation: ({ memberId }) => {
      inputs.push({ kind: "recordLocation", memberId });

      return Promise.resolve(subscription);
    },
    registerPushToken: ({ memberId, token: inputToken }) => {
      inputs.push({
        kind: "registerPushToken",
        memberId,
        token: inputToken,
      });

      return Promise.resolve(token);
    },
    unsubscribe: () =>
      Promise.resolve({
        ...subscription,
        status: "unsubscribed",
        unsubscribedAt: now,
      }),
    updateMovingAlertsPreference: ({ enabled, memberId, permissionState }) => {
      inputs.push({
        enabled,
        kind: "updateMovingAlerts",
        memberId,
        permissionState,
      });

      return Promise.resolve({
        ...subscription,
        movingAlerts: {
          enabled,
          permissionState,
          status: "needs-background-permission",
        },
      });
    },
    upsertSettings: ({ memberId, radiusMeters }) => {
      inputs.push({
        kind: "upsertSettings",
        memberId,
        radiusMeters,
      });

      return Promise.resolve(subscription);
    },
  };
}

function createSubscription(): PersistedAlertSubscription {
  return {
    categories: ["lost_pet"],
    createdAt: now,
    id: subscriptionId,
    location: {
      latitude: -16.510231,
      longitude: -68.123881,
      label: "Sopocachi, La Paz",
      locationCell: "bo-lpb-sopocachi",
      recordedAt: now,
    },
    movingAlerts: {
      enabled: false,
      permissionState: "not-requested",
      status: "off",
    },
    pausedUntil: null,
    radiusMeters: 3500,
    status: "active",
    unsubscribedAt: null,
    updatedAt: now,
  };
}

function createPushToken(): PersistedAlertPushToken {
  return {
    deviceId: null,
    disabledAt: null,
    id: pushTokenId,
    lastSeenAt: now,
    platform: "ios",
    registeredAt: now,
    token: "ExponentPushToken[abc_123-XYZ]",
  };
}
