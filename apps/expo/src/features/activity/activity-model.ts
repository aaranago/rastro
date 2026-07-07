import type {
  AlertSubscriptionsSessionState,
  LostPetAlertNotification,
} from "../alert-subscriptions/alert-subscriptions";
import type { ChatConversation } from "../chat/chat-model";
import type { StaleActiveReportPrompt } from "../reports/report-lifecycle";
import { buildChatConversationViewModel } from "../chat/chat-model";

export interface BuildActivityViewModelInput {
  alertDeliveries?: readonly ActivityAlertDelivery[];
  candidateMatches?: readonly ActivityCandidateMatch[];
  chatConversations?: readonly ChatConversation[];
  chatSummaries?: readonly ActivityChatSummary[];
  isOffline?: boolean;
  isStale?: boolean;
  moderationEvents?: readonly ActivityModerationEvent[];
  nearbyLostPetAlerts?: readonly ActivityNearbyLostPetAlert[];
  ownedReportPrompts?: readonly ActivityOwnedReportPrompt[];
  reportUpdates?: readonly ActivityReportUpdate[];
  session: AlertSubscriptionsSessionState;
}

export interface ActivityInboxQuery {
  cacheScope?: string;
  focus?: "all" | "conversations" | "reports";
  limit?: number;
}

export interface ActivityInbox {
  alertDeliveries: ActivityAlertDelivery[];
  candidateMatches: ActivityCandidateMatch[];
  chatSummaries: ActivityChatSummary[];
  isOffline?: boolean;
  isStale?: boolean;
  moderationEvents: ActivityModerationEvent[];
  ownedReportPrompts: ActivityOwnedReportPrompt[];
  reportUpdates: ActivityReportUpdate[];
}

export interface ActivityRepository {
  getInbox: (input: ActivityInboxQuery) => Promise<ActivityInbox>;
}

export interface ActivityAlertDelivery {
  body: string;
  deliveryId: string;
  href: string;
  id: string;
  occurredAt: string;
  reportId: string;
  status: string;
  title: string;
}

export interface ActivityChatSummarySubject {
  href: string;
  id: string;
  kind: string;
  subtitle?: string;
  title: string;
}

export interface ActivityChatSummaryParticipant {
  displayName: string;
  memberId?: string;
}

export interface ActivityChatSummaryLastMessage {
  authorLabel?: string;
  id: string;
  senderMemberId?: string;
  sentAt?: string;
  text: string;
}

export interface ActivityChatSummary {
  conversationId: string;
  href: string;
  id: string;
  lastMessage?: ActivityChatSummaryLastMessage | null;
  occurredAt: string;
  otherParticipant: ActivityChatSummaryParticipant;
  subject: ActivityChatSummarySubject;
}

export type ActivityReportType =
  | "adoption"
  | "found_pet"
  | "lost_pet"
  | "sighting";

export type ActivityReportStatus = "active" | "closed" | "pending_review";

export type ActivityReportOutcome =
  | "adopted"
  | "inactive"
  | "reunited"
  | "still_missing"
  | "transferred_to_shelter"
  | "unable_to_locate";

export type ActivityReportAvailability =
  | "available"
  | "deleted"
  | "false_report"
  | "hidden";

export type ActivityReportKind =
  | "adoption-listing"
  | "found-pet-report"
  | "lost-pet-report"
  | "sighting-report";

export interface ActivityReportSummary {
  availability: ActivityReportAvailability;
  href: string;
  id: string;
  kind: ActivityReportKind;
  outcome: ActivityReportOutcome | null;
  status: ActivityReportStatus;
  title: string;
  type: ActivityReportType;
}

export type ActivityReportUpdateType =
  | "created"
  | "deleted"
  | "resolved"
  | "updated";

export interface ActivityReportUpdate {
  actorMemberId?: string | null;
  eventType: ActivityReportUpdateType;
  fromStatus?: ActivityReportStatus | null;
  id: string;
  note?: string | null;
  occurredAt: string;
  outcome?: ActivityReportOutcome | null;
  report: ActivityReportSummary;
  toStatus?: ActivityReportStatus | null;
}

export type ActivityModerationAction =
  | "hide"
  | "mark_false"
  | "restore"
  | "unmark_false";

export interface ActivityModerationEvent {
  action: ActivityModerationAction;
  adminId?: string | null;
  id: string;
  note?: string | null;
  occurredAt: string;
  reason: string;
  report: ActivityReportSummary;
}

