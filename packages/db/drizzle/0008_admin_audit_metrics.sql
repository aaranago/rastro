CREATE TABLE "admin_audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"actor_email" varchar(320),
	"action" varchar(120) NOT NULL,
	"target_type" varchar(120) NOT NULL,
	"target_id" varchar(160) NOT NULL,
	"target_label" varchar(240) NOT NULL,
	"summary" text NOT NULL,
	"metadata" jsonb,
	"source" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_location" ADD COLUMN "city" varchar(120) DEFAULT 'No especificado' NOT NULL;--> statement-breakpoint
ALTER TABLE "report_location" ADD COLUMN "department" varchar(80) DEFAULT 'No especificado' NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_audit_event" ADD CONSTRAINT "admin_audit_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_event_created_idx" ON "admin_audit_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_event_actor_idx" ON "admin_audit_event" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_event_action_idx" ON "admin_audit_event" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_event_target_idx" ON "admin_audit_event" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "report_location_city_idx" ON "report_location" USING btree ("city");--> statement-breakpoint
CREATE INDEX "report_location_department_idx" ON "report_location" USING btree ("department");
