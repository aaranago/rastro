ALTER TYPE "public"."report_media_status" ADD VALUE 'pending' BEFORE 'ready';--> statement-breakpoint
ALTER TYPE "public"."report_media_status" ADD VALUE 'failed' BEFORE 'removed';--> statement-breakpoint
DROP INDEX "report_media_report_ready_position_idx";--> statement-breakpoint
ALTER TABLE "report_media" ALTER COLUMN "report_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "report_media" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "report_media" ALTER COLUMN "position" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "report_media" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "report_media" ADD COLUMN "upload_draft_id" varchar(128);--> statement-breakpoint
ALTER TABLE "report_media" ADD COLUMN "upload_report_type" "report_type";--> statement-breakpoint
ALTER TABLE "report_media" ADD COLUMN "expected_checksum_sha256" varchar(128);--> statement-breakpoint
ALTER TABLE "report_media" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report_media" ADD COLUMN "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report_media" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report_media" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report_media" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "report_media"
SET
  "owner_id" = "report"."caretaker_id",
  "upload_draft_id" = "report"."idempotency_key",
  "upload_report_type" = "report"."type",
  "expires_at" = "report_media"."created_at" + interval '1 day',
  "verified_at" = "report_media"."created_at"
FROM "report"
WHERE "report_media"."report_id" = "report"."id";--> statement-breakpoint
ALTER TABLE "report_media" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "report_media" ALTER COLUMN "upload_draft_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "report_media" ALTER COLUMN "upload_report_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "report_media" ALTER COLUMN "expires_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "report_media" ADD CONSTRAINT "report_media_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_media_owner_status_idx" ON "report_media" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "report_media_pending_expiry_idx" ON "report_media" USING btree ("expires_at") WHERE "report_media"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "report_media_report_ready_position_idx" ON "report_media" USING btree ("report_id","position") WHERE "report_media"."status" = 'ready' AND "report_media"."report_id" IS NOT NULL;
