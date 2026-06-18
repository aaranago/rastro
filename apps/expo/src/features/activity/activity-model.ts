import type {
  AlertSubscriptionsSessionState,
  LostPetAlertNotification,
} from "../alert-subscriptions/alert-subscriptions";
import type { ChatConversation } from "../chat/chat-model";
import type { StaleActiveReportPrompt } from "../reports/report-lifecycle";
import { buildChatConversationViewModel } from "../chat/chat-model";

export interface BuildActivityViewModelInput {
  candidateMatches?: readonly ActivityCandidateMatch[];
  chatConversations?: readonly ChatConversation[];
  nearbyLostPetAlerts?: readonly ActivityNearbyLostPetAlert[];
  ownedReportPrompts?: readonly ActivityOwnedReportPrompt[];
  session: AlertSubscriptionsSessionState;
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
  | "nearby-alerts"
  | "report-updates";

export type ActivityItemKind =
  | "candidate-match"
  | "chat-conversation"
  | "nearby-lost-pet-alert"
  | "owned-report-update";

export type ActivityItemTone = "attention" | "info" | "urgent";

export interface ActivityItemViewModel {
  action: ActivityActionViewModel;
  body: string;
  id: string;
  kind: ActivityItemKind;
  meta?: string;
  occurredAt: string;
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
    body: string;
    title: string;
  };
  kind: "member";
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
    signIn: "Iniciar sesion",
    viewReport: "Ver reporte",
  },
  emptyMember: {
    body: "Tus alertas cercanas, chats, actualizaciones y coincidencias apareceran aqui.",
    title: "Sin actividad todavia",
  },
  memberSubtitle: "Alertas, mensajes y actualizaciones",
  sections: {
    candidateMatches: "Coincidencias",
    chats: "Mensajes",
    nearbyAlerts: "Historial de alertas",
    reportUpdates: "Actualizaciones",
  },
  signedOut: {
    body: "Tus alertas, mensajes y actualizaciones apareceran aqui cuando seas miembro.",
    title: "Inicia sesion para ver tu actividad",
  },
  title: "Actividad",
} as const;

export function buildActivityViewModel({
  candidateMatches = [],
  chatConversations = [],
  nearbyLostPetAlerts = [],
  ownedReportPrompts = [],
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
      body: activityCopy.emptyMember.body,
      title: activityCopy.emptyMember.title,
    },
    kind: "member",
    sections: buildActivitySections({
      candidateMatches,
      chatConversations,
      nearbyLostPetAlerts,
      ownedReportPrompts,
      viewerMemberId: session.memberId,
    }),
    subtitle: activityCopy.memberSubtitle,
    title: activityCopy.title,
  };
}

function buildActivitySections({
  candidateMatches,
  chatConversations,
  nearbyLostPetAlerts,
  ownedReportPrompts,
  viewerMemberId,
}: {
  candidateMatches: readonly ActivityCandidateMatch[];
  chatConversations: readonly ChatConversation[];
  nearbyLostPetAlerts: readonly ActivityNearbyLostPetAlert[];
  ownedReportPrompts: readonly ActivityOwnedReportPrompt[];
  viewerMemberId: string;
}): ActivitySectionViewModel[] {
  const sections: ActivitySectionViewModel[] = [];

  if (nearbyLostPetAlerts.length > 0) {
    sections.push({
      id: "nearby-alerts",
      items: nearbyLostPetAlerts.map(toNearbyAlertActivityItem),
      title: activityCopy.sections.nearbyAlerts,
    });
  }

  if (chatConversations.length > 0) {
    sections.push({
      id: "chats",
      items: chatConversations.map((conversation) =>
        toChatActivityItem(conversation, viewerMemberId),
      ),
      title: activityCopy.sections.chats,
    });
  }

  if (ownedReportPrompts.length > 0) {
    sections.push({
      id: "report-updates",
      items: ownedReportPrompts.map(toOwnedReportPromptActivityItem),
      title: activityCopy.sections.reportUpdates,
    });
  }

  if (candidateMatches.length > 0) {
    sections.push({
      id: "candidate-matches",
      items: candidateMatches.map(toCandidateMatchActivityItem),
      title: activityCopy.sections.candidateMatches,
    });
  }

  return sections;
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
    title: chat.title,
    tone: "info",
  };
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
    body: `${match.candidate.title} podria coincidir con ${match.ownedReport.title}.`,
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
