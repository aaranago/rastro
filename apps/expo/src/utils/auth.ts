import * as SecureStore from "expo-secure-store";
import { expoClient, getSetCookie } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { createAccountClientAdapter } from "@acme/auth/client";

import type {
  ShellAuthActionResult,
  ShellAuthAdapter,
  ShellAuthCredentials,
  ShellSocialAuthProvider,
} from "../features/shell/shell-auth";
import { shellSocialAuthProviders } from "../features/shell/shell-auth";
import { getBaseUrl } from "./base-url";

const mobileAuthScheme = "rastro";
const mobileAuthCallbackPath = "auth/callback";
const mobileAuthCookieStorageKey = `${mobileAuthScheme}_cookie`;

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    expoClient({
      scheme: mobileAuthScheme,
      storagePrefix: mobileAuthScheme,
      storage: SecureStore,
    }),
  ],
});

const accountClientAdapter = createAccountClientAdapter(authClient);
const socialAuthMessages = {
  canceled:
    "Cancelaste el ingreso con proveedor. Puedes intentar otra vez o usar correo y contrasena.",
  failed: "No pudimos completar el ingreso con ese proveedor.",
  unavailable:
    "Ese proveedor de acceso no esta disponible en este momento. Usa correo y contrasena o intenta mas tarde.",
};

export interface ShellSocialAuthSignInRequest {
  callbackURL: string;
  disableRedirect: true;
  errorCallbackURL: string;
  provider: ShellSocialAuthProvider;
}

export interface ShellSocialAuthSignInResult {
  data?:
    | {
        redirect?: boolean | undefined;
        url?: string | undefined;
      }
    | null
    | undefined;
  error?:
    | {
        message?: string | undefined;
      }
    | null
    | undefined;
}

export interface ShellSocialAuthHandoffDependencies {
  availableProviders: readonly ShellSocialAuthProvider[];
  createCallbackURL: () => string;
  createProxyURL: (authorizationURL: string) => string;
  messages: {
    canceled: string;
    failed: string;
    unavailable: string;
  };
  openAuthSession: (
    url: string,
    callbackURL: string,
  ) => Promise<{ type: string; url?: string | undefined }>;
  persistCookie: (setCookieHeader: string) => Promise<void> | void;
  signInSocial: (
    request: ShellSocialAuthSignInRequest,
  ) => Promise<ShellSocialAuthSignInResult>;
}

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return undefined;
}

function normalizeAuthActionResult(result: {
  error?: { message?: string } | null;
}): ShellAuthActionResult {
  if (result.error) {
    return {
      message: result.error.message,
      ok: false,
    };
  }

  return { ok: true };
}

async function runAuthAction(
  action: () => Promise<{ error?: { message?: string } | null }>,
): Promise<ShellAuthActionResult> {
  try {
    return normalizeAuthActionResult(await action());
  } catch (error) {
    return {
      message: getErrorMessage(error),
      ok: false,
    };
  }
}

function createMobileAuthCallbackURL() {
  return Linking.createURL(mobileAuthCallbackPath, {
    scheme: mobileAuthScheme,
  });
}

function createMobileAuthProxyURL(authorizationURL: string) {
  const proxyURL = new URL("/expo-authorization-proxy", getBaseUrl());

  proxyURL.searchParams.set("authorizationURL", authorizationURL);

  return proxyURL.toString();
}

function persistMobileAuthCookie(setCookieHeader: string) {
  const previousCookie =
    SecureStore.getItem(mobileAuthCookieStorageKey) ?? undefined;

  SecureStore.setItem(
    mobileAuthCookieStorageKey,
    getSetCookie(setCookieHeader, previousCookie),
  );
}

function getAvailableShellSocialAuthProviders(
  configuredProviders: string | undefined = getConfiguredSocialAuthProviders(),
): ShellSocialAuthProvider[] {
  if (configuredProviders === undefined) {
    return [...shellSocialAuthProviders];
  }

  const providerSet = new Set(
    configuredProviders
      .split(/[,\s]+/)
      .map((provider) => provider.trim().toLowerCase())
      .filter(Boolean),
  );

  return shellSocialAuthProviders.filter((provider) =>
    providerSet.has(provider),
  );
}

