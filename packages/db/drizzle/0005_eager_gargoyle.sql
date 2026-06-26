CREATE TYPE "public"."moderation_report_reason" AS ENUM('spam', 'scam', 'incorrect_location', 'offensive_content', 'animal_cruelty', 'stolen_pet_concern', 'impersonation', 'other');--> statement-breakpoint
CREATE TYPE "public"."resource_provider_moderation_review_status" AS ENUM('pending');--> statement-breakpoint
CREATE TABLE "resource_provider_moderation_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_item_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"reporter_id" text,
	"reason" "moderation_report_reason" NOT NULL,
	"detail" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_provider_moderation_review_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"reason" "moderation_report_reason" NOT NULL,
	"status" "resource_provider_moderation_review_status" DEFAULT 'pending' NOT NULL,
	"first_reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "resource_provider_moderation_report" ADD CONSTRAINT "resource_provider_moderation_report_review_item_id_resource_provider_moderation_review_item_id_fk" FOREIGN KEY ("review_item_id") REFERENCES "public"."resource_provider_moderation_review_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_provider_moderation_report" ADD CONSTRAINT "resource_provider_moderation_report_provider_id_resource_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."resource_provider"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_provider_moderation_report" ADD CONSTRAINT "resource_provider_moderation_report_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_provider_moderation_review_item" ADD CONSTRAINT "resource_provider_moderation_review_item_provider_id_resource_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."resource_provider"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "resource_provider_moderation_report_reporter_idx" ON "resource_provider_moderation_report" USING btree ("reporter_id","provider_id","reason") WHERE "resource_provider_moderation_report"."reporter_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "resource_provider_moderation_report_review_item_idx" ON "resource_provider_moderation_report" USING btree ("review_item_id","created_at");--> statement-breakpoint
CREATE INDEX "resource_provider_moderation_report_provider_idx" ON "resource_provider_moderation_report" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_provider_moderation_review_unique_idx" ON "resource_provider_moderation_review_item" USING btree ("provider_id","reason","status");--> statement-breakpoint
CREATE INDEX "resource_provider_moderation_review_provider_idx" ON "resource_provider_moderation_review_item" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "resource_provider_moderation_review_status_latest_idx" ON "resource_provider_moderation_review_item" USING btree ("status","last_reported_at");
