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
const isProductionDeployment =
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";
const isProductionPlaceholder = (value: string) =>
  /^(dev-only|change[_-]?me)/i.test(value);
const authSecret = isProductionDeployment
  ? z
      .string()
      .min(4, "AUTH_SECRET must be at least 4 characters in production.")
      .refine(
        (value) => !isProductionPlaceholder(value),
        "AUTH_SECRET must not use a placeholder in production.",
      )
  : z.string().min(1).optional();
const betterAuthUrl = isProductionDeployment
  ? z.url("BETTER_AUTH_URL must be a valid URL in production.")
  : optionalString;

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
      AUTH_REDIRECT_PROXY_URL: optionalString,
      AUTH_REQUIRE_EMAIL_VERIFICATION: booleanString,
      AUTH_SECRET: authSecret,
      BETTER_AUTH_URL: betterAuthUrl,
      NODE_ENV: z.enum(["development", "production", "test"]).optional(),
    },
    runtimeEnv: process.env,
    skipValidation:
      process.env.npm_lifecycle_event === "lint" ||
      (!!process.env.CI && !isProductionDeployment),
  });
}
