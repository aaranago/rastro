import { describe, expect, it } from "vitest";

import type { ExpoPushClient } from "./alert-delivery-dispatcher";
import type {
  AlertRepository,
  PendingAlertNotificationDelivery,
  PersistedAlertNotificationDelivery,
  PersistedAlertPushToken,
} from "./alert-repository";
import {
  createExpoPushClient,
  dispatchPendingAlertDeliveries,
} from "./alert-delivery-dispatcher";

const baseTime = "2026-07-01T12:00:00.000Z";

describe("alert delivery dispatcher", () => {
  it("marks accepted tickets sent, send errors failed, missing or disabled tokens skipped, and disables unregistered tokens", async () => {
    const repository = createFakeAlertRepository([
      createPendingDelivery({
        id: "11111111-1111-4111-8111-000000000001",
        pushToken: createPushToken({
          id: "22222222-2222-4222-8222-000000000001",
          token: "ExponentPushToken[accepted_123]",
        }),
      }),
      createPendingDelivery({
        id: "11111111-1111-4111-8111-000000000002",
        pushToken: createPushToken({
          id: "22222222-2222-4222-8222-000000000002",
          token: "ExponentPushToken[device_gone_123]",
        }),
      }),
      createPendingDelivery({
        id: "11111111-1111-4111-8111-000000000003",
        pushToken: null,
      }),
      createPendingDelivery({
        id: "11111111-1111-4111-8111-000000000008",
        pushToken: createPushToken({
          disabledAt: baseTime,
          id: "22222222-2222-4222-8222-000000000008",
          token: "ExponentPushToken[permission_denied_123]",
        }),
      }),
    ]);
    const sentMessages: string[] = [];
    const pushClient: ExpoPushClient = {
      send: (messages) => {
        sentMessages.push(...messages.map((message) => message.to));
        return Promise.resolve([
          { id: "expo-ticket-1", status: "ok" },
          {
            details: { error: "DeviceNotRegistered" },
            message: "The recipient device is not registered.",
            status: "error",
          },
        ]);
      },
    };

    const result = await dispatchPendingAlertDeliveries({
      alertRepository: repository,
      pushClient,
    });

    expect(result).toEqual({
      failed: 1,
      pending: 4,
      requested: 2,
      sent: 1,
      skipped: 2,
    });
    expect(sentMessages).toEqual([
      "ExponentPushToken[accepted_123]",
      "ExponentPushToken[device_gone_123]",
    ]);
    expect(
      repository.deliveryStatus("11111111-1111-4111-8111-000000000001"),
    ).toBe("sent");
    expect(
      repository.deliveryStatus("11111111-1111-4111-8111-000000000002"),
    ).toBe("failed");
    expect(
      repository.deliveryStatus("11111111-1111-4111-8111-000000000003"),
    ).toBe("skipped");
    expect(
      repository.deliveryStatus("11111111-1111-4111-8111-000000000008"),
    ).toBe("skipped");
    expect(repository.disabledPushTokenIds).toEqual([
      "22222222-2222-4222-8222-000000000002",
    ]);
  });

  it("leaves sendable rows pending when the Expo request throws before tickets are known", async () => {
    const repository = createFakeAlertRepository([
      createPendingDelivery({
        id: "11111111-1111-4111-8111-000000000004",
        pushToken: createPushToken({
          id: "22222222-2222-4222-8222-000000000004",
          token: "ExponentPushToken[retry_123]",
        }),
      }),
    ]);

    await expect(
      dispatchPendingAlertDeliveries({
        alertRepository: repository,
        pushClient: {
          send: () => Promise.reject(new Error("Expo is unavailable.")),
        },
      }),
    ).rejects.toThrow("Expo is unavailable.");
    expect(
      repository.deliveryStatus("11111111-1111-4111-8111-000000000004"),
    ).toBe("pending");
  });

  it("batches Expo requests at 100 messages per request", async () => {
    const deliveries = Array.from({ length: 205 }, (_, index) =>
      createPendingDelivery({
        id: `delivery-${index}`,
        pushToken: createPushToken({
          id: `push-token-${index}`,
          token: `ExponentPushToken[batch_${index}]`,
        }),
      }),
    );
    const batchSizes: number[] = [];
    const repository = createFakeAlertRepository(deliveries);

    const result = await dispatchPendingAlertDeliveries({
      alertRepository: repository,
      pushClient: {
        send: (messages) => {
          batchSizes.push(messages.length);

          return Promise.resolve(
            messages.map((_, index) => ({
              id: `expo-ticket-${batchSizes.length}-${index}`,
              status: "ok" as const,
            })),
          );
        },
      },
    });

    expect(batchSizes).toEqual([100, 100, 5]);
    expect(result).toEqual({
      failed: 0,
      pending: 205,
      requested: 205,
      sent: 205,
      skipped: 0,
    });
  });

  it("parses Expo push response tickets from the default client", async () => {
    const client = createExpoPushClient({
      endpoint: "https://expo.invalid/push",
      fetch: (input, init) => {
        expect(input).toBe("https://expo.invalid/push");
        const [message] = parseJsonArray(init.body);

        expect(message).toMatchObject({
          data: {
            type: "alert_delivery",
          },
          to: "ExponentPushToken[accepted_123]",
        });

        return Promise.resolve({
          json: () =>
            Promise.resolve({
              data: [{ id: "ticket-1", status: "ok" }],
            }),
          ok: true,
          status: 200,
          statusText: "OK",
          text: () => Promise.resolve(""),
        });
      },
    });

    await expect(
      client.send([
        {
          body: "Toby fue reportada cerca de tu zona.",
          data: {
            deepLink:
              "rastro://reportes/perdidos/33333333-3333-4333-8333-333333333333",
            deliveryId: "11111111-1111-4111-8111-000000000001",
            reportId: "33333333-3333-4333-8333-333333333333",
            type: "alert_delivery",
          },
          sound: "default",
          title: "Mascota perdida cerca de ti",
          to: "ExponentPushToken[accepted_123]",
        },
      ]),
    ).resolves.toEqual([{ id: "ticket-1", status: "ok" }]);
  });
});