export interface ActivityNearbyLostPetAlert {
  notification: LostPetAlertNotification;
  receivedAt: string;
}

export interface ActivityOwnedReportPrompt {
  href: string;
  promptedAt: string;
  prompt: StaleActiveReportPrompt;
}

export type ActivityCandidateReportKind =
  | "found-pet-report"
  | "lost-pet-report"
  | "sighting-report";

export interface ActivityCandidateMatchReport {
  href: string;
  id: string;
  title: string;
}

export interface ActivityCandidateMatchCandidate
  extends ActivityCandidateMatchReport {
  kind: ActivityCandidateReportKind;
}

export interface ActivityCandidateMatch {
  candidate: ActivityCandidateMatchCandidate;
  confidence: "possible";
  createdAt: string;
  id: string;
  locationLabel?: string;
  ownedReport: ActivityCandidateMatchReport;
}

export interface ActivityActionViewModel {
  href: string;
  label: string;
}

export type ActivitySectionId =
  | "candidate-matches"
  | "chats"
  | "moderation-events"
  | "nearby-alerts"
  | "report-updates";

export type ActivityItemKind =
  | "candidate-match"
  | "chat-conversation"
  | "moderation-event"
  | "nearby-lost-pet-alert"
  | "owned-report-update"
  | "report-update";

export type ActivityItemTone = "attention" | "info" | "urgent";

export interface ActivityItemViewModel {
  action: ActivityActionViewModel;
  body: string;
  id: string;
  kind: ActivityItemKind;
  meta?: string;
  occurredAt: string;
  targetId?: string;
  title: string;
  tone: ActivityItemTone;
}

export interface ActivitySectionViewModel {
  id: ActivitySectionId;
  items: ActivityItemViewModel[];
  title: string;
}

export interface ActivitySignedOutViewModel {
  kind: "visitor";
  sections: [];
  signedOut: {
    action: ActivityActionViewModel;
    body: string;
    title: string;
  };
  title: string;
}

export interface ActivityMemberViewModel {
  emptyState: {
    action?: ActivityActionViewModel;
    body: string;
    title: string;
  };
  kind: "member";
  offlineLabel?: string;
  sections: ActivitySectionViewModel[];
  subtitle: string;
  title: string;
}

export type ActivityViewModel =
  | ActivityMemberViewModel
  | ActivitySignedOutViewModel;

const activityCopy = {
  actions: {
    openChat: "Abrir chat",
    reviewMatch: "Revisar coincidencia",
    signIn: "Iniciar sesión",
    viewReport: "Ver reporte",
  },
  emptyMember: {
    action: {
      href: "/(tabs)/(nearby)",
      label: "Ver reportes cercanos",
    },
    body: "Cuando publiques un reporte, recibas un mensaje o una alerta cercana, lo verás aquí.",
    title: "Sin actividad todavía",
  },
  memberSubtitle: "Alertas, mensajes y actualizaciones",
  sections: {
    candidateMatches: "Coincidencias",
    chats: "Mensajes",
    moderationEvents: "Moderación",
    nearbyAlerts: "Historial de alertas",
    reportUpdates: "Actualizaciones",
  },
  signedOut: {
    body: "Tus alertas, mensajes y actualizaciones aparecerán aquí cuando seas miembro.",
    title: "Inicia sesión para ver tu actividad",
  },
  title: "Actividad",
} as const;

export function buildActivityViewModel({
  alertDeliveries = [],
  candidateMatches = [],
  chatConversations = [],
  chatSummaries = [],
  isOffline = false,
  isStale = false,
  moderationEvents = [],
  nearbyLostPetAlerts = [],
  ownedReportPrompts = [],
  reportUpdates = [],
  session,
}: BuildActivityViewModelInput): ActivityViewModel {
  if (session.kind === "visitor") {
    return {
      kind: "visitor",
      sections: [],
      signedOut: {
        action: {
          href: "rastro://auth/sign-in?returnTo=/actividad",
          label: activityCopy.actions.signIn,
        },
        body: activityCopy.signedOut.body,
        title: activityCopy.signedOut.title,
      },
      title: activityCopy.title,
    };
  }

  return {
    emptyState: {
      action: activityCopy.emptyMember.action,
      body: activityCopy.emptyMember.body,
      title: activityCopy.emptyMember.title,
    },
    kind: "member",
    offlineLabel: buildActivityOfflineLabel({ isOffline, isStale }),
    sections: buildActivitySections({
      alertDeliveries,
      candidateMatches,
      chatConversations,
      chatSummaries,
      moderationEvents,
      nearbyLostPetAlerts,
      ownedReportPrompts,
      reportUpdates,
      viewerMemberId: session.memberId,
    }),
    subtitle: activityCopy.memberSubtitle,
    title: activityCopy.title,
  };
}

