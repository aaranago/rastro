import type {
  SubmitTrustSafetyReportInput,
  TrustSafetyRepository,
} from "../trust-safety";
import { createInMemoryTrustSafetyRepository } from "../trust-safety";

export type ChatSubjectKind =
  | "adoption-listing"
  | "found-pet-report"
  | "lost-pet-report"
  | "sighting-report";

export interface ChatSubject {
  href: string;
  id: string;
  kind: ChatSubjectKind;
  subtitle: string;
  title: string;
}

export interface ChatParticipant {
  displayName: string;
  memberId: string;
}

export interface ChatMessage {
  conversationId: string;
  createdAt: string;
  id: string;
  senderMemberId: string;
  text: string;
}

export interface ChatConversation {
  blockedMemberships: ChatBlockedMembership[];
  createdAt: string;
  hiddenByMemberIds: string[];
  id: string;
  messages: ChatMessage[];
  participants: [ChatParticipant, ChatParticipant];
  reports: ChatConversationReport[];
  subject: ChatSubject;
  updatedAt: string;
}

export interface ChatBlockedMembership {
  blockedAt: string;
  blockedMemberId: string;
  blockerMemberId: string;
}

export interface ChatConversationReport {
  createdAt: string;
  note?: string;
  reason?: SubmitTrustSafetyReportInput["reason"];
  reporterMemberId: string;
}

export interface ChatNewMessagePushNotification {
  body: string;
  conversationId: string;
  deepLink: string;
  messageId: string;
  recipientMemberId: string;
  senderDisplayName: string;
  title: string;
}

export interface ChatPushNotificationAdapter {
  notifyNewMessage: (
    notification: ChatNewMessagePushNotification,
  ) => Promise<void>;
}

export interface GetOrCreateChatConversationInput {
  participants: readonly ChatParticipant[];
  subject: ChatSubject;
}

export interface GetChatConversationInput {
  conversationId: string;
  viewerMemberId?: string;
}

export interface ListChatConversationsInput {
  viewerMemberId: string;
}

export interface SendChatMessageInput {
  conversationId: string;
  senderMemberId: string;
  text: string;
}

export interface RefreshChatConversationInput {
  conversationId: string;
  viewerMemberId?: string;
}

export interface ReportChatConversationInput {
  conversationId: string;
  note?: string;
  reason?: SubmitTrustSafetyReportInput["reason"];
  reporterMemberId: string;
}

export interface BlockChatMemberInput {
  blockedMemberId: string;
  blockerMemberId: string;
  conversationId: string;
}

export interface HideChatConversationInput {
  conversationId: string;
  viewerMemberId: string;
}

export interface ChatRepository {
  blockMember: (input: BlockChatMemberInput) => Promise<ChatConversation>;
  getConversation: (
    input: GetChatConversationInput,
  ) => Promise<ChatConversation | null>;
  getOrCreateConversation: (
    input: GetOrCreateChatConversationInput,
  ) => Promise<ChatConversation>;
  hideConversation: (
    input: HideChatConversationInput,
  ) => Promise<ChatConversation>;
  listConversations: (
    input: ListChatConversationsInput,
  ) => Promise<ChatConversation[]>;
  refreshConversation: (
    input: RefreshChatConversationInput,
  ) => Promise<ChatConversation | null>;
  reportConversation: (
    input: ReportChatConversationInput,
  ) => Promise<ChatConversation>;
  sendMessage: (input: SendChatMessageInput) => Promise<ChatConversation>;
}

export interface ChatConversationViewModel {
  composer: {
    disabledReason?: string;
    placeholder: string;
    sendLabel: string;
  };
  contactOptionLabel: string;
  controls: {
    block: {
      blockedMemberId: string;
      label: string;
      status: "available" | "blocked_by_viewer" | "viewer_blocked";
      statusLabel?: string;
    };
    hide: {
      label: string;
    };
    report: {
      label: string;
      status: "available" | "reported";
      statusLabel: string;
    };
  };
  conversationId: string;
  emptyState: string;
  messages: ChatConversationMessageViewModel[];
  refreshPolicy: ChatConversationRefreshPolicyViewModel;
  subjectLink: {
    href: string;
    kind: ChatSubjectKind;
    label: string;
    subtitle: string;
    title: string;
  };
  subtitle: string;
  title: string;
}

