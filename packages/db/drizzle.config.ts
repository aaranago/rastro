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
    "report",
    "report_location",
    "report_media",
    "report_lifecycle_event",
  ],
} satisfies Config;
