import { describe, expect, it, vi } from "vitest";

import type { ApiChatClient, ApiChatConversation } from "./api-chat-repository";
import { createApiChatRepository } from "./api-chat-repository";

describe("API chat repository", () => {
  it("maps server conversations to the ChatRepository conversation shape", async () => {
    const serverConversation = createApiConversation();
    const client = createApiChatClient({
      detail: serverConversation,
      list: [serverConversation],
    });
    const repository = createApiChatRepository({ client });

    await expect(
      repository.getConversation({
        conversationId: serverConversation.id,
        viewerMemberId: "member-camila",
      }),
    ).resolves.toMatchObject({
      blockedMemberships: [
        {
          blockedAt: "2026-06-30T13:06:00.000Z",
          blockedMemberId: "member-diego",
          blockerMemberId: "member-camila",
        },
      ],
      createdAt: "2026-06-30T13:00:00.000Z",
      messages: [
        {
          createdAt: "2026-06-30T13:05:00.000Z",
          id: "message-1",
          senderMemberId: "member-diego",
          text: "Vi a Toby cerca de la plaza.",
        },
      ],
      participants: [
        { displayName: "Camila", memberId: "member-camila" },
        { displayName: "Diego", memberId: "member-diego" },
      ],
      reports: [
        {
          createdAt: "2026-06-30T13:07:00.000Z",
          note: "Mensaje sospechoso",
          reason: "spam",
          reporterMemberId: "member-camila",
        },
      ],
      updatedAt: "2026-06-30T13:07:00.000Z",
    });
    await expect(
      repository.listConversations({ viewerMemberId: "member-camila" }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: serverConversation.id,
        updatedAt: "2026-06-30T13:07:00.000Z",
      }),
    ]);
  });

  it("opens a report conversation from the repository get-or-create contract without sending client participant ids", async () => {
    const serverConversation = createApiConversation();
    const client = createApiChatClient({
      openReportConversation: serverConversation,
    });
    const repository = createApiChatRepository({ client });

    await repository.getOrCreateConversation({
      participants: [
        { displayName: "Persona falsa", memberId: "member-spoofed" },
        { displayName: "Otra persona", memberId: "member-other" },
      ],
      subject: {
        href: "rastro://reportes/perdidos/report-lost-1",
        id: "report-lost-1",
        kind: "lost-pet-report",
        subtitle: "Sopocachi",
        title: "Toby",
      },
    });

    expect(client.chat.openReportConversation.mutate).toHaveBeenCalledWith({
      reportId: "report-lost-1",
    });
  });

  it("does not forward spoofable sender, blocker, reporter, or viewer ids to chat mutations", async () => {
    const serverConversation = createApiConversation();
    const client = createApiChatClient({
      blockMember: serverConversation,
      hideConversation: serverConversation,
      reportConversation: serverConversation,
      sendMessage: serverConversation,
    });
    const repository = createApiChatRepository({ client });

    await repository.sendMessage({
      conversationId: serverConversation.id,
      senderMemberId: "member-spoofed-sender",
      text: "  Hola  ",
    });
    await repository.blockMember({
      blockedMemberId: "member-diego",
      blockerMemberId: "member-spoofed-blocker",
      conversationId: serverConversation.id,
    });
    await repository.reportConversation({
      conversationId: serverConversation.id,
      note: "  Revisa esto  ",
      reason: "spam",
      reporterMemberId: "member-spoofed-reporter",
    });
    await repository.hideConversation({
      conversationId: serverConversation.id,
      viewerMemberId: "member-spoofed-viewer",
    });

    expect(client.chat.sendMessage.mutate).toHaveBeenCalledWith({
      conversationId: serverConversation.id,
      text: "  Hola  ",
    });
    expect(client.chat.blockMember.mutate).toHaveBeenCalledWith({
      blockedMemberId: "member-diego",
      conversationId: serverConversation.id,
    });
    expect(client.chat.reportConversation.mutate).toHaveBeenCalledWith({
      conversationId: serverConversation.id,
      note: "Revisa esto",
      reason: "spam",
    });
    expect(client.chat.hideConversation.mutate).toHaveBeenCalledWith({
      conversationId: serverConversation.id,
    });
  });

  it("opens report conversations through the explicit API adapter method", async () => {
    const serverConversation = createApiConversation();
    const client = createApiChatClient({
      openReportConversation: serverConversation,
    });
    const repository = createApiChatRepository({ client });

    await expect(
      repository.openReportConversation({ reportId: "report-lost-1" }),
    ).resolves.toMatchObject({
      id: serverConversation.id,
      subject: {
        id: "report-lost-1",
      },
    });
    expect(client.chat.openReportConversation.mutate).toHaveBeenCalledWith({
      reportId: "report-lost-1",
    });
  });
});

function createApiChatClient(
  overrides: Partial<{
    blockMember: ApiChatConversation;
    detail: ApiChatConversation | null;
    hideConversation: ApiChatConversation;
    list: ApiChatConversation[];
    openReportConversation: ApiChatConversation;
    reportConversation: ApiChatConversation;
    sendMessage: ApiChatConversation;
  }> = {},
): ApiChatClient {
  const fallbackConversation = createApiConversation();

  return {
    chat: {
      blockMember: {
        mutate: vi
          .fn()
          .mockResolvedValue(overrides.blockMember ?? fallbackConversation),
      },
      detail: {
        query: vi
          .fn()
          .mockResolvedValue(
            overrides.detail === undefined
              ? fallbackConversation
              : overrides.detail,
          ),
      },
      hideConversation: {
        mutate: vi
          .fn()
          .mockResolvedValue(
            overrides.hideConversation ?? fallbackConversation,
          ),
      },
      list: {
        query: vi.fn().mockResolvedValue(overrides.list ?? []),
      },
      openReportConversation: {
        mutate: vi
          .fn()
          .mockResolvedValue(
            overrides.openReportConversation ?? fallbackConversation,
          ),
      },
      reportConversation: {
        mutate: vi
          .fn()
          .mockResolvedValue(
            overrides.reportConversation ?? fallbackConversation,
          ),
      },
      sendMessage: {
        mutate: vi
          .fn()
          .mockResolvedValue(overrides.sendMessage ?? fallbackConversation),
      },
    },
  };
}

function createApiConversation(): ApiChatConversation {
  return {
    blockedMemberships: [
      {
        blockedAt: new Date("2026-06-30T13:06:00.000Z"),
        blockedMemberId: "member-diego",
        blockerMemberId: "member-camila",
      },
    ],
    createdAt: new Date("2026-06-30T13:00:00.000Z"),
    hiddenByMemberIds: [],
    id: "chat-conversation-1",
    messages: [
      {
        conversationId: "chat-conversation-1",
        createdAt: new Date("2026-06-30T13:05:00.000Z"),
        id: "message-1",
        senderMemberId: "member-diego",
        text: "Vi a Toby cerca de la plaza.",
      },
    ],
    participants: [
      { displayName: "Camila", memberId: "member-camila" },
      { displayName: "Diego", memberId: "member-diego" },
    ],
    reports: [
      {
        createdAt: new Date("2026-06-30T13:07:00.000Z"),
        note: "Mensaje sospechoso",
        reason: "spam",
        reporterMemberId: "member-camila",
      },
    ],
    subject: {
      href: "rastro://reportes/perdidos/report-lost-1",
      id: "report-lost-1",
      kind: "lost-pet-report",
      subtitle: "Sopocachi",
      title: "Toby",
    },
    updatedAt: new Date("2026-06-30T13:07:00.000Z"),
  };
}