export interface ChatConversationMessageViewModel {
  authorLabel: string;
  groupPosition: "single" | "first" | "middle" | "last";
  id: string;
  isMine: boolean;
  showSenderLabel: boolean;
  showTimestamp: boolean;
  sentAt: string;
  text: string;
}

export interface ChatConversationRefreshPolicyViewModel {
  alwaysOnSocket: false;
  label: string;
  pollingIntervalMs: number;
  triggers: ["focus", "send", "polling"];
  usesServerSentEvents: false;
  usesWebSocket: false;
}

export interface BuildChatConversationViewModelInput {
  conversation: ChatConversation;
  viewerMemberId: string;
}

export interface InMemoryChatRepositoryOptions {
  now?: () => string;
  pushAdapter?: ChatPushNotificationAdapter;
  trustSafety?: TrustSafetyRepository;
}

type ChatRepositoryErrorCode =
  | "chat_conversation_member_required"
  | "chat_conversation_not_found"
  | "chat_member_blocked"
  | "chat_message_attachments_not_supported"
  | "chat_message_text_required"
  | "chat_participant_required"
  | "chat_subject_required";

class ChatRepositoryError extends Error {
  code: ChatRepositoryErrorCode;

  constructor(code: ChatRepositoryErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "ChatRepositoryError";
  }
}

export function createInMemoryChatRepository(
  options: InMemoryChatRepositoryOptions = {},
): ChatRepository {
  const now = options.now ?? (() => "2026-01-01T00:00:00.000Z");
  const pushAdapter = options.pushAdapter;
  const trustSafety =
    options.trustSafety ?? createInMemoryTrustSafetyRepository({ now });
  const conversations: ChatConversation[] = [];

  return {
    blockMember(input) {
      const conversation = findConversationOrThrow(
        conversations,
        input.conversationId,
      );
      assertConversationParticipant(conversation, input.blockerMemberId);
      assertConversationParticipant(conversation, input.blockedMemberId);

      if (
        !conversation.blockedMemberships.some(
          (membership) =>
            membership.blockerMemberId === input.blockerMemberId &&
            membership.blockedMemberId === input.blockedMemberId,
        )
      ) {
        conversation.blockedMemberships.push({
          blockedAt: now(),
          blockedMemberId: input.blockedMemberId,
          blockerMemberId: input.blockerMemberId,
        });
        conversation.updatedAt =
          conversation.blockedMemberships[
            conversation.blockedMemberships.length - 1
          ]?.blockedAt ?? conversation.updatedAt;
      }

      return Promise.resolve(cloneConversation(conversation));
    },
    getConversation(input) {
      const conversation = conversations.find(
        (candidate) => candidate.id === input.conversationId,
      );

      return Promise.resolve(
        conversation ? cloneConversation(conversation) : null,
      );
    },
    getOrCreateConversation(input) {
      assertSubject(input.subject);
      assertOneToOneParticipants(input.participants);

      const key = buildConversationKey(input.subject, input.participants);
      const existing = conversations.find(
        (conversation) =>
          buildConversationKey(
            conversation.subject,
            conversation.participants,
          ) === key,
      );

      if (existing) {
        return Promise.resolve(cloneConversation(existing));
      }

      const createdAt = now();
      const conversation: ChatConversation = {
        blockedMemberships: [],
        createdAt,
        hiddenByMemberIds: [],
        id: `chat-conversation-${conversations.length + 1}`,
        messages: [],
        participants: cloneParticipantPair(input.participants),
        reports: [],
        subject: { ...input.subject },
        updatedAt: createdAt,
      };

      conversations.push(conversation);

      return Promise.resolve(cloneConversation(conversation));
    },
    hideConversation(input) {
      const conversation = findConversationOrThrow(
        conversations,
        input.conversationId,
      );
      assertConversationParticipant(conversation, input.viewerMemberId);

      if (!conversation.hiddenByMemberIds.includes(input.viewerMemberId)) {
        conversation.hiddenByMemberIds.push(input.viewerMemberId);
        conversation.updatedAt = now();
      }

      return Promise.resolve(cloneConversation(conversation));
    },
    listConversations(input) {
      return Promise.resolve(
        conversations
          .filter((conversation) =>
            conversation.participants.some(
              (participant) => participant.memberId === input.viewerMemberId,
            ),
          )
          .filter(
            (conversation) =>
              !conversation.hiddenByMemberIds.includes(input.viewerMemberId),
          )
          .map(cloneConversation),
      );
    },
    refreshConversation(input) {
      return this.getConversation(input);
    },
    async reportConversation(input) {
      const conversation = findConversationOrThrow(
        conversations,
        input.conversationId,
      );
      assertConversationParticipant(conversation, input.reporterMemberId);

      if (
        !conversation.reports.some(
          (report) => report.reporterMemberId === input.reporterMemberId,
        )
      ) {
        const createdAt = now();

        conversation.reports.push({
          createdAt,
          note: optionalTrimmed(input.note),
          reporterMemberId: input.reporterMemberId,
          ...(input.reason ? { reason: input.reason } : {}),
        });
        conversation.updatedAt = createdAt;
      }

      await trustSafety.submitReport({
        detail: optionalTrimmed(input.note),
        reason: input.reason ?? "other",
        reporterMemberId: input.reporterMemberId,
        targetId: conversation.id,
        targetType: "chat_conversation",
      });

      return cloneConversation(conversation);
    },
    async sendMessage(input) {
      if (hasUnsupportedAttachmentInput(input)) {
        throw new ChatRepositoryError(
          "chat_message_attachments_not_supported",
          "El chat de Rastro solo acepta mensajes de texto.",
        );
      }

      if (input.text.trim().length === 0) {
        throw new ChatRepositoryError(
          "chat_message_text_required",
          "Escribe un mensaje para enviarlo.",
        );
      }

      const conversation = findConversationOrThrow(
        conversations,
        input.conversationId,
      );
      assertConversationParticipant(conversation, input.senderMemberId);
      assertMemberCanSend(conversation, input.senderMemberId);

      const message: ChatMessage = {
        conversationId: conversation.id,
        createdAt: now(),
        id: `chat-message-${countMessages(conversations) + 1}`,
        senderMemberId: input.senderMemberId,
        text: input.text.trim(),
      };

      conversation.messages.push(message);
      conversation.updatedAt = message.createdAt;

      const sender = getParticipant(conversation, input.senderMemberId);
      const recipient = conversation.participants.find(
        (participant) => participant.memberId !== input.senderMemberId,
      );

      if (pushAdapter && recipient) {
        await pushAdapter.notifyNewMessage({
          body: `${sender.displayName}: ${message.text}`,
          conversationId: conversation.id,
          deepLink: buildChatDeepLink(conversation.id),
          messageId: message.id,
          recipientMemberId: recipient.memberId,
          senderDisplayName: sender.displayName,
          title: "Nuevo mensaje en Rastro",
        });
      }

      return cloneConversation(conversation);
    },
  };
}

