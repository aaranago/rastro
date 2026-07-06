import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import { z } from "zod/v4";

import { authEnv } from "@acme/auth/env";

const isProductionDeployment =
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";
const optionalString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().min(1).optional(),
);
const productionSecret = (name: string) =>
  isProductionDeployment
    ? z
        .string()
        .min(32, `${name} must be at least 32 characters in production.`)
        .refine(
          (value) => !/^dev-only/i.test(value),
          `${name} must not use the dev-only placeholder in production.`,
        )
    : optionalString;
const productionRequiredString = (name: string) =>
  isProductionDeployment
    ? z
        .string()
        .min(1, `${name} is required in production.`)
        .refine(
          (value) => !/^dev-only/i.test(value),
          `${name} must not use the dev-only placeholder in production.`,
        )
    : optionalString;
const productionRequiredUrl = (name: string) =>
  isProductionDeployment
    ? z
        .url(`${name} must be a valid URL in production.`)
        .refine(
          (value) => !/^dev-only/i.test(value),
          `${name} must not use the dev-only placeholder in production.`,
        )
    : optionalString;

export const env = createEnv({
  extends: [authEnv(), vercel()],
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  /**
   * Specify your server-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   */
  server: {
    POSTGRES_URL: z.url(),
    RASTRO_ADMIN_EMAILS: z.string().optional(),
    RASTRO_ANDROID_INSTALL_URL: productionRequiredUrl(
      "RASTRO_ANDROID_INSTALL_URL",
    ),
    RASTRO_AUTH_EMAIL_FROM: productionRequiredString("RASTRO_AUTH_EMAIL_FROM"),
    RASTRO_AUTH_EMAIL_WEBHOOK_SECRET: productionSecret(
      "RASTRO_AUTH_EMAIL_WEBHOOK_SECRET",
    ),
    RASTRO_AUTH_EMAIL_WEBHOOK_URL: productionRequiredUrl(
      "RASTRO_AUTH_EMAIL_WEBHOOK_URL",
    ),
    RASTRO_IOS_INSTALL_URL: productionRequiredUrl("RASTRO_IOS_INSTALL_URL"),
    RASTRO_JOB_SECRET: productionSecret("RASTRO_JOB_SECRET"),
    RASTRO_SPONSOR_DELIVERY_TOKEN_SECRET: productionSecret(
      "RASTRO_SPONSOR_DELIVERY_TOKEN_SECRET",
    ),
    RASTRO_STORAGE_ACCESS_KEY_ID: productionRequiredString(
      "RASTRO_STORAGE_ACCESS_KEY_ID",
    ),
    RASTRO_STORAGE_ALLOWED_MIME_TYPES: z.string().optional(),
    RASTRO_STORAGE_BUCKET: productionRequiredString("RASTRO_STORAGE_BUCKET"),
    RASTRO_STORAGE_DELIVERY_BASE_URL: z.string().optional(),
    RASTRO_STORAGE_FORCE_PATH_STYLE: z.string().optional(),
    RASTRO_STORAGE_INTERNAL_ENDPOINT: z.string().optional(),
    RASTRO_STORAGE_MAX_IMAGE_BYTES: z.string().optional(),
    RASTRO_STORAGE_PRESIGN_ENDPOINT: z.string().optional(),
    RASTRO_STORAGE_PRESIGN_EXPIRES_SECONDS: z.string().optional(),
    RASTRO_STORAGE_REGION: productionRequiredString("RASTRO_STORAGE_REGION"),
    RASTRO_STORAGE_SECRET_ACCESS_KEY: productionSecret(
      "RASTRO_STORAGE_SECRET_ACCESS_KEY",
    ),
    RASTRO_STORAGE_TLS: z.string().optional(),
  },

  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },
  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,

    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  skipValidation:
    process.env.npm_lifecycle_event === "lint" ||
    (!!process.env.CI && !isProductionDeployment),
});
