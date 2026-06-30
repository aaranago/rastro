DO $$ BEGIN
	CREATE TYPE "public"."admin_media_asset_purpose" AS ENUM('provider_logo', 'provider_photo', 'sponsor_logo', 'sponsor_image');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	CREATE TYPE "public"."admin_media_asset_status" AS ENUM('pending', 'ready', 'failed', 'removed');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_media_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_admin_id" text,
	"purpose" "admin_media_asset_purpose" NOT NULL,
	"status" "admin_media_asset_status" DEFAULT 'pending' NOT NULL,
	"object_key" varchar(512) NOT NULL,
	"canonical_url" text,
	"mime_type" varchar(80) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"expected_checksum_sha256" varchar(128),
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "admin_media_asset" ADD CONSTRAINT "admin_media_asset_created_by_admin_id_user_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_media_asset_admin_status_idx" ON "admin_media_asset" USING btree ("created_by_admin_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_media_asset_purpose_status_idx" ON "admin_media_asset" USING btree ("purpose","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_media_asset_pending_expiry_idx" ON "admin_media_asset" USING btree ("expires_at") WHERE "admin_media_asset"."status" = 'pending';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "admin_media_asset_object_key_idx" ON "admin_media_asset" USING btree ("object_key");
