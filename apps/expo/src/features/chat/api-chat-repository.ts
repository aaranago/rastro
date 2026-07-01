import type {
  ChatBlockedMembership,
  ChatConversation,
  ChatConversationReport,
  ChatMessage,
  ChatParticipant,
  ChatRepository,
  ChatSubject,
  GetOrCreateChatConversationInput,
  ReportChatConversationInput,
} from "./chat-model";

export type ApiDateValue = Date | string;

export interface ApiChatConversation {
  blockedMemberships: readonly ApiChatBlockedMembership[];
  createdAt: ApiDateValue;
  hiddenByMemberIds: readonly string[];
  id: string;
  messages: readonly ApiChatMessage[];
  participants: readonly ChatParticipant[];
  reports: readonly ApiChatConversationReport[];
  subject: ChatSubject;
  updatedAt: ApiDateValue;
}

export interface ApiChatMessage extends Omit<ChatMessage, "createdAt"> {
  createdAt: ApiDateValue;
}

export interface ApiChatBlockedMembership
  extends Omit<ChatBlockedMembership, "blockedAt"> {
  blockedAt: ApiDateValue;
}

export interface ApiChatConversationReport
  extends Omit<ChatConversationReport, "createdAt"> {
  createdAt: ApiDateValue;
}

export interface ApiChatClient {
  chat: {
    blockMember: {
      mutate: (input: {
        blockedMemberId: string;
        conversationId: string;
      }) => Promise<ApiChatConversation>;
    };
    detail: {
      query: (input: {
        conversationId: string;
      }) => Promise<ApiChatConversation | null>;
    };
    hideConversation: {
      mutate: (input: {
        conversationId: string;
      }) => Promise<ApiChatConversation>;
    };
    list: {
      query: () => Promise<ApiChatConversation[]>;
    };
    openReportConversation: {
      mutate: (input: { reportId: string }) => Promise<ApiChatConversation>;
    };
    reportConversation: {
      mutate: (input: {
        conversationId: string;
        note?: string;
        reason?: ChatConversationReport["reason"];
      }) => Promise<ApiChatConversation>;
    };
    sendMessage: {
      mutate: (input: {
        conversationId: string;
        text: string;
      }) => Promise<ApiChatConversation>;
    };
  };
}

export interface OpenReportChatConversationInput {
  reportId: string;
}

export interface ApiChatRepository extends ChatRepository {
  openReportConversation: (
    input: OpenReportChatConversationInput,
  ) => Promise<ChatConversation>;
}

export function createApiChatRepository({
  client,
}: {
  client: unknown;
}): ApiChatRepository {
  return {
    blockMember(input) {
      return getChatClient(client)
        .blockMember.mutate({
          blockedMemberId: input.blockedMemberId,
          conversationId: input.conversationId,
        })
        .then(normalizeChatConversation);
    },
    getConversation(input) {
      return getChatClient(client)
        .detail.query({
          conversationId: input.conversationId,
        })
        .then((conversation) =>
          conversation ? normalizeChatConversation(conversation) : null,
        );
    },
    getOrCreateConversation(input) {
      return openReportConversationFromSubject(client, input);
    },
    hideConversation(input) {
      return getChatClient(client)
        .hideConversation.mutate({
          conversationId: input.conversationId,
        })
        .then(normalizeChatConversation);
    },
    listConversations() {
      return getChatClient(client)
        .list.query()
        .then((conversations) => conversations.map(normalizeChatConversation));
    },
    openReportConversation(input) {
      return getChatClient(client)
        .openReportConversation.mutate({
          reportId: input.reportId,
        })
        .then(normalizeChatConversation);
    },
    refreshConversation(input) {
      return getChatClient(client)
        .detail.query({
          conversationId: input.conversationId,
        })
        .then((conversation) =>
          conversation ? normalizeChatConversation(conversation) : null,
        );
    },
    reportConversation(input) {
      return getChatClient(client)
        .reportConversation.mutate(buildReportConversationInput(input))
        .then(normalizeChatConversation);
    },
    sendMessage(input) {
      return getChatClient(client)
        .sendMessage.mutate({
          conversationId: input.conversationId,
          text: input.text,
        })
        .then(normalizeChatConversation);
    },
  };
}

function openReportConversationFromSubject(
  client: unknown,
  input: GetOrCreateChatConversationInput,
) {
  return getChatClient(client)
    .openReportConversation.mutate({
      reportId: input.subject.id,
    })
    .then(normalizeChatConversation);
}

function buildReportConversationInput(input: ReportChatConversationInput) {
  const note = optionalTrimmed(input.note);

  return {
    conversationId: input.conversationId,
    ...(note ? { note } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
  };
}

function normalizeChatConversation(
  conversation: ApiChatConversation,
): ChatConversation {
  return {
    blockedMemberships: conversation.blockedMemberships.map(
      normalizeBlockedMembership,
    ),
    createdAt: normalizeDateValue(conversation.createdAt),
    hiddenByMemberIds: [...conversation.hiddenByMemberIds],
    id: conversation.id,
    messages: conversation.messages.map(normalizeMessage),
    participants: normalizeParticipantPair(conversation.participants),
    reports: conversation.reports.map(normalizeReport),
    subject: { ...conversation.subject },
    updatedAt: normalizeDateValue(conversation.updatedAt),
  };
}

function normalizeMessage(message: ApiChatMessage): ChatMessage {
  return {
    ...message,
    createdAt: normalizeDateValue(message.createdAt),
  };
}

function normalizeBlockedMembership(
  membership: ApiChatBlockedMembership,
): ChatBlockedMembership {
  return {
    ...membership,
    blockedAt: normalizeDateValue(membership.blockedAt),
  };
}

function normalizeReport(
  report: ApiChatConversationReport,
): ChatConversationReport {
  return {
    ...report,
    createdAt: normalizeDateValue(report.createdAt),
  };
}

function normalizeParticipantPair(
  participants: readonly ChatParticipant[],
): [ChatParticipant, ChatParticipant] {
  const first = participants[0];
  const second = participants[1];

  if (!first || !second) {
    throw new Error("Chat API returned a conversation without two members.");
  }

  return [{ ...first }, { ...second }];
}

function normalizeDateValue(value: ApiDateValue) {
  return value instanceof Date ? value.toISOString() : value;
}

function getChatClient(client: unknown): ApiChatClient["chat"] {
  const chat = (client as Partial<ApiChatClient>).chat;

  if (!chat) {
    throw new Error("Chat API client is not available.");
  }

  return chat;
}

function optionalTrimmed(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}
