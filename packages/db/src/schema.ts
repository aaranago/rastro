import { relations, sql } from "drizzle-orm";
import {
  customType,
  index,
  pgEnum,
  pgTable,
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

export const reportStatus = pgEnum("report_status", ["active", "closed"]);

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

export const publicLocationPrecision = pgEnum("public_location_precision", [
  "exact",
  "approximate",
]);

export const reportMediaKind = pgEnum("report_media_kind", ["photo"]);

export const reportMediaStatus = pgEnum("report_media_status", [
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
    expiresAt: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
    verifiedAt: t.timestamp({ mode: "date", withTimezone: true }),
    failedAt: t.timestamp({ mode: "date", withTimezone: true }),
    removedAt: t.timestamp({ mode: "date", withTimezone: true }),
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

export const reportRelations = relations(Report, ({ one, many }) => ({
  caretaker: one(user, {
    fields: [Report.caretakerId],
    references: [user.id],
  }),
  location: one(ReportLocation, {
    fields: [Report.id],
    references: [ReportLocation.reportId],
  }),
  media: many(ReportMedia),
  lifecycleEvents: many(ReportLifecycleEvent),
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

export * from "./auth-schema";
