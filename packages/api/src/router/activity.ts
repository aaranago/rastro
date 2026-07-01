import type { TRPCRouterRecord } from "@trpc/server";

import type {
  ActivityInboxItemOutput,
  ActivityInboxOutput,
} from "@acme/validators";
import {
  activityInboxInputSchema,
  activityInboxOutputSchema,
} from "@acme/validators";

import type { PersistedAlertNotificationDelivery } from "../alert-repository";
import type { PersistedChatConversation } from "../chat-repository";
import { protectedProcedure } from "../trpc";

const defaultInboxLimit = 50;

export const activityRouter = {
  inbox: protectedProcedure
    .input(activityInboxInputSchema)
    .output(activityInboxOutputSchema)
    .query(async ({ ctx, input }) => {
      const memberId = ctx.session.user.id;
      const limit = input.limit ?? defaultInboxLimit;
      const [alertDeliveries, chatConversations] = await Promise.all([
        ctx.alertRepository.listMemberDeliveryHistory({
          limit,
          memberId,
        }),
        ctx.chatRepository.listConversations({
          viewerMemberId: memberId,
        }),
      ]);
      const items = [
        ...alertDeliveries.map(toAlertDeliveryInboxItem),
        ...chatConversations.map((conversation) =>
          toChatConversationInboxItem(conversation, memberId),
        ),
      ].sort(compareInboxItems);

      return {
        items: items.slice(0, limit),
      } satisfies ActivityInboxOutput;
    }),
} satisfies TRPCRouterRecord;

function toAlertDeliveryInboxItem(
  delivery: PersistedAlertNotificationDelivery,
): ActivityInboxItemOutput {
  return {
    delivery,
    id: delivery.id,
    occurredAt: delivery.sentAt ?? delivery.failedAt ?? delivery.matchedAt,
    type: "alert_delivery",
  };
}

function toChatConversationInboxItem(
  conversation: PersistedChatConversation,
  viewerMemberId: string,
): ActivityInboxItemOutput {
  const latestMessage = conversation.messages[conversation.messages.length - 1];
  const otherParticipant =
    conversation.participants.find(
      (participant) => participant.memberId !== viewerMemberId,
    ) ?? conversation.participants[0];

  return {
    conversation: {
      href: `rastro://chats/${conversation.id}`,
      id: conversation.id,
      latestMessage: latestMessage
        ? {
            createdAt: latestMessage.createdAt,
            id: latestMessage.id,
            senderMemberId: latestMessage.senderMemberId,
            text: latestMessage.text,
          }
        : null,
      otherParticipant,
      subject: conversation.subject,
      updatedAt: conversation.updatedAt,
    },
    id: conversation.id,
    occurredAt: conversation.updatedAt,
    type: "chat_conversation",
  };
}

function compareInboxItems(
  left: ActivityInboxItemOutput,
  right: ActivityInboxItemOutput,
) {
  const timestampComparison =
    Date.parse(right.occurredAt) - Date.parse(left.occurredAt);

  if (timestampComparison !== 0) {
    return timestampComparison;
  }

  return right.id.localeCompare(left.id);
}
