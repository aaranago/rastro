CREATE TYPE "public"."member_suspension_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TABLE "member_suspension" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" text NOT NULL,
	"status" "member_suspension_status" DEFAULT 'active' NOT NULL,
	"reason" text NOT NULL,
	"suspended_by_admin_id" text,
	"suspended_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by_admin_id" text,
	"revoked_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_suspension" ADD CONSTRAINT "member_suspension_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_suspension" ADD CONSTRAINT "member_suspension_suspended_by_admin_id_user_id_fk" FOREIGN KEY ("suspended_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_suspension" ADD CONSTRAINT "member_suspension_revoked_by_admin_id_user_id_fk" FOREIGN KEY ("revoked_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "member_suspension_active_member_idx" ON "member_suspension" USING btree ("member_id") WHERE "member_suspension"."status" = 'active' AND "member_suspension"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "member_suspension_member_created_idx" ON "member_suspension" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "member_suspension_admin_idx" ON "member_suspension" USING btree ("suspended_by_admin_id");--> statement-breakpoint
CREATE INDEX "member_suspension_revoked_admin_idx" ON "member_suspension" USING btree ("revoked_by_admin_id");
