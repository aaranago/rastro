import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

const optionalString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().min(1).optional(),
);

const booleanString = z
  .enum(["true", "false"])
  .optional()
  .default("false")
  .transform((value) => value === "true");

export function authEnv() {
  return createEnv({
    server: {
      AUTH_APPLE_APP_BUNDLE_IDENTIFIER: optionalString,
      AUTH_APPLE_CLIENT_ID: optionalString,
      AUTH_APPLE_CLIENT_SECRET: optionalString,
      AUTH_FACEBOOK_ID: optionalString,
      AUTH_FACEBOOK_SECRET: optionalString,
      AUTH_GOOGLE_ID: optionalString,
      AUTH_GOOGLE_SECRET: optionalString,
      AUTH_REQUIRE_EMAIL_VERIFICATION: booleanString,
      AUTH_SECRET:
        process.env.NODE_ENV === "production"
          ? z.string().min(1)
          : z.string().min(1).optional(),
      BETTER_AUTH_URL: optionalString,
      NODE_ENV: z.enum(["development", "production"]).optional(),
    },
    runtimeEnv: process.env,
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  });
}
