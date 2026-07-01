CREATE TABLE IF NOT EXISTS "chat_conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"caretaker_member_id" text NOT NULL,
	"contact_member_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_member_id" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_conversation_hidden" (
	"conversation_id" uuid NOT NULL,
	"member_id" text NOT NULL,
	"hidden_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_conversation_hidden_pk" PRIMARY KEY("conversation_id","member_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_conversation_block" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"blocker_member_id" text NOT NULL,
	"blocked_member_id" text NOT NULL,
	"blocked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_conversation_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"reporter_member_id" text NOT NULL,
	"reason" "moderation_report_reason",
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_conversation" ADD CONSTRAINT "chat_conversation_report_id_report_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."report"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_conversation" ADD CONSTRAINT "chat_conversation_caretaker_member_id_user_id_fk" FOREIGN KEY ("caretaker_member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_conversation" ADD CONSTRAINT "chat_conversation_contact_member_id_user_id_fk" FOREIGN KEY ("contact_member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_conversation_id_chat_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_sender_member_id_user_id_fk" FOREIGN KEY ("sender_member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_conversation_hidden" ADD CONSTRAINT "chat_conversation_hidden_conversation_id_chat_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_conversation_hidden" ADD CONSTRAINT "chat_conversation_hidden_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_conversation_block" ADD CONSTRAINT "chat_conversation_block_conversation_id_chat_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_conversation_block" ADD CONSTRAINT "chat_conversation_block_blocker_member_id_user_id_fk" FOREIGN KEY ("blocker_member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_conversation_block" ADD CONSTRAINT "chat_conversation_block_blocked_member_id_user_id_fk" FOREIGN KEY ("blocked_member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_conversation_report" ADD CONSTRAINT "chat_conversation_report_conversation_id_chat_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_conversation_report" ADD CONSTRAINT "chat_conversation_report_reporter_member_id_user_id_fk" FOREIGN KEY ("reporter_member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_conversation_report_members_idx" ON "chat_conversation" USING btree ("report_id","caretaker_member_id","contact_member_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_conversation_caretaker_updated_idx" ON "chat_conversation" USING btree ("caretaker_member_id","updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_conversation_contact_updated_idx" ON "chat_conversation" USING btree ("contact_member_id","updated_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_message_conversation_created_idx" ON "chat_message" USING btree ("conversation_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_conversation_hidden_member_idx" ON "chat_conversation_hidden" USING btree ("member_id","hidden_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_conversation_block_unique_idx" ON "chat_conversation_block" USING btree ("conversation_id","blocker_member_id","blocked_member_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_conversation_block_blocker_idx" ON "chat_conversation_block" USING btree ("blocker_member_id","blocked_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_conversation_block_blocked_idx" ON "chat_conversation_block" USING btree ("blocked_member_id","blocked_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_conversation_report_reporter_idx" ON "chat_conversation_report" USING btree ("conversation_id","reporter_member_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_conversation_report_created_idx" ON "chat_conversation_report" USING btree ("conversation_id","created_at");
