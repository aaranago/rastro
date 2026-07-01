CREATE TABLE IF NOT EXISTS "member_profile" (
	"member_id" text PRIMARY KEY NOT NULL,
	"default_contact_preference" "contact_preference" DEFAULT 'in_app_chat' NOT NULL,
	"phone" varchar(32),
	"whatsapp" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "member_profile" ADD CONSTRAINT "member_profile_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
