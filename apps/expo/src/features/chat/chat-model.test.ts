import { describe, expect, it } from "vitest";

import type {
  ChatNewMessagePushNotification,
  ChatParticipant,
  ChatPushNotificationAdapter,
  ChatSubject,
  SendChatMessageInput,
} from "./chat-model";
import {
  buildChatConversationViewModel,
  createInMemoryChatRepository,
} from "./chat-model";

const caretaker: ChatParticipant = {
  displayName: "Camila",
  memberId: "member-camila",
};

const finder: ChatParticipant = {
  displayName: "Diego",
  memberId: "member-diego",
};

const lostReportSubject: ChatSubject = {
  href: "rastro://reportes/perdidos/lost-report-1",
  id: "lost-report-1",
  kind: "lost-pet-report",
  subtitle: "Sopocachi",
  title: "Toby",
};

describe("Chat repository", () => {
  it("opens exactly one one-to-one conversation for a report subject and member pair regardless of participant order", async () => {
    const repository = createInMemoryChatRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });

    const created = await repository.getOrCreateConversation({
      participants: [caretaker, finder],
      subject: lostReportSubject,
    });
    const reused = await repository.getOrCreateConversation({
      participants: [finder, caretaker],
      subject: lostReportSubject,
    });
    const listedForCaretaker = await repository.listConversations({
      viewerMemberId: caretaker.memberId,
    });

    expect(reused.id).toBe(created.id);
    expect(created).toMatchObject({
      createdAt: "2026-06-18T12:00:00.000Z",
      messages: [],
      subject: lostReportSubject,
    });
    expect(
      created.participants.map((participant) => participant.memberId),
    ).toEqual([caretaker.memberId, finder.memberId]);
    expect(listedForCaretaker.map((conversation) => conversation.id)).toEqual([
      created.id,
    ]);
  });

  it("stores a trimmed text-only message in the conversation", async () => {
    const repository = createInMemoryChatRepository({
      now: () => "2026-06-18T12:05:00.000Z",
    });
    const conversation = await repository.getOrCreateConversation({
      participants: [caretaker, finder],
      subject: lostReportSubject,
    });

    const updated = await repository.sendMessage({
      conversationId: conversation.id,
      senderMemberId: finder.memberId,
      text: "  Lo vi cerca de la plaza.  ",
    });
    const refreshed = await repository.refreshConversation({
      conversationId: conversation.id,
      viewerMemberId: caretaker.memberId,
    });

    expect(updated.messages).toEqual([
      {
        conversationId: conversation.id,
        createdAt: "2026-06-18T12:05:00.000Z",
        id: "chat-message-1",
        senderMemberId: finder.memberId,
        text: "Lo vi cerca de la plaza.",
      },
    ]);
    expect(refreshed?.messages).toEqual(updated.messages);
  });

  it("rejects empty messages and attachment-like inputs at the public send boundary", async () => {
    const repository = createInMemoryChatRepository();
    const conversation = await repository.getOrCreateConversation({
      participants: [caretaker, finder],
      subject: lostReportSubject,
    });

    await expect(
      repository.sendMessage({
        conversationId: conversation.id,
        senderMemberId: finder.memberId,
        text: "   ",
      }),
    ).rejects.toMatchObject({
      code: "chat_message_text_required",
    });

    await expect(
      repository.sendMessage({
        attachment: { uri: "file:///toby.png" },
        conversationId: conversation.id,
        senderMemberId: finder.memberId,
        text: "Te mando una foto.",
      } as unknown as SendChatMessageInput),
    ).rejects.toMatchObject({
      code: "chat_message_attachments_not_supported",
    });
  });

  it("notifies the other participant about a new message through the injected push adapter with a chat deep link", async () => {
    const notifications: ChatNewMessagePushNotification[] = [];
    const pushAdapter: ChatPushNotificationAdapter = {
      notifyNewMessage(notification) {
        notifications.push(notification);

        return Promise.resolve();
      },
    };
    const repository = createInMemoryChatRepository({
      now: () => "2026-06-18T12:10:00.000Z",
      pushAdapter,
    });
    const conversation = await repository.getOrCreateConversation({
      participants: [caretaker, finder],
      subject: lostReportSubject,
    });

    await repository.sendMessage({
      conversationId: conversation.id,
      senderMemberId: finder.memberId,
      text: "Lo vi cerca de la plaza.",
    });

    expect(notifications).toEqual([
      {
        body: "Diego: Lo vi cerca de la plaza.",
        conversationId: conversation.id,
        deepLink: "rastro://chats/chat-conversation-1",
        messageId: "chat-message-1",
        recipientMemberId: caretaker.memberId,
        senderDisplayName: "Diego",
        title: "Nuevo mensaje en Rastro",
      },
    ]);
  });

  it("blocks future sends from a blocked member and lets the blocker hide the conversation", async () => {
    const repository = createInMemoryChatRepository({
      now: () => "2026-06-18T12:15:00.000Z",
    });
    const conversation = await repository.getOrCreateConversation({
      participants: [caretaker, finder],
      subject: lostReportSubject,
    });

    const blocked = await repository.blockMember({
      blockedMemberId: finder.memberId,
      blockerMemberId: caretaker.memberId,
      conversationId: conversation.id,
    });

    expect(blocked.blockedMemberships).toEqual([
      {
        blockedAt: "2026-06-18T12:15:00.000Z",
        blockedMemberId: finder.memberId,
        blockerMemberId: caretaker.memberId,
      },
    ]);
    await expect(
      repository.sendMessage({
        conversationId: conversation.id,
        senderMemberId: finder.memberId,
        text: "Sigues ahi?",
      }),
    ).rejects.toMatchObject({
      code: "chat_member_blocked",
    });

    await repository.hideConversation({
      conversationId: conversation.id,
      viewerMemberId: caretaker.memberId,
    });

    await expect(
      repository.listConversations({ viewerMemberId: caretaker.memberId }),
    ).resolves.toEqual([]);
    expect(
      await repository.listConversations({ viewerMemberId: finder.memberId }),
    ).toHaveLength(1);
  });

  it("records a conversation report and surfaces the reported control state in the view model", async () => {
    const repository = createInMemoryChatRepository({
      now: () => "2026-06-18T12:20:00.000Z",
    });
    const conversation = await repository.getOrCreateConversation({
      participants: [caretaker, finder],
      subject: lostReportSubject,
    });

    const reported = await repository.reportConversation({
      conversationId: conversation.id,
      note: "Mensaje sospechoso.",
      reporterMemberId: finder.memberId,
    });
    const viewModel = buildChatConversationViewModel({
      conversation: reported,
      viewerMemberId: finder.memberId,
    });

    expect(reported.reports).toEqual([
      {
        createdAt: "2026-06-18T12:20:00.000Z",
        note: "Mensaje sospechoso.",
        reporterMemberId: finder.memberId,
      },
    ]);
    expect(viewModel.controls.report).toEqual({
      isReported: true,
      label: "Reportar conversacion",
      statusLabel: "Ya reportaste esta conversacion.",
    });
  });

  it("builds a Spanish-first view model with ordered messages, a report link, controls, and polling refresh policy", async () => {
    let timestamp = "2026-06-18T12:25:00.000Z";
    const repository = createInMemoryChatRepository({
      now: () => timestamp,
    });
    const conversation = await repository.getOrCreateConversation({
      participants: [caretaker, finder],
      subject: lostReportSubject,
    });

    timestamp = "2026-06-18T12:30:00.000Z";
    await repository.sendMessage({
      conversationId: conversation.id,
      senderMemberId: caretaker.memberId,
      text: "Gracias por avisar.",
    });
    timestamp = "2026-06-18T12:28:00.000Z";
    const refreshed = await repository.sendMessage({
      conversationId: conversation.id,
      senderMemberId: finder.memberId,
      text: "Lo vi cerca de la plaza.",
    });

    const viewModel = buildChatConversationViewModel({
      conversation: refreshed,
      viewerMemberId: caretaker.memberId,
    });
    const visibleCopy = [
      viewModel.composer.placeholder,
      viewModel.composer.sendLabel,
      viewModel.contactOptionLabel,
      viewModel.controls.block.label,
      viewModel.controls.hide.label,
      viewModel.controls.report.label,
      viewModel.controls.report.statusLabel,
      viewModel.emptyState,
      viewModel.refreshPolicy.label,
      viewModel.subjectLink.label,
      viewModel.subtitle,
      viewModel.title,
    ].join(" ");

    expect(viewModel).toMatchObject({
      composer: {
        placeholder: "Escribe un mensaje",
        sendLabel: "Enviar",
      },
      contactOptionLabel: "Chat en Rastro",
      controls: {
        block: {
          blockedMemberId: finder.memberId,
          isBlocked: false,
          label: "Bloquear miembro",
        },
        hide: {
          label: "Ocultar conversacion",
        },
        report: {
          isReported: false,
          label: "Reportar conversacion",
        },
      },
      refreshPolicy: {
        alwaysOnSocket: false,
        pollingIntervalMs: 30000,
        triggers: ["focus", "send", "polling"],
        usesServerSentEvents: false,
        usesWebSocket: false,
      },
      subjectLink: {
        href: lostReportSubject.href,
        kind: "lost-pet-report",
        label: "Ver reporte relacionado",
        subtitle: "Sopocachi",
        title: "Toby",
      },
      subtitle: "Sopocachi",
      title: "Diego",
    });
    expect(viewModel.messages.map((message) => message.text)).toEqual([
      "Lo vi cerca de la plaza.",
      "Gracias por avisar.",
    ]);
    expect(visibleCopy.toLocaleLowerCase("es-BO")).not.toMatch(
      /comentarios|comentario|grupo|adjuntos|adjunto|archivos|archivo|dm|mensaje directo/,
    );
  });
});
