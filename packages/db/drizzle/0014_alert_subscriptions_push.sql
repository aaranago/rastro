DO $$ BEGIN
	CREATE TYPE "public"."alert_subscription_category" AS ENUM('lost_pet');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."alert_push_token_platform" AS ENUM('ios', 'android', 'web', 'unknown');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."alert_notification_delivery_status" AS ENUM('pending', 'sent', 'failed', 'skipped');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" text NOT NULL,
	"categories" "alert_subscription_category"[] DEFAULT ARRAY['lost_pet']::"alert_subscription_category"[] NOT NULL,
	"radius_meters" integer DEFAULT 5000 NOT NULL,
	"location_point" geometry(point,4326),
	"latitude" double precision,
	"longitude" double precision,
	"location_label" varchar(160),
	"location_cell" varchar(96),
	"last_location_recorded_at" timestamp with time zone,
	"paused_until" timestamp with time zone,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_push_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" text NOT NULL,
	"token" varchar(512) NOT NULL,
	"platform" "alert_push_token_platform" DEFAULT 'unknown' NOT NULL,
	"device_id" varchar(128),
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alert_notification_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"report_id" uuid NOT NULL,
	"push_token_id" uuid,
	"member_id" text NOT NULL,
	"status" "alert_notification_delivery_status" DEFAULT 'pending' NOT NULL,
	"title" varchar(160) NOT NULL,
	"body" text NOT NULL,
	"deep_link" text NOT NULL,
	"matched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "alert_subscription" ADD CONSTRAINT "alert_subscription_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "alert_push_token" ADD CONSTRAINT "alert_push_token_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "alert_notification_delivery" ADD CONSTRAINT "alert_notification_delivery_subscription_id_alert_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."alert_subscription"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "alert_notification_delivery" ADD CONSTRAINT "alert_notification_delivery_report_id_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "alert_notification_delivery" ADD CONSTRAINT "alert_notification_delivery_push_token_id_alert_push_token_id_fk" FOREIGN KEY ("push_token_id") REFERENCES "public"."alert_push_token"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "alert_notification_delivery" ADD CONSTRAINT "alert_notification_delivery_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "alert_subscription_member_idx" ON "alert_subscription" USING btree ("member_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_subscription_location_point_gist_idx" ON "alert_subscription" USING gist ("location_point");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_subscription_active_idx" ON "alert_subscription" USING btree ("unsubscribed_at","paused_until");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "alert_push_token_token_idx" ON "alert_push_token" USING btree ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_push_token_member_active_idx" ON "alert_push_token" USING btree ("member_id","last_seen_at") WHERE "alert_push_token"."disabled_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "alert_notification_delivery_subscription_report_idx" ON "alert_notification_delivery" USING btree ("subscription_id","report_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_notification_delivery_report_idx" ON "alert_notification_delivery" USING btree ("report_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "alert_notification_delivery_member_created_idx" ON "alert_notification_delivery" USING btree ("member_id","created_at");