export function buildChatConversationViewModel({
  conversation,
  viewerMemberId,
}: BuildChatConversationViewModelInput): ChatConversationViewModel {
  const viewer = getParticipant(conversation, viewerMemberId);
  const otherParticipant =
    conversation.participants.find(
      (participant) => participant.memberId !== viewer.memberId,
    ) ?? viewer;
  const isReported = conversation.reports.some(
    (report) => report.reporterMemberId === viewerMemberId,
  );
  const isBlocked = conversation.blockedMemberships.some(
    (membership) =>
      membership.blockerMemberId === viewerMemberId &&
      membership.blockedMemberId === otherParticipant.memberId,
  );
  const isViewerBlocked = conversation.blockedMemberships.some(
    (membership) =>
      membership.blockerMemberId === otherParticipant.memberId &&
      membership.blockedMemberId === viewerMemberId,
  );
  const blockStatus = getChatBlockStatus({
    isBlocked,
    isViewerBlocked,
  });

  return {
    composer: {
      disabledReason: getChatComposerDisabledReason(blockStatus),
      placeholder: "Escribe un mensaje",
      sendLabel: "Enviar",
    },
    contactOptionLabel: "Chat en Rastro",
    controls: {
      block: {
        blockedMemberId: otherParticipant.memberId,
        label:
          blockStatus === "available"
            ? `Bloquear a ${otherParticipant.displayName}`
            : "Chat bloqueado",
        status: blockStatus,
        statusLabel: getChatBlockStatusLabel({
          otherParticipantName: otherParticipant.displayName,
          status: blockStatus,
        }),
      },
      hide: {
        label: "Ocultar conversacion",
      },
      report: {
        label: isReported ? "Chat reportado" : "Reportar chat",
        status: isReported ? "reported" : "available",
        statusLabel: isReported
          ? "Reporte enviado. Moderación revisará este chat."
          : "Rastro puede revisar este chat y el reporte vinculado.",
      },
    },
    conversationId: conversation.id,
    emptyState: "Aun no hay mensajes.",
    messages: buildGroupedMessageViewModels({
      messages: conversation.messages,
      otherParticipantName: otherParticipant.displayName,
      viewerMemberId: viewer.memberId,
    }),
    refreshPolicy: {
      alwaysOnSocket: false,
      label: "Se actualiza al abrir, enviar y por sondeo.",
      pollingIntervalMs: 30_000,
      triggers: ["focus", "send", "polling"],
      usesServerSentEvents: false,
      usesWebSocket: false,
    },
    subjectLink: {
      href: conversation.subject.href,
      kind: conversation.subject.kind,
      label: buildSubjectLinkLabel(conversation.subject.kind),
      subtitle: conversation.subject.subtitle,
      title: conversation.subject.title,
    },
    subtitle: conversation.subject.subtitle,
    title: otherParticipant.displayName,
  };
}

