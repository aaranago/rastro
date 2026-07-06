import type { Database } from "@acme/db/client";
import type { ReportLocation, user } from "@acme/db/schema";
import type { ModerationReportReason, ReportType } from "@acme/validators";
import { and, asc, desc, eq, or } from "@acme/db";
import {
  ChatConversation,
  ChatConversationBlock,
  ChatConversationHidden,
  ChatConversationReport,
  ChatMessage,
  ChatNotificationDelivery,
  Report,
} from "@acme/db/schema";
import { isPublicReportId } from "@acme/validators";

import { findLatestActiveAlertPushToken } from "./alert-push-token-repository";

export type ChatSubjectKind =
  | "adoption-listing"
  | "found-pet-report"
  | "lost-pet-report"
  | "sighting-report";

export interface PersistedChatSubject {
  href: string;
  id: string;
  kind: ChatSubjectKind;
  subtitle: string;
  title: string;
}

export interface PersistedChatParticipant {
  displayName: string;
  memberId: string;
}

export interface PersistedChatMessage {
  conversationId: string;
  createdAt: string;
  id: string;
  senderMemberId: string;
  text: string;
}

export interface PersistedChatBlockedMembership {
  blockedAt: string;
  blockedMemberId: string;
  blockerMemberId: string;
}

export interface PersistedChatConversationReport {
  createdAt: string;
  note?: string;
  reason?: ModerationReportReason;
  reporterMemberId: string;
}

export interface PersistedChatConversation {
  blockedMemberships: PersistedChatBlockedMembership[];
  createdAt: string;
  hiddenByMemberIds: string[];
  id: string;
  messages: PersistedChatMessage[];
  participants: [PersistedChatParticipant, PersistedChatParticipant];
  reports: PersistedChatConversationReport[];
  subject: PersistedChatSubject;
  updatedAt: string;
}

export type ChatRepositoryErrorCode =
  | "chat_conversation_member_required"
  | "chat_conversation_not_found"
  | "chat_member_block_target_required"
  | "chat_member_blocked"
  | "chat_message_text_required"
  | "chat_report_contact_not_enabled"
  | "chat_report_not_public"
  | "chat_report_self_contact_not_allowed";

export class ChatRepositoryError extends Error {
  code: ChatRepositoryErrorCode;

  constructor(code: ChatRepositoryErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "ChatRepositoryError";
  }
}

export interface ChatRepository {
  blockMember(input: {
    blockedMemberId: string;
    blockerMemberId: string;
    conversationId: string;
  }): Promise<PersistedChatConversation>;
  getConversation(input: {
    conversationId: string;
    viewerMemberId: string;
  }): Promise<PersistedChatConversation>;
  hideConversation(input: {
    conversationId: string;
    memberId: string;
  }): Promise<PersistedChatConversation>;
  listConversations(input: {
    limit?: number;
    viewerMemberId: string;
  }): Promise<PersistedChatConversation[]>;
  openReportConversation(input: {
    contactMemberId: string;
    reportId: string;
  }): Promise<PersistedChatConversation>;
  reportConversation(input: {
    conversationId: string;
    note?: string;
    reason?: ModerationReportReason;
    reporterMemberId: string;
  }): Promise<PersistedChatConversation>;
  sendMessage(input: {
    conversationId: string;
    senderMemberId: string;
    text: string;
  }): Promise<PersistedChatConversation>;
}

export interface DrizzleChatRepositoryOptions {
  now?: () => Date;
}

type ReportSubjectRow = typeof Report.$inferSelect & {
  location: typeof ReportLocation.$inferSelect | null;
};

type ChatConversationRow = typeof ChatConversation.$inferSelect & {
  blocks: (typeof ChatConversationBlock.$inferSelect)[];
  caretaker: typeof user.$inferSelect | null;
  contact: typeof user.$inferSelect | null;
  hiddenStates: (typeof ChatConversationHidden.$inferSelect)[];
  messages: (typeof ChatMessage.$inferSelect)[];
  report: ReportSubjectRow | null;
  reports: (typeof ChatConversationReport.$inferSelect)[];
};

