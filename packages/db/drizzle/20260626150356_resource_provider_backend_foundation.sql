CREATE TYPE "public"."local_sponsor_placement_surface" AS ENUM('resources_directory', 'provider_details', 'launch_home_banner', 'report_success', 'contextual_care_resources');--> statement-breakpoint
CREATE TYPE "public"."resource_provider_category" AS ENUM('veterinary', 'shelter', 'groomer', 'pet_food', 'trainer', 'pet_store', 'transport', 'other');--> statement-breakpoint
CREATE TYPE "public"."resource_provider_contact_kind" AS ENUM('phone', 'whatsapp', 'website', 'email', 'directions', 'social');--> statement-breakpoint
CREATE TYPE "public"."resource_provider_verification_status" AS ENUM('unverified', 'verified');--> statement-breakpoint
CREATE TABLE "local_sponsor_placement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"surface" "local_sponsor_placement_surface" NOT NULL,
	"label" varchar(80) DEFAULT 'Patrocinado' NOT NULL,
	"disclosure" varchar(240) DEFAULT 'Patrocinado: apoyo local. No cambia la prioridad de reportes.' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_by_admin_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_provider" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"category" "resource_provider_category" NOT NULL,
	"description" text NOT NULL,
	"short_description" text NOT NULL,
	"logo_url" text,
	"photo_url" text,
	"service_area_label" varchar(160) NOT NULL,
	"hours_label" varchar(160) NOT NULL,
	"website_url" text,
	"social_links" jsonb,
	"external_links" jsonb,
	"emergency_available" boolean DEFAULT false NOT NULL,
	"is_open_now" boolean DEFAULT false NOT NULL,
	"verification_status" "resource_provider_verification_status" DEFAULT 'unverified' NOT NULL,
	"verification_note" text,
	"verified_at" timestamp with time zone,
	"created_by_admin_id" text,
	"verification_updated_by_admin_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "resource_provider_contact_option" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"kind" "resource_provider_contact_kind" NOT NULL,
	"label" varchar(80) NOT NULL,
	"value" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_provider_location" (
	"provider_id" uuid PRIMARY KEY NOT NULL,
	"exact_point" geometry(point,4326) NOT NULL,
	"exact_latitude" double precision NOT NULL,
	"exact_longitude" double precision NOT NULL,
	"public_point" geometry(point,4326) NOT NULL,
	"public_latitude" double precision NOT NULL,
	"public_longitude" double precision NOT NULL,
	"public_precision" "public_location_precision" DEFAULT 'approximate' NOT NULL,
	"approximate_location_label" varchar(160) NOT NULL,
	"location_cell" varchar(96) NOT NULL,
	"address_label" varchar(240),
	"country_code" varchar(2) DEFAULT 'BO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "local_sponsor_placement" ADD CONSTRAINT "local_sponsor_placement_provider_id_resource_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."resource_provider"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_sponsor_placement" ADD CONSTRAINT "local_sponsor_placement_created_by_admin_id_user_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_provider" ADD CONSTRAINT "resource_provider_created_by_admin_id_user_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_provider" ADD CONSTRAINT "resource_provider_verification_updated_by_admin_id_user_id_fk" FOREIGN KEY ("verification_updated_by_admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_provider_contact_option" ADD CONSTRAINT "resource_provider_contact_option_provider_id_resource_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."resource_provider"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_provider_location" ADD CONSTRAINT "resource_provider_location_provider_id_resource_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."resource_provider"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "local_sponsor_placement_provider_idx" ON "local_sponsor_placement" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "local_sponsor_placement_surface_idx" ON "local_sponsor_placement" USING btree ("surface");--> statement-breakpoint
CREATE INDEX "local_sponsor_placement_active_window_idx" ON "local_sponsor_placement" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "resource_provider_category_idx" ON "resource_provider" USING btree ("category");--> statement-breakpoint
CREATE INDEX "resource_provider_verification_idx" ON "resource_provider" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "resource_provider_created_at_idx" ON "resource_provider" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "resource_provider_contact_provider_idx" ON "resource_provider_contact_option" USING btree ("provider_id","sort_order");--> statement-breakpoint
CREATE INDEX "resource_provider_location_exact_point_gist_idx" ON "resource_provider_location" USING gist ("exact_point");--> statement-breakpoint
CREATE INDEX "resource_provider_location_public_point_gist_idx" ON "resource_provider_location" USING gist ("public_point");--> statement-breakpoint
CREATE INDEX "resource_provider_location_cell_idx" ON "resource_provider_location" USING btree ("location_cell");