function getConfiguredSocialAuthProviders(): string | undefined {
  const globalWithProcess = globalThis as {
    process?: {
      env?: {
        EXPO_PUBLIC_AUTH_SOCIAL_PROVIDERS?: string | undefined;
      };
    };
  };

  return globalWithProcess.process?.env?.EXPO_PUBLIC_AUTH_SOCIAL_PROVIDERS;
}

export async function signInWithShellSocialProvider(
  provider: ShellSocialAuthProvider,
  dependencies: ShellSocialAuthHandoffDependencies,
): Promise<ShellAuthActionResult> {
  if (!dependencies.availableProviders.includes(provider)) {
    return {
      message: dependencies.messages.unavailable,
      ok: false,
      reason: "unavailable",
    };
  }

  const callbackURL = dependencies.createCallbackURL();

  try {
    const result = await dependencies.signInSocial({
      callbackURL,
      disableRedirect: true,
      errorCallbackURL: callbackURL,
      provider,
    });

    if (result.error) {
      return {
        message: result.error.message ?? dependencies.messages.failed,
        ok: false,
        reason: "failed",
      };
    }

    const authURL = result.data?.url;

    if (!authURL) {
      return {
        message: dependencies.messages.unavailable,
        ok: false,
        reason: "unavailable",
      };
    }

    const browserResult = await dependencies.openAuthSession(
      dependencies.createProxyURL(authURL),
      callbackURL,
    );

    if (browserResult.type !== "success") {
      return {
        message: dependencies.messages.canceled,
        ok: false,
        reason: "canceled",
      };
    }

    const callbackParameters = getSocialAuthCallbackParameters(
      browserResult.url,
    );
    const callbackError =
      callbackParameters?.get("error_description") ??
      callbackParameters?.get("error") ??
      callbackParameters?.get("message");

    if (callbackError) {
      return {
        message: callbackError,
        ok: false,
        reason: "failed",
      };
    }

    const setCookieHeader = callbackParameters?.get("cookie");

    if (!setCookieHeader) {
      return {
        message: dependencies.messages.failed,
        ok: false,
        reason: "failed",
      };
    }

    await dependencies.persistCookie(setCookieHeader);

    return { ok: true };
  } catch (error) {
    return {
      message: getErrorMessage(error) ?? dependencies.messages.failed,
      ok: false,
      reason: "failed",
    };
  }
}

function getSocialAuthCallbackParameters(
  callbackURL: string | undefined,
): URLSearchParams | null {
  if (!callbackURL) {
    return null;
  }

  try {
    return new URL(callbackURL).searchParams;
  } catch {
    return null;
  }
}

export const shellAuthAdapter: ShellAuthAdapter = {
  availableSocialAuthProviders: getAvailableShellSocialAuthProviders(),
  createAccountWithEmail: ({ email, name, password }: ShellAuthCredentials) =>
    runAuthAction(() =>
      authClient.signUp.email({
        email,
        name: name ?? email,
        password,
      }),
    ),
  initiateAccountDeletion: () =>
    accountClientAdapter.initiateAccountDeletion({
      callbackURL: "/",
    }),
  requestPasswordResetForEmail: (email: string) =>
    accountClientAdapter.requestPasswordResetForEmail(email, {
      redirectTo: "/",
    }),
  signInWithEmail: ({ email, password }: ShellAuthCredentials) =>
    runAuthAction(() =>
      authClient.signIn.email({
        email,
        password,
        rememberMe: true,
      }),
    ),
  signInWithSocialProvider: (provider: ShellSocialAuthProvider) =>
    signInWithShellSocialProvider(provider, {
      availableProviders: getAvailableShellSocialAuthProviders(),
      createCallbackURL: createMobileAuthCallbackURL,
      createProxyURL: createMobileAuthProxyURL,
      messages: socialAuthMessages,
      openAuthSession: (url, callbackURL) =>
        WebBrowser.openAuthSessionAsync(url, callbackURL),
      persistCookie: persistMobileAuthCookie,
      signInSocial: (request) => authClient.signIn.social(request),
    }),
  signOut: () => accountClientAdapter.signOut(),
  useSession: () => authClient.useSession(),
};
