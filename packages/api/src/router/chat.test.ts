import { describe, expect, it } from "vitest";

import type {
  ChatRepository,
  PersistedChatConversation,
} from "../chat-repository";
import { ChatRepositoryError } from "../chat-repository";
import { appRouter } from "../root";

const reportId = "report-sighting-sopocachi";
const conversationId = "11111111-1111-4111-8111-111111111111";
const secondConversationId = "22222222-2222-4222-8222-222222222222";

function createCaller(context: unknown) {
  return appRouter.createCaller(context as never);
}

describe("chat router", () => {
  it("rejects unauthenticated report chat opening before repository work", async () => {
    let opened = false;
    const caller = createCaller({
      authApi: {},
      chatRepository: {
        openReportConversation: () => {
          opened = true;
          return Promise.reject(new Error("Should not open without auth."));
        },
      },
      db: {},
      session: null,
    });

    await expect(
      caller.chat.openReportConversation({ reportId }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(opened).toBe(false);
  });

  it("rejects the caretaker opening contact chat for their own report", async () => {
    const caller = createCaller({
      authApi: {},
      chatRepository: createFakeChatRepository(),
      db: {},
      session: {
        user: {
          id: "member-camila",
        },
      },
    });

    await expect(
      caller.chat.openReportConversation({ reportId }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("opens a report conversation idempotently using the session member as contact", async () => {
    const repository = createFakeChatRepository();
    const caller = createCaller({
      authApi: {},
      chatRepository: repository,
      db: {},
      session: {
        user: {
          id: "member-diego",
        },
      },
    });

    const first = await caller.chat.openReportConversation({ reportId });
    const second = await caller.chat.openReportConversation({ reportId });

    expect(first.id).toBe(conversationId);
    expect(second.id).toBe(conversationId);
    expect(first.participants).toEqual([
      { displayName: "Camila", memberId: "member-camila" },
      { displayName: "Diego", memberId: "member-diego" },
    ]);
    expect(repository.openInputs).toEqual([
      { contactMemberId: "member-diego", reportId },
      { contactMemberId: "member-diego", reportId },
    ]);
  });

  it("rejects client-supplied sender, blocker, and reporter fields", async () => {
    const caller = createCaller({
      authApi: {},
      chatRepository: createFakeChatRepository(),
      db: {},
      session: {
        user: {
          id: "member-diego",
        },
      },
    });

    await expect(
      caller.chat.sendMessage({
        conversationId,
        senderMemberId: "member-camila",
        text: "spoof",
      } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.chat.blockMember({
        blockedMemberId: "member-camila",
        blockerMemberId: "member-diego",
        conversationId,
      } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.chat.reportConversation({
        conversationId,
        note: "Este chat parece sospechoso.",
        reporterMemberId: "member-camila",
      } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("allows only participants to read, send, block, and report a conversation", async () => {
    const repository = createFakeChatRepository();
    const participantCaller = createCaller({
      authApi: {},
      chatRepository: repository,
      db: {},
      session: {
        user: {
          id: "member-diego",
        },
      },
    });
    const outsiderCaller = createCaller({
      authApi: {},
      chatRepository: repository,
      db: {},
      session: {
        user: {
          id: "member-lucia",
        },
      },
    });

    const conversation = await participantCaller.chat.openReportConversation({
      reportId,
    });
    await expect(
      participantCaller.chat.detail({ conversationId: conversation.id }),
    ).resolves.toMatchObject({
      id: conversation.id,
      messages: [],
    });
    await expect(
      participantCaller.chat.sendMessage({
        conversationId: conversation.id,
        text: "Vi a Toby cerca de la plaza.",
      }),
    ).resolves.toMatchObject({
      messages: [
        expect.objectContaining({
          senderMemberId: "member-diego",
          text: "Vi a Toby cerca de la plaza.",
        }),
      ],
    });
    await expect(
      participantCaller.chat.blockMember({
        blockedMemberId: "member-camila",
        conversationId: conversation.id,
      }),
    ).resolves.toMatchObject({
      blockedMemberships: [
        {
          blockedAt: "2026-06-30T12:02:00.000Z",
          blockedMemberId: "member-camila",
          blockerMemberId: "member-diego",
        },
      ],
    });
    await expect(
      participantCaller.chat.reportConversation({
        conversationId: conversation.id,
        note: "Este chat parece sospechoso.",
        reason: "scam",
      }),
    ).resolves.toMatchObject({
      reports: [
        {
          createdAt: "2026-06-30T12:03:00.000Z",
          note: "Este chat parece sospechoso.",
          reason: "scam",
          reporterMemberId: "member-diego",
        },
      ],
    });

    await expect(
      outsiderCaller.chat.detail({ conversationId: conversation.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      outsiderCaller.chat.sendMessage({
        conversationId: conversation.id,
        text: "No soy participante.",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      outsiderCaller.chat.blockMember({
        blockedMemberId: "member-diego",
        conversationId: conversation.id,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      outsiderCaller.chat.reportConversation({
        conversationId: conversation.id,
        note: "No soy participante.",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects sending by a member blocked in that conversation", async () => {
    const repository = createFakeChatRepository();
    const caretakerCaller = createCaller({
      authApi: {},
      chatRepository: repository,
      db: {},
      session: {
        user: {
          id: "member-camila",
        },
      },
    });
    const contactCaller = createCaller({
      authApi: {},
      chatRepository: repository,
      db: {},
      session: {
        user: {
          id: "member-diego",
        },
      },
    });
    const conversation = await contactCaller.chat.openReportConversation({
      reportId,
    });

    await caretakerCaller.chat.blockMember({
      blockedMemberId: "member-diego",
      conversationId: conversation.id,
    });

    await expect(
      contactCaller.chat.sendMessage({
        conversationId: conversation.id,
        text: "No deberia enviarse.",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("filters hidden conversations from the member list", async () => {
    const repository = createFakeChatRepository();
    const caller = createCaller({
      authApi: {},
      chatRepository: repository,
      db: {},
      session: {
        user: {
          id: "member-diego",
        },
      },
    });
    const first = await caller.chat.openReportConversation({ reportId });
    await repository.openReportConversation({
      contactMemberId: "member-diego",
      reportId: "report-found-sopocachi",
    });

    await expect(caller.chat.list()).resolves.toHaveLength(2);
    await caller.chat.hideConversation({ conversationId: first.id });

    await expect(caller.chat.list()).resolves.toEqual([
      expect.objectContaining({ id: secondConversationId }),
    ]);
  });
});

type FakeChatRepository = ChatRepository & {
  openInputs: {
    contactMemberId: string;
    reportId: string;
  }[];
};

function createFakeChatRepository(): FakeChatRepository {
  const conversations = new Map<string, PersistedChatConversation>();
  const openInputs: FakeChatRepository["openInputs"] = [];
  let nextConversationIndex = 0;
  let nextMessageIndex = 0;
  let nextTimestampOffsetMinutes = 0;

  const nextTimestamp = () => {
    const timestamp = new Date("2026-06-30T12:00:00.000Z");
    timestamp.setUTCMinutes(
      timestamp.getUTCMinutes() + nextTimestampOffsetMinutes,
    );
    nextTimestampOffsetMinutes += 1;
    return timestamp.toISOString();
  };

  const repository: FakeChatRepository = {
    openInputs,
    blockMember: ({ blockedMemberId, blockerMemberId, conversationId }) => {
      const conversation = requireConversation(conversations, conversationId);
      assertParticipant(conversation, blockerMemberId);
      assertParticipant(conversation, blockedMemberId);

      if (
        !conversation.blockedMemberships.some(
          (membership) =>
            membership.blockedMemberId === blockedMemberId &&
            membership.blockerMemberId === blockerMemberId,
        )
      ) {
        const blockedAt = nextTimestamp();

        conversation.blockedMemberships.push({
          blockedAt,
          blockedMemberId,
          blockerMemberId,
        });
        conversation.updatedAt = blockedAt;
      }

      return Promise.resolve(cloneConversation(conversation));
    },
    getConversation: ({ conversationId, viewerMemberId }) => {
      const conversation = requireConversation(conversations, conversationId);
      assertParticipant(conversation, viewerMemberId);

      return Promise.resolve(cloneConversation(conversation));
    },
    hideConversation: ({ conversationId, memberId }) => {
      const conversation = requireConversation(conversations, conversationId);
      assertParticipant(conversation, memberId);

      if (!conversation.hiddenByMemberIds.includes(memberId)) {
        conversation.hiddenByMemberIds.push(memberId);
        conversation.updatedAt = nextTimestamp();
      }

      return Promise.resolve(cloneConversation(conversation));
    },
    listConversations: ({ viewerMemberId }) => {
      return Promise.resolve(
        [...conversations.values()]
          .filter((conversation) =>
            conversation.participants.some(
              (participant) => participant.memberId === viewerMemberId,
            ),
          )
          .filter(
            (conversation) =>
              !conversation.hiddenByMemberIds.includes(viewerMemberId),
          )
          .map(cloneConversation),
      );
    },
    openReportConversation: ({ contactMemberId, reportId: inputReportId }) => {
      openInputs.push({ contactMemberId, reportId: inputReportId });

      if (contactMemberId === "member-camila") {
        throw new ChatRepositoryError(
          "chat_report_self_contact_not_allowed",
          "No puedes abrir un chat de contacto con tu propio reporte.",
        );
      }

      const existing = [...conversations.values()].find(
        (conversation) =>
          conversation.subject.id === inputReportId &&
          conversation.participants.some(
            (participant) => participant.memberId === contactMemberId,
          ),
      );

      if (existing) {
        return Promise.resolve(cloneConversation(existing));
      }

      const ids = [conversationId, secondConversationId];
      const id =
        ids[nextConversationIndex] ??
        `33333333-3333-4333-8333-33333333333${nextConversationIndex}`;
      nextConversationIndex += 1;
      const createdAt = nextTimestamp();
      const conversation = createConversation({
        contactMemberId,
        createdAt,
        id,
        reportId: inputReportId,
      });

      conversations.set(id, conversation);

      return Promise.resolve(cloneConversation(conversation));
    },
    reportConversation: ({
      conversationId,
      note,
      reason,
      reporterMemberId,
    }) => {
      const conversation = requireConversation(conversations, conversationId);
      assertParticipant(conversation, reporterMemberId);

      if (
        !conversation.reports.some(
          (report) => report.reporterMemberId === reporterMemberId,
        )
      ) {
        const createdAt = nextTimestamp();

        conversation.reports.push({
          createdAt,
          note,
          reason,
          reporterMemberId,
        });
        conversation.updatedAt = createdAt;
      }

      return Promise.resolve(cloneConversation(conversation));
    },
    sendMessage: ({ conversationId, senderMemberId, text }) => {
      const conversation = requireConversation(conversations, conversationId);
      assertParticipant(conversation, senderMemberId);

      if (
        conversation.blockedMemberships.some(
          (membership) => membership.blockedMemberId === senderMemberId,
        )
      ) {
        throw new ChatRepositoryError(
          "chat_member_blocked",
          "Este miembro esta bloqueado para esta conversacion.",
        );
      }

      const createdAt = nextTimestamp();

      nextMessageIndex += 1;
      conversation.messages.push({
        conversationId,
        createdAt,
        id: `chat-message-${nextMessageIndex}`,
        senderMemberId,
        text,
      });
      conversation.updatedAt = createdAt;

      return Promise.resolve(cloneConversation(conversation));
    },
  };

  return repository;
}

function createConversation(input: {
  contactMemberId: string;
  createdAt: string;
  id: string;
  reportId: string;
}): PersistedChatConversation {
  return {
    blockedMemberships: [],
    createdAt: input.createdAt,
    hiddenByMemberIds: [],
    id: input.id,
    messages: [],
    participants: [
      { displayName: "Camila", memberId: "member-camila" },
      { displayName: "Diego", memberId: input.contactMemberId },
    ],
    reports: [],
    subject: {
      href: `rastro://reportes/avistamientos/${input.reportId}`,
      id: input.reportId,
      kind: "sighting-report",
      subtitle: "Sopocachi, La Paz",
      title: "Perro visto cerca de Sopocachi",
    },
    updatedAt: input.createdAt,
  };
}

function requireConversation(
  conversations: Map<string, PersistedChatConversation>,
  id: string,
) {
  const conversation = conversations.get(id);

  if (!conversation) {
    throw new ChatRepositoryError(
      "chat_conversation_not_found",
      "La conversacion no fue encontrada.",
    );
  }

  return conversation;
}

function assertParticipant(
  conversation: PersistedChatConversation,
  memberId: string,
) {
  if (
    !conversation.participants.some(
      (participant) => participant.memberId === memberId,
    )
  ) {
    throw new ChatRepositoryError(
      "chat_conversation_member_required",
      "Solo los miembros de la conversacion pueden usar este chat.",
    );
  }
}

function cloneConversation(
  conversation: PersistedChatConversation,
): PersistedChatConversation {
  return {
    ...conversation,
    blockedMemberships: conversation.blockedMemberships.map((membership) => ({
      ...membership,
    })),
    hiddenByMemberIds: [...conversation.hiddenByMemberIds],
    messages: conversation.messages.map((message) => ({ ...message })),
    participants: [
      { ...conversation.participants[0] },
      { ...conversation.participants[1] },
    ],
    reports: conversation.reports.map((report) => ({ ...report })),
    subject: { ...conversation.subject },
  };
}
