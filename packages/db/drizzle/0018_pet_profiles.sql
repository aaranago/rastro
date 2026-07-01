CREATE TABLE IF NOT EXISTS "pet_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caretaker_member_id" text NOT NULL,
	"name" varchar(80) NOT NULL,
	"type" varchar(24) NOT NULL,
	"breed" varchar(120) DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_records" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "pet_profile" ADD CONSTRAINT "pet_profile_caretaker_member_id_user_id_fk" FOREIGN KEY ("caretaker_member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pet_profile_caretaker_updated_idx" ON "pet_profile" USING btree ("caretaker_member_id","updated_at");