type FakeAlertRepository = AlertRepository & {
  deliveryStatus: (
    deliveryId: string,
  ) => PersistedAlertNotificationDelivery["status"] | undefined;
  disabledPushTokenIds: string[];
};

function createFakeAlertRepository(
  initialDeliveries: PendingAlertNotificationDelivery[],
): FakeAlertRepository {
  const deliveries = new Map(
    initialDeliveries.map((delivery) => [delivery.id, delivery]),
  );
  const disabledPushTokenIds: string[] = [];

  const updatePendingDelivery = (
    deliveryId: string,
    update: Partial<PersistedAlertNotificationDelivery>,
  ) => {
    const delivery = deliveries.get(deliveryId);

    if (delivery?.status !== "pending") {
      return null;
    }

    const updated = {
      ...delivery,
      ...update,
    };

    deliveries.set(deliveryId, updated);

    return cloneDelivery(updated);
  };

  return {
    disabledPushTokenIds,
    createLostPetReportCreatedDeliveries: () => Promise.resolve([]),
    deliveryStatus: (deliveryId) => deliveries.get(deliveryId)?.status,
    disablePushToken: ({ pushTokenId }) => {
      disabledPushTokenIds.push(pushTokenId);
      const token = [...deliveries.values()]
        .map((delivery) => delivery.pushToken)
        .find((pushToken) => pushToken?.id === pushTokenId);

      if (!token) {
        return Promise.resolve(null);
      }

      token.disabledAt = baseTime;

      return Promise.resolve({ ...token });
    },
    get: () => Promise.resolve({ pushTokens: [], subscription: null }),
    listMemberDeliveryHistory: () =>
      Promise.resolve([...deliveries.values()].map(cloneDelivery)),
    listPendingDeliveries: () =>
      Promise.resolve(
        [...deliveries.values()]
          .filter((delivery) => delivery.status === "pending")
          .map(clonePendingDelivery),
      ),
    markDeliveryFailed: ({ deliveryId, reason }) =>
      Promise.resolve(
        updatePendingDelivery(deliveryId, {
          failedAt: baseTime,
          failureReason: reason,
          status: "failed",
        }),
      ),
    markDeliverySent: ({ deliveryId }) =>
      Promise.resolve(
        updatePendingDelivery(deliveryId, {
          sentAt: baseTime,
          status: "sent",
        }),
      ),
    markDeliverySkipped: ({ deliveryId, reason }) =>
      Promise.resolve(
        updatePendingDelivery(deliveryId, {
          failureReason: reason,
          status: "skipped",
        }),
      ),
    pause: () => Promise.reject(new Error("Not needed in dispatcher tests.")),
    recordLocation: () =>
      Promise.reject(new Error("Not needed in dispatcher tests.")),
    registerPushToken: () =>
      Promise.reject(new Error("Not needed in dispatcher tests.")),
    unsubscribe: () =>
      Promise.reject(new Error("Not needed in dispatcher tests.")),
    updateMovingAlertsPreference: () =>
      Promise.reject(new Error("Not needed in dispatcher tests.")),
    upsertSettings: () =>
      Promise.reject(new Error("Not needed in dispatcher tests.")),
  };
}

function createPendingDelivery(input: {
  id: string;
  pushToken: PersistedAlertPushToken | null;
}): PendingAlertNotificationDelivery {
  return {
    body: "Toby fue reportada cerca de tu zona.",
    createdAt: baseTime,
    deepLink: "rastro://reportes/perdidos/33333333-3333-4333-8333-333333333333",
    failedAt: null,
    failureReason: null,
    id: input.id,
    matchedAt: baseTime,
    pushToken: input.pushToken,
    pushTokenId: input.pushToken?.id ?? null,
    reportId: "33333333-3333-4333-8333-333333333333",
    sentAt: null,
    status: "pending",
    subscriptionId: "44444444-4444-4444-8444-444444444444",
    title: "Mascota perdida cerca de ti",
  };
}

function createPushToken(input: {
  disabledAt?: string | null;
  id: string;
  token: string;
}): PersistedAlertPushToken {
  return {
    deviceId: null,
    disabledAt: input.disabledAt ?? null,
    id: input.id,
    lastSeenAt: baseTime,
    platform: "ios",
    registeredAt: baseTime,
    token: input.token,
  };
}

function clonePendingDelivery(
  delivery: PendingAlertNotificationDelivery,
): PendingAlertNotificationDelivery {
  return {
    ...cloneDelivery(delivery),
    pushToken: delivery.pushToken ? { ...delivery.pushToken } : null,
  };
}

function cloneDelivery(
  delivery: PersistedAlertNotificationDelivery,
): PersistedAlertNotificationDelivery {
  return {
    ...delivery,
  };
}

function parseJsonArray(body: string): unknown[] {
  const parsed = JSON.parse(body) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Expected request body to be a JSON array.");
  }

  return parsed;
}
