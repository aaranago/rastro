import type { LastLoadedCache } from "../resilience/last-loaded-cache";
import type {
  ActivityAlertDelivery,
  ActivityCandidateMatch,
  ActivityChatSummary,
  ActivityChatSummaryLastMessage,
  ActivityChatSummaryParticipant,
  ActivityChatSummarySubject,
  ActivityInbox,
  ActivityInboxQuery,
  ActivityModerationEvent,
  ActivityOwnedReportPrompt,
  ActivityReportSummary,
  ActivityReportUpdate,
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

export interface ApiActivityCandidateMatch {
  candidate: ApiActivityCandidateMatchCandidate;
  confidence: ActivityCandidateMatch["confidence"];
  createdAt: ApiDateValue;
  id: string;
  locationLabel: string | null;
  ownedReport: ApiActivityReportSummary;
}

export interface ApiActivityCandidateMatchCandidate
  extends ApiActivityReportSummary {
  kind: ActivityCandidateMatch["candidate"]["kind"];
}

export interface ApiActivityCandidateMatchItem {
  id: string;
  match: ApiActivityCandidateMatch;
  occurredAt: ApiDateValue;
  type: "candidate_match";
}

export interface ApiActivityReportSummary {
  availability: ActivityReportSummary["availability"];
  href: string;
  id: string;
  kind: ActivityReportSummary["kind"];
  outcome: ActivityReportSummary["outcome"];
  status: ActivityReportSummary["status"];
  title: string;
  type: ActivityReportSummary["type"];
}

export interface ApiActivityReportUpdate {
  actorMemberId: string | null;
  eventType: ActivityReportUpdate["eventType"];
  fromStatus: ActivityReportUpdate["fromStatus"];
  id: string;
  note: string | null;
  outcome: ActivityReportUpdate["outcome"];
  report: ApiActivityReportSummary;
  toStatus: ActivityReportUpdate["toStatus"];
}

export interface ApiActivityReportUpdateItem {
  id: string;
  occurredAt: ApiDateValue;
  type: "report_update";
  update: ApiActivityReportUpdate;
}

export interface ApiActivityModerationEvent {
  action: ActivityModerationEvent["action"];
  adminId: string | null;
  id: string;
  note: string | null;
  reason: string;
  report: ApiActivityReportSummary;
}

export interface ApiActivityModerationEventItem {
  event: ApiActivityModerationEvent;
  id: string;
  occurredAt: ApiDateValue;
  type: "moderation_event";
}

export interface ApiActivityOwnedReportPrompt {
  lastConfirmedAt: ApiDateValue;
  report: ApiActivityReportSummary;
  staleAfterDays: number;
}

export interface ApiActivityOwnedReportPromptItem {
  id: string;
  occurredAt: ApiDateValue;
  prompt: ApiActivityOwnedReportPrompt;
  type: "owned_report_prompt";
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
  | ApiActivityCandidateMatchItem
  | ApiActivityChatConversationItem
  | ApiActivityOwnedReportPromptItem
  | ApiActivityReportUpdateItem
  | ApiActivityModerationEventItem;

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

export function createCachedActivityRepository({
  cache,
  cacheKey,
  source,
}: {
  cache: LastLoadedCache<ActivityInbox>;
  cacheKey: string | ((input: ActivityInboxQuery) => string);
  source: ActivityRepository;
}): ActivityRepository {
  const latestSuccessfulInboxes = new Map<string, ActivityInbox>();

  return {
    async getInbox(input) {
      const key = resolveActivityCacheKey(cacheKey, input);

      try {
        const inbox = await source.getInbox(input);
        const freshInbox = toFreshActivityInbox(inbox);

        latestSuccessfulInboxes.set(key, freshInbox);
        await cache.write(key, freshInbox).catch(() => undefined);

        return inbox;
      } catch (error) {
        const cached =
          latestSuccessfulInboxes.get(key) ?? (await cache.read(key));

        if (cached === null) {
          throw error;
        }

        return {
          ...cached,
          isOffline: true,
          isStale: true,
        };
      }
    },
  };
}

function buildInboxQuery(input: ActivityInboxQuery): ActivityInboxQuery {
  return typeof input.limit === "number" ? { limit: input.limit } : {};
}

function normalizeActivityInbox(output: ApiActivityInboxOutput): ActivityInbox {
  const alertDeliveries: ActivityAlertDelivery[] = [];
  const candidateMatches: ActivityCandidateMatch[] = [];
  const chatSummaries: ActivityChatSummary[] = [];
  const moderationEvents: ActivityModerationEvent[] = [];
  const ownedReportPrompts: ActivityOwnedReportPrompt[] = [];
  const reportUpdates: ActivityReportUpdate[] = [];

  for (const item of output.items) {
    if (item.type === "alert_delivery") {
      alertDeliveries.push(normalizeAlertDeliveryItem(item));
      continue;
    }

    if (item.type === "candidate_match") {
      candidateMatches.push(normalizeCandidateMatchItem(item));
      continue;
    }

    if (item.type === "chat_conversation") {
      chatSummaries.push(normalizeChatSummaryItem(item));
      continue;
    }

    if (item.type === "report_update") {
      reportUpdates.push(normalizeReportUpdateItem(item));
      continue;
    }

    if (item.type === "owned_report_prompt") {
      ownedReportPrompts.push(normalizeOwnedReportPromptItem(item));
      continue;
    }

    moderationEvents.push(normalizeModerationEventItem(item));
  }

  return {
    alertDeliveries,
    candidateMatches,
    chatSummaries,
    moderationEvents,
    ownedReportPrompts,
    reportUpdates,
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

function normalizeCandidateMatchItem(
  item: ApiActivityCandidateMatchItem,
): ActivityCandidateMatch {
  const match = item.match;

  return {
    candidate: {
      href: match.candidate.href,
      id: match.candidate.id,
      kind: match.candidate.kind,
      title: match.candidate.title,
    },
    confidence: match.confidence,
    createdAt: normalizeDateValue(match.createdAt),
    id: match.id,
    ...(match.locationLabel ? { locationLabel: match.locationLabel } : {}),
    ownedReport: {
      href: match.ownedReport.href,
      id: match.ownedReport.id,
      title: match.ownedReport.title,
    },
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

function normalizeReportUpdateItem(
  item: ApiActivityReportUpdateItem,
): ActivityReportUpdate {
  const update = item.update;

  return {
    actorMemberId: update.actorMemberId,
    eventType: update.eventType,
    fromStatus: update.fromStatus,
    id: update.id,
    note: update.note,
    occurredAt: normalizeDateValue(item.occurredAt),
    outcome: update.outcome,
    report: normalizeReportSummary(update.report),
    toStatus: update.toStatus,
  };
}

function normalizeOwnedReportPromptItem(
  item: ApiActivityOwnedReportPromptItem,
): ActivityOwnedReportPrompt {
  const prompt = item.prompt;

  return {
    href: prompt.report.href,
    promptedAt: normalizeDateValue(item.occurredAt),
    prompt: {
      actionLabel: "Confirmar o actualizar",
      message: "Confirma si este reporte sigue activo o elige un resultado.",
      outcomeOptions: staleActiveReportPromptOutcomeOptions.map((option) => ({
        ...option,
      })),
      reportId: prompt.report.id,
      title: prompt.report.title,
    },
  };
}

function normalizeModerationEventItem(
  item: ApiActivityModerationEventItem,
): ActivityModerationEvent {
  const event = item.event;

  return {
    action: event.action,
    adminId: event.adminId,
    id: event.id,
    note: event.note,
    occurredAt: normalizeDateValue(item.occurredAt),
    reason: event.reason,
    report: normalizeReportSummary(event.report),
  };
}

function normalizeReportSummary(
  report: ApiActivityReportSummary,
): ActivityReportSummary {
  return {
    availability: report.availability,
    href: report.href,
    id: report.id,
    kind: report.kind,
    outcome: report.outcome,
    status: report.status,
    title: report.title,
    type: report.type,
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

const staleActiveReportPromptOutcomeOptions = [
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
] as const;

function resolveActivityCacheKey(
  cacheKey: string | ((input: ActivityInboxQuery) => string),
  input: ActivityInboxQuery,
) {
  return typeof cacheKey === "function" ? cacheKey(input) : cacheKey;
}

function toFreshActivityInbox(inbox: ActivityInbox): ActivityInbox {
  const { isOffline: _isOffline, isStale: _isStale, ...freshInbox } = inbox;

  return freshInbox;
}

function getActivityClient(client: unknown): ApiActivityClient["activity"] {
  const activity = (client as Partial<ApiActivityClient>).activity;

  if (!activity) {
    throw new Error("Activity API client is not available.");
  }

  return activity;
}
