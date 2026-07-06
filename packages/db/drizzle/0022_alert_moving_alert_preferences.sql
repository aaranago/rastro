DO $$ BEGIN
	CREATE TYPE "public"."alert_subscription_background_permission_state" AS ENUM('background-granted', 'denied', 'foreground-only', 'not-requested');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "alert_subscription" ADD COLUMN IF NOT EXISTS "moving_alerts_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "alert_subscription" ADD COLUMN IF NOT EXISTS "moving_alerts_permission_state" "alert_subscription_background_permission_state" DEFAULT 'not-requested' NOT NULL;
