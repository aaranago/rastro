DO $$ BEGIN
  CREATE TYPE "report_moderation_review_status" AS ENUM (
    'pending',
    'dismissed_false_report',
    'resolved_action_taken',
    'resolved_no_action'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_moderation_review_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "report_id" uuid NOT NULL,
  "target_type" "report_type" NOT NULL,
  "reason" "moderation_report_reason" NOT NULL,
  "status" "report_moderation_review_status" DEFAULT 'pending' NOT NULL,
  "first_reported_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_reported_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone,
  "resolved_by_admin_id" text,
  "resolution_note" text,
  "resolution_reason" varchar(120),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "report_moderation_review_item_report_id_report_id_fk"
    FOREIGN KEY ("report_id") REFERENCES "report"("id") ON DELETE cascade,
  CONSTRAINT "report_moderation_review_item_resolved_by_admin_id_user_id_fk"
    FOREIGN KEY ("resolved_by_admin_id") REFERENCES "user"("id") ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_moderation_report" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "review_item_id" uuid NOT NULL,
  "report_id" uuid NOT NULL,
  "reporter_id" text NOT NULL,
  "reason" "moderation_report_reason" NOT NULL,
  "detail" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "report_moderation_report_review_item_id_report_moderation_review_item_id_fk"
    FOREIGN KEY ("review_item_id") REFERENCES "report_moderation_review_item"("id") ON DELETE cascade,
  CONSTRAINT "report_moderation_report_report_id_report_id_fk"
    FOREIGN KEY ("report_id") REFERENCES "report"("id") ON DELETE cascade,
  CONSTRAINT "report_moderation_report_reporter_id_user_id_fk"
    FOREIGN KEY ("reporter_id") REFERENCES "user"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "report_moderation_review_unique_idx"
  ON "report_moderation_review_item" ("report_id", "reason")
  WHERE "status" = 'pending';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_moderation_review_report_idx"
  ON "report_moderation_review_item" ("report_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_moderation_review_status_latest_idx"
  ON "report_moderation_review_item" ("status", "last_reported_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_moderation_review_resolved_admin_idx"
  ON "report_moderation_review_item" ("resolved_by_admin_id", "resolved_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "report_moderation_report_reporter_unique_idx"
  ON "report_moderation_report" ("reporter_id", "report_id", "reason");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_moderation_report_review_created_idx"
  ON "report_moderation_report" ("review_item_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_moderation_report_report_idx"
  ON "report_moderation_report" ("report_id");