const reportSubjectKindByType = {
  adoption: "adoption-listing",
  found_pet: "found-pet-report",
  lost_pet: "lost-pet-report",
  sighting: "sighting-report",
} satisfies Record<ReportType, ChatSubjectKind>;

const publicReportPathPrefixes = {
  adoption: "/adopciones",
  found_pet: "/reportes/encontrados",
  lost_pet: "/reportes/perdidos",
  sighting: "/reportes/avistamientos",
} satisfies Record<ReportType, string>;

export function buildReportSubjectHref(report: {
  id: string;
  type: ReportType;
}) {
  const path = `${publicReportPathPrefixes[report.type]}/${encodeURIComponent(
    report.id,
  )}`;

  return `rastro://${path.replace(/^\//, "")}`;
}

export function buildChatConversationDeepLink(conversationId: string) {
  return `rastro://chats/${encodeURIComponent(conversationId)}`;
}

export function buildChatMessageNotification(input: {
  conversationId: string;
  messageText: string;
  senderDisplayName: string;
}) {
  return {
    body: `${input.senderDisplayName}: ${input.messageText}`,
    deepLink: buildChatConversationDeepLink(input.conversationId),
    title: "Nuevo mensaje en Rastro",
  };
}

export function createDrizzleChatRepository(
  db: Database,
  options: DrizzleChatRepositoryOptions = {},
): ChatRepository {
  const now = options.now ?? (() => new Date());

  const loadConversationById = async (conversationId: string) => {
    return db.query.ChatConversation.findFirst({
      where: eq(ChatConversation.id, conversationId),
      with: conversationWithRelations,
    });
  };

  const loadConversationByReportMembers = async (input: {
    caretakerMemberId: string;
    contactMemberId: string;
    reportId: string;
  }) => {
    return db.query.ChatConversation.findFirst({
      where: and(
        eq(ChatConversation.reportId, input.reportId),
        eq(ChatConversation.caretakerMemberId, input.caretakerMemberId),
        eq(ChatConversation.contactMemberId, input.contactMemberId),
      ),
      with: conversationWithRelations,
    });
  };

  const loadConversationOrThrow = async (conversationId: string) => {
    const row = await loadConversationById(conversationId);

    if (!row) {
      throw new ChatRepositoryError(
        "chat_conversation_not_found",
        "La conversación no fue encontrada.",
      );
    }

    return row;
  };

  const updateConversationTimestamp = async (
    conversationId: string,
    updatedAt: Date,
  ) => {
    await db
      .update(ChatConversation)
      .set({ updatedAt })
      .where(eq(ChatConversation.id, conversationId));
  };

  const reloadConversation = async (conversationId: string) => {
    return toPersistedChatConversation(
      await loadConversationOrThrow(conversationId),
    );
  };

  return {
    blockMember: async ({
      blockedMemberId,
      blockerMemberId,
      conversationId,
    }) => {
      const conversation = await loadConversationOrThrow(conversationId);
      assertConversationParticipant(conversation, blockerMemberId);
      assertConversationParticipant(conversation, blockedMemberId);

      if (blockedMemberId === blockerMemberId) {
        throw new ChatRepositoryError(
          "chat_member_block_target_required",
          "No puedes bloquearte a ti mismo en una conversación.",
        );
      }

      const blockedAt = now();
      const [createdBlock] = await db
        .insert(ChatConversationBlock)
        .values({
          blockedAt,
          blockedMemberId,
          blockerMemberId,
          conversationId,
        })
        .onConflictDoNothing()
        .returning({ id: ChatConversationBlock.id });

      if (createdBlock) {
        await updateConversationTimestamp(conversationId, blockedAt);
      }

      return reloadConversation(conversationId);
    },
    getConversation: async ({ conversationId, viewerMemberId }) => {
      const conversation = await loadConversationOrThrow(conversationId);
      assertConversationParticipant(conversation, viewerMemberId);

      return toPersistedChatConversation(conversation);
    },
    hideConversation: async ({ conversationId, memberId }) => {
      const conversation = await loadConversationOrThrow(conversationId);
      assertConversationParticipant(conversation, memberId);

      const hiddenAt = now();
      const [createdHidden] = await db
        .insert(ChatConversationHidden)
        .values({
          conversationId,
          hiddenAt,
          memberId,
        })
        .onConflictDoNothing()
        .returning({ conversationId: ChatConversationHidden.conversationId });

      if (createdHidden) {
        await updateConversationTimestamp(conversationId, hiddenAt);
      }

      return reloadConversation(conversationId);
    },
    listConversations: async ({ limit, viewerMemberId }) => {
      const rows = await db.query.ChatConversation.findMany({
        ...(typeof limit === "number" ? { limit } : {}),
        orderBy: [
          desc(ChatConversation.updatedAt),
          desc(ChatConversation.createdAt),
          desc(ChatConversation.id),
        ],
        where: or(
          eq(ChatConversation.caretakerMemberId, viewerMemberId),
          eq(ChatConversation.contactMemberId, viewerMemberId),
        ),
        with: conversationWithRelations,
      });

      return rows
        .filter(
          (conversation) =>
            !conversation.hiddenStates.some(
              (hidden) => hidden.memberId === viewerMemberId,
            ),
        )
        .map(toPersistedChatConversation);
    },
    openReportConversation: async ({ contactMemberId, reportId }) => {
      if (!isPublicReportId(reportId)) {
        throw new ChatRepositoryError(
          "chat_report_not_public",
          "El reporte no está disponible para iniciar chat.",
        );
      }

      const report = await db.query.Report.findFirst({
        where: eq(Report.id, reportId),
        with: {
          caretaker: true,
          location: true,
        },
      });

      assertReportCanOpenChatConversation(report, contactMemberId);

      const createdAt = now();
      const [createdConversation] = await db
        .insert(ChatConversation)
        .values({
          caretakerMemberId: report.caretakerId,
          contactMemberId,
          createdAt,
          reportId: report.id,
          updatedAt: createdAt,
        })
        .onConflictDoNothing()
        .returning({ id: ChatConversation.id });

      if (createdConversation) {
        return reloadConversation(createdConversation.id);
      }

      const existingConversation = await loadConversationByReportMembers({
        caretakerMemberId: report.caretakerId,
        contactMemberId,
        reportId: report.id,
      });

      if (!existingConversation) {
        throw new Error("Chat conversation could not be loaded after insert.");
      }

      return toPersistedChatConversation(existingConversation);
    },
    reportConversation: async ({
      conversationId,
      note,
      reason,
      reporterMemberId,
    }) => {
      const conversation = await loadConversationOrThrow(conversationId);
      assertConversationParticipant(conversation, reporterMemberId);

      const createdAt = now();
      const [createdReport] = await db
        .insert(ChatConversationReport)
        .values({
          conversationId,
          createdAt,
          note: optionalTrimmed(note) ?? null,
          reason: reason ?? null,
          reporterMemberId,
        })
        .onConflictDoNothing()
        .returning({ id: ChatConversationReport.id });

      if (createdReport) {
        await updateConversationTimestamp(conversationId, createdAt);
      }

      return reloadConversation(conversationId);
    },
    sendMessage: async ({ conversationId, senderMemberId, text }) => {
      const messageText = text.trim();

      if (messageText.length === 0) {
        throw new ChatRepositoryError(
          "chat_message_text_required",
          "Escribe un mensaje para enviarlo.",
        );
      }

      const conversation = await loadConversationOrThrow(conversationId);
      assertConversationParticipant(conversation, senderMemberId);
      assertMemberCanSend(conversation, senderMemberId);

      const createdAt = now();
      await db.transaction(async (tx) => {
        const txDb = tx as unknown as Database;
        const [message] = await tx
          .insert(ChatMessage)
          .values({
            conversationId,
            createdAt,
            senderMemberId,
            text: messageText,
          })
          .returning({ id: ChatMessage.id });

        if (!message) {
          throw new Error("Chat message could not be persisted.");
        }

        await createChatNotificationDelivery({
          conversation,
          db: txDb,
          messageId: message.id,
          messageText,
          queuedAt: createdAt,
          senderMemberId,
        });

        await tx
          .update(ChatConversation)
          .set({ updatedAt: createdAt })
          .where(eq(ChatConversation.id, conversationId));
      });

      return reloadConversation(conversationId);
    },
  };
}

