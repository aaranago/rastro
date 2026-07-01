import { describe, expect, it } from "vitest";

import type {
  AlertRepository,
  PersistedAlertNotificationDelivery,
} from "../alert-repository";
import type {
  ChatRepository,
  PersistedChatConversation,
} from "../chat-repository";
import { appRouter } from "../root";

const alertDeliveryId = "11111111-1111-4111-8111-111111111111";
const reportId = "22222222-2222-4222-8222-222222222222";
const subscriptionId = "33333333-3333-4333-8333-333333333333";
const pushTokenId = "44444444-4444-4444-8444-444444444444";
const conversationId = "55555555-5555-4555-8555-555555555555";
const messageId = "66666666-6666-4666-8666-666666666666";
const reportUpdateId = "77777777-7777-4777-8777-777777777777";
const moderationEventId = "88888888-8888-4888-8888-888888888888";

function createCaller(context: unknown) {
  return appRouter.createCaller(context as never);
}

describe("activity router", () => {
  it("rejects unauthenticated inbox reads before repository work", async () => {
    let read = false;
    const caller = createCaller({
      alertRepository: {
        listMemberDeliveryHistory: () => {
          read = true;
          return Promise.resolve([]);
        },
      },
      authApi: {},
      chatRepository: {
        listConversations: () => {
          read = true;
          return Promise.resolve([]);
        },
      },
      db: {},
      session: null,
    });

    await expect(caller.activity.inbox({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(read).toBe(false);
  });

  it("rejects client-supplied member ids before repository work", async () => {
    const alertRepository = createFakeAlertRepository([]);
    const chatRepository = createFakeChatRepository([]);
    const caller = createCaller({
      alertRepository,
      authApi: {},
      chatRepository,
      db: {},
      session: {
        user: {
          id: "member-camila",
        },
      },
    });

    await expect(
      caller.activity.inbox({
        limit: 10,
        memberId: "member-attacker",
      } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(alertRepository.historyInputs).toEqual([]);
    expect(chatRepository.listInputs).toEqual([]);
  });

  it("combines alerts, chats, report updates, and moderation newest first", async () => {
    const alertRepository = createFakeAlertRepository([createAlertDelivery()]);
    const chatRepository = createFakeChatRepository([createConversation()]);
    const db = createFakeActivityDb({
      moderationEvents: [createModerationEventRow()],
      reportUpdates: [createReportUpdateRow()],
    });
    const caller = createCaller({
      alertRepository,
      authApi: {},
      chatRepository,
      db,
      session: {
        user: {
          id: "member-camila",
        },
      },
    });

    const inbox = await caller.activity.inbox({ limit: 4 });

    expect(alertRepository.historyInputs).toEqual([
      {
        limit: 4,
        memberId: "member-camila",
      },
    ]);
    expect(chatRepository.listInputs).toEqual([
      {
        viewerMemberId: "member-camila",
      },
    ]);
    expect(db.limits).toEqual([4, 4]);
    expect(inbox.items).toEqual([
      {
        event: {
          action: "hide",
          adminId: "member-admin",
          id: moderationEventId,
          note: "Ubicación sensible.",
          reason: "Ubicación exacta expuesta",
          report: {
            availability: "hidden",
            href: `rastro://reportes/perdidos/${reportId}`,
            id: reportId,
            kind: "lost-pet-report",
            outcome: null,
            status: "active",
            title: "Toby",
            type: "lost_pet",
          },
        },
        id: moderationEventId,
        occurredAt: "2026-07-01T12:07:00.000Z",
        type: "moderation_event",
      },
      {
        id: reportUpdateId,
        occurredAt: "2026-07-01T12:06:00.000Z",
        type: "report_update",
        update: {
          actorMemberId: "member-camila",
          eventType: "resolved",
          fromStatus: "active",
          id: reportUpdateId,
          note: null,
          outcome: "reunited",
          report: {
            availability: "available",
            href: `rastro://reportes/perdidos/${reportId}`,
            id: reportId,
            kind: "lost-pet-report",
            outcome: "reunited",
            status: "closed",
            title: "Toby",
            type: "lost_pet",
          },
          toStatus: "closed",
        },
      },
      {
        conversation: {
          href: `rastro://chats/${conversationId}`,
          id: conversationId,
          latestMessage: {
            createdAt: "2026-07-01T12:05:00.000Z",
            id: messageId,
            senderMemberId: "member-diego",
            text: "Lo vi cerca de la plaza.",
          },
          otherParticipant: {
            displayName: "Diego",
            memberId: "member-diego",
          },
          subject: {
            href: `rastro://reportes/perdidos/${reportId}`,
            id: reportId,
            kind: "lost-pet-report",
            subtitle: "Sopocachi, La Paz",
            title: "Toby",
          },
          updatedAt: "2026-07-01T12:05:00.000Z",
        },
        id: conversationId,
        occurredAt: "2026-07-01T12:05:00.000Z",
        type: "chat_conversation",
      },
      {
        delivery: createAlertDelivery(),
        id: alertDeliveryId,
        occurredAt: "2026-07-01T12:01:00.000Z",
        type: "alert_delivery",
      },
    ]);
  });
});

type FakeAlertRepository = AlertRepository & {
  historyInputs: {
    limit?: number;
    memberId: string;
  }[];
};

function createFakeAlertRepository(
  deliveries: PersistedAlertNotificationDelivery[],
): FakeAlertRepository {
  const historyInputs: FakeAlertRepository["historyInputs"] = [];

  return {
    historyInputs,
    createLostPetReportCreatedDeliveries: () => Promise.resolve([]),
    disablePushToken: () => Promise.resolve(null),
    get: () => Promise.resolve({ pushTokens: [], subscription: null }),
    listMemberDeliveryHistory: (input) => {
      historyInputs.push(input);
      return Promise.resolve(deliveries);
    },
    listPendingDeliveries: () => Promise.resolve([]),
    markDeliveryFailed: () => Promise.resolve(null),
    markDeliverySent: () => Promise.resolve(null),
    markDeliverySkipped: () => Promise.resolve(null),
    pause: () => Promise.reject(new Error("Not needed in activity tests.")),
    recordLocation: () =>
      Promise.reject(new Error("Not needed in activity tests.")),
    registerPushToken: () =>
      Promise.reject(new Error("Not needed in activity tests.")),
    unsubscribe: () =>
      Promise.reject(new Error("Not needed in activity tests.")),
    upsertSettings: () =>
      Promise.reject(new Error("Not needed in activity tests.")),
  };
}

type FakeChatRepository = ChatRepository & {
  listInputs: {
    viewerMemberId: string;
  }[];
};

function createFakeChatRepository(
  conversations: PersistedChatConversation[],
): FakeChatRepository {
  const listInputs: FakeChatRepository["listInputs"] = [];

  return {
    listInputs,
    blockMember: () =>
      Promise.reject(new Error("Not needed in activity tests.")),
    getConversation: () =>
      Promise.reject(new Error("Not needed in activity tests.")),
    hideConversation: () =>
      Promise.reject(new Error("Not needed in activity tests.")),
    listConversations: (input) => {
      listInputs.push(input);
      return Promise.resolve(conversations);
    },
    openReportConversation: () =>
      Promise.reject(new Error("Not needed in activity tests.")),
    reportConversation: () =>
      Promise.reject(new Error("Not needed in activity tests.")),
    sendMessage: () =>
      Promise.reject(new Error("Not needed in activity tests.")),
  };
}

interface FakeActivityDb {
  limits: number[];
  select: () => {
    from: () => {
      innerJoin: () => {
        where: () => {
          orderBy: () => {
            limit: (limit: number) => Promise<unknown[]>;
          };
        };
      };
    };
  };
}

function createFakeActivityDb({
  moderationEvents = [],
  reportUpdates = [],
}: {
  moderationEvents?: unknown[];
  reportUpdates?: unknown[];
} = {}): FakeActivityDb {
  const limits: number[] = [];
  let selectCount = 0;

  return {
    limits,
    select: () => {
      const rows = selectCount === 0 ? reportUpdates : moderationEvents;
      selectCount += 1;

      return {
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: (limit: number) => {
                  limits.push(limit);
                  return Promise.resolve(rows.slice(0, limit));
                },
              }),
            }),
          }),
        }),
      };
    },
  };
}

