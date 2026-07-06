import { relations, sql } from "drizzle-orm";
import {
  customType,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { user } from "./auth-schema";

const postgisPoint4326 = customType<{
  data: { x: number; y: number };
  driverData: string;
}>({
  dataType: () => "geometry(point,4326)",
  toDriver: (value) =>
    sql`ST_SetSRID(ST_MakePoint(${value.x}, ${value.y}), 4326)`,
});

type PgTableBuilder = Parameters<Parameters<typeof pgTable>[1]>[0];

const timestampWithTimezone = { mode: "date", withTimezone: true } as const;

function createUploadLifecycleColumns(t: PgTableBuilder) {
  return {
    expiresAt: t.timestamp(timestampWithTimezone).notNull(),
    verifiedAt: t.timestamp(timestampWithTimezone),
    failedAt: t.timestamp(timestampWithTimezone),
    removedAt: t.timestamp(timestampWithTimezone),
    createdAt: t.timestamp(timestampWithTimezone).defaultNow().notNull(),
    updatedAt: t
      .timestamp(timestampWithTimezone)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  };
}

function createModerationReviewLifecycleColumns<TStatus>(
  t: PgTableBuilder,
  status: TStatus,
) {
  return {
    status,
    firstReportedAt: t.timestamp(timestampWithTimezone).defaultNow().notNull(),
    lastReportedAt: t.timestamp(timestampWithTimezone).defaultNow().notNull(),
    resolvedAt: t.timestamp(timestampWithTimezone),
    resolvedByAdminId: t.text().references(() => user.id, {
      onDelete: "set null",
    }),
    resolutionNote: t.text(),
    resolutionReason: t.varchar({ length: 120 }),
    createdAt: t.timestamp(timestampWithTimezone).defaultNow().notNull(),
    updatedAt: t
      .timestamp(timestampWithTimezone)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  };
}

export const Post = pgTable("post", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  title: t.varchar({ length: 256 }).notNull(),
  content: t.text().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdate(() => new Date()),
}));

