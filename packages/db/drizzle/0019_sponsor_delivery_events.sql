CREATE TYPE "public"."local_sponsor_placement_delivery_event_type" AS ENUM('impression', 'open');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "local_sponsor_placement_delivery_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"surface" "local_sponsor_placement_surface" NOT NULL,
	"event_type" "local_sponsor_placement_delivery_event_type" NOT NULL,
	"idempotency_key" varchar(191),
	"member_id" text,
	"source" varchar(80),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "local_sponsor_placement_delivery_event" ADD CONSTRAINT "local_sponsor_placement_delivery_event_placement_id_local_sponsor_placement_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."local_sponsor_placement"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "local_sponsor_placement_delivery_event" ADD CONSTRAINT "local_sponsor_placement_delivery_event_provider_id_resource_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."resource_provider"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "local_sponsor_placement_delivery_event" ADD CONSTRAINT "local_sponsor_placement_delivery_event_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "local_sponsor_delivery_event_idempotency_idx" ON "local_sponsor_placement_delivery_event" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "local_sponsor_delivery_event_placement_idx" ON "local_sponsor_placement_delivery_event" USING btree ("placement_id","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "local_sponsor_delivery_event_provider_surface_idx" ON "local_sponsor_placement_delivery_event" USING btree ("provider_id","surface","event_type","occurred_at");
