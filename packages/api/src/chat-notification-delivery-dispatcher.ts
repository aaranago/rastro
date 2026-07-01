import type { ExpoPushClient } from "./alert-delivery-dispatcher";
import type { ChatNotificationDeliveryRepository } from "./chat-notification-delivery-repository";
import { dispatchPendingPushDeliveries } from "./alert-delivery-dispatcher";

export interface ChatNotificationDeliveryDispatchResult {
  failed: number;
  pending: number;
  requested: number;
  sent: number;
  skipped: number;
}

export interface DispatchPendingChatNotificationDeliveriesInput {
  chatNotificationRepository: ChatNotificationDeliveryRepository;
  limit?: number;
  pushClient: ExpoPushClient;
}

const noActiveChatPushTokenReason =
  "No hay un token push activo para el destinatario del chat.";

export async function dispatchPendingChatNotificationDeliveries({
  chatNotificationRepository,
  limit,
  pushClient,
}: DispatchPendingChatNotificationDeliveriesInput): Promise<ChatNotificationDeliveryDispatchResult> {
  return dispatchPendingPushDeliveries({
    deliveryRepository: chatNotificationRepository,
    limit,
    noActivePushTokenReason: noActiveChatPushTokenReason,
    pushClient,
    toMessageData: (delivery) => ({
      conversationId: delivery.conversationId,
      deepLink: delivery.deepLink,
      deliveryId: delivery.id,
      messageId: delivery.messageId,
      type: "chat_message",
    }),
  });
}