const conversationWithRelations = {
  blocks: {
    orderBy: [
      asc(ChatConversationBlock.blockedAt),
      asc(ChatConversationBlock.id),
    ],
  },
  caretaker: true as const,
  contact: true as const,
  hiddenStates: {
    orderBy: [
      asc(ChatConversationHidden.hiddenAt),
      asc(ChatConversationHidden.memberId),
    ],
  },
  messages: {
    orderBy: [asc(ChatMessage.createdAt), asc(ChatMessage.id)],
  },
  report: {
    with: {
      location: true as const,
    },
  },
  reports: {
    orderBy: [
      asc(ChatConversationReport.createdAt),
      asc(ChatConversationReport.id),
    ],
  },
};

function assertReportCanOpenChatConversation(
  report:
    | (typeof Report.$inferSelect & {
        caretaker: typeof user.$inferSelect | null;
        location: typeof ReportLocation.$inferSelect | null;
      })
    | null
    | undefined,
  contactMemberId: string,
): asserts report is typeof Report.$inferSelect & {
  caretaker: typeof user.$inferSelect | null;
  location: typeof ReportLocation.$inferSelect | null;
} {
  if (!report || !isPublicVisibleReport(report)) {
    throw new ChatRepositoryError(
      "chat_report_not_public",
      "El reporte no está disponible para iniciar chat.",
    );
  }

  if (
    report.contactPreference !== "in_app_chat" &&
    report.contactPreference !== "both"
  ) {
    throw new ChatRepositoryError(
      "chat_report_contact_not_enabled",
      "Este reporte no acepta chat en Rastro.",
    );
  }

  if (report.caretakerId === contactMemberId) {
    throw new ChatRepositoryError(
      "chat_report_self_contact_not_allowed",
      "No puedes abrir un chat de contacto con tu propio reporte.",
    );
  }
}

