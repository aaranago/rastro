ALTER TABLE "resource_provider_location" ADD COLUMN "city" varchar(120);--> statement-breakpoint
ALTER TABLE "resource_provider_location" ADD COLUMN "department" varchar(80);--> statement-breakpoint
UPDATE "resource_provider_location"
SET
	"city" = COALESCE(NULLIF(btrim(split_part("approximate_location_label", ',', 1)), ''), "approximate_location_label"),
	"department" = COALESCE(
		NULLIF(
			btrim(
				CASE
					WHEN position(',' in "approximate_location_label") > 0
						THEN regexp_replace("approximate_location_label", '^.*, *', '')
					ELSE "location_cell"
				END
			),
			''
		),
		"location_cell"
	);--> statement-breakpoint
ALTER TABLE "resource_provider_location" ALTER COLUMN "city" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "resource_provider_location" ALTER COLUMN "department" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "resource_provider_location_city_idx" ON "resource_provider_location" USING btree ("city");--> statement-breakpoint
CREATE INDEX "resource_provider_location_department_idx" ON "resource_provider_location" USING btree ("department");
