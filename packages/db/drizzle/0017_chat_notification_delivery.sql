CREATE TABLE IF NOT EXISTS "chat_notification_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"sender_member_id" text NOT NULL,
	"recipient_member_id" text NOT NULL,
	"push_token_id" uuid,
	"status" "alert_notification_delivery_status" DEFAULT 'pending' NOT NULL,
	"title" varchar(160) NOT NULL,
	"body" text NOT NULL,
	"deep_link" text NOT NULL,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_notification_delivery" ADD CONSTRAINT "chat_notification_delivery_conversation_id_chat_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_notification_delivery" ADD CONSTRAINT "chat_notification_delivery_message_id_chat_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_message"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_notification_delivery" ADD CONSTRAINT "chat_notification_delivery_sender_member_id_user_id_fk" FOREIGN KEY ("sender_member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_notification_delivery" ADD CONSTRAINT "chat_notification_delivery_recipient_member_id_user_id_fk" FOREIGN KEY ("recipient_member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "chat_notification_delivery" ADD CONSTRAINT "chat_notification_delivery_push_token_id_alert_push_token_id_fk" FOREIGN KEY ("push_token_id") REFERENCES "public"."alert_push_token"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_notification_delivery_message_recipient_idx" ON "chat_notification_delivery" USING btree ("message_id","recipient_member_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_notification_delivery_conversation_created_idx" ON "chat_notification_delivery" USING btree ("conversation_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_notification_delivery_recipient_created_idx" ON "chat_notification_delivery" USING btree ("recipient_member_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_notification_delivery_status_created_idx" ON "chat_notification_delivery" USING btree ("status","created_at");
