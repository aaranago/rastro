import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";

import { db } from "@acme/db/client";

export interface OAuthProviderCredentials {
  clientId?: string | undefined;
  clientSecret?: string | undefined;
}

export interface AppleProviderCredentials extends OAuthProviderCredentials {
  appBundleIdentifier?: string | undefined;
}

export interface AuthSocialProviders {
  google?: OAuthProviderCredentials | undefined;
  facebook?: OAuthProviderCredentials | undefined;
  apple?: AppleProviderCredentials | undefined;
}

export interface InitAuthOptions<
  TExtraPlugins extends BetterAuthPlugin[] = [],
> {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;
  requireEmailVerification?: boolean | undefined;
  socialProviders?: AuthSocialProviders | undefined;
  trustedOrigins?: string[] | undefined;
  extraPlugins?: TExtraPlugins | undefined;
}

const DEFAULT_TRUSTED_ORIGINS = ["expo://"];

function hasOAuthCredentials<TCredentials extends OAuthProviderCredentials>(
  credentials: TCredentials | undefined,
): credentials is TCredentials & { clientId: string; clientSecret: string } {
  return Boolean(
    credentials?.clientId?.trim() && credentials.clientSecret?.trim(),
  );
}

function callbackUrl(productionUrl: string, provider: string) {
  return `${productionUrl.replace(/\/$/, "")}/api/auth/callback/${provider}`;
}

function createSocialProviders(
  productionUrl: string,
  providers: AuthSocialProviders | undefined,
): NonNullable<BetterAuthOptions["socialProviders"]> {
  const socialProviders: NonNullable<BetterAuthOptions["socialProviders"]> = {};

  if (hasOAuthCredentials(providers?.google)) {
    socialProviders.google = {
      clientId: providers.google.clientId,
      clientSecret: providers.google.clientSecret,
      redirectURI: callbackUrl(productionUrl, "google"),
    };
  }

  if (hasOAuthCredentials(providers?.facebook)) {
    socialProviders.facebook = {
      clientId: providers.facebook.clientId,
      clientSecret: providers.facebook.clientSecret,
      redirectURI: callbackUrl(productionUrl, "facebook"),
    };
  }

  if (hasOAuthCredentials(providers?.apple)) {
    socialProviders.apple = {
      clientId: providers.apple.clientId,
      clientSecret: providers.apple.clientSecret,
      appBundleIdentifier: providers.apple.appBundleIdentifier,
      redirectURI: callbackUrl(productionUrl, "apple"),
    };
  }

  return socialProviders;
}

export function createAuthOptions<
  TExtraPlugins extends BetterAuthPlugin[] = [],
>(options: InitAuthOptions<TExtraPlugins>) {
  const config = {
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    baseURL: options.baseUrl,
    secret: options.secret,
    plugins: [
      oAuthProxy({
        productionURL: options.productionUrl,
      }),
      expo(),
      ...(options.extraPlugins ?? []),
    ],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: options.requireEmailVerification ?? false,
    },
    socialProviders: createSocialProviders(
      options.productionUrl,
      options.socialProviders,
    ),
    trustedOrigins: [
      ...new Set([
        ...DEFAULT_TRUSTED_ORIGINS,
        ...(options.trustedOrigins ?? []),
      ]),
    ],
    onAPIError: {
      onError(error, ctx) {
        console.error("BETTER AUTH API ERROR", error, ctx);
      },
    },
  } satisfies BetterAuthOptions;

  return config;
}

export function initAuth<TExtraPlugins extends BetterAuthPlugin[] = []>(
  options: InitAuthOptions<TExtraPlugins>,
) {
  return betterAuth(createAuthOptions(options));
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
