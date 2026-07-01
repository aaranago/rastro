import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  AlertNotificationDelivery,
  AlertPushToken,
  AlertSubscription,
  alertSubscriptionCategory,
  ChatConversation,
  ChatConversationBlock,
  ChatConversationHidden,
  ChatConversationReport,
  ChatMessage,
  ChatNotificationDelivery,
  Post,
  Report,
  ReportLifecycleEvent,
  ReportLocation,
  ReportMedia,
  ReportModerationAction,
  reportModerationActionType,
  reportStatus,
} from "./schema";

const postgresQueryConfig = {
  casing: {
    getColumnCasing: (column: { name: string }) => column.name,
  },
  escapeName: (name: string) => `"${name}"`,
  escapeParam: (index: number) => `$${index + 1}`,
  escapeString: (value: string) => `'${value.replaceAll("'", "''")}'`,
};

describe("report schema", () => {
  it("defines ownership, idempotency, media, lifecycle, and PostGIS location columns", () => {
    expect(Report.caretakerId).toBeDefined();
    expect(Report.idempotencyKey).toBeDefined();
    expect(Report.status).toBeDefined();
    expect(Report.outcome).toBeDefined();
    expect(Report.hiddenAt).toBeDefined();
    expect(Report.hiddenByAdminId).toBeDefined();
    expect(Report.hiddenReason).toBeDefined();
    expect(Report.hiddenNote).toBeDefined();

    expect(ReportLocation.reportId).toBeDefined();
    expect(ReportLocation.exactPoint.getSQLType()).toBe("geometry(point,4326)");
    expect(ReportLocation.publicPoint.getSQLType()).toBe(
      "geometry(point,4326)",
    );
    expect(ReportLocation.publicPrecision).toBeDefined();
    expect(ReportLocation.city).toBeDefined();
    expect(ReportLocation.department).toBeDefined();

    expect(ReportMedia.objectKey).toBeDefined();
    expect(ReportMedia.ownerId).toBeDefined();
    expect(ReportMedia.uploadDraftId).toBeDefined();
    expect(ReportMedia.uploadReportType).toBeDefined();
    expect(ReportMedia.expectedChecksumSha256).toBeDefined();
    expect(ReportMedia.expiresAt).toBeDefined();
    expect(ReportMedia.verifiedAt).toBeDefined();
    expect(ReportMedia.failedAt).toBeDefined();
    expect(ReportMedia.removedAt).toBeDefined();
    expect(ReportMedia.position).toBeDefined();
    expect(ReportLifecycleEvent.type).toBeDefined();
    expect(ReportLifecycleEvent.actorId).toBeDefined();
    expect(ReportModerationAction.reportId).toBeDefined();
    expect(ReportModerationAction.targetType).toBeDefined();
    expect(ReportModerationAction.adminId).toBeDefined();
    expect(ReportModerationAction.reason).toBeDefined();
    expect(ReportModerationAction.note).toBeDefined();
  });

  it("supports pending, ready, failed, and removed media states", () => {
    expect(ReportMedia.status.enumValues).toEqual([
      "pending",
      "ready",
      "failed",
      "removed",
    ]);
  });

  it("supports pending review reports for Review Mode adoption publishing", () => {
    expect(reportStatus.enumValues).toEqual([
      "active",
      "pending_review",
      "closed",
    ]);
  });

  it("records moderation actions separately from report status", () => {
    expect(reportModerationActionType.enumValues).toEqual([
      "hide",
      "restore",
      "mark_false",
      "unmark_false",
    ]);

    const reportIndexes = getTableConfig(Report).indexes.map(
      (index) => index.config.name,
    );
    const actionIndexes = getTableConfig(ReportModerationAction).indexes.map(
      (index) => index.config.name,
    );

    expect(reportIndexes).toContain("report_hidden_at_idx");
    expect(actionIndexes).toEqual(
      expect.arrayContaining([
        "report_moderation_action_admin_idx",
        "report_moderation_action_report_idx",
      ]),
    );
  });

  it("defines persistent one-to-one report chat tables with participant safety indexes", () => {
    expect(ChatConversation.reportId).toBeDefined();
    expect(ChatConversation.caretakerMemberId).toBeDefined();
    expect(ChatConversation.contactMemberId).toBeDefined();
    expect(ChatMessage.conversationId).toBeDefined();
    expect(ChatMessage.senderMemberId).toBeDefined();
    expect(ChatConversationHidden.memberId).toBeDefined();
    expect(ChatConversationBlock.blockerMemberId).toBeDefined();
    expect(ChatConversationBlock.blockedMemberId).toBeDefined();
    expect(ChatConversationReport.reporterMemberId).toBeDefined();
    expect(ChatNotificationDelivery.messageId).toBeDefined();
    expect(ChatNotificationDelivery.recipientMemberId).toBeDefined();
    expect(ChatNotificationDelivery.pushTokenId).toBeDefined();
    expect(ChatNotificationDelivery.deepLink).toBeDefined();
    expect(ChatNotificationDelivery.status.enumValues).toEqual([
      "pending",
      "sent",
      "failed",
      "skipped",
    ]);
    expect(ChatConversationReport.reason.enumValues).toEqual([
      "spam",
      "scam",
      "incorrect_location",
      "offensive_content",
      "animal_cruelty",
      "stolen_pet_concern",
      "impersonation",
      "other",
    ]);

    const conversationIndexes = getTableConfig(ChatConversation).indexes.map(
      (index) => index.config.name,
    );
    const messageIndexes = getTableConfig(ChatMessage).indexes.map(
      (index) => index.config.name,
    );
    const hiddenPrimaryKeys = getTableConfig(
      ChatConversationHidden,
    ).primaryKeys;
    const blockIndexes = getTableConfig(ChatConversationBlock).indexes.map(
      (index) => index.config.name,
    );
    const reportIndexes = getTableConfig(ChatConversationReport).indexes.map(
      (index) => index.config.name,
    );
    const notificationDeliveryIndexes = getTableConfig(
      ChatNotificationDelivery,
    ).indexes.map((index) => index.config.name);

    expect(conversationIndexes).toEqual(
      expect.arrayContaining([
        "chat_conversation_report_members_idx",
        "chat_conversation_caretaker_updated_idx",
        "chat_conversation_contact_updated_idx",
      ]),
    );
    expect(messageIndexes).toContain("chat_message_conversation_created_idx");
    expect(hiddenPrimaryKeys.map((key) => key.getName())).toContain(
      "chat_conversation_hidden_pk",
    );
    expect(blockIndexes).toEqual(
      expect.arrayContaining([
        "chat_conversation_block_unique_idx",
        "chat_conversation_block_blocked_idx",
        "chat_conversation_block_blocker_idx",
      ]),
    );
    expect(reportIndexes).toEqual(
      expect.arrayContaining([
        "chat_conversation_report_created_idx",
        "chat_conversation_report_reporter_idx",
      ]),
    );
    expect(notificationDeliveryIndexes).toEqual(
      expect.arrayContaining([
        "chat_notification_delivery_message_recipient_idx",
        "chat_notification_delivery_conversation_created_idx",
        "chat_notification_delivery_recipient_created_idx",
        "chat_notification_delivery_status_created_idx",
      ]),
    );
  });

  it("defines durable alert subscription, push token, and delivery tables", () => {
    expect(AlertSubscription.memberId).toBeDefined();
    expect(alertSubscriptionCategory.enumValues).toEqual(["lost_pet"]);
    expect(AlertSubscription.categories.getSQLType()).toBe(
      "alert_subscription_category[]",
    );
    expect(AlertSubscription.radiusMeters).toBeDefined();
    expect(AlertSubscription.locationPoint.getSQLType()).toBe(
      "geometry(point,4326)",
    );
    expect(AlertSubscription.latitude).toBeDefined();
    expect(AlertSubscription.longitude).toBeDefined();
    expect(AlertSubscription.pausedUntil).toBeDefined();
    expect(AlertSubscription.unsubscribedAt).toBeDefined();

    expect(AlertPushToken.memberId).toBeDefined();
    expect(AlertPushToken.token).toBeDefined();
    expect(AlertPushToken.platform.enumValues).toEqual([
      "ios",
      "android",
      "web",
      "unknown",
    ]);
    expect(AlertPushToken.disabledAt).toBeDefined();

    expect(AlertNotificationDelivery.subscriptionId).toBeDefined();
    expect(AlertNotificationDelivery.reportId).toBeDefined();
    expect(AlertNotificationDelivery.pushTokenId).toBeDefined();
    expect(AlertNotificationDelivery.status.enumValues).toEqual([
      "pending",
      "sent",
      "failed",
      "skipped",
    ]);

    const subscriptionIndexes = getTableConfig(AlertSubscription).indexes.map(
      (index) => index.config.name,
    );
    const pushTokenIndexes = getTableConfig(AlertPushToken).indexes.map(
      (index) => index.config.name,
    );
    const deliveryIndexes = getTableConfig(
      AlertNotificationDelivery,
    ).indexes.map((index) => index.config.name);

    expect(subscriptionIndexes).toEqual(
      expect.arrayContaining([
        "alert_subscription_member_idx",
        "alert_subscription_location_point_gist_idx",
        "alert_subscription_active_idx",
      ]),
    );
    expect(pushTokenIndexes).toEqual(
      expect.arrayContaining([
        "alert_push_token_token_idx",
        "alert_push_token_member_active_idx",
      ]),
    );
    expect(deliveryIndexes).toEqual(
      expect.arrayContaining([
        "alert_notification_delivery_subscription_report_idx",
        "alert_notification_delivery_report_idx",
        "alert_notification_delivery_member_created_idx",
        "alert_notification_delivery_status_created_idx",
      ]),
    );
  });

  it("indexes structured report location fields for admin metrics", () => {
    const locationIndexes = getTableConfig(ReportLocation).indexes.map(
      (index) => index.config.name,
    );

    expect(locationIndexes).toEqual(
      expect.arrayContaining([
        "report_location_city_idx",
        "report_location_department_idx",
      ]),
    );
  });

  it("allows media replacement history without blocking reused display positions", () => {
    const reportMediaIndexes = getTableConfig(ReportMedia).indexes.map(
      (index) => index.config,
    );
    const positionIndex = reportMediaIndexes.find(
      (index) => index.name === "report_media_report_ready_position_idx",
    );

    expect(
      positionIndex?.columns.map((column) => "name" in column && column.name),
    ).toEqual(["reportId", "position"]);
    expect(positionIndex?.unique).toBe(true);
    expect(
      positionIndex?.where?.toQuery(postgresQueryConfig as never).sql,
    ).toBe(
      `"report_media"."status" = 'ready' AND "report_media"."reportId" IS NOT NULL`,
    );
  });

  it("uses Date values for timestamp update hooks", () => {
    expect(Post.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(Report.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(ReportLocation.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
  });
});
