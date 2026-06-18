import { reactStartCookies } from "better-auth/react-start";

import type { AuthSocialProviders } from "@acme/auth";
import { createDrizzleAuthDatabase, initAuth } from "@acme/auth";
import { db } from "@acme/db/client";

import { env } from "~/env";
import { getBaseUrl } from "~/lib/url";

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
  baseUrl: getBaseUrl(),
  productionUrl: `https://${env.VERCEL_PROJECT_PRODUCTION_URL ?? "turbo.t3.gg"}`,
  secret: env.AUTH_SECRET,
  requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
  socialProviders,
  extraPlugins: [reactStartCookies()],
});
