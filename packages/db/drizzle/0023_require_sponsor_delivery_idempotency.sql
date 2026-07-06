UPDATE "local_sponsor_placement_delivery_event"
SET "idempotency_key" = 'legacy:' || "id"::text
WHERE "idempotency_key" IS NULL;--> statement-breakpoint
ALTER TABLE "local_sponsor_placement_delivery_event"
ALTER COLUMN "idempotency_key" SET NOT NULL;