function buildActivitySections({
  alertDeliveries,
  candidateMatches,
  chatConversations,
  chatSummaries,
  moderationEvents,
  nearbyLostPetAlerts,
  ownedReportPrompts,
  reportUpdates,
  viewerMemberId,
}: {
  alertDeliveries: readonly ActivityAlertDelivery[];
  candidateMatches: readonly ActivityCandidateMatch[];
  chatConversations: readonly ChatConversation[];
  chatSummaries: readonly ActivityChatSummary[];
  moderationEvents: readonly ActivityModerationEvent[];
  nearbyLostPetAlerts: readonly ActivityNearbyLostPetAlert[];
  ownedReportPrompts: readonly ActivityOwnedReportPrompt[];
  reportUpdates: readonly ActivityReportUpdate[];
  viewerMemberId: string;
}): ActivitySectionViewModel[] {
  const sections: ActivitySectionViewModel[] = [];
  const alertItems = [
    ...alertDeliveries.map(toAlertDeliveryActivityItem),
    ...nearbyLostPetAlerts.map(toNearbyAlertActivityItem),
  ];

  if (alertItems.length > 0) {
    sections.push({
      id: "nearby-alerts",
      items: sortActivityItemsByRecency(alertItems),
      title: activityCopy.sections.nearbyAlerts,
    });
  }

  const chatItems = [
    ...chatSummaries.map(toChatSummaryActivityItem),
    ...chatConversations.map((conversation) =>
      toChatActivityItem(conversation, viewerMemberId),
    ),
  ];

  if (chatItems.length > 0) {
    sections.push({
      id: "chats",
      items: sortActivityItemsByRecency(chatItems),
      title: activityCopy.sections.chats,
    });
  }

  const reportUpdateItems = [
    ...reportUpdates.map(toReportUpdateActivityItem),
    ...ownedReportPrompts.map(toOwnedReportPromptActivityItem),
  ];

  if (reportUpdateItems.length > 0) {
    sections.push({
      id: "report-updates",
      items: sortActivityItemsByRecency(reportUpdateItems),
      title: activityCopy.sections.reportUpdates,
    });
  }

  if (moderationEvents.length > 0) {
    sections.push({
      id: "moderation-events",
      items: sortActivityItemsByRecency(
        moderationEvents.map(toModerationEventActivityItem),
      ),
      title: activityCopy.sections.moderationEvents,
    });
  }

  if (candidateMatches.length > 0) {
    sections.push({
      id: "candidate-matches",
      items: sortActivityItemsByRecency(
        candidateMatches.map(toCandidateMatchActivityItem),
      ),
      title: activityCopy.sections.candidateMatches,
    });
  }

  return sortActivitySectionsByRecency(sections);
}

function sortActivitySectionsByRecency(
  sections: ActivitySectionViewModel[],
): ActivitySectionViewModel[] {
  return [...sections].sort(
    (left, right) =>
      getLatestSectionOccurredAtMs(right) - getLatestSectionOccurredAtMs(left),
  );
}

function getLatestSectionOccurredAtMs(section: ActivitySectionViewModel) {
  return Math.max(
    ...section.items.map((item) => Date.parse(item.occurredAt) || 0),
  );
}

function sortActivityItemsByRecency(
  items: readonly ActivityItemViewModel[],
): ActivityItemViewModel[] {
  return [...items].sort(
    (left, right) =>
      Date.parse(right.occurredAt) - Date.parse(left.occurredAt) ||
      right.id.localeCompare(left.id),
  );
}

function buildActivityOfflineLabel({
  isOffline,
  isStale,
}: {
  isOffline: boolean;
  isStale: boolean;
}) {
  if (isOffline && isStale) {
    return "Sin conexión - actividad guardada";
  }

  if (isOffline) {
    return "Sin conexión";
  }

  if (isStale) {
    return "Actividad guardada";
  }

  return undefined;
}

