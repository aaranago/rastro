import * as React from "react";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { expoClient, getSetCookie } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";

import { createAccountClientAdapter } from "@acme/auth/client";

import type {
  ShellAuthActionResult,
  ShellAuthAdapter,
  ShellAuthCredentials,
  ShellAuthSessionState,
  ShellSocialAuthProvider,
} from "../features/shell/shell-auth";
import { mobileHomeHref } from "../features/navigation/home-route";
import { shellSocialAuthProviders } from "../features/shell/shell-auth";
import { getBaseUrl } from "./base-url";

const mobileAuthScheme = "rastro";
const mobileAuthCallbackPath = "auth/callback";
const mobileAuthCallbackTransactionStorageKey = `${mobileAuthScheme}_callback_transaction`;
const mobileAuthCallbackTransactionMaxAgeMs = 10 * 60 * 1000;
const mobileAuthCookieStorageKey = `${mobileAuthScheme}_cookie`;
const betterAuthBasePath = "/api/auth";
const betterAuthCallbackPathSegment = "/callback/";

export const mobileAuthCallbackRedirectHref = mobileHomeHref;

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
    "Cancelaste el ingreso con proveedor. Puedes intentar otra vez o usar correo y contraseña.",
  failed: "No pudimos completar el ingreso con ese proveedor.",
  unavailable:
    "Ese proveedor de acceso no está disponible en este momento. Usa correo y contraseña o intenta más tarde.",
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

export interface MobileAuthCallbackSearchParams {
  cookie?: string | string[] | undefined;
  error?: string | string[] | undefined;
  error_description?: string | string[] | undefined;
  message?: string | string[] | undefined;
  transaction?: string | string[] | undefined;
}

