CREATE TYPE "public"."report_moderation_action_type" AS ENUM('hide', 'restore');--> statement-breakpoint
CREATE TABLE "report_moderation_action" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"target_type" "report_type" NOT NULL,
	"action" "report_moderation_action_type" NOT NULL,
	"admin_id" text,
	"reason" varchar(120) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "hidden_by_admin_id" text;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "hidden_reason" varchar(120);--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "hidden_note" text;--> statement-breakpoint
ALTER TABLE "report_moderation_action" ADD CONSTRAINT "report_moderation_action_report_id_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_moderation_action" ADD CONSTRAINT "report_moderation_action_admin_id_user_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_hidden_by_admin_id_user_id_fk" FOREIGN KEY ("hidden_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_hidden_at_idx" ON "report" USING btree ("hidden_at");--> statement-breakpoint
CREATE INDEX "report_moderation_action_report_idx" ON "report_moderation_action" USING btree ("report_id","created_at");--> statement-breakpoint
CREATE INDEX "report_moderation_action_admin_idx" ON "report_moderation_action" USING btree ("admin_id");
