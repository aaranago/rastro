ALTER TYPE "public"."report_status" ADD VALUE 'pending_review' BEFORE 'closed';--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"adoption_review_mode_enabled" boolean DEFAULT false NOT NULL,
	"verified_email_required_to_publish" boolean DEFAULT false NOT NULL,
	"updated_by_admin_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_updated_by_admin_id_user_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
