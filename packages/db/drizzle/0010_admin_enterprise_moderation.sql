ALTER TYPE "public"."report_moderation_action_type" ADD VALUE IF NOT EXISTS 'mark_false';--> statement-breakpoint
ALTER TYPE "public"."report_moderation_action_type" ADD VALUE IF NOT EXISTS 'unmark_false';--> statement-breakpoint
ALTER TYPE "public"."resource_provider_moderation_review_status" ADD VALUE IF NOT EXISTS 'dismissed_false_report';--> statement-breakpoint
ALTER TYPE "public"."resource_provider_moderation_review_status" ADD VALUE IF NOT EXISTS 'resolved_action_taken';--> statement-breakpoint
ALTER TYPE "public"."resource_provider_moderation_review_status" ADD VALUE IF NOT EXISTS 'resolved_no_action';--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "false_reported_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "false_reported_by_admin_id" text;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "false_report_reason" varchar(120);--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "false_report_note" text;--> statement-breakpoint
ALTER TABLE "resource_provider_moderation_review_item" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "resource_provider_moderation_review_item" ADD COLUMN "resolved_by_admin_id" text;--> statement-breakpoint
ALTER TABLE "resource_provider_moderation_review_item" ADD COLUMN "resolution_note" text;--> statement-breakpoint
ALTER TABLE "resource_provider_moderation_review_item" ADD COLUMN "resolution_reason" varchar(120);--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_false_reported_by_admin_id_user_id_fk" FOREIGN KEY ("false_reported_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_provider_moderation_review_item" ADD CONSTRAINT "resource_provider_moderation_review_item_resolved_by_admin_id_user_id_fk" FOREIGN KEY ("resolved_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
DROP INDEX IF EXISTS "resource_provider_moderation_review_unique_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "resource_provider_moderation_review_unique_idx" ON "resource_provider_moderation_review_item" USING btree ("provider_id","reason") WHERE "resource_provider_moderation_review_item"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "report_false_reported_at_idx" ON "report" USING btree ("false_reported_at");--> statement-breakpoint
CREATE INDEX "resource_provider_moderation_review_resolved_admin_idx" ON "resource_provider_moderation_review_item" USING btree ("resolved_by_admin_id","resolved_at");
