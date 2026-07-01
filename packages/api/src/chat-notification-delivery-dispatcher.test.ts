import { describe, expect, it } from "vitest";

import type { ExpoPushClient } from "./alert-delivery-dispatcher";
import type { PersistedAlertPushToken } from "./alert-repository";
import type {
  ChatNotificationDeliveryRepository,
  PendingChatNotificationDelivery,
  PersistedChatNotificationDelivery,
} from "./chat-notification-delivery-repository";
import { dispatchPendingChatNotificationDeliveries } from "./chat-notification-delivery-dispatcher";

const baseTime = "2026-07-01T12:00:00.000Z";

describe("chat notification delivery dispatcher", () => {
  it("sends chat push payloads and transitions ticket results", async () => {
    const repository = createFakeChatNotificationRepository([
      createPendingChatDelivery({
        id: "11111111-1111-4111-8111-000000000001",
        pushToken: createPushToken({
          id: "22222222-2222-4222-8222-000000000001",
          token: "ExponentPushToken[chat_ok_123]",
        }),
      }),
      createPendingChatDelivery({
        id: "11111111-1111-4111-8111-000000000002",
        pushToken: createPushToken({
          id: "22222222-2222-4222-8222-000000000002",
          token: "ExponentPushToken[chat_gone_123]",
        }),
      }),
      createPendingChatDelivery({
        id: "11111111-1111-4111-8111-000000000003",
        pushToken: null,
      }),
    ]);
    const sentPayloads: unknown[] = [];
    const pushClient: ExpoPushClient = {
      send: (messages) => {
        sentPayloads.push(...messages);

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

    const result = await dispatchPendingChatNotificationDeliveries({
      chatNotificationRepository: repository,
      pushClient,
    });

    expect(result).toEqual({
      failed: 1,
      pending: 3,
      requested: 2,
      sent: 1,
      skipped: 1,
    });
    expect(sentPayloads).toEqual([
      expect.objectContaining({
        data: {
          conversationId: "55555555-5555-4555-8555-555555555555",
          deepLink: "rastro://chats/55555555-5555-4555-8555-555555555555",
          deliveryId: "11111111-1111-4111-8111-000000000001",
          messageId: "66666666-6666-4666-8666-000000000001",
          type: "chat_message",
        },
        to: "ExponentPushToken[chat_ok_123]",
      }),
      expect.objectContaining({
        data: {
          conversationId: "55555555-5555-4555-8555-555555555555",
          deepLink: "rastro://chats/55555555-5555-4555-8555-555555555555",
          deliveryId: "11111111-1111-4111-8111-000000000002",
          messageId: "66666666-6666-4666-8666-000000000002",
          type: "chat_message",
        },
        to: "ExponentPushToken[chat_gone_123]",
      }),
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
    expect(repository.disabledPushTokenIds).toEqual([
      "22222222-2222-4222-8222-000000000002",
    ]);
  });
});

type FakeChatNotificationRepository = ChatNotificationDeliveryRepository & {
  deliveryStatus: (
    deliveryId: string,
  ) => PersistedChatNotificationDelivery["status"] | undefined;
  disabledPushTokenIds: string[];
};

function createFakeChatNotificationRepository(
  initialDeliveries: PendingChatNotificationDelivery[],
): FakeChatNotificationRepository {
  const deliveries = new Map(
    initialDeliveries.map((delivery) => [delivery.id, delivery]),
  );
  const disabledPushTokenIds: string[] = [];

  const updatePendingDelivery = (
    deliveryId: string,
    update: Partial<PersistedChatNotificationDelivery>,
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
  };
}

function createPendingChatDelivery(input: {
  id: string;
  pushToken: PersistedAlertPushToken | null;
}): PendingChatNotificationDelivery {
  const messageSuffix = input.id.endsWith("2")
    ? "000000000002"
    : "000000000001";

  return {
    body: "Diego: Lo vi cerca de la plaza.",
    conversationId: "55555555-5555-4555-8555-555555555555",
    createdAt: baseTime,
    deepLink: "rastro://chats/55555555-5555-4555-8555-555555555555",
    failedAt: null,
    failureReason: null,
    id: input.id,
    messageId: `66666666-6666-4666-8666-${messageSuffix}`,
    pushToken: input.pushToken,
    pushTokenId: input.pushToken?.id ?? null,
    queuedAt: baseTime,
    recipientMemberId: "member-chat-caretaker",
    senderMemberId: "member-chat-contact",
    sentAt: null,
    status: "pending",
    title: "Nuevo mensaje en Rastro",
  };
}

function createPushToken(input: {
  id: string;
  token: string;
}): PersistedAlertPushToken {
  return {
    deviceId: null,
    disabledAt: null,
    id: input.id,
    lastSeenAt: baseTime,
    platform: "ios",
    registeredAt: baseTime,
    token: input.token,
  };
}

function clonePendingDelivery(
  delivery: PendingChatNotificationDelivery,
): PendingChatNotificationDelivery {
  return {
    ...cloneDelivery(delivery),
    pushToken: delivery.pushToken ? { ...delivery.pushToken } : null,
  };
}

function cloneDelivery(
  delivery: PersistedChatNotificationDelivery,
): PersistedChatNotificationDelivery {
  return {
    ...delivery,
  };
}