export const CreatePostSchema = createInsertSchema(Post, {
  title: z.string().max(256),
  content: z.string().max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const reportType = pgEnum("report_type", [
  "lost_pet",
  "found_pet",
  "sighting",
  "adoption",
]);

export const reportStatus = pgEnum("report_status", [
  "active",
  "pending_review",
  "closed",
]);

export const reportOutcome = pgEnum("report_outcome", [
  "still_missing",
  "reunited",
  "transferred_to_shelter",
  "unable_to_locate",
  "inactive",
  "adopted",
]);

export const petSpecies = pgEnum("pet_species", [
  "dog",
  "cat",
  "bird",
  "rabbit",
  "other",
]);

export const contactPreference = pgEnum("contact_preference", [
  "in_app_chat",
  "whatsapp",
  "both",
]);

export const resourceProviderCategory = pgEnum("resource_provider_category", [
  "veterinary",
  "shelter",
  "groomer",
  "pet_food",
  "trainer",
  "pet_store",
  "transport",
  "other",
]);

export const resourceProviderContactKind = pgEnum(
  "resource_provider_contact_kind",
  ["phone", "whatsapp", "website", "email", "directions", "social"],
);

export const resourceProviderVerificationStatus = pgEnum(
  "resource_provider_verification_status",
  ["unverified", "verified"],
);

export const moderationReportReason = pgEnum("moderation_report_reason", [
  "spam",
  "scam",
  "incorrect_location",
  "offensive_content",
  "animal_cruelty",
  "stolen_pet_concern",
  "impersonation",
  "other",
]);

export const resourceProviderModerationReviewStatus = pgEnum(
  "resource_provider_moderation_review_status",
  [
    "pending",
    "dismissed_false_report",
    "resolved_action_taken",
    "resolved_no_action",
  ],
);

export const reportModerationReviewStatus = pgEnum(
  "report_moderation_review_status",
  [
    "pending",
    "dismissed_false_report",
    "resolved_action_taken",
    "resolved_no_action",
  ],
);

export const memberSuspensionStatus = pgEnum("member_suspension_status", [
  "active",
  "revoked",
]);

export const MemberProfile = pgTable("member_profile", (t) => ({
  memberId: t
    .text()
    .notNull()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  defaultContactPreference: contactPreference()
    .default("in_app_chat")
    .notNull(),
  phone: t.varchar({ length: 32 }),
  whatsapp: t.varchar({ length: 32 }),
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}));

export interface PetProfilePhotoJson {
  alt?: string;
  height?: number;
  id: string;
  mimeType?: string;
  position?: number;
  sourceUri?: string;
  status?: "draft" | "ready" | "uploading" | "error";
  thumbUri?: string;
  uri?: string;
  width?: number;
}

export interface PetProfileRelatedRecordJson {
  id: string;
  kind: "adoption-listing" | "found-report" | "lost-report" | "sighting-report";
  outcomeLabel?: string;
  status: "active" | "closed";
  title: string;
  updatedAtLabel?: string;
}

export const PetProfile = pgTable(
  "pet_profile",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    caretakerMemberId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: t.varchar({ length: 80 }).notNull(),
    type: t.varchar({ length: 24 }).notNull(),
    breed: t.varchar({ length: 120 }).default("").notNull(),
    description: t.text().default("").notNull(),
    photos: t
      .jsonb()
      .$type<PetProfilePhotoJson[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    relatedRecords: t
      .jsonb()
      .$type<PetProfileRelatedRecordJson[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    createdAt: t.timestamp(timestampWithTimezone).defaultNow().notNull(),
    updatedAt: t
      .timestamp(timestampWithTimezone)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => [
    index("pet_profile_caretaker_updated_idx").on(
      table.caretakerMemberId,
      table.updatedAt,
    ),
  ],
);

export const alertSubscriptionCategory = pgEnum("alert_subscription_category", [
  "lost_pet",
]);

export const alertPushTokenPlatform = pgEnum("alert_push_token_platform", [
  "ios",
  "android",
  "web",
  "unknown",
]);

export const alertSubscriptionBackgroundPermissionState = pgEnum(
  "alert_subscription_background_permission_state",
  ["background-granted", "denied", "foreground-only", "not-requested"],
);

export const alertNotificationDeliveryStatus = pgEnum(
  "alert_notification_delivery_status",
  ["pending", "sent", "failed", "skipped"],
);

function createNotificationDeliveryContentColumns(t: PgTableBuilder) {
  return {
    status: alertNotificationDeliveryStatus().default("pending").notNull(),
    title: t.varchar({ length: 160 }).notNull(),
    body: t.text().notNull(),
    deepLink: t.text().notNull(),
  };
}

function createNotificationDeliveryDispatchColumns(t: PgTableBuilder) {
  return {
    sentAt: t.timestamp(timestampWithTimezone),
    failedAt: t.timestamp(timestampWithTimezone),
    failureReason: t.text(),
    createdAt: t.timestamp(timestampWithTimezone).defaultNow().notNull(),
    updatedAt: t
      .timestamp(timestampWithTimezone)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  };
}

export const localSponsorPlacementSurface = pgEnum(
  "local_sponsor_placement_surface",
  [
    "resources_directory",
    "provider_details",
    "launch_home_banner",
    "report_success",
    "contextual_care_resources",
  ],
);

export const localSponsorPlacementDeliveryEventType = pgEnum(
  "local_sponsor_placement_delivery_event_type",
  ["impression", "open"],
);

export const publicLocationPrecision = pgEnum("public_location_precision", [
  "exact",
  "approximate",
]);

export const AdminSettings = pgTable("admin_settings", (t) => ({
  id: t.varchar({ length: 64 }).notNull().primaryKey(),
  adoptionReviewModeEnabled: t.boolean().default(false).notNull(),
  verifiedEmailRequiredToPublish: t.boolean().default(false).notNull(),
  updatedByAdminId: t.text().references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}));

export type AdminAuditEventMetadataJson = Record<string, unknown>;

export const AdminAuditEvent = pgTable(
  "admin_audit_event",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    actorId: t.text().references(() => user.id, { onDelete: "set null" }),
    actorEmail: t.varchar({ length: 320 }),
    action: t.varchar({ length: 120 }).notNull(),
    targetType: t.varchar({ length: 120 }).notNull(),
    targetId: t.varchar({ length: 160 }).notNull(),
    targetLabel: t.varchar({ length: 240 }).notNull(),
    summary: t.text().notNull(),
    metadata: t.jsonb().$type<AdminAuditEventMetadataJson>(),
    source: t.varchar({ length: 120 }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
  (table) => [
    index("admin_audit_event_created_idx").on(table.createdAt),
    index("admin_audit_event_actor_idx").on(table.actorId, table.createdAt),
    index("admin_audit_event_action_idx").on(table.action, table.createdAt),
    index("admin_audit_event_target_idx").on(
      table.targetType,
      table.targetId,
      table.createdAt,
    ),
  ],
);

export const MemberSuspension = pgTable(
  "member_suspension",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    memberId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: memberSuspensionStatus().default("active").notNull(),
    reason: t.text().notNull(),
    suspendedByAdminId: t.text().references(() => user.id, {
      onDelete: "set null",
    }),
    suspendedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: t.timestamp({ mode: "date", withTimezone: true }),
    revokedByAdminId: t.text().references(() => user.id, {
      onDelete: "set null",
    }),
    revokedReason: t.text(),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => [
    uniqueIndex("member_suspension_active_member_idx")
      .on(table.memberId)
      .where(sql`${table.status} = 'active' AND ${table.revokedAt} IS NULL`),
    index("member_suspension_member_created_idx").on(
      table.memberId,
      table.createdAt,
    ),
    index("member_suspension_admin_idx").on(table.suspendedByAdminId),
    index("member_suspension_revoked_admin_idx").on(table.revokedByAdminId),
  ],
);

export const reportMediaKind = pgEnum("report_media_kind", ["photo"]);

export const reportMediaStatus = pgEnum("report_media_status", [
  "pending",
  "ready",
  "failed",
  "removed",
]);

export const adminMediaAssetPurpose = pgEnum("admin_media_asset_purpose", [
  "provider_logo",
  "provider_photo",
  "sponsor_logo",
  "sponsor_image",
]);

export const adminMediaAssetStatus = pgEnum("admin_media_asset_status", [
  "pending",
  "ready",
  "failed",
  "removed",
]);

export const reportLifecycleEventType = pgEnum("report_lifecycle_event_type", [
  "created",
  "updated",
  "resolved",
  "deleted",
]);

export const reportModerationActionType = pgEnum(
  "report_moderation_action_type",
  ["hide", "restore", "mark_false", "unmark_false"],
);

export const Report = pgTable(
  "report",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    caretakerId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    idempotencyKey: t.varchar({ length: 128 }).notNull(),
    type: reportType().notNull(),
    status: reportStatus().default("active").notNull(),
    outcome: reportOutcome(),
    title: t.varchar({ length: 120 }).notNull(),
    description: t.text().notNull(),
    petName: t.varchar({ length: 80 }),
    species: petSpecies().notNull(),
    breed: t.varchar({ length: 120 }),
    color: t.varchar({ length: 120 }).notNull(),
    size: t.varchar({ length: 80 }),
    distinguishingTraits: t.text(),
    eventOccurredAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .notNull(),
    contactPreference: contactPreference().notNull(),
    whatsappPhone: t.varchar({ length: 32 }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    hiddenAt: t.timestamp({ mode: "date", withTimezone: true }),
    hiddenByAdminId: t.text().references(() => user.id, {
      onDelete: "set null",
    }),
    hiddenReason: t.varchar({ length: 120 }),
    hiddenNote: t.text(),
    falseReportedAt: t.timestamp({ mode: "date", withTimezone: true }),
    falseReportedByAdminId: t.text().references(() => user.id, {
      onDelete: "set null",
    }),
    falseReportReason: t.varchar({ length: 120 }),
    falseReportNote: t.text(),
    resolvedAt: t.timestamp({ mode: "date", withTimezone: true }),
    deletedAt: t.timestamp({ mode: "date", withTimezone: true }),
  }),
  (table) => [
    uniqueIndex("report_caretaker_idempotency_key_idx").on(
      table.caretakerId,
      table.idempotencyKey,
    ),
    index("report_caretaker_idx").on(table.caretakerId),
    index("report_type_status_idx").on(table.type, table.status),
    index("report_hidden_at_idx").on(table.hiddenAt),
    index("report_false_reported_at_idx").on(table.falseReportedAt),
    index("report_created_at_idx").on(table.createdAt),
  ],
);

export const ReportLocation = pgTable(
  "report_location",
  (t) => ({
    reportId: t
      .uuid()
      .notNull()
      .primaryKey()
      .references(() => Report.id, { onDelete: "cascade" }),
    exactPoint: postgisPoint4326("exact_point").notNull(),
    exactLatitude: t.doublePrecision().notNull(),
    exactLongitude: t.doublePrecision().notNull(),
    publicPoint: postgisPoint4326("public_point").notNull(),
    publicLatitude: t.doublePrecision().notNull(),
    publicLongitude: t.doublePrecision().notNull(),
    publicPrecision: publicLocationPrecision().default("approximate").notNull(),
    label: t.varchar({ length: 160 }).notNull(),
    city: t.varchar({ length: 120 }).default("No especificado").notNull(),
    department: t.varchar({ length: 80 }).default("No especificado").notNull(),
    locationCell: t.varchar({ length: 96 }).notNull(),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => [
    index("report_location_exact_point_gist_idx").using(
      "gist",
      table.exactPoint,
    ),
    index("report_location_public_point_gist_idx").using(
      "gist",
      table.publicPoint,
    ),
    index("report_location_city_idx").on(table.city),
    index("report_location_department_idx").on(table.department),
    index("report_location_cell_idx").on(table.locationCell),
  ],
);

export const ReportMedia = pgTable(
  "report_media",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    reportId: t.uuid().references(() => Report.id, { onDelete: "cascade" }),
    ownerId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    uploadDraftId: t.varchar({ length: 128 }).notNull(),
    uploadReportType: reportType().notNull(),
    kind: reportMediaKind().default("photo").notNull(),
    status: reportMediaStatus().default("pending").notNull(),
    objectKey: t.varchar({ length: 512 }).notNull(),
    canonicalUrl: t.text(),
    thumbnailObjectKey: t.varchar({ length: 512 }),
    mimeType: t.varchar({ length: 80 }).notNull(),
    width: t.integer().notNull(),
    height: t.integer().notNull(),
    sizeBytes: t.integer().notNull(),
    expectedChecksumSha256: t.varchar({ length: 128 }),
    altText: t.varchar({ length: 240 }),
    position: t.integer(),
    ...createUploadLifecycleColumns(t),
  }),
  (table) => [
    index("report_media_report_idx").on(table.reportId),
    index("report_media_owner_status_idx").on(table.ownerId, table.status),
    index("report_media_pending_expiry_idx")
      .on(table.expiresAt)
      .where(sql`${table.status} = 'pending'`),
    uniqueIndex("report_media_object_key_idx").on(table.objectKey),
    uniqueIndex("report_media_report_ready_position_idx")
      .on(table.reportId, table.position)
      .where(sql`${table.status} = 'ready' AND ${table.reportId} IS NOT NULL`),
  ],
);

export const AdminMediaAsset = pgTable(
  "admin_media_asset",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    createdByAdminId: t.text().references(() => user.id, {
      onDelete: "set null",
    }),
    purpose: adminMediaAssetPurpose().notNull(),
    status: adminMediaAssetStatus().default("pending").notNull(),
    objectKey: t.varchar({ length: 512 }).notNull(),
    canonicalUrl: t.text(),
    mimeType: t.varchar({ length: 80 }).notNull(),
    width: t.integer().notNull(),
    height: t.integer().notNull(),
    sizeBytes: t.integer().notNull(),
    expectedChecksumSha256: t.varchar({ length: 128 }),
    ...createUploadLifecycleColumns(t),
  }),
  (table) => [
    index("admin_media_asset_admin_status_idx").on(
      table.createdByAdminId,
      table.status,
    ),
    index("admin_media_asset_purpose_status_idx").on(
      table.purpose,
      table.status,
    ),
    index("admin_media_asset_pending_expiry_idx")
      .on(table.expiresAt)
      .where(sql`${table.status} = 'pending'`),
    uniqueIndex("admin_media_asset_object_key_idx").on(table.objectKey),
  ],
);

export const ReportLifecycleEvent = pgTable(
  "report_lifecycle_event",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    reportId: t
      .uuid()
      .notNull()
      .references(() => Report.id, { onDelete: "cascade" }),
    actorId: t.text().references(() => user.id, { onDelete: "set null" }),
    type: reportLifecycleEventType().notNull(),
    fromStatus: reportStatus(),
    toStatus: reportStatus(),
    outcome: reportOutcome(),
    note: t.text(),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
  (table) => [
    index("report_lifecycle_report_idx").on(table.reportId),
    index("report_lifecycle_actor_idx").on(table.actorId),
  ],
);

export const ReportModerationAction = pgTable(
  "report_moderation_action",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    reportId: t
      .uuid()
      .notNull()
      .references(() => Report.id, { onDelete: "cascade" }),
    targetType: reportType().notNull(),
    action: reportModerationActionType().notNull(),
    adminId: t.text().references(() => user.id, { onDelete: "set null" }),
    reason: t.varchar({ length: 120 }).notNull(),
    note: t.text(),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
  (table) => [
    index("report_moderation_action_report_idx").on(
      table.reportId,
      table.createdAt,
    ),
    index("report_moderation_action_admin_idx").on(table.adminId),
  ],
);

export const ReportModerationReviewItem = pgTable(
  "report_moderation_review_item",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    reportId: t
      .uuid()
      .notNull()
      .references(() => Report.id, { onDelete: "cascade" }),
    targetType: reportType().notNull(),
    reason: moderationReportReason().notNull(),
    ...createModerationReviewLifecycleColumns(
      t,
      reportModerationReviewStatus().default("pending").notNull(),
    ),
  }),
  (table) => [
    uniqueIndex("report_moderation_review_unique_idx")
      .on(table.reportId, table.reason)
      .where(sql`${table.status} = 'pending'`),
    index("report_moderation_review_report_idx").on(table.reportId),
    index("report_moderation_review_status_latest_idx").on(
      table.status,
      table.lastReportedAt,
    ),
    index("report_moderation_review_resolved_admin_idx").on(
      table.resolvedByAdminId,
      table.resolvedAt,
    ),
  ],
);

