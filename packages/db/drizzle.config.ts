import type { Config } from "drizzle-kit";

if (!process.env.POSTGRES_URL) {
  throw new Error("Missing POSTGRES_URL");
}

const nonPoolingUrl = process.env.POSTGRES_URL.replace(":6543", ":5432");

export default {
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: nonPoolingUrl },
  casing: "snake_case",
  // Keep PostGIS extension tables out of Drizzle's app-schema diff.
  tablesFilter: [
    "post",
    "user",
    "session",
    "account",
    "verification",
    "admin_settings",
    "admin_audit_event",
    "admin_media_asset",
    "report",
    "report_location",
    "report_media",
    "report_lifecycle_event",
    "report_moderation_action",
    "chat_conversation",
    "chat_message",
    "chat_conversation_hidden",
    "chat_conversation_block",
    "chat_conversation_report",
    "chat_notification_delivery",
    "alert_subscription",
    "alert_push_token",
    "alert_notification_delivery",
    "member_profile",
    "member_suspension",
    "resource_provider",
    "resource_provider_location",
    "resource_provider_contact_option",
    "local_sponsor_placement",
    "resource_provider_moderation_review_item",
    "resource_provider_moderation_report",
  ],
} satisfies Config;
