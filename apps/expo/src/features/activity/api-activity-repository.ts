import type {
  ActivityAlertDelivery,
  ActivityChatSummary,
  ActivityChatSummaryLastMessage,
  ActivityChatSummaryParticipant,
  ActivityChatSummarySubject,
  ActivityInbox,
  ActivityInboxQuery,
  ActivityRepository,
} from "./activity-model";

export type ApiDateValue = Date | string;

export interface ApiActivityAlertDelivery {
  body: string;
  id: string;
  deepLink: string;
  failedAt: ApiDateValue | null;
  failureReason: string | null;
  matchedAt: ApiDateValue;
  pushTokenId: string | null;
  reportId: string;
  sentAt: ApiDateValue | null;
  status: string;
  subscriptionId: string;
  title: string;
}

export interface ApiActivityChatConversation {
  href: string;
  id: string;
  latestMessage: ApiActivityChatLastMessage | null;
  otherParticipant: ApiActivityChatParticipant;
  subject: ApiActivityChatSubject;
  updatedAt: ApiDateValue;
}

export interface ApiActivityAlertDeliveryItem {
  delivery: ApiActivityAlertDelivery;
  id: string;
  occurredAt: ApiDateValue;
  type: "alert_delivery";
}

export interface ApiActivityChatConversationItem {
  conversation: ApiActivityChatConversation;
  id: string;
  occurredAt: ApiDateValue;
  type: "chat_conversation";
}

export interface ApiActivityChatSubject {
  href: string;
  id: string;
  kind: string;
  subtitle?: string | null;
  title: string;
}

export interface ApiActivityChatParticipant {
  displayName: string;
  memberId?: string | null;
}

export interface ApiActivityChatLastMessage {
  authorLabel?: string | null;
  createdAt?: ApiDateValue;
  id: string;
  occurredAt?: ApiDateValue;
  senderMemberId?: string | null;
  sentAt?: ApiDateValue;
  text: string;
}

export type ApiActivityInboxItem =
  | ApiActivityAlertDeliveryItem
  | ApiActivityChatConversationItem;

export interface ApiActivityInboxOutput {
  items: readonly ApiActivityInboxItem[];
}

interface ApiActivityClient {
  activity: {
    inbox: {
      query: (input: ActivityInboxQuery) => Promise<ApiActivityInboxOutput>;
    };
  };
}

export function createApiActivityRepository({
  client,
}: {
  client: unknown;
}): ActivityRepository {
  return {
    getInbox(input) {
      return getActivityClient(client)
        .inbox.query(buildInboxQuery(input))
        .then(normalizeActivityInbox);
    },
  };
}

function buildInboxQuery(input: ActivityInboxQuery): ActivityInboxQuery {
  return typeof input.limit === "number" ? { limit: input.limit } : {};
}

function normalizeActivityInbox(output: ApiActivityInboxOutput): ActivityInbox {
  const alertDeliveries: ActivityAlertDelivery[] = [];
  const chatSummaries: ActivityChatSummary[] = [];

  for (const item of output.items) {
    if (item.type === "alert_delivery") {
      alertDeliveries.push(normalizeAlertDeliveryItem(item));
      continue;
    }

    chatSummaries.push(normalizeChatSummaryItem(item));
  }

  return {
    alertDeliveries,
    chatSummaries,
  };
}

function normalizeAlertDeliveryItem(
  item: ApiActivityAlertDeliveryItem,
): ActivityAlertDelivery {
  const delivery = item.delivery;

  return {
    body: delivery.body,
    deliveryId: delivery.id,
    href: delivery.deepLink,
    id: delivery.id,
    occurredAt: normalizeDateValue(item.occurredAt),
    reportId: delivery.reportId,
    status: delivery.status,
    title: delivery.title,
  };
}

function normalizeChatSummaryItem(
  item: ApiActivityChatConversationItem,
): ActivityChatSummary {
  const conversation = item.conversation;

  return {
    conversationId: conversation.id,
    href: conversation.href,
    id: conversation.id,
    lastMessage: normalizeLastMessage(conversation.latestMessage),
    occurredAt: normalizeDateValue(item.occurredAt),
    otherParticipant: normalizeParticipant(conversation.otherParticipant),
    subject: normalizeSubject(conversation.subject),
  };
}

function normalizeSubject(
  subject: ApiActivityChatSubject,
): ActivityChatSummarySubject {
  return {
    href: subject.href,
    id: subject.id,
    kind: subject.kind,
    ...(subject.subtitle ? { subtitle: subject.subtitle } : {}),
    title: subject.title,
  };
}

function normalizeParticipant(
  participant: ApiActivityChatParticipant,
): ActivityChatSummaryParticipant {
  return {
    displayName: participant.displayName,
    ...(participant.memberId ? { memberId: participant.memberId } : {}),
  };
}

function normalizeLastMessage(
  message: ApiActivityChatLastMessage | null,
): ActivityChatSummaryLastMessage | null {
  if (!message) {
    return null;
  }

  const sentAt = message.sentAt ?? message.createdAt ?? message.occurredAt;

  return {
    ...(message.authorLabel ? { authorLabel: message.authorLabel } : {}),
    id: message.id,
    ...(message.senderMemberId
      ? { senderMemberId: message.senderMemberId }
      : {}),
    ...(sentAt ? { sentAt: normalizeDateValue(sentAt) } : {}),
    text: message.text,
  };
}

function normalizeDateValue(value: ApiDateValue) {
  return value instanceof Date ? value.toISOString() : value;
}

function getActivityClient(client: unknown): ApiActivityClient["activity"] {
  const activity = (client as Partial<ApiActivityClient>).activity;

  if (!activity) {
    throw new Error("Activity API client is not available.");
  }

  return activity;
}