export interface MobileAuthSessionFetchRequest {
  baseUrl?: string;
  cookie: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
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

export function getLocalizedAuthErrorMessage(
  message: string | undefined,
): string | undefined {
  if (!message) {
    return undefined;
  }

  const normalizedMessage = message.trim().toLowerCase();

  if (
    normalizedMessage === "invalid email" ||
    normalizedMessage === "invalid email or password"
  ) {
    return "Correo o contraseña inválidos.";
  }

  if (normalizedMessage === "provider not found") {
    return "Ese proveedor de acceso no está disponible en este momento.";
  }

  if (
    normalizedMessage === "correo o contraseña inválidos." ||
    normalizedMessage ===
      "ese proveedor de acceso no está disponible en este momento." ||
    normalizedMessage ===
      "no pudimos completar el acceso. intenta de nuevo." ||
    normalizedMessage ===
      "no pudimos conectar con rastro. revisa tu conexión e intenta de nuevo." ||
    normalizedMessage ===
      "cancelaste el ingreso con proveedor. puedes intentar otra vez o usar correo y contraseña." ||
    normalizedMessage ===
      "no pudimos completar el ingreso. revisa tus datos e intenta de nuevo."
  ) {
    return message;
  }

  if (
    /network|fetch|offline|internet|conex|timeout|failed to fetch/i.test(
      normalizedMessage,
    )
  ) {
    return "No pudimos conectar con Rastro. Revisa tu conexión e intenta de nuevo.";
  }

  return "No pudimos completar el acceso. Intenta de nuevo.";
}

export function getLocalizedPasswordResetErrorMessage(
  _message: string | undefined,
) {
  return "No pudimos enviar el enlace. Revisa el correo e intenta de nuevo.";
}

export function getShellCreateAccountDisplayName(
  _email: string,
  name: string | undefined,
) {
  const displayName = name?.trim();

  if (displayName) {
    return displayName;
  }

  return "Miembro Rastro";
}

function normalizeAuthActionResult(result: {
  error?: { message?: string } | null;
}): ShellAuthActionResult {
  if (result.error) {
    return {
      message: getLocalizedAuthErrorMessage(result.error.message),
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
      message: getLocalizedAuthErrorMessage(getErrorMessage(error)),
      ok: false,
    };
  }
}

export function createMobileAuthCallbackURL() {
  const callbackURL = new URL(
    Linking.createURL(mobileAuthCallbackPath, {
      scheme: mobileAuthScheme,
    }),
  );

  callbackURL.searchParams.set(
    "transaction",
    beginMobileAuthCallbackTransaction(),
  );

  return callbackURL.toString();
}

export function beginMobileAuthCallbackTransaction(now = Date.now()) {
  const id = createMobileAuthCallbackTransactionId();

  SecureStore.setItem(
    mobileAuthCallbackTransactionStorageKey,
    JSON.stringify({
      createdAt: now,
      id,
    }),
  );

  return id;
}

export function createMobileAuthProxyURL(authorizationURL: string) {
  const proxyURL = new URL(
    "expo-authorization-proxy",
    getMobileAuthProxyBaseURL(authorizationURL),
  );

  proxyURL.searchParams.set("authorizationURL", authorizationURL);

  return proxyURL.toString();
}

function getMobileAuthProxyBaseURL(authorizationURL: string) {
  const redirectURL = getAuthorizationRedirectURL(authorizationURL);

  if (!redirectURL) {
    return new URL(`${betterAuthBasePath}/`, getBaseUrl());
  }

  const callbackPathIndex = redirectURL.pathname.indexOf(
    betterAuthCallbackPathSegment,
  );
  const authBasePath =
    callbackPathIndex === -1
      ? betterAuthBasePath
      : redirectURL.pathname.slice(0, callbackPathIndex);

  return new URL(`${authBasePath.replace(/\/+$/, "")}/`, redirectURL.origin);
}

function getAuthorizationRedirectURL(authorizationURL: string) {
  const redirectURI = new URL(authorizationURL).searchParams.get(
    "redirect_uri",
  );

  if (!redirectURI) {
    return null;
  }

  return new URL(redirectURI);
}

function persistMobileAuthCookie(setCookieHeader: string) {
  const previousCookie =
    SecureStore.getItem(mobileAuthCookieStorageKey) ?? undefined;

  SecureStore.setItem(
    mobileAuthCookieStorageKey,
    getSetCookie(setCookieHeader, previousCookie),
  );
  authClient.$store.notify("$sessionSignal");
}

export async function fetchMobileAuthSessionWithCookie({
  baseUrl = getBaseUrl(),
  cookie,
  fetchImpl = fetch,
  signal,
}: MobileAuthSessionFetchRequest): Promise<ShellAuthSessionState["data"]> {
  const normalizedCookie = cookie.trim();

  if (!normalizedCookie) {
    return null;
  }

  const response = await fetchImpl(`${baseUrl}/api/auth/get-session`, {
    headers: {
      Cookie: normalizedCookie,
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Session check failed with ${response.status}`);
  }

  return normalizeMobileAuthSession(await response.json());
}

function normalizeMobileAuthSession(
  value: unknown,
): ShellAuthSessionState["data"] {
  if (!isRecord(value) || !isRecord(value.user)) {
    return null;
  }

  const user = value.user;

  if (typeof user.id !== "string") {
    return null;
  }

  return {
    session: value.session,
    user: {
      email: typeof user.email === "string" ? user.email : undefined,
      id: user.id,
      name:
        typeof user.name === "string" || user.name === null
          ? user.name
          : undefined,
    },
  };
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function useMobileAuthSession(): ShellAuthSessionState {
  const authSession = authClient.useSession();
  const [fallbackSession, setFallbackSession] = React.useState<{
    data: ShellAuthSessionState["data"];
    error: unknown;
    isPending: boolean;
  }>({
    data: null,
    error: null,
    isPending: false,
  });
  const [fallbackRefreshKey, setFallbackRefreshKey] = React.useState(0);
  const refetchAuthSession = authSession.refetch;
  const hasAuthClientUser = Boolean(authSession.data?.user);
  const refetch = React.useCallback(() => {
    refetchAuthSession();
    setFallbackRefreshKey((current) => current + 1);
  }, [refetchAuthSession]);

  React.useEffect(() => {
    if (authSession.isPending || hasAuthClientUser) {
      return;
    }

    const cookie = authClient.getCookie();

    if (!cookie) {
      setFallbackSession({
        data: null,
        error: null,
        isPending: false,
      });
      return;
    }

    const abortController = new AbortController();
    let isActive = true;

    setFallbackSession((current) => ({
      ...current,
      error: null,
      isPending: true,
    }));

    fetchMobileAuthSessionWithCookie({
      cookie,
      signal: abortController.signal,
    })
      .then((data) => {
        if (!isActive) {
          return;
        }

        setFallbackSession({
          data,
          error: null,
          isPending: false,
        });
      })
      .catch((error: unknown) => {
        if (!isActive || isAbortError(error)) {
          return;
        }

        setFallbackSession({
          data: null,
          error,
          isPending: false,
        });
      });

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [
    authSession.data?.user.id,
    authSession.isPending,
    fallbackRefreshKey,
    hasAuthClientUser,
  ]);

  if (hasAuthClientUser) {
    return {
      ...authSession,
      refetch,
    };
  }

  if (fallbackSession.data?.user) {
    return {
      ...authSession,
      data: fallbackSession.data,
      error: fallbackSession.error,
      isPending: false,
      refetch,
    };
  }

  return {
    ...authSession,
    error: authSession.error ?? fallbackSession.error,
    isPending: authSession.isPending || fallbackSession.isPending,
    refetch,
  };
}

export function completeMobileAuthCallback(
  params: MobileAuthCallbackSearchParams,
): ShellAuthActionResult {
  const callbackError =
    getFirstCallbackSearchParam(params.error_description) ??
    getFirstCallbackSearchParam(params.error) ??
    getFirstCallbackSearchParam(params.message);

  if (callbackError) {
    return {
      message:
        getLocalizedAuthErrorMessage(callbackError) ??
        socialAuthMessages.failed,
      ok: false,
      reason: "failed",
    };
  }

  const setCookieHeader = getFirstCallbackSearchParam(params.cookie);

  if (!setCookieHeader) {
    return {
      message: socialAuthMessages.failed,
      ok: false,
      reason: "failed",
    };
  }

  if (
    !consumeMobileAuthCallbackTransaction(
      getFirstCallbackSearchParam(params.transaction),
    )
  ) {
    return {
      message: socialAuthMessages.failed,
      ok: false,
      reason: "failed",
    };
  }

  persistMobileAuthCookie(setCookieHeader);

  return { ok: true };
}

function consumeMobileAuthCallbackTransaction(
  transactionId: string | undefined,
  now = Date.now(),
) {
  if (!transactionId) {
    return false;
  }

  const transaction = readMobileAuthCallbackTransaction();

  if (!transaction) {
    return false;
  }

  if (transaction.id !== transactionId) {
    return false;
  }

  SecureStore.setItem(mobileAuthCallbackTransactionStorageKey, "");

  return now - transaction.createdAt <= mobileAuthCallbackTransactionMaxAgeMs;
}

function readMobileAuthCallbackTransaction() {
  const storedValue = SecureStore.getItem(
    mobileAuthCallbackTransactionStorageKey,
  );

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);

    if (!isRecord(parsedValue)) {
      return null;
    }

    const id = parsedValue.id;
    const createdAt = parsedValue.createdAt;

    if (typeof id !== "string" || typeof createdAt !== "number") {
      return null;
    }

    return { createdAt, id };
  } catch {
    SecureStore.setItem(mobileAuthCallbackTransactionStorageKey, "");
    return null;
  }
}

function createMobileAuthCallbackTransactionId() {
  const cryptoApi = (
    globalThis as {
      crypto?: {
        randomUUID?: () => string;
      };
    }
  ).crypto;

  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getFirstCallbackSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  const firstValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = firstValue?.trim();

  if (!normalizedValue) {
    return undefined;
  }

  return normalizedValue;
}

export function getAvailableShellSocialAuthProviders(
  configuredProviders: string | undefined = getConfiguredSocialAuthProviders(),
  runtimeEnv: string | undefined = getRuntimeEnv(),
): ShellSocialAuthProvider[] {
  void runtimeEnv;

  if (configuredProviders === undefined) {
    return [];
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

function getRuntimeEnv(): string | undefined {
  const globalWithProcess = globalThis as {
    process?: {
      env?: {
        NODE_ENV?: string | undefined;
      };
    };
  };

  return globalWithProcess.process?.env?.NODE_ENV;
}

function getConfiguredSocialAuthProviders(): string | undefined {
  const globalWithProcess = globalThis as {
    process?: {
      env?: {
        EXPO_PUBLIC_AUTH_SOCIAL_PROVIDERS?: string | undefined;
      };
    };
  };

  return (
    globalWithProcess.process?.env?.EXPO_PUBLIC_AUTH_SOCIAL_PROVIDERS ??
    getExpoConfigSocialAuthProviders()
  );
}

function getExpoConfigSocialAuthProviders(): string | undefined {
  const extra = Constants.expoConfig?.extra;

  if (!isRecord(extra)) {
    return undefined;
  }

  const auth = extra.auth;

  if (!isRecord(auth)) {
    return undefined;
  }

  const socialProviders = auth.socialProviders;

  if (typeof socialProviders !== "string" || socialProviders.trim() === "") {
    return undefined;
  }

  return socialProviders;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
        message:
          getLocalizedAuthErrorMessage(result.error.message) ??
          dependencies.messages.failed,
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

    if (!isTrustedMobileAuthCallbackURL(browserResult.url, callbackURL)) {
      return {
        message: dependencies.messages.failed,
        ok: false,
        reason: "failed",
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
        message:
          getLocalizedAuthErrorMessage(callbackError) ??
          dependencies.messages.failed,
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

    if (
      !consumeMobileAuthCallbackTransaction(
        callbackParameters?.get("transaction") ?? undefined,
      )
    ) {
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
      message:
        getLocalizedAuthErrorMessage(getErrorMessage(error)) ??
        dependencies.messages.failed,
      ok: false,
      reason: "failed",
    };
  }
}

export function isTrustedMobileAuthCallbackURL(
  receivedURL: string | undefined,
  expectedURL: string,
): boolean {
  if (!receivedURL) {
    return false;
  }

  try {
    const received = new URL(receivedURL);
    const expected = new URL(expectedURL);

    return (
      received.protocol === expected.protocol &&
      received.hostname === expected.hostname &&
      received.pathname === expected.pathname
    );
  } catch {
    return false;
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
        name: getShellCreateAccountDisplayName(email, name),
        password,
      }),
    ),
  initiateAccountDeletion: () =>
    accountClientAdapter.initiateAccountDeletion({
      callbackURL: "/",
    }),
  requestPasswordResetForEmail: async (email: string) => {
    const result = await accountClientAdapter.requestPasswordResetForEmail(
      email,
      {
        redirectTo: "/",
      },
    );

    return result.ok
      ? result
      : {
          message: getLocalizedPasswordResetErrorMessage(result.message),
          ok: false,
        };
  },
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
  useSession: useMobileAuthSession,
};