function toAlertDeliveryActivityItem(
  delivery: ActivityAlertDelivery,
): ActivityItemViewModel {
  return {
    action: {
      href: delivery.href,
      label: activityCopy.actions.viewReport,
    },
    body: delivery.body,
    id: `alert-${delivery.deliveryId}`,
    kind: "nearby-lost-pet-alert",
    meta: formatAlertDeliveryStatus(delivery.status),
    occurredAt: delivery.occurredAt,
    targetId: delivery.reportId,
    title: delivery.title,
    tone: "urgent",
  };
}

function toNearbyAlertActivityItem(
  alert: ActivityNearbyLostPetAlert,
): ActivityItemViewModel {
  return {
    action: {
      href: alert.notification.deepLink,
      label: activityCopy.actions.viewReport,
    },
    body: alert.notification.body,
    id: `nearby-alert-${alert.notification.reportId}`,
    kind: "nearby-lost-pet-alert",
    occurredAt: alert.receivedAt,
    title: alert.notification.title,
    tone: "urgent",
  };
}

function toChatSummaryActivityItem(
  summary: ActivityChatSummary,
): ActivityItemViewModel {
  return {
    action: {
      href: summary.href,
      label: activityCopy.actions.openChat,
    },
    body: formatChatSummaryBody(summary.lastMessage),
    id: `chat-${summary.conversationId}`,
    kind: "chat-conversation",
    meta: formatOptionalMeta([
      summary.subject.title,
      summary.subject.subtitle ?? "",
    ]),
    occurredAt: summary.occurredAt,
    targetId: summary.conversationId,
    title: formatParticipantDisplayName(summary.otherParticipant.displayName),
    tone: "info",
  };
}

function toChatActivityItem(
  conversation: ChatConversation,
  viewerMemberId: string,
): ActivityItemViewModel {
  const chat = buildChatConversationViewModel({
    conversation,
    viewerMemberId,
  });
  const latestMessage = chat.messages[chat.messages.length - 1];

  return {
    action: {
      href: `rastro://chats/${chat.conversationId}`,
      label: activityCopy.actions.openChat,
    },
    body: latestMessage
      ? `${latestMessage.authorLabel}: ${latestMessage.text}`
      : chat.emptyState,
    id: `chat-${chat.conversationId}`,
    kind: "chat-conversation",
    meta: formatOptionalMeta([
      chat.subjectLink.title,
      chat.subjectLink.subtitle,
    ]),
    occurredAt: conversation.updatedAt,
    title: formatParticipantDisplayName(chat.title),
    tone: "info",
  };
}

function toReportUpdateActivityItem(
  update: ActivityReportUpdate,
): ActivityItemViewModel {
  const action = getReportActivityAction(update.report);

  return {
    action,
    body: formatReportUpdateBody(update),
    id: `report-update-${update.id}`,
    kind: "report-update",
    meta: formatActivityReportMeta(update.report, update.outcome),
    occurredAt: update.occurredAt,
    targetId: update.report.id,
    title: update.report.title,
    tone: getReportActivityTone(update.report.availability),
  };
}

function toModerationEventActivityItem(
  event: ActivityModerationEvent,
): ActivityItemViewModel {
  const action = getReportActivityAction(event.report);

  return {
    action,
    body: formatModerationEventBody(event),
    id: `moderation-event-${event.id}`,
    kind: "moderation-event",
    meta: formatActivityReportMeta(event.report),
    occurredAt: event.occurredAt,
    targetId: event.report.id,
    title: event.report.title,
    tone: "attention",
  };
}

function formatChatSummaryBody(
  lastMessage: ActivityChatSummaryLastMessage | null | undefined,
) {
  if (!lastMessage) {
    return "Aún no hay mensajes en este chat.";
  }

  const text = formatMessagePreview(lastMessage.text);
  const authorLabel = lastMessage.authorLabel
    ? formatParticipantDisplayName(lastMessage.authorLabel)
    : "";

  if (!text) {
    return authorLabel
      ? `${authorLabel}: Mensaje reciente`
      : "Mensaje reciente";
  }

  return authorLabel ? `${authorLabel}: ${text}` : text;
}

function formatParticipantDisplayName(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed || isLowValueIdentifier(trimmed)) {
    return "Miembro de Rastro";
  }

  return trimmed;
}

function formatMessagePreview(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Mensaje reciente";
  }

  return trimmed;
}

function isLowValueIdentifier(value: string) {
  const compact = value.replace(/[\s_-]/g, "");

  return (
    /^[a-z]+e2e[a-z]*\d{6,}$/i.test(compact) ||
    /^[0-9a-f]{24,}$/i.test(compact) ||
    /^[0-9a-f]{8}[0-9a-f-]{18,}$/i.test(value)
  );
}

