ALTER TABLE "local_sponsor_placement" ADD COLUMN IF NOT EXISTS "detached_at" timestamp with time zone;--> statement-breakpoint
DROP INDEX IF EXISTS "local_sponsor_placement_active_window_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "local_sponsor_placement_active_window_idx" ON "local_sponsor_placement" USING btree ("starts_at","ends_at") WHERE "detached_at" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "local_sponsor_placement_detached_idx" ON "local_sponsor_placement" USING btree ("detached_at");--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "local_sponsor_placement" DROP CONSTRAINT IF EXISTS "local_sponsor_placement_no_window_overlap_excl";
	ALTER TABLE "local_sponsor_placement" ADD CONSTRAINT "local_sponsor_placement_no_window_overlap_excl" EXCLUDE USING gist (
		"provider_id" WITH =,
		"surface" WITH =,
		tstzrange("starts_at", "ends_at", '[]') WITH &&
	) WHERE ("detached_at" IS NULL);
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
