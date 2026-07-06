CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "local_sponsor_placement" ADD CONSTRAINT "local_sponsor_placement_valid_window_chk" CHECK ("starts_at" <= "ends_at");
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "local_sponsor_placement" ADD CONSTRAINT "local_sponsor_placement_no_window_overlap_excl" EXCLUDE USING gist (
		"provider_id" WITH =,
		"surface" WITH =,
		tstzrange("starts_at", "ends_at", '[]') WITH &&
	);
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