function buildGroupedMessageViewModels({
  messages,
  otherParticipantName,
  viewerMemberId,
}: {
  messages: readonly ChatMessage[];
  otherParticipantName: string;
  viewerMemberId: string;
}): ChatConversationMessageViewModel[] {
  const sortedMessages = [...messages].sort(compareMessagesByCreatedAt);

  return sortedMessages.map((message, index) => {
    const previousMessage = sortedMessages[index - 1];
    const nextMessage = sortedMessages[index + 1];
    const followsPrevious = previousMessage
      ? areMessagesGrouped(previousMessage, message)
      : false;
    const continuesNext = nextMessage
      ? areMessagesGrouped(message, nextMessage)
      : false;

    return {
      authorLabel:
        message.senderMemberId === viewerMemberId ? "Tu" : otherParticipantName,
      groupPosition: getMessageGroupPosition({
        continuesNext,
        followsPrevious,
      }),
      id: message.id,
      isMine: message.senderMemberId === viewerMemberId,
      showSenderLabel:
        message.senderMemberId !== viewerMemberId && !followsPrevious,
      showTimestamp: !continuesNext,
      sentAt: message.createdAt,
      text: message.text,
    };
  });
}

function areMessagesGrouped(left: ChatMessage, right: ChatMessage) {
  if (left.senderMemberId !== right.senderMemberId) {
    return false;
  }

  const leftTime = new Date(left.createdAt).getTime();
  const rightTime = new Date(right.createdAt).getTime();

  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
    return false;
  }

  return rightTime - leftTime <= 5 * 60 * 1000;
}

function getMessageGroupPosition({
  continuesNext,
  followsPrevious,
}: {
  continuesNext: boolean;
  followsPrevious: boolean;
}): ChatConversationMessageViewModel["groupPosition"] {
  if (!followsPrevious && !continuesNext) {
    return "single";
  }

  if (!followsPrevious) {
    return "first";
  }

  return continuesNext ? "middle" : "last";
}

function getChatBlockStatus({
  isBlocked,
  isViewerBlocked,
}: {
  isBlocked: boolean;
  isViewerBlocked: boolean;
}): ChatConversationViewModel["controls"]["block"]["status"] {
  if (isBlocked) {
    return "blocked_by_viewer";
  }

  return isViewerBlocked ? "viewer_blocked" : "available";
}

function getChatComposerDisabledReason(
  status: ChatConversationViewModel["controls"]["block"]["status"],
) {
  if (status === "blocked_by_viewer") {
    return "Chat bloqueado";
  }

  if (status === "viewer_blocked") {
    return "No puedes enviar mensajes porque este chat fue bloqueado.";
  }

  return undefined;
}

function getChatBlockStatusLabel({
  otherParticipantName,
  status,
}: {
  otherParticipantName: string;
  status: ChatConversationViewModel["controls"]["block"]["status"];
}) {
  if (status === "blocked_by_viewer") {
    return `Bloqueaste a ${otherParticipantName}. No podrá responder en este chat.`;
  }

  if (status === "viewer_blocked") {
    return "No puedes enviar mensajes porque este chat fue bloqueado.";
  }

  return undefined;
}