export const ReportModerationReport = pgTable(
  "report_moderation_report",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    reviewItemId: t
      .uuid()
      .notNull()
      .references(() => ReportModerationReviewItem.id, {
        onDelete: "cascade",
      }),
    reportId: t
      .uuid()
      .notNull()
      .references(() => Report.id, { onDelete: "cascade" }),
    reporterId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reason: moderationReportReason().notNull(),
    detail: t.text().notNull(),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
  (table) => [
    uniqueIndex("report_moderation_report_reporter_unique_idx").on(
      table.reporterId,
      table.reportId,
      table.reason,
    ),
    index("report_moderation_report_review_created_idx").on(
      table.reviewItemId,
      table.createdAt,
    ),
    index("report_moderation_report_report_idx").on(table.reportId),
  ],
);

export const ChatConversation = pgTable(
  "chat_conversation",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    reportId: t
      .uuid()
      .notNull()
      .references(() => Report.id, { onDelete: "cascade" }),
    caretakerMemberId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contactMemberId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => [
    uniqueIndex("chat_conversation_report_members_idx").on(
      table.reportId,
      table.caretakerMemberId,
      table.contactMemberId,
    ),
    index("chat_conversation_caretaker_updated_idx").on(
      table.caretakerMemberId,
      table.updatedAt,
    ),
    index("chat_conversation_contact_updated_idx").on(
      table.contactMemberId,
      table.updatedAt,
    ),
  ],
);

