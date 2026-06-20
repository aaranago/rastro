CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE TYPE "public"."contact_preference" AS ENUM('in_app_chat', 'whatsapp', 'both');--> statement-breakpoint
CREATE TYPE "public"."pet_species" AS ENUM('dog', 'cat', 'bird', 'rabbit', 'other');--> statement-breakpoint
CREATE TYPE "public"."public_location_precision" AS ENUM('exact', 'approximate');--> statement-breakpoint
CREATE TYPE "public"."report_lifecycle_event_type" AS ENUM('created', 'updated', 'resolved', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."report_media_kind" AS ENUM('photo');--> statement-breakpoint
CREATE TYPE "public"."report_media_status" AS ENUM('ready', 'removed');--> statement-breakpoint
CREATE TYPE "public"."report_outcome" AS ENUM('still_missing', 'reunited', 'transferred_to_shelter', 'unable_to_locate', 'inactive', 'adopted');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('lost_pet', 'found_pet', 'sighting', 'adoption');--> statement-breakpoint
CREATE TABLE "post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(256) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caretaker_id" text NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"type" "report_type" NOT NULL,
	"status" "report_status" DEFAULT 'active' NOT NULL,
	"outcome" "report_outcome",
	"title" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"pet_name" varchar(80),
	"species" "pet_species" NOT NULL,
	"breed" varchar(120),
	"color" varchar(120) NOT NULL,
	"size" varchar(80),
	"distinguishing_traits" text,
	"event_occurred_at" timestamp with time zone NOT NULL,
	"contact_preference" "contact_preference" NOT NULL,
	"whatsapp_phone" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report_lifecycle_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"actor_id" text,
	"type" "report_lifecycle_event_type" NOT NULL,
	"from_status" "report_status",
	"to_status" "report_status",
	"outcome" "report_outcome",
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_location" (
	"report_id" uuid PRIMARY KEY NOT NULL,
	"exact_point" geometry(point,4326) NOT NULL,
	"exact_latitude" double precision NOT NULL,
	"exact_longitude" double precision NOT NULL,
	"public_point" geometry(point,4326) NOT NULL,
	"public_latitude" double precision NOT NULL,
	"public_longitude" double precision NOT NULL,
	"public_precision" "public_location_precision" DEFAULT 'approximate' NOT NULL,
	"label" varchar(160) NOT NULL,
	"location_cell" varchar(96) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"kind" "report_media_kind" DEFAULT 'photo' NOT NULL,
	"status" "report_media_status" DEFAULT 'ready' NOT NULL,
	"object_key" varchar(512) NOT NULL,
	"canonical_url" text,
	"thumbnail_object_key" varchar(512),
	"mime_type" varchar(80) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"alt_text" varchar(240),
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_caretaker_id_user_id_fk" FOREIGN KEY ("caretaker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_lifecycle_event" ADD CONSTRAINT "report_lifecycle_event_report_id_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_lifecycle_event" ADD CONSTRAINT "report_lifecycle_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_location" ADD CONSTRAINT "report_location_report_id_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_media" ADD CONSTRAINT "report_media_report_id_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "report_caretaker_idempotency_key_idx" ON "report" USING btree ("caretaker_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "report_caretaker_idx" ON "report" USING btree ("caretaker_id");--> statement-breakpoint
CREATE INDEX "report_type_status_idx" ON "report" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "report_created_at_idx" ON "report" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "report_lifecycle_report_idx" ON "report_lifecycle_event" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "report_lifecycle_actor_idx" ON "report_lifecycle_event" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "report_location_exact_point_gist_idx" ON "report_location" USING gist ("exact_point");--> statement-breakpoint
CREATE INDEX "report_location_public_point_gist_idx" ON "report_location" USING gist ("public_point");--> statement-breakpoint
CREATE INDEX "report_location_cell_idx" ON "report_location" USING btree ("location_cell");--> statement-breakpoint
CREATE INDEX "report_media_report_idx" ON "report_media" USING btree ("report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_media_object_key_idx" ON "report_media" USING btree ("object_key");--> statement-breakpoint
CREATE UNIQUE INDEX "report_media_report_ready_position_idx" ON "report_media" USING btree ("report_id","position") WHERE "report_media"."status" = 'ready';--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");
