import type { Database } from "@acme/db/client";
import { and, asc, eq, isNull } from "@acme/db";
import { AlertPushToken, ChatNotificationDelivery } from "@acme/db/schema";

import type { PersistedAlertPushToken } from "./alert-repository";
import {
  findLatestActiveAlertPushToken,
  toPersistedAlertPushToken,
} from "./alert-push-token-repository";

export interface PersistedChatNotificationDelivery {
  body: string;
  conversationId: string;
  createdAt: string;
  deepLink: string;
  failedAt: string | null;
  failureReason: string | null;
  id: string;
  messageId: string;
  pushTokenId: string | null;
  queuedAt: string;
  recipientMemberId: string;
  senderMemberId: string;
  sentAt: string | null;
  status: "pending" | "sent" | "failed" | "skipped";
  title: string;
}

export interface PendingChatNotificationDelivery
  extends PersistedChatNotificationDelivery {
  pushToken: PersistedAlertPushToken | null;
}

export interface ChatNotificationDeliveryRepository {
  disablePushToken(input: {
    pushTokenId: string;
  }): Promise<PersistedAlertPushToken | null>;
  listPendingDeliveries(input: {
    limit?: number;
  }): Promise<PendingChatNotificationDelivery[]>;
  markDeliveryFailed(input: {
    deliveryId: string;
    reason: string;
  }): Promise<PersistedChatNotificationDelivery | null>;
  markDeliverySent(input: {
    deliveryId: string;
  }): Promise<PersistedChatNotificationDelivery | null>;
  markDeliverySkipped(input: {
    deliveryId: string;
    reason: string;
  }): Promise<PersistedChatNotificationDelivery | null>;
}

export interface DrizzleChatNotificationDeliveryRepositoryOptions {
  now?: () => Date;
}

export function createDrizzleChatNotificationDeliveryRepository(
  db: Database,
  options: DrizzleChatNotificationDeliveryRepositoryOptions = {},
): ChatNotificationDeliveryRepository {
  const now = options.now ?? (() => new Date());

  return {
    disablePushToken: async ({ pushTokenId }) => {
      const disabledAt = now();
      const [pushToken] = await db
        .update(AlertPushToken)
        .set({
          disabledAt,
          updatedAt: disabledAt,
        })
        .where(
          and(
            eq(AlertPushToken.id, pushTokenId),
            isNull(AlertPushToken.disabledAt),
          ),
        )
        .returning();

      return pushToken ? toPersistedAlertPushToken(pushToken) : null;
    },
    listPendingDeliveries: async ({ limit }) => {
      const rows = await db.query.ChatNotificationDelivery.findMany({
        limit: normalizeDeliveryLimit(limit),
        orderBy: [
          asc(ChatNotificationDelivery.createdAt),
          asc(ChatNotificationDelivery.id),
        ],
        where: eq(ChatNotificationDelivery.status, "pending"),
        with: {
          pushToken: true,
        },
      });

      return Promise.all(
        rows.map((row) => toPendingChatNotificationDelivery(db, row)),
      );
    },
    markDeliveryFailed: async ({ deliveryId, reason }) => {
      const failedAt = now();
      const [delivery] = await db
        .update(ChatNotificationDelivery)
        .set({
          failedAt,
          failureReason: normalizeDeliveryFailureReason(reason),
          sentAt: null,
          status: "failed",
          updatedAt: failedAt,
        })
        .where(
          and(
            eq(ChatNotificationDelivery.id, deliveryId),
            eq(ChatNotificationDelivery.status, "pending"),
          ),
        )
        .returning();

      return delivery ? toPersistedChatNotificationDelivery(delivery) : null;
    },
    markDeliverySent: async ({ deliveryId }) => {
      const sentAt = now();
      const [delivery] = await db
        .update(ChatNotificationDelivery)
        .set({
          failedAt: null,
          failureReason: null,
          sentAt,
          status: "sent",
          updatedAt: sentAt,
        })
        .where(
          and(
            eq(ChatNotificationDelivery.id, deliveryId),
            eq(ChatNotificationDelivery.status, "pending"),
          ),
        )
        .returning();

      return delivery ? toPersistedChatNotificationDelivery(delivery) : null;
    },
    markDeliverySkipped: async ({ deliveryId, reason }) => {
      const skippedAt = now();
      const [delivery] = await db
        .update(ChatNotificationDelivery)
        .set({
          failedAt: null,
          failureReason: normalizeDeliveryFailureReason(reason),
          sentAt: null,
          status: "skipped",
          updatedAt: skippedAt,
        })
        .where(
          and(
            eq(ChatNotificationDelivery.id, deliveryId),
            eq(ChatNotificationDelivery.status, "pending"),
          ),
        )
        .returning();

      return delivery ? toPersistedChatNotificationDelivery(delivery) : null;
    },
  };
}

function toPersistedChatNotificationDelivery(
  row: typeof ChatNotificationDelivery.$inferSelect,
): PersistedChatNotificationDelivery {
  return {
    body: row.body,
    conversationId: row.conversationId,
    createdAt: row.createdAt.toISOString(),
    deepLink: row.deepLink,
    failedAt: row.failedAt?.toISOString() ?? null,
    failureReason: row.failureReason,
    id: row.id,
    messageId: row.messageId,
    pushTokenId: row.pushTokenId,
    queuedAt: row.queuedAt.toISOString(),
    recipientMemberId: row.recipientMemberId,
    senderMemberId: row.senderMemberId,
    sentAt: row.sentAt?.toISOString() ?? null,
    status: row.status,
    title: row.title,
  };
}

async function toPendingChatNotificationDelivery(
  db: Database,
  row: typeof ChatNotificationDelivery.$inferSelect & {
    pushToken: typeof AlertPushToken.$inferSelect | null;
  },
): Promise<PendingChatNotificationDelivery> {
  const activePushToken =
    row.pushToken && !row.pushToken.disabledAt
      ? row.pushToken
      : await findLatestActiveAlertPushToken(db, row.recipientMemberId);

  return {
    ...toPersistedChatNotificationDelivery(row),
    pushToken: activePushToken
      ? toPersistedAlertPushToken(activePushToken)
      : null,
  };
}

function normalizeDeliveryLimit(limit: number | undefined) {
  if (limit === undefined) {
    return 100;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 500);
}

function normalizeDeliveryFailureReason(reason: string) {
  const trimmed = reason.trim();

  if (trimmed.length === 0) {
    return "No se pudo procesar la entrega de chat.";
  }

  return trimmed.slice(0, 1000);
}