export const ChatMessage = pgTable(
  "chat_message",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    conversationId: t
      .uuid()
      .notNull()
      .references(() => ChatConversation.id, { onDelete: "cascade" }),
    senderMemberId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    text: t.text().notNull(),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
  (table) => [
    index("chat_message_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

export const ChatConversationHidden = pgTable(
  "chat_conversation_hidden",
  (t) => ({
    conversationId: t
      .uuid()
      .notNull()
      .references(() => ChatConversation.id, { onDelete: "cascade" }),
    memberId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    hiddenAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
  (table) => [
    primaryKey({
      columns: [table.conversationId, table.memberId],
      name: "chat_conversation_hidden_pk",
    }),
    index("chat_conversation_hidden_member_idx").on(
      table.memberId,
      table.hiddenAt,
    ),
  ],
);

export const ChatConversationBlock = pgTable(
  "chat_conversation_block",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    conversationId: t
      .uuid()
      .notNull()
      .references(() => ChatConversation.id, { onDelete: "cascade" }),
    blockerMemberId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockedMemberId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
  (table) => [
    uniqueIndex("chat_conversation_block_unique_idx").on(
      table.conversationId,
      table.blockerMemberId,
      table.blockedMemberId,
    ),
    index("chat_conversation_block_blocker_idx").on(
      table.blockerMemberId,
      table.blockedAt,
    ),
    index("chat_conversation_block_blocked_idx").on(
      table.blockedMemberId,
      table.blockedAt,
    ),
  ],
);

export const ChatConversationReport = pgTable(
  "chat_conversation_report",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    conversationId: t
      .uuid()
      .notNull()
      .references(() => ChatConversation.id, { onDelete: "cascade" }),
    reporterMemberId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reason: moderationReportReason(),
    note: t.text(),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
  (table) => [
    uniqueIndex("chat_conversation_report_reporter_idx").on(
      table.conversationId,
      table.reporterMemberId,
    ),
    index("chat_conversation_report_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

export const AlertSubscription = pgTable(
  "alert_subscription",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    memberId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    categories: alertSubscriptionCategory()
      .array()
      .default(sql`ARRAY['lost_pet']::alert_subscription_category[]`)
      .notNull(),
    radiusMeters: t.integer().default(5000).notNull(),
    locationPoint: postgisPoint4326("location_point"),
    latitude: t.doublePrecision(),
    longitude: t.doublePrecision(),
    locationLabel: t.varchar({ length: 160 }),
    locationCell: t.varchar({ length: 96 }),
    lastLocationRecordedAt: t.timestamp(timestampWithTimezone),
    movingAlertsEnabled: t.boolean().default(false).notNull(),
    movingAlertsPermissionState: alertSubscriptionBackgroundPermissionState()
      .default("not-requested")
      .notNull(),
    pausedUntil: t.timestamp(timestampWithTimezone),
    unsubscribedAt: t.timestamp(timestampWithTimezone),
    createdAt: t.timestamp(timestampWithTimezone).defaultNow().notNull(),
    updatedAt: t
      .timestamp(timestampWithTimezone)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => [
    uniqueIndex("alert_subscription_member_idx").on(table.memberId),
    index("alert_subscription_location_point_gist_idx").using(
      "gist",
      table.locationPoint,
    ),
    index("alert_subscription_active_idx").on(
      table.unsubscribedAt,
      table.pausedUntil,
    ),
  ],
);

export const AlertPushToken = pgTable(
  "alert_push_token",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    memberId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: t.varchar({ length: 512 }).notNull(),
    platform: alertPushTokenPlatform().default("unknown").notNull(),
    deviceId: t.varchar({ length: 128 }),
    registeredAt: t.timestamp(timestampWithTimezone).defaultNow().notNull(),
    lastSeenAt: t.timestamp(timestampWithTimezone).defaultNow().notNull(),
    disabledAt: t.timestamp(timestampWithTimezone),
    createdAt: t.timestamp(timestampWithTimezone).defaultNow().notNull(),
    updatedAt: t
      .timestamp(timestampWithTimezone)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => [
    uniqueIndex("alert_push_token_token_idx").on(table.token),
    index("alert_push_token_member_active_idx")
      .on(table.memberId, table.lastSeenAt)
      .where(sql`${table.disabledAt} IS NULL`),
  ],
);

export const ChatNotificationDelivery = pgTable(
  "chat_notification_delivery",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    conversationId: t
      .uuid()
      .notNull()
      .references(() => ChatConversation.id, { onDelete: "cascade" }),
    messageId: t
      .uuid()
      .notNull()
      .references(() => ChatMessage.id, { onDelete: "cascade" }),
    senderMemberId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipientMemberId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    pushTokenId: t.uuid().references(() => AlertPushToken.id, {
      onDelete: "set null",
    }),
    ...createNotificationDeliveryContentColumns(t),
    queuedAt: t.timestamp(timestampWithTimezone).defaultNow().notNull(),
    ...createNotificationDeliveryDispatchColumns(t),
  }),
  (table) => [
    uniqueIndex("chat_notification_delivery_message_recipient_idx").on(
      table.messageId,
      table.recipientMemberId,
    ),
    index("chat_notification_delivery_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
    index("chat_notification_delivery_recipient_created_idx").on(
      table.recipientMemberId,
      table.createdAt,
    ),
    index("chat_notification_delivery_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
  ],
);

export const AlertNotificationDelivery = pgTable(
  "alert_notification_delivery",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    subscriptionId: t
      .uuid()
      .notNull()
      .references(() => AlertSubscription.id, { onDelete: "cascade" }),
    reportId: t
      .uuid()
      .notNull()
      .references(() => Report.id, { onDelete: "cascade" }),
    pushTokenId: t.uuid().references(() => AlertPushToken.id, {
      onDelete: "set null",
    }),
    memberId: t
      .text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...createNotificationDeliveryContentColumns(t),
    matchedAt: t.timestamp(timestampWithTimezone).defaultNow().notNull(),
    ...createNotificationDeliveryDispatchColumns(t),
  }),
  (table) => [
    uniqueIndex("alert_notification_delivery_subscription_report_idx").on(
      table.subscriptionId,
      table.reportId,
    ),
    index("alert_notification_delivery_report_idx").on(table.reportId),
    index("alert_notification_delivery_member_created_idx").on(
      table.memberId,
      table.createdAt,
    ),
    index("alert_notification_delivery_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
  ],
);

export interface ResourceProviderLinkJson {
  label: string;
  url: string;
}

export const ResourceProvider = pgTable(
  "resource_provider",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    name: t.varchar({ length: 120 }).notNull(),
    category: resourceProviderCategory().notNull(),
    description: t.text().notNull(),
    shortDescription: t.text().notNull(),
    logoUrl: t.text(),
    photoUrl: t.text(),
    serviceAreaLabel: t.varchar({ length: 160 }).notNull(),
    hoursLabel: t.varchar({ length: 160 }).notNull(),
    websiteUrl: t.text(),
    socialLinks: t.jsonb().$type<ResourceProviderLinkJson[]>(),
    externalLinks: t.jsonb().$type<ResourceProviderLinkJson[]>(),
    emergencyAvailable: t.boolean().default(false).notNull(),
    isOpenNow: t.boolean().default(false).notNull(),
    verificationStatus: resourceProviderVerificationStatus()
      .default("unverified")
      .notNull(),
    verificationNote: t.text(),
    verifiedAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdByAdminId: t.text().references(() => user.id, {
      onDelete: "set null",
    }),
    verificationUpdatedByAdminId: t.text().references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: t.timestamp({ mode: "date", withTimezone: true }),
  }),
  (table) => [
    index("resource_provider_category_idx").on(table.category),
    index("resource_provider_verification_idx").on(table.verificationStatus),
    index("resource_provider_created_at_idx").on(table.createdAt),
  ],
);

export const ResourceProviderLocation = pgTable(
  "resource_provider_location",
  (t) => ({
    providerId: t
      .uuid()
      .notNull()
      .primaryKey()
      .references(() => ResourceProvider.id, { onDelete: "cascade" }),
    exactPoint: postgisPoint4326("exact_point").notNull(),
    exactLatitude: t.doublePrecision().notNull(),
    exactLongitude: t.doublePrecision().notNull(),
    publicPoint: postgisPoint4326("public_point").notNull(),
    publicLatitude: t.doublePrecision().notNull(),
    publicLongitude: t.doublePrecision().notNull(),
    publicPrecision: publicLocationPrecision().default("approximate").notNull(),
    city: t.varchar({ length: 120 }).notNull(),
    department: t.varchar({ length: 80 }).notNull(),
    approximateLocationLabel: t.varchar({ length: 160 }).notNull(),
    locationCell: t.varchar({ length: 96 }).notNull(),
    addressLabel: t.varchar({ length: 240 }),
    countryCode: t.varchar({ length: 2 }).default("BO").notNull(),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => [
    index("resource_provider_location_exact_point_gist_idx").using(
      "gist",
      table.exactPoint,
    ),
    index("resource_provider_location_public_point_gist_idx").using(
      "gist",
      table.publicPoint,
    ),
    index("resource_provider_location_city_idx").on(table.city),
    index("resource_provider_location_department_idx").on(table.department),
    index("resource_provider_location_cell_idx").on(table.locationCell),
  ],
);

export const ResourceProviderContactOption = pgTable(
  "resource_provider_contact_option",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    providerId: t
      .uuid()
      .notNull()
      .references(() => ResourceProvider.id, { onDelete: "cascade" }),
    kind: resourceProviderContactKind().notNull(),
    label: t.varchar({ length: 80 }).notNull(),
    value: t.text().notNull(),
    sortOrder: t.integer().default(0).notNull(),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => [
    index("resource_provider_contact_provider_idx").on(
      table.providerId,
      table.sortOrder,
    ),
  ],
);

export const LocalSponsorPlacement = pgTable(
  "local_sponsor_placement",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    providerId: t
      .uuid()
      .notNull()
      .references(() => ResourceProvider.id, { onDelete: "cascade" }),
    surface: localSponsorPlacementSurface().notNull(),
    label: t.varchar({ length: 80 }).default("Patrocinado").notNull(),
    disclosure: t
      .varchar({ length: 240 })
      .default("Patrocinado: apoyo local. No cambia la prioridad de reportes.")
      .notNull(),
    logoUrl: t.text(),
    imageUrl: t.text(),
    startsAt: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
    endsAt: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
    detachedAt: t.timestamp({ mode: "date", withTimezone: true }),
    createdByAdminId: t.text().references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  }),
  (table) => [
    index("local_sponsor_placement_provider_idx").on(table.providerId),
    index("local_sponsor_placement_surface_idx").on(table.surface),
    index("local_sponsor_placement_active_window_idx").on(
      table.startsAt,
      table.endsAt,
    ),
  ],
);

export const LocalSponsorPlacementDeliveryEvent = pgTable(
  "local_sponsor_placement_delivery_event",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    placementId: t
      .uuid()
      .notNull()
      .references(() => LocalSponsorPlacement.id, { onDelete: "cascade" }),
    providerId: t
      .uuid()
      .notNull()
      .references(() => ResourceProvider.id, { onDelete: "cascade" }),
    surface: localSponsorPlacementSurface().notNull(),
    eventType: localSponsorPlacementDeliveryEventType().notNull(),
    idempotencyKey: t.varchar({ length: 191 }).notNull(),
    memberId: t.text().references(() => user.id, { onDelete: "set null" }),
    source: t.varchar({ length: 80 }),
    occurredAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
  (table) => [
    uniqueIndex("local_sponsor_delivery_event_idempotency_idx").on(
      table.idempotencyKey,
    ),
    index("local_sponsor_delivery_event_placement_idx").on(
      table.placementId,
      table.occurredAt,
    ),
    index("local_sponsor_delivery_event_provider_surface_idx").on(
      table.providerId,
      table.surface,
      table.eventType,
      table.occurredAt,
    ),
  ],
);

export const ResourceProviderModerationReviewItem = pgTable(
  "resource_provider_moderation_review_item",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    providerId: t
      .uuid()
      .notNull()
      .references(() => ResourceProvider.id, { onDelete: "cascade" }),
    reason: moderationReportReason().notNull(),
    ...createModerationReviewLifecycleColumns(
      t,
      resourceProviderModerationReviewStatus().default("pending").notNull(),
    ),
  }),
  (table) => [
    uniqueIndex("resource_provider_moderation_review_unique_idx")
      .on(table.providerId, table.reason)
      .where(sql`${table.status} = 'pending'`),
    index("resource_provider_moderation_review_provider_idx").on(
      table.providerId,
    ),
    index("resource_provider_moderation_review_status_latest_idx").on(
      table.status,
      table.lastReportedAt,
    ),
    index("resource_provider_moderation_review_resolved_admin_idx").on(
      table.resolvedByAdminId,
      table.resolvedAt,
    ),
  ],
);

export const ResourceProviderModerationReport = pgTable(
  "resource_provider_moderation_report",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    reviewItemId: t
      .uuid()
      .notNull()
      .references(() => ResourceProviderModerationReviewItem.id, {
        onDelete: "cascade",
      }),
    providerId: t
      .uuid()
      .notNull()
      .references(() => ResourceProvider.id, { onDelete: "cascade" }),
    reporterId: t.text().references(() => user.id, {
      onDelete: "set null",
    }),
    reason: moderationReportReason().notNull(),
    detail: t.text().notNull(),
    createdAt: t
      .timestamp({ mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
  }),
  (table) => [
    uniqueIndex("resource_provider_moderation_report_reporter_idx")
      .on(table.reporterId, table.providerId, table.reason)
      .where(sql`${table.reporterId} IS NOT NULL`),
    index("resource_provider_moderation_report_review_item_idx").on(
      table.reviewItemId,
      table.createdAt,
    ),
    index("resource_provider_moderation_report_provider_idx").on(
      table.providerId,
    ),
  ],
);

export const reportRelations = relations(Report, ({ one, many }) => ({
  caretaker: one(user, {
    fields: [Report.caretakerId],
    references: [user.id],
  }),
  location: one(ReportLocation, {
    fields: [Report.id],
    references: [ReportLocation.reportId],
  }),
  chatConversations: many(ChatConversation),
  media: many(ReportMedia),
  lifecycleEvents: many(ReportLifecycleEvent),
  moderationActions: many(ReportModerationAction),
  moderationReports: many(ReportModerationReport),
  moderationReviewItems: many(ReportModerationReviewItem),
  hiddenByAdmin: one(user, {
    fields: [Report.hiddenByAdminId],
    references: [user.id],
  }),
  falseReportedByAdmin: one(user, {
    fields: [Report.falseReportedByAdminId],
    references: [user.id],
  }),
}));

export const reportLocationRelations = relations(ReportLocation, ({ one }) => ({
  report: one(Report, {
    fields: [ReportLocation.reportId],
    references: [Report.id],
  }),
}));

export const reportMediaRelations = relations(ReportMedia, ({ one }) => ({
  report: one(Report, {
    fields: [ReportMedia.reportId],
    references: [Report.id],
  }),
}));

export const adminMediaAssetRelations = relations(
  AdminMediaAsset,
  ({ one }) => ({
    createdByAdmin: one(user, {
      fields: [AdminMediaAsset.createdByAdminId],
      references: [user.id],
    }),
  }),
);

export const reportLifecycleEventRelations = relations(
  ReportLifecycleEvent,
  ({ one }) => ({
    report: one(Report, {
      fields: [ReportLifecycleEvent.reportId],
      references: [Report.id],
    }),
    actor: one(user, {
      fields: [ReportLifecycleEvent.actorId],
      references: [user.id],
    }),
  }),
);

export const reportModerationActionRelations = relations(
  ReportModerationAction,
  ({ one }) => ({
    admin: one(user, {
      fields: [ReportModerationAction.adminId],
      references: [user.id],
    }),
    report: one(Report, {
      fields: [ReportModerationAction.reportId],
      references: [Report.id],
    }),
  }),
);

export const reportModerationReviewItemRelations = relations(
  ReportModerationReviewItem,
  ({ many, one }) => ({
    report: one(Report, {
      fields: [ReportModerationReviewItem.reportId],
      references: [Report.id],
    }),
    reports: many(ReportModerationReport),
    resolvedByAdmin: one(user, {
      fields: [ReportModerationReviewItem.resolvedByAdminId],
      references: [user.id],
    }),
  }),
);

export const reportModerationReportRelations = relations(
  ReportModerationReport,
  ({ one }) => ({
    report: one(Report, {
      fields: [ReportModerationReport.reportId],
      references: [Report.id],
    }),
    reporter: one(user, {
      fields: [ReportModerationReport.reporterId],
      references: [user.id],
    }),
    reviewItem: one(ReportModerationReviewItem, {
      fields: [ReportModerationReport.reviewItemId],
      references: [ReportModerationReviewItem.id],
    }),
  }),
);

export const chatConversationRelations = relations(
  ChatConversation,
  ({ one, many }) => ({
    report: one(Report, {
      fields: [ChatConversation.reportId],
      references: [Report.id],
    }),
    caretaker: one(user, {
      fields: [ChatConversation.caretakerMemberId],
      references: [user.id],
    }),
    contact: one(user, {
      fields: [ChatConversation.contactMemberId],
      references: [user.id],
    }),
    messages: many(ChatMessage),
    hiddenStates: many(ChatConversationHidden),
    blocks: many(ChatConversationBlock),
    reports: many(ChatConversationReport),
    notificationDeliveries: many(ChatNotificationDelivery),
  }),
);

export const chatMessageRelations = relations(ChatMessage, ({ many, one }) => ({
  conversation: one(ChatConversation, {
    fields: [ChatMessage.conversationId],
    references: [ChatConversation.id],
  }),
  sender: one(user, {
    fields: [ChatMessage.senderMemberId],
    references: [user.id],
  }),
  notificationDeliveries: many(ChatNotificationDelivery),
}));

export const chatConversationHiddenRelations = relations(
  ChatConversationHidden,
  ({ one }) => ({
    conversation: one(ChatConversation, {
      fields: [ChatConversationHidden.conversationId],
      references: [ChatConversation.id],
    }),
    member: one(user, {
      fields: [ChatConversationHidden.memberId],
      references: [user.id],
    }),
  }),
);

export const chatConversationBlockRelations = relations(
  ChatConversationBlock,
  ({ one }) => ({
    conversation: one(ChatConversation, {
      fields: [ChatConversationBlock.conversationId],
      references: [ChatConversation.id],
    }),
    blocker: one(user, {
      fields: [ChatConversationBlock.blockerMemberId],
      references: [user.id],
    }),
    blocked: one(user, {
      fields: [ChatConversationBlock.blockedMemberId],
      references: [user.id],
    }),
  }),
);

export const chatConversationReportRelations = relations(
  ChatConversationReport,
  ({ one }) => ({
    conversation: one(ChatConversation, {
      fields: [ChatConversationReport.conversationId],
      references: [ChatConversation.id],
    }),
    reporter: one(user, {
      fields: [ChatConversationReport.reporterMemberId],
      references: [user.id],
    }),
  }),
);

export const chatNotificationDeliveryRelations = relations(
  ChatNotificationDelivery,
  ({ one }) => ({
    conversation: one(ChatConversation, {
      fields: [ChatNotificationDelivery.conversationId],
      references: [ChatConversation.id],
    }),
    message: one(ChatMessage, {
      fields: [ChatNotificationDelivery.messageId],
      references: [ChatMessage.id],
    }),
    pushToken: one(AlertPushToken, {
      fields: [ChatNotificationDelivery.pushTokenId],
      references: [AlertPushToken.id],
    }),
    recipient: one(user, {
      fields: [ChatNotificationDelivery.recipientMemberId],
      references: [user.id],
    }),
    sender: one(user, {
      fields: [ChatNotificationDelivery.senderMemberId],
      references: [user.id],
    }),
  }),
);

export const alertSubscriptionRelations = relations(
  AlertSubscription,
  ({ many, one }) => ({
    deliveries: many(AlertNotificationDelivery),
    member: one(user, {
      fields: [AlertSubscription.memberId],
      references: [user.id],
    }),
  }),
);

export const alertPushTokenRelations = relations(
  AlertPushToken,
  ({ many, one }) => ({
    chatNotificationDeliveries: many(ChatNotificationDelivery),
    member: one(user, {
      fields: [AlertPushToken.memberId],
      references: [user.id],
    }),
  }),
);

export const alertNotificationDeliveryRelations = relations(
  AlertNotificationDelivery,
  ({ one }) => ({
    member: one(user, {
      fields: [AlertNotificationDelivery.memberId],
      references: [user.id],
    }),
    pushToken: one(AlertPushToken, {
      fields: [AlertNotificationDelivery.pushTokenId],
      references: [AlertPushToken.id],
    }),
    report: one(Report, {
      fields: [AlertNotificationDelivery.reportId],
      references: [Report.id],
    }),
    subscription: one(AlertSubscription, {
      fields: [AlertNotificationDelivery.subscriptionId],
      references: [AlertSubscription.id],
    }),
  }),
);

export const memberProfileRelations = relations(MemberProfile, ({ one }) => ({
  member: one(user, {
    fields: [MemberProfile.memberId],
    references: [user.id],
  }),
}));

export const memberSuspensionRelations = relations(
  MemberSuspension,
  ({ one }) => ({
    member: one(user, {
      fields: [MemberSuspension.memberId],
      references: [user.id],
    }),
    revokedByAdmin: one(user, {
      fields: [MemberSuspension.revokedByAdminId],
      references: [user.id],
    }),
    suspendedByAdmin: one(user, {
      fields: [MemberSuspension.suspendedByAdminId],
      references: [user.id],
    }),
  }),
);

export const resourceProviderRelations = relations(
  ResourceProvider,
  ({ one, many }) => ({
    contactOptions: many(ResourceProviderContactOption),
    createdByAdmin: one(user, {
      fields: [ResourceProvider.createdByAdminId],
      references: [user.id],
    }),
    location: one(ResourceProviderLocation, {
      fields: [ResourceProvider.id],
      references: [ResourceProviderLocation.providerId],
    }),
    sponsorPlacements: many(LocalSponsorPlacement),
    moderationReviewItems: many(ResourceProviderModerationReviewItem),
    verificationUpdatedByAdmin: one(user, {
      fields: [ResourceProvider.verificationUpdatedByAdminId],
      references: [user.id],
    }),
  }),
);

export const resourceProviderLocationRelations = relations(
  ResourceProviderLocation,
  ({ one }) => ({
    provider: one(ResourceProvider, {
      fields: [ResourceProviderLocation.providerId],
      references: [ResourceProvider.id],
    }),
  }),
);

export const resourceProviderContactOptionRelations = relations(
  ResourceProviderContactOption,
  ({ one }) => ({
    provider: one(ResourceProvider, {
      fields: [ResourceProviderContactOption.providerId],
      references: [ResourceProvider.id],
    }),
  }),
);

export const localSponsorPlacementRelations = relations(
  LocalSponsorPlacement,
  ({ one, many }) => ({
    createdByAdmin: one(user, {
      fields: [LocalSponsorPlacement.createdByAdminId],
      references: [user.id],
    }),
    deliveryEvents: many(LocalSponsorPlacementDeliveryEvent),
    provider: one(ResourceProvider, {
      fields: [LocalSponsorPlacement.providerId],
      references: [ResourceProvider.id],
    }),
  }),
);

export const localSponsorPlacementDeliveryEventRelations = relations(
  LocalSponsorPlacementDeliveryEvent,
  ({ one }) => ({
    member: one(user, {
      fields: [LocalSponsorPlacementDeliveryEvent.memberId],
      references: [user.id],
    }),
    placement: one(LocalSponsorPlacement, {
      fields: [LocalSponsorPlacementDeliveryEvent.placementId],
      references: [LocalSponsorPlacement.id],
    }),
    provider: one(ResourceProvider, {
      fields: [LocalSponsorPlacementDeliveryEvent.providerId],
      references: [ResourceProvider.id],
    }),
  }),
);

export const resourceProviderModerationReviewItemRelations = relations(
  ResourceProviderModerationReviewItem,
  ({ one, many }) => ({
    provider: one(ResourceProvider, {
      fields: [ResourceProviderModerationReviewItem.providerId],
      references: [ResourceProvider.id],
    }),
    reports: many(ResourceProviderModerationReport),
    resolvedByAdmin: one(user, {
      fields: [ResourceProviderModerationReviewItem.resolvedByAdminId],
      references: [user.id],
    }),
  }),
);

export const resourceProviderModerationReportRelations = relations(
  ResourceProviderModerationReport,
  ({ one }) => ({
    provider: one(ResourceProvider, {
      fields: [ResourceProviderModerationReport.providerId],
      references: [ResourceProvider.id],
    }),
    reporter: one(user, {
      fields: [ResourceProviderModerationReport.reporterId],
      references: [user.id],
    }),
    reviewItem: one(ResourceProviderModerationReviewItem, {
      fields: [ResourceProviderModerationReport.reviewItemId],
      references: [ResourceProviderModerationReviewItem.id],
    }),
  }),
);

export const adminSettingsRelations = relations(AdminSettings, ({ one }) => ({
  updatedByAdmin: one(user, {
    fields: [AdminSettings.updatedByAdminId],
    references: [user.id],
  }),
}));

export const adminAuditEventRelations = relations(
  AdminAuditEvent,
  ({ one }) => ({
    actor: one(user, {
      fields: [AdminAuditEvent.actorId],
      references: [user.id],
    }),
  }),
);

export * from "./auth-schema";