function formatAlertDeliveryStatus(status: string) {
  switch (status) {
    case "delivered":
      return "Entregada";
    case "failed":
      return "No entregada";
    case "pending":
      return "Pendiente";
    case "sent":
      return "Enviada";
    default:
      return undefined;
  }
}

function formatReportUpdateBody(update: ActivityReportUpdate) {
  switch (update.eventType) {
    case "created":
      return "Tu reporte fue creado.";
    case "deleted":
      return "Tu reporte fue cerrado y ya no se muestra en búsqueda.";
    case "resolved":
      return update.outcome
        ? `Resultado registrado: ${formatActivityReportOutcome(update.outcome)}.`
        : "Tu reporte fue cerrado.";
    case "updated":
      return "Tu reporte fue actualizado.";
  }
}

function formatModerationEventBody(event: ActivityModerationEvent) {
  const reason = event.reason.trim();
  const suffix = reason ? `: ${reason}.` : ".";

  switch (event.action) {
    case "hide":
      return `El equipo retiró temporalmente este reporte${suffix}`;
    case "mark_false":
      return `El equipo marcó este reporte como falso${suffix}`;
    case "restore":
      return `El equipo restauró este reporte${suffix}`;
    case "unmark_false":
      return `El equipo retiró la marca de reporte falso${suffix}`;
  }
}

function getReportActivityAction(
  report: ActivityReportSummary,
): ActivityActionViewModel {
  if (report.availability === "available") {
    return {
      href: report.href,
      label: activityCopy.actions.viewReport,
    };
  }

  return {
    href: "/mis-reportes",
    label: "Revisar en Mis reportes",
  };
}

function formatActivityReportMeta(
  report: ActivityReportSummary,
  outcome?: ActivityReportOutcome | null,
) {
  return formatOptionalMeta([
    formatActivityReportType(report.type),
    report.availability === "available"
      ? ""
      : formatActivityReportAvailability(report.availability),
    outcome ? formatActivityReportOutcome(outcome) : "",
  ]);
}

function formatActivityReportType(type: ActivityReportType) {
  switch (type) {
    case "adoption":
      return "Adopción";
    case "found_pet":
      return "Mascota encontrada";
    case "lost_pet":
      return "Mascota perdida";
    case "sighting":
      return "Avistamiento";
  }
}

function formatActivityReportAvailability(
  availability: ActivityReportAvailability,
) {
  switch (availability) {
    case "available":
      return "";
    case "deleted":
      return "No disponible";
    case "false_report":
      return "Marcado como falso";
    case "hidden":
      return "Retirado de la búsqueda";
  }
}

function formatActivityReportOutcome(outcome: ActivityReportOutcome) {
  switch (outcome) {
    case "adopted":
      return "Adoptada";
    case "inactive":
      return "Inactiva";
    case "reunited":
      return "Reunida";
    case "still_missing":
      return "Sigue activa";
    case "transferred_to_shelter":
      return "Trasladada a refugio";
    case "unable_to_locate":
      return "No se pudo ubicar";
  }
}

function getReportActivityTone(availability: ActivityReportAvailability) {
  return availability === "available" ? "info" : "attention";
}

function toOwnedReportPromptActivityItem({
  href,
  promptedAt,
  prompt,
}: ActivityOwnedReportPrompt): ActivityItemViewModel {
  return {
    action: {
      href,
      label: prompt.actionLabel,
    },
    body: prompt.message,
    id: `report-update-${prompt.reportId}`,
    kind: "owned-report-update",
    meta: "Reporte activo",
    occurredAt: promptedAt,
    title: prompt.title,
    tone: "attention",
  };
}

function toCandidateMatchActivityItem(
  match: ActivityCandidateMatch,
): ActivityItemViewModel {
  return {
    action: {
      href: match.candidate.href,
      label: activityCopy.actions.reviewMatch,
    },
    body: `${match.candidate.title} podría coincidir con ${match.ownedReport.title}.`,
    id: `candidate-match-${match.id}`,
    kind: "candidate-match",
    meta: match.locationLabel,
    occurredAt: match.createdAt,
    title: "Coincidencia posible",
    tone: "attention",
  };
}

function formatOptionalMeta(parts: readonly string[]) {
  const meta = parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" - ");

  return meta.length > 0 ? meta : undefined;
}
