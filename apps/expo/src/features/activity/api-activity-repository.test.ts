import { describe, expect, it, vi } from "vitest";

import type {
  ApiActivityAlertDeliveryItem,
  ApiActivityCandidateMatchItem,
  ApiActivityChatConversationItem,
  ApiActivityInboxOutput,
  ApiActivityModerationEventItem,
  ApiActivityOwnedReportPromptItem,
  ApiActivityReportUpdateItem,
} from "./api-activity-repository";
import {
  createApiActivityRepository,
  createCachedActivityRepository,
} from "./api-activity-repository";

describe("API Activity repository", () => {
  it("loads the member inbox with an empty query and normalizes backend items", async () => {
    const alertDelivery = createApiAlertDelivery();
    const candidateMatch = createApiCandidateMatch();
    const chatConversation = createApiChatConversation();
    const reportUpdate = createApiReportUpdate();
    const moderationEvent = createApiModerationEvent();
    const ownedReportPrompt = createApiOwnedReportPrompt();
    const client = createApiActivityClient({
      items: [
        alertDelivery,
        candidateMatch,
        chatConversation,
        reportUpdate,
        moderationEvent,
        ownedReportPrompt,
      ],
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
      candidateMatches: [
        {
          candidate: {
            href: "rastro://reportes/encontrados/found-report-1",
            id: "found-report-1",
            kind: "found-pet-report",
            title: "Perro encontrado en Sopocachi",
          },
          confidence: "possible",
          createdAt: "2026-06-30T13:02:00.000Z",
          id: "match:lost-report-1:found-report-1",
          locationLabel: "Sopocachi, La Paz",
          ownedReport: {
            href: "rastro://reportes/perdidos/lost-report-1",
            id: "lost-report-1",
            title: "Toby",
          },
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
      moderationEvents: [
        {
          action: "hide",
          adminId: "member-admin",
          id: "moderation-event-1",
          note: "Ubicación sensible.",
          occurredAt: "2026-06-30T13:06:00.000Z",
          reason: "Ubicación exacta expuesta",
          report: {
            availability: "hidden",
            href: "rastro://reportes/perdidos/lost-report-1",
            id: "lost-report-1",
            kind: "lost-pet-report",
            outcome: null,
            status: "active",
            title: "Toby",
            type: "lost_pet",
          },
        },
      ],
      ownedReportPrompts: [
        {
          href: "/(tabs)/(profile)/mis-reportes?reportId=lost-report-1",
          promptedAt: "2026-06-30T13:07:00.000Z",
          prompt: {
            actionLabel: "Confirmar o actualizar",
            message:
              "Confirma si este reporte sigue activo o elige un resultado.",
            outcomeOptions: [
              {
                label: "Sigue activa",
                outcome: "still-missing",
              },
              {
                label: "Reunida",
                outcome: "reunited",
              },
              {
                label: "Trasladada a refugio",
                outcome: "transferred-to-shelter",
              },
              {
                label: "No se pudo ubicar",
                outcome: "unable-to-locate",
              },
              {
                label: "Inactiva",
                outcome: "inactive",
              },
            ],
            reportId: "lost-report-1",
            title: "Toby",
          },
        },
      ],
      reportUpdates: [
        {
          actorMemberId: "member-camila",
          eventType: "resolved",
          fromStatus: "active",
          id: "report-update-1",
          note: null,
          occurredAt: "2026-06-30T13:05:00.000Z",
          outcome: "reunited",
          report: {
            availability: "available",
            href: "rastro://reportes/perdidos/lost-report-1",
            id: "lost-report-1",
            kind: "lost-pet-report",
            outcome: "reunited",
            status: "closed",
            title: "Toby",
            type: "lost_pet",
          },
          toStatus: "closed",
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
      focus: "conversations",
      limit: 20,
      memberId: "member-spoofed",
    } as unknown as Parameters<typeof repository.getInbox>[0]);

    expect(client.activity.inbox.query).toHaveBeenCalledWith({
      focus: "conversations",
      limit: 20,
    });
    expect(
      JSON.stringify(client.activity.inbox.query.mock.calls),
    ).not.toContain("member-spoofed");
  });

  it("returns the last successful inbox as stale cache when a later fetch fails", async () => {
    const freshInbox = {
      alertDeliveries: [],
      candidateMatches: [],
      chatSummaries: [],
      moderationEvents: [normalizeApiModerationEventForCache()],
      ownedReportPrompts: [],
      reportUpdates: [],
    };
    const cache = {
      read: vi.fn(() => Promise.resolve(null)),
      write: vi.fn(() => Promise.resolve()),
    };
    const source = {
      getInbox: vi
        .fn()
        .mockResolvedValueOnce(freshInbox)
        .mockRejectedValueOnce(new Error("offline")),
    };
    const repository = createCachedActivityRepository({
      cache,
      cacheKey: (input) => `activity:${input.limit ?? "default"}`,
      source,
    });

    await expect(repository.getInbox({ limit: 20 })).resolves.toEqual(
      freshInbox,
    );
    await expect(repository.getInbox({ limit: 20 })).resolves.toEqual({
      ...freshInbox,
      isOffline: true,
      isStale: true,
    });

    expect(cache.write).toHaveBeenCalledWith("activity:20", freshInbox);
    expect(cache.read).not.toHaveBeenCalled();
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

function createApiCandidateMatch(): ApiActivityCandidateMatchItem {
  return {
    id: "match:lost-report-1:found-report-1",
    match: {
      candidate: {
        availability: "available",
        href: "rastro://reportes/encontrados/found-report-1",
        id: "found-report-1",
        kind: "found-pet-report",
        outcome: null,
        status: "active",
        title: "Perro encontrado en Sopocachi",
        type: "found_pet",
      },
      confidence: "possible",
      createdAt: new Date("2026-06-30T13:02:00.000Z"),
      id: "match:lost-report-1:found-report-1",
      locationLabel: "Sopocachi, La Paz",
      ownedReport: {
        availability: "available",
        href: "rastro://reportes/perdidos/lost-report-1",
        id: "lost-report-1",
        kind: "lost-pet-report",
        outcome: null,
        status: "active",
        title: "Toby",
        type: "lost_pet",
      },
    },
    occurredAt: new Date("2026-06-30T13:02:00.000Z"),
    type: "candidate_match",
  };
}

function createApiReportUpdate(): ApiActivityReportUpdateItem {
  return {
    id: "activity-report-update-1",
    occurredAt: new Date("2026-06-30T13:05:00.000Z"),
    type: "report_update",
    update: {
      actorMemberId: "member-camila",
      eventType: "resolved",
      fromStatus: "active",
      id: "report-update-1",
      note: null,
      outcome: "reunited",
      report: {
        availability: "available",
        href: "rastro://reportes/perdidos/lost-report-1",
        id: "lost-report-1",
        kind: "lost-pet-report",
        outcome: "reunited",
        status: "closed",
        title: "Toby",
        type: "lost_pet",
      },
      toStatus: "closed",
    },
  };
}

function createApiOwnedReportPrompt(): ApiActivityOwnedReportPromptItem {
  return {
    id: "owned-report-prompt:lost-report-1",
    occurredAt: new Date("2026-06-30T13:07:00.000Z"),
    prompt: {
      lastConfirmedAt: "2026-06-01T12:00:00.000Z",
      report: {
        availability: "available",
        href: "rastro://reportes/perdidos/lost-report-1",
        id: "lost-report-1",
        kind: "lost-pet-report",
        outcome: null,
        status: "active",
        title: "Toby",
        type: "lost_pet",
      },
      staleAfterDays: 14,
    },
    type: "owned_report_prompt",
  };
}

function createApiModerationEvent(): ApiActivityModerationEventItem {
  return {
    event: {
      action: "hide",
      adminId: "member-admin",
      id: "moderation-event-1",
      note: "Ubicación sensible.",
      reason: "Ubicación exacta expuesta",
      report: {
        availability: "hidden",
        href: "rastro://reportes/perdidos/lost-report-1",
        id: "lost-report-1",
        kind: "lost-pet-report",
        outcome: null,
        status: "active",
        title: "Toby",
        type: "lost_pet",
      },
    },
    id: "activity-moderation-event-1",
    occurredAt: new Date("2026-06-30T13:06:00.000Z"),
    type: "moderation_event",
  };
}

function normalizeApiModerationEventForCache() {
  return {
    action: "hide" as const,
    adminId: "member-admin",
    id: "moderation-event-1",
    note: "Ubicación sensible.",
    occurredAt: "2026-06-30T13:06:00.000Z",
    reason: "Ubicación exacta expuesta",
    report: {
      availability: "hidden" as const,
      href: "rastro://reportes/perdidos/lost-report-1",
      id: "lost-report-1",
      kind: "lost-pet-report" as const,
      outcome: null,
      status: "active" as const,
      title: "Toby",
      type: "lost_pet" as const,
    },
  };
}