function isPublicVisibleReport(report: typeof Report.$inferSelect) {
  return (
    !report.deletedAt &&
    !report.hiddenAt &&
    !report.falseReportedAt &&
    report.status !== "pending_review"
  );
}

function toPersistedChatConversation(
  row: ChatConversationRow,
): PersistedChatConversation {
  if (!row.report) {
    throw new Error("Chat conversation is missing its report subject.");
  }

  return {
    blockedMemberships: row.blocks.map((block) => ({
      blockedAt: block.blockedAt.toISOString(),
      blockedMemberId: block.blockedMemberId,
      blockerMemberId: block.blockerMemberId,
    })),
    createdAt: row.createdAt.toISOString(),
    hiddenByMemberIds: row.hiddenStates.map((hidden) => hidden.memberId),
    id: row.id,
    messages: row.messages.map((message) => ({
      conversationId: message.conversationId,
      createdAt: message.createdAt.toISOString(),
      id: message.id,
      senderMemberId: message.senderMemberId,
      text: message.text,
    })),
    participants: [
      {
        displayName: row.caretaker?.name ?? "Miembro de Rastro",
        memberId: row.caretakerMemberId,
      },
      {
        displayName: row.contact?.name ?? "Miembro de Rastro",
        memberId: row.contactMemberId,
      },
    ],
    reports: row.reports.map((report) => ({
      createdAt: report.createdAt.toISOString(),
      reporterMemberId: report.reporterMemberId,
      ...(report.note ? { note: report.note } : {}),
      ...(report.reason ? { reason: report.reason } : {}),
    })),
    subject: toPersistedChatSubject(row.report),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toPersistedChatSubject(
  report: ReportSubjectRow,
): PersistedChatSubject {
  return {
    href: buildReportSubjectHref(report),
    id: report.id,
    kind: reportSubjectKindByType[report.type],
    subtitle: report.location?.label ?? "Reporte en Rastro",
    title: report.petName ?? report.title,
  };
}

async function createChatNotificationDelivery(input: {
  conversation: ChatConversationRow;
  db: Database;
  messageId: string;
  messageText: string;
  queuedAt: Date;
  senderMemberId: string;
}) {
  const recipientMemberId = getChatNotificationRecipientMemberId(
    input.conversation,
    input.senderMemberId,
  );

  if (!recipientMemberId || input.conversation.blocks.length > 0) {
    return null;
  }

  const senderDisplayName = getConversationParticipantDisplayName(
    input.conversation,
    input.senderMemberId,
  );
  const pushToken = await findLatestActiveAlertPushToken(
    input.db,
    recipientMemberId,
  );
  const notification = buildChatMessageNotification({
    conversationId: input.conversation.id,
    messageText: input.messageText,
    senderDisplayName,
  });

  const [delivery] = await input.db
    .insert(ChatNotificationDelivery)
    .values({
      body: notification.body,
      conversationId: input.conversation.id,
      createdAt: input.queuedAt,
      deepLink: notification.deepLink,
      messageId: input.messageId,
      pushTokenId: pushToken?.id ?? null,
      queuedAt: input.queuedAt,
      recipientMemberId,
      senderMemberId: input.senderMemberId,
      title: notification.title,
      updatedAt: input.queuedAt,
    })
    .onConflictDoNothing()
    .returning({ id: ChatNotificationDelivery.id });

  return delivery ?? null;
}

function getChatNotificationRecipientMemberId(
  conversation: Pick<
    typeof ChatConversation.$inferSelect,
    "caretakerMemberId" | "contactMemberId"
  >,
  senderMemberId: string,
) {
  if (conversation.caretakerMemberId === senderMemberId) {
    return conversation.contactMemberId;
  }

  if (conversation.contactMemberId === senderMemberId) {
    return conversation.caretakerMemberId;
  }

  return null;
}

function getConversationParticipantDisplayName(
  conversation: Pick<
    ChatConversationRow,
    "caretaker" | "caretakerMemberId" | "contact" | "contactMemberId"
  >,
  memberId: string,
) {
  if (conversation.caretakerMemberId === memberId) {
    return conversation.caretaker?.name ?? "Miembro de Rastro";
  }

  if (conversation.contactMemberId === memberId) {
    return conversation.contact?.name ?? "Miembro de Rastro";
  }

  return "Miembro de Rastro";
}

function assertConversationParticipant(
  conversation: Pick<
    typeof ChatConversation.$inferSelect,
    "caretakerMemberId" | "contactMemberId"
  >,
  memberId: string,
) {
  if (
    conversation.caretakerMemberId !== memberId &&
    conversation.contactMemberId !== memberId
  ) {
    throw new ChatRepositoryError(
      "chat_conversation_member_required",
      "Solo los miembros de la conversación pueden usar este chat.",
    );
  }
}

function assertMemberCanSend(
  conversation: ChatConversationRow,
  memberId: string,
) {
  if (conversation.blocks.some((block) => block.blockedMemberId === memberId)) {
    throw new ChatRepositoryError(
      "chat_member_blocked",
      "Este miembro está bloqueado para esta conversación.",
    );
  }
}

function optionalTrimmed(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed;
}
