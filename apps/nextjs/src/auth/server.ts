import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { nextCookies } from "better-auth/next-js";

import type { AuthSocialProviders, OAuthProviderCredentials } from "@acme/auth";
import { createDrizzleAuthDatabase, initAuth } from "@acme/auth";
import { db } from "@acme/db/client";

import { env } from "~/env";

const localBaseUrl = "http://localhost:3000";

const getBaseUrl = () => {
  if (env.BETTER_AUTH_URL) {
    return env.BETTER_AUTH_URL;
  }

  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (env.VERCEL_ENV === "preview" && env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`;
  }

  return localBaseUrl;
};

export type SocialAuthProvider = "apple" | "facebook" | "google";

export const socialAuthProviderLabels = {
  apple: "Continuar con Apple",
  facebook: "Continuar con Facebook",
  google: "Continuar con Google",
} satisfies Record<SocialAuthProvider, string>;

const hasProviderCredentials = (
  credentials: OAuthProviderCredentials | undefined,
) => Boolean(credentials?.clientId && credentials.clientSecret);

export const getEnabledSocialAuthProviders = (): SocialAuthProvider[] => {
  const providers: SocialAuthProvider[] = [];

  if (hasProviderCredentials(socialProviders.google)) {
    providers.push("google");
  }

  if (hasProviderCredentials(socialProviders.facebook)) {
    providers.push("facebook");
  }

  if (hasProviderCredentials(socialProviders.apple)) {
    providers.push("apple");
  }

  return providers;
};

const baseUrl = getBaseUrl();
const productionUrl = env.BETTER_AUTH_URL ?? baseUrl;
const socialProviders: AuthSocialProviders = {
  google: {
    clientId: env.AUTH_GOOGLE_ID,
    clientSecret: env.AUTH_GOOGLE_SECRET,
  },
  facebook: {
    clientId: env.AUTH_FACEBOOK_ID,
    clientSecret: env.AUTH_FACEBOOK_SECRET,
  },
  apple: {
    clientId: env.AUTH_APPLE_CLIENT_ID,
    clientSecret: env.AUTH_APPLE_CLIENT_SECRET,
    appBundleIdentifier: env.AUTH_APPLE_APP_BUNDLE_IDENTIFIER,
  },
};

export const auth = initAuth({
  database: createDrizzleAuthDatabase(db),
  baseUrl,
  productionUrl,
  secret: env.AUTH_SECRET,
  requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
  socialProviders,
  extraPlugins: [nextCookies()],
});

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
