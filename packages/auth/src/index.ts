import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { oAuthProxy } from "better-auth/plugins";

import type { AccountDeletionCleanupBoundary } from "./account-deletion-policy";
import { prepareAccountDeletion } from "./account-deletion-policy";

export {
  getAccountDeletionPolicy,
  prepareAccountDeletion,
} from "./account-deletion-policy";
export type {
  AccountDeletionCleanupBoundary,
  AccountDeletionCleanupInput,
  AccountDeletionCleanupRequirement,
  AccountDeletionCleanupResult,
  AccountDeletionConsequence,
  AccountDeletionConsequenceResource,
  AccountDeletionDisposition,
  AccountDeletionPreparation,
  AccountDeletionPolicy,
  PrepareAccountDeletionInput,
} from "./account-deletion-policy";

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

export type AuthDatabase = ReturnType<typeof drizzleAdapter>;
type DrizzleDatabase = Parameters<typeof drizzleAdapter>[0];
type EmailAndPasswordOptions = Extract<
  NonNullable<BetterAuthOptions["emailAndPassword"]>,
  { sendResetPassword?: unknown }
>;
type DeleteUserOptions = NonNullable<
  NonNullable<BetterAuthOptions["user"]>["deleteUser"]
>;

export type SendPasswordResetEmail = NonNullable<
  EmailAndPasswordOptions["sendResetPassword"]
>;
export type SendDeleteAccountVerificationEmail = NonNullable<
  DeleteUserOptions["sendDeleteAccountVerification"]
>;
export type BeforeDeleteAccount = NonNullable<
  DeleteUserOptions["beforeDelete"]
>;
export type AfterDeleteAccount = NonNullable<DeleteUserOptions["afterDelete"]>;

export interface AuthPasswordResetOptions {
  sendEmail: SendPasswordResetEmail;
  tokenExpiresInSeconds?: number | undefined;
}

export interface AuthAccountDeletionOptions {
  cleanup?: AccountDeletionCleanupBoundary | undefined;
  sendVerificationEmail?: SendDeleteAccountVerificationEmail | undefined;
  tokenExpiresInSeconds?: number | undefined;
  beforeDelete?: BeforeDeleteAccount | undefined;
  afterDelete?: AfterDeleteAccount | undefined;
}

export interface InitAuthOptions<
  TExtraPlugins extends BetterAuthPlugin[] = [],
> {
  database: AuthDatabase;
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;
  requireEmailVerification?: boolean | undefined;
  passwordReset?: AuthPasswordResetOptions | undefined;
  accountDeletion?: AuthAccountDeletionOptions | undefined;
  socialProviders?: AuthSocialProviders | undefined;
  trustedOrigins?: string[] | undefined;
  extraPlugins?: TExtraPlugins | undefined;
}

const DEFAULT_TRUSTED_ORIGINS = ["expo://"];

export function createDrizzleAuthDatabase(database: DrizzleDatabase) {
  return drizzleAdapter(database, {
    provider: "pg",
  });
}

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
    database: options.database,
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
      sendResetPassword: options.passwordReset?.sendEmail,
      resetPasswordTokenExpiresIn: options.passwordReset?.tokenExpiresInSeconds,
    },
    user: {
      deleteUser: {
        enabled: true,
        sendDeleteAccountVerification:
          options.accountDeletion?.sendVerificationEmail,
        deleteTokenExpiresIn: options.accountDeletion?.tokenExpiresInSeconds,
        async beforeDelete(user, request) {
          if (options.accountDeletion?.cleanup) {
            await prepareAccountDeletion({
              cleanup: options.accountDeletion.cleanup,
              memberId: user.id,
            });
          }

          await options.accountDeletion?.beforeDelete?.(user, request);
        },
        afterDelete: options.accountDeletion?.afterDelete,
      },
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