function createReportUpdateRow() {
  return {
    actorMemberId: "member-camila",
    createdAt: new Date("2026-07-01T12:06:00.000Z"),
    eventType: "resolved",
    fromStatus: "active",
    id: reportUpdateId,
    note: null,
    outcome: "reunited",
    report: {
      deletedAt: null,
      falseReportedAt: null,
      hiddenAt: null,
      id: reportId,
      outcome: "reunited",
      status: "closed",
      title: "Toby",
      type: "lost_pet",
    },
    toStatus: "closed",
  };
}

function createModerationEventRow() {
  return {
    action: "hide",
    adminId: "member-admin",
    createdAt: new Date("2026-07-01T12:07:00.000Z"),
    id: moderationEventId,
    note: "Ubicación sensible.",
    reason: "Ubicación exacta expuesta",
    report: {
      deletedAt: null,
      falseReportedAt: null,
      hiddenAt: new Date("2026-07-01T12:07:00.000Z"),
      id: reportId,
      outcome: null,
      status: "active",
      title: "Toby",
      type: "lost_pet",
    },
  };
}

function createAlertDelivery(): PersistedAlertNotificationDelivery {
  return {
    body: "Toby fue reportada cerca de tu zona.",
    createdAt: "2026-07-01T12:00:00.000Z",
    deepLink: `rastro://reportes/perdidos/${reportId}`,
    failedAt: null,
    failureReason: null,
    id: alertDeliveryId,
    matchedAt: "2026-07-01T12:00:00.000Z",
    pushTokenId,
    reportId,
    sentAt: "2026-07-01T12:01:00.000Z",
    status: "sent",
    subscriptionId,
    title: "Mascota perdida cerca de ti",
  };
}

function createConversation(): PersistedChatConversation {
  return {
    blockedMemberships: [],
    createdAt: "2026-07-01T12:03:00.000Z",
    hiddenByMemberIds: [],
    id: conversationId,
    messages: [
      {
        conversationId,
        createdAt: "2026-07-01T12:05:00.000Z",
        id: messageId,
        senderMemberId: "member-diego",
        text: "Lo vi cerca de la plaza.",
      },
    ],
    participants: [
      {
        displayName: "Camila",
        memberId: "member-camila",
      },
      {
        displayName: "Diego",
        memberId: "member-diego",
      },
    ],
    reports: [],
    subject: {
      href: `rastro://reportes/perdidos/${reportId}`,
      id: reportId,
      kind: "lost-pet-report",
      subtitle: "Sopocachi, La Paz",
      title: "Toby",
    },
    updatedAt: "2026-07-01T12:05:00.000Z",
  };
}
