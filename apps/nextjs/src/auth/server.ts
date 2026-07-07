import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { nextCookies } from "better-auth/next-js";

import type {
  AuthSocialProviders,
  OAuthProviderCredentials,
  SendDeleteAccountVerificationEmail,
  SendPasswordResetEmail,
} from "@acme/auth";
import {
  createDrizzleAccountDeletionCleanup,
  createDrizzleAuthDatabase,
  initAuth,
} from "@acme/auth";
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
const isProductionRuntime =
  env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
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

type AuthEmailKind = "account_deletion_verification" | "password_reset";

async function sendAuthEmail(input: {
  kind: AuthEmailKind;
  subject: string;
  to: string;
  url: string;
}) {
  if (!env.RASTRO_AUTH_EMAIL_WEBHOOK_URL) {
    if (isProductionRuntime) {
      throw new Error("Auth email delivery is not configured.");
    }

    console.info("[Rastro auth] Auth email link requested", input);
    return;
  }

  if (!env.RASTRO_AUTH_EMAIL_FROM || !env.RASTRO_AUTH_EMAIL_WEBHOOK_SECRET) {
    throw new Error("Auth email delivery is not configured.");
  }

  const response = await fetch(env.RASTRO_AUTH_EMAIL_WEBHOOK_URL, {
    body: JSON.stringify({
      from: env.RASTRO_AUTH_EMAIL_FROM,
      kind: input.kind,
      subject: input.subject,
      to: input.to,
      url: input.url,
    }),
    headers: {
      authorization: `Bearer ${env.RASTRO_AUTH_EMAIL_WEBHOOK_SECRET}`,
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(
      `Auth email webhook failed with status ${response.status}.`,
    );
  }
}

const sendPasswordResetEmail: SendPasswordResetEmail = ({ url, user }) => {
  return sendAuthEmail({
    kind: "password_reset",
    subject: "Restablece tu contraseña de Rastro",
    to: user.email,
    url,
  });
};

const sendDeleteAccountVerificationEmail: SendDeleteAccountVerificationEmail =
  ({ url, user }) => {
    return sendAuthEmail({
      kind: "account_deletion_verification",
      subject: "Confirma la eliminación de tu cuenta de Rastro",
      to: user.email,
      url,
    });
  };

const accountDeletionCleanup = createDrizzleAccountDeletionCleanup(db);

export const auth = initAuth({
  database: createDrizzleAuthDatabase(db),
  baseUrl,
  productionUrl,
  secret: env.AUTH_SECRET,
  requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
  passwordReset: {
    sendEmail: sendPasswordResetEmail,
  },
  accountDeletion: {
    cleanup: accountDeletionCleanup,
    sendVerificationEmail: sendDeleteAccountVerificationEmail,
  },
  socialProviders,
  extraPlugins: [nextCookies()],
});

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
