import { describe, expect, it, vi } from "vitest";

import type {
  ApiActivityAlertDeliveryItem,
  ApiActivityChatConversationItem,
  ApiActivityInboxOutput,
} from "./api-activity-repository";
import { createApiActivityRepository } from "./api-activity-repository";

describe("API Activity repository", () => {
  it("loads the member inbox with an empty query and normalizes backend items", async () => {
    const alertDelivery = createApiAlertDelivery();
    const chatConversation = createApiChatConversation();
    const client = createApiActivityClient({
      items: [alertDelivery, chatConversation],
    });
    const repository = createApiActivityRepository({ client });

    await expect(repository.getInbox({})).resolves.toEqual({
      alertDeliveries: [
        {
          body: "Toby fue reportado cerca de Sopocachi.",
          deliveryId: "alert-delivery-1",
          href: "rastro://reportes/perdidos/lost-report-1",
          id: "alert-delivery-1",
          occurredAt: "2026-06-30T13:00:00.000Z",
          reportId: "lost-report-1",
          status: "sent",
          title: "Mascota perdida cerca de ti",
        },
      ],
      chatSummaries: [
        {
          conversationId: "chat-conversation-1",
          href: "rastro://chats/chat-conversation-1",
          id: "chat-conversation-1",
          lastMessage: {
            authorLabel: "Diego",
            id: "chat-message-1",
            senderMemberId: "member-diego",
            sentAt: "2026-06-30T13:03:00.000Z",
            text: "Lo vi cerca de la plaza.",
          },
          occurredAt: "2026-06-30T13:04:00.000Z",
          otherParticipant: {
            displayName: "Diego",
            memberId: "member-diego",
          },
          subject: {
            href: "rastro://reportes/perdidos/lost-report-1",
            id: "lost-report-1",
            kind: "lost-pet-report",
            subtitle: "Sopocachi",
            title: "Toby",
          },
        },
      ],
    });
    expect(client.activity.inbox.query).toHaveBeenCalledWith({});
  });

  it("preserves deep links and clones nested objects instead of reusing API references", async () => {
    const chatConversation = createApiChatConversation();
    const client = createApiActivityClient({
      items: [chatConversation],
    });
    const repository = createApiActivityRepository({ client });
    const inbox = await repository.getInbox({});
    const [summary] = inbox.chatSummaries;

    expect(summary?.href).toBe("rastro://chats/chat-conversation-1");
    expect(summary?.subject.href).toBe(
      "rastro://reportes/perdidos/lost-report-1",
    );
    expect(summary?.subject).not.toBe(chatConversation.conversation.subject);
    expect(summary?.otherParticipant).not.toBe(
      chatConversation.conversation.otherParticipant,
    );
    expect(summary?.lastMessage).not.toBe(
      chatConversation.conversation.latestMessage,
    );
  });

  it("passes only supported inbox query fields and never sends memberId", async () => {
    const client = createApiActivityClient();
    const repository = createApiActivityRepository({ client });

    await repository.getInbox({
      limit: 20,
      memberId: "member-spoofed",
    } as unknown as Parameters<typeof repository.getInbox>[0]);

    expect(client.activity.inbox.query).toHaveBeenCalledWith({
      limit: 20,
    });
    expect(
      JSON.stringify(client.activity.inbox.query.mock.calls),
    ).not.toContain("member-spoofed");
  });
});

function createApiActivityClient(
  output: ApiActivityInboxOutput = { items: [] },
) {
  return {
    activity: {
      inbox: {
        query: vi.fn(() => Promise.resolve(output)),
      },
    },
  };
}

function createApiAlertDelivery(): ApiActivityAlertDeliveryItem {
  return {
    id: "activity-alert-1",
    type: "alert_delivery",
    occurredAt: new Date("2026-06-30T13:00:00.000Z"),
    delivery: {
      body: "Toby fue reportado cerca de Sopocachi.",
      deepLink: "rastro://reportes/perdidos/lost-report-1",
      failedAt: null,
      failureReason: null,
      id: "alert-delivery-1",
      matchedAt: "2026-06-30T12:59:00.000Z",
      pushTokenId: "push-token-1",
      reportId: "lost-report-1",
      sentAt: "2026-06-30T13:00:00.000Z",
      status: "sent",
      subscriptionId: "alert-subscription-1",
      title: "Mascota perdida cerca de ti",
    },
  };
}

function createApiChatConversation(): ApiActivityChatConversationItem {
  return {
    id: "activity-chat-1",
    type: "chat_conversation",
    occurredAt: new Date("2026-06-30T13:04:00.000Z"),
    conversation: {
      href: "rastro://chats/chat-conversation-1",
      id: "chat-conversation-1",
      latestMessage: {
        authorLabel: "Diego",
        createdAt: new Date("2026-06-30T13:03:00.000Z"),
        id: "chat-message-1",
        senderMemberId: "member-diego",
        text: "Lo vi cerca de la plaza.",
      },
      otherParticipant: {
        displayName: "Diego",
        memberId: "member-diego",
      },
      subject: {
        href: "rastro://reportes/perdidos/lost-report-1",
        id: "lost-report-1",
        kind: "lost-pet-report",
        subtitle: "Sopocachi",
        title: "Toby",
      },
      updatedAt: "2026-06-30T13:04:00.000Z",
    },
  };
}