function hasUnsupportedAttachmentInput(input: SendChatMessageInput) {
  const keys = [
    "attachment",
    "attachments",
    "file",
    "files",
    "image",
    "images",
    "media",
    "photo",
    "photos",
  ];

  return keys.some((key) => Object.prototype.hasOwnProperty.call(input, key));
}

function findConversationOrThrow(
  conversations: readonly ChatConversation[],
  conversationId: string,
) {
  const conversation = conversations.find(
    (candidate) => candidate.id === conversationId,
  );

  if (!conversation) {
    throw new ChatRepositoryError(
      "chat_conversation_not_found",
      "La conversacion no fue encontrada.",
    );
  }

  return conversation;
}

function assertConversationParticipant(
  conversation: ChatConversation,
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

function assertMemberCanSend(conversation: ChatConversation, memberId: string) {
  if (
    conversation.blockedMemberships.some(
      (membership) => membership.blockedMemberId === memberId,
    )
  ) {
    throw new ChatRepositoryError(
      "chat_member_blocked",
      "Este miembro esta bloqueado para esta conversacion.",
    );
  }
}

function getParticipant(conversation: ChatConversation, memberId: string) {
  const participant = conversation.participants.find(
    (candidate) => candidate.memberId === memberId,
  );

  if (!participant) {
    throw new ChatRepositoryError(
      "chat_conversation_member_required",
      "Solo los miembros de la conversacion pueden usar este chat.",
    );
  }

  return participant;
}

function countMessages(conversations: readonly ChatConversation[]) {
  return conversations.reduce(
    (count, conversation) => count + conversation.messages.length,
    0,
  );
}

function buildChatDeepLink(conversationId: string) {
  return `rastro://chats/${conversationId}`;
}

function optionalTrimmed(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed;
}

function compareMessagesByCreatedAt(left: ChatMessage, right: ChatMessage) {
  const createdAtComparison = left.createdAt.localeCompare(right.createdAt);

  if (createdAtComparison !== 0) {
    return createdAtComparison;
  }

  return left.id.localeCompare(right.id);
}

function buildSubjectLinkLabel(kind: ChatSubjectKind) {
  if (kind === "adoption-listing") {
    return "Ver adopcion relacionada";
  }

  return "Ver reporte relacionado";
}

function assertSubject(subject: ChatSubject) {
  if (subject.id.trim().length === 0 || subject.href.trim().length === 0) {
    throw new ChatRepositoryError(
      "chat_subject_required",
      "La conversacion debe estar vinculada a un reporte o adopcion.",
    );
  }
}

function assertOneToOneParticipants(
  participants: readonly ChatParticipant[],
): asserts participants is readonly [ChatParticipant, ChatParticipant] {
  const memberIds = participants.map((participant) =>
    participant.memberId.trim(),
  );

  if (
    memberIds.length !== 2 ||
    memberIds.some((memberId) => memberId.length === 0) ||
    new Set(memberIds).size !== 2
  ) {
    throw new ChatRepositoryError(
      "chat_participant_required",
      "El chat de Rastro es uno a uno entre dos miembros.",
    );
  }
}

function buildConversationKey(
  subject: ChatSubject,
  participants: readonly ChatParticipant[],
) {
  return [
    subject.kind,
    subject.id,
    ...participants
      .map((participant) => participant.memberId)
      .sort((left, right) => left.localeCompare(right)),
  ].join(":");
}

function cloneParticipantPair(
  participants: readonly [ChatParticipant, ChatParticipant],
): [ChatParticipant, ChatParticipant] {
  return [{ ...participants[0] }, { ...participants[1] }];
}

function cloneConversation(conversation: ChatConversation): ChatConversation {
  return {
    ...conversation,
    blockedMemberships: conversation.blockedMemberships.map((membership) => ({
      ...membership,
    })),
    hiddenByMemberIds: [...conversation.hiddenByMemberIds],
    messages: conversation.messages.map((message) => ({ ...message })),
    participants: cloneParticipantPair(conversation.participants),
    reports: conversation.reports.map((report) => ({ ...report })),
    subject: { ...conversation.subject },
  };
}
