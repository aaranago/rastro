import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  beginMobileAuthCallbackTransaction,
  completeMobileAuthCallback,
  createMobileAuthCallbackURL,
  createMobileAuthProxyURL,
  fetchMobileAuthSessionWithCookie,
  getAvailableShellSocialAuthProviders,
  getLocalizedAuthErrorMessage,
  getLocalizedPasswordResetErrorMessage,
  getShellCreateAccountDisplayName,
  isTrustedMobileAuthCallbackURL,
  mobileAuthCallbackRedirectHref,
  signInWithShellSocialProvider,
} from "./auth";

const expoConstants = vi.hoisted(() => ({
  expoConfig: undefined as
    | { extra?: Record<string, unknown> | undefined }
    | undefined,
}));
const secureStore = vi.hoisted(() => ({
  getItem: vi.fn((): string | null => null),
  setItem: vi.fn(),
}));
const authStore = vi.hoisted(() => ({
  notify: vi.fn(),
}));

const originalSocialProvidersEnv =
  typeof process.env.EXPO_PUBLIC_AUTH_SOCIAL_PROVIDERS === "string"
    ? process.env.EXPO_PUBLIC_AUTH_SOCIAL_PROVIDERS
    : undefined;

vi.mock("expo-constants", () => ({
  default: expoConstants,
}));

vi.mock("expo-secure-store", () => secureStore);

vi.mock("@better-auth/expo/client", () => ({
  expoClient: vi.fn(() => ({ id: "expo" })),
  getSetCookie: vi.fn((setCookieHeader: string) => `stored:${setCookieHeader}`),
}));

vi.mock("better-auth/react", () => ({
  createAuthClient: vi.fn(() => ({
    deleteUser: vi.fn(),
    requestPasswordReset: vi.fn(),
    signIn: {
      email: vi.fn(),
      social: vi.fn(),
    },
    signOut: vi.fn(),
    signUp: {
      email: vi.fn(),
    },
    useSession: vi.fn(),
    $store: authStore,
  })),
}));

vi.mock("@acme/auth/client", () => ({
  createAccountClientAdapter: vi.fn(() => ({
    initiateAccountDeletion: vi.fn(),
    requestPasswordResetForEmail: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock("expo-linking", () => ({
  createURL: vi.fn(() => "rastro://auth/callback"),
}));

vi.mock("expo-web-browser", () => ({
  openAuthSessionAsync: vi.fn(),
}));

vi.mock("./base-url", () => ({
  getBaseUrl: () => "http://localhost:3000",
}));

beforeEach(() => {
  expoConstants.expoConfig = undefined;
  authStore.notify.mockClear();
  secureStore.getItem.mockClear();
  secureStore.getItem.mockReturnValue(null);
  secureStore.setItem.mockClear();
  delete process.env.EXPO_PUBLIC_AUTH_SOCIAL_PROVIDERS;
});

afterEach(() => {
  if (originalSocialProvidersEnv === undefined) {
    delete process.env.EXPO_PUBLIC_AUTH_SOCIAL_PROVIDERS;
    return;
  }

  process.env.EXPO_PUBLIC_AUTH_SOCIAL_PROVIDERS = originalSocialProvidersEnv;
});

function createStoredMobileAuthCallbackURL(createdAt = Date.now()) {
  const transaction = beginMobileAuthCallbackTransaction(createdAt);

  secureStore.getItem.mockImplementation((key?: string) => {
    if (key === "rastro_callback_transaction") {
      return JSON.stringify({
        createdAt,
        id: transaction,
      });
    }

    return null;
  });

  return `rastro://auth/callback?transaction=${encodeURIComponent(transaction)}`;
}

describe("signInWithShellSocialProvider", () => {
  it("starts a Better Auth social sign-in with a mobile auth-session handoff", async () => {
    const callbackURL = createStoredMobileAuthCallbackURL();
    const socialRequests: unknown[] = [];
    const browserSessions: unknown[] = [];
    const persistedCookies: string[] = [];

    const result = await signInWithShellSocialProvider("google", {
      availableProviders: ["google", "facebook"],
      createCallbackURL: () => callbackURL,
      createProxyURL: (authorizationURL) =>
        `https://auth.example.test/api/auth/expo-authorization-proxy?authorizationURL=${encodeURIComponent(authorizationURL)}`,
      messages: {
        canceled: "Cancelaste el ingreso.",
        failed: "No pudimos iniciar sesión con ese proveedor.",
        unavailable: "Ese proveedor no está disponible.",
      },
      openAuthSession: (url, callbackURL) => {
        browserSessions.push({ callbackURL, url });
        return Promise.resolve({
          type: "success",
          url: `${callbackURL}&cookie=${encodeURIComponent("better-auth.session_token=abc")}`,
        });
      },
      persistCookie: (setCookieHeader) => {
        persistedCookies.push(setCookieHeader);
      },
      signInSocial: (request) => {
        socialRequests.push(request);
        return Promise.resolve({
          data: {
            redirect: false,
            url: "https://auth.example.test/oauth/google",
          },
          error: null,
        });
      },
    });

    expect(result).toEqual({ ok: true });
    expect(socialRequests).toEqual([
      {
        callbackURL,
        disableRedirect: true,
        errorCallbackURL: callbackURL,
        provider: "google",
      },
    ]);
    expect(browserSessions).toEqual([
      {
        callbackURL,
        url: "https://auth.example.test/api/auth/expo-authorization-proxy?authorizationURL=https%3A%2F%2Fauth.example.test%2Foauth%2Fgoogle",
      },
    ]);
    expect(persistedCookies).toEqual(["better-auth.session_token=abc"]);
  });

  it("returns a recoverable error when Better Auth rejects the social provider", async () => {
    const browserSessions: unknown[] = [];

    const result = await signInWithShellSocialProvider("facebook", {
      availableProviders: ["google", "facebook"],
      createCallbackURL: () => "rastro://auth/callback",
      createProxyURL: (authorizationURL) =>
        `https://auth.example.test/api/auth/expo-authorization-proxy?authorizationURL=${encodeURIComponent(authorizationURL)}`,
      messages: {
        canceled: "Cancelaste el ingreso.",
        failed: "No pudimos iniciar sesión con ese proveedor.",
        unavailable: "Ese proveedor no está disponible.",
      },
      openAuthSession: (url, callbackURL) => {
        browserSessions.push({ callbackURL, url });
        return Promise.resolve({
          type: "success",
          url: callbackURL,
        });
      },
      persistCookie: vi.fn(),
      signInSocial: () =>
        Promise.resolve({
          data: null,
          error: {
            message: "Provider not found",
          },
        }),
    });

    expect(result).toEqual({
      message: "Ese proveedor de acceso no está disponible en este momento.",
      ok: false,
      reason: "failed",
    });
    expect(browserSessions).toEqual([]);
  });

  it("keeps the auth surface recoverable when the provider handoff is canceled", async () => {
    const result = await signInWithShellSocialProvider("google", {
      availableProviders: ["google", "facebook"],
      createCallbackURL: () => "rastro://auth/callback",
      createProxyURL: (authorizationURL) =>
        `https://auth.example.test/api/auth/expo-authorization-proxy?authorizationURL=${encodeURIComponent(authorizationURL)}`,
      messages: {
        canceled: "Cancelaste el ingreso.",
        failed: "No pudimos iniciar sesión con ese proveedor.",
        unavailable: "Ese proveedor no está disponible.",
      },
      openAuthSession: () =>
        Promise.resolve({
          type: "cancel",
        }),
      persistCookie: vi.fn(),
      signInSocial: () =>
        Promise.resolve({
          data: {
            redirect: false,
            url: "https://auth.example.test/oauth/google",
          },
          error: null,
        }),
    });

    expect(result).toEqual({
      message: "Cancelaste el ingreso.",
      ok: false,
      reason: "canceled",
    });
  });

  it("rejects a successful handoff from an unexpected custom-scheme callback", async () => {
    const persistedCookies: string[] = [];

    const result = await signInWithShellSocialProvider("google", {
      availableProviders: ["google"],
      createCallbackURL: () => "rastro://auth/callback",
      createProxyURL: (authorizationURL) =>
        `https://auth.example.test/api/auth/expo-authorization-proxy?authorizationURL=${encodeURIComponent(authorizationURL)}`,
      messages: {
        canceled: "Cancelaste el ingreso.",
        failed: "No pudimos iniciar sesión con ese proveedor.",
        unavailable: "Ese proveedor no está disponible.",
      },
      openAuthSession: () =>
        Promise.resolve({
          type: "success",
          url: "rastro://evil/callback?cookie=better-auth.session_token%3Dabc",
        }),
      persistCookie: (setCookieHeader) => {
        persistedCookies.push(setCookieHeader);
      },
      signInSocial: () =>
        Promise.resolve({
          data: {
            redirect: false,
            url: "https://auth.example.test/oauth/google",
          },
          error: null,
        }),
    });

    expect(result).toEqual({
      message: "No pudimos iniciar sesión con ese proveedor.",
      ok: false,
      reason: "failed",
    });
    expect(persistedCookies).toEqual([]);
  });

  it("rejects same-path social handoff cookies without the pending transaction", async () => {
    const callbackURL = createStoredMobileAuthCallbackURL();
    const persistedCookies: string[] = [];

    const result = await signInWithShellSocialProvider("google", {
      availableProviders: ["google"],
      createCallbackURL: () => callbackURL,
      createProxyURL: (authorizationURL) =>
        `https://auth.example.test/api/auth/expo-authorization-proxy?authorizationURL=${encodeURIComponent(authorizationURL)}`,
      messages: {
        canceled: "Cancelaste el ingreso.",
        failed: "No pudimos iniciar sesión con ese proveedor.",
        unavailable: "Ese proveedor no está disponible.",
      },
      openAuthSession: () =>
        Promise.resolve({
          type: "success",
          url: "rastro://auth/callback?cookie=better-auth.session_token%3Dattacker",
        }),
      persistCookie: (setCookieHeader) => {
        persistedCookies.push(setCookieHeader);
      },
      signInSocial: () =>
        Promise.resolve({
          data: {
            redirect: false,
            url: "https://auth.example.test/oauth/google",
          },
          error: null,
        }),
    });

    expect(result).toEqual({
      message: "No pudimos iniciar sesión con ese proveedor.",
      ok: false,
      reason: "failed",
    });
    expect(persistedCookies).toEqual([]);
  });
});

describe("mobile auth configuration helpers", () => {
  it("routes completed mobile auth callbacks to an existing tab anchor", () => {
    expect(mobileAuthCallbackRedirectHref).toBe("/(tabs)/(nearby)");
    expect(mobileAuthCallbackRedirectHref).not.toBe("/");
  });

  it("adds a one-time transaction to routed mobile auth callback URLs", () => {
    const callbackURL = createMobileAuthCallbackURL();
    const transaction = new URL(callbackURL).searchParams.get("transaction");

    expect(callbackURL).toMatch(/^rastro:\/\/auth\/callback\?transaction=/);
    expect(transaction).toBeTruthy();
    expect(secureStore.setItem).toHaveBeenCalledWith(
      "rastro_callback_transaction",
      expect.stringContaining(`"id":"${transaction}"`),
    );
  });

  it("builds the Expo auth proxy on the Better Auth callback origin", () => {
    const authorizationURL =
      "https://accounts.google.com/o/oauth2/auth?state=abc&redirect_uri=https%3A%2F%2Fauth.example.test%2Fapi%2Fauth%2Fcallback%2Fgoogle";

    expect(createMobileAuthProxyURL(authorizationURL)).toBe(
      `https://auth.example.test/api/auth/expo-authorization-proxy?authorizationURL=${encodeURIComponent(authorizationURL)}`,
    );
  });

  it("falls back to the configured API base URL when the provider URL has no redirect URI", () => {
    const authorizationURL =
      "https://auth.example.test/api/auth/sign-in/social?provider=facebook&state=abc";

    expect(createMobileAuthProxyURL(authorizationURL)).toBe(
      `http://localhost:3000/api/auth/expo-authorization-proxy?authorizationURL=${encodeURIComponent(authorizationURL)}`,
    );
  });

  it("requires an explicit social provider allowlist in production", () => {
    expect(
      getAvailableShellSocialAuthProviders(undefined, "production"),
    ).toEqual([]);
    expect(
      getAvailableShellSocialAuthProviders(undefined, "development"),
    ).toEqual([]);
    expect(
      getAvailableShellSocialAuthProviders("google", "production"),
    ).toEqual(["google"]);
    expect(
      getAvailableShellSocialAuthProviders("google,facebook", "production"),
    ).toEqual(["google", "facebook"]);
  });

  it("uses the public Expo config social provider allowlist when the direct env var is absent", () => {
    expoConstants.expoConfig = {
      extra: {
        auth: {
          socialProviders: "google,facebook",
        },
      },
    };

    expect(getAvailableShellSocialAuthProviders()).toEqual([
      "google",
      "facebook",
    ]);
  });

  it("accepts only the expected mobile auth callback URL shape", () => {
    expect(
      isTrustedMobileAuthCallbackURL(
        "rastro://auth/callback?cookie=session",
        "rastro://auth/callback",
      ),
    ).toBe(true);
    expect(
      isTrustedMobileAuthCallbackURL(
        "rastro://evil/callback?cookie=session",
        "rastro://auth/callback",
      ),
    ).toBe(false);
  });

  it("persists the Better Auth cookie from a routed mobile callback", () => {
    const transaction = beginMobileAuthCallbackTransaction();
    secureStore.getItem.mockImplementation((key?: string) => {
      if (key === "rastro_callback_transaction") {
        return JSON.stringify({
          createdAt: Date.now(),
          id: transaction,
        });
      }

      return null;
    });

    expect(
      completeMobileAuthCallback({
        cookie: "__Secure-better-auth.session_token=abc; Path=/; HttpOnly",
        transaction,
      }),
    ).toEqual({ ok: true });

    expect(secureStore.getItem).toHaveBeenCalledWith(
      "rastro_callback_transaction",
    );
    expect(secureStore.getItem).toHaveBeenCalledWith("rastro_cookie");
    expect(secureStore.setItem).toHaveBeenCalledWith(
      "rastro_callback_transaction",
      "",
    );
    expect(secureStore.setItem).toHaveBeenCalledWith(
      "rastro_cookie",
      "stored:__Secure-better-auth.session_token=abc; Path=/; HttpOnly",
    );
    expect(authStore.notify).toHaveBeenCalledWith("$sessionSignal");
  });

  it("rejects routed mobile callback cookies without the pending transaction", () => {
    expect(
      completeMobileAuthCallback({
        cookie: "better-auth.session_token=attacker",
      }),
    ).toEqual({
      message: "No pudimos completar el ingreso con ese proveedor.",
      ok: false,
      reason: "failed",
    });

    expect(secureStore.setItem).not.toHaveBeenCalledWith(
      "rastro_cookie",
      expect.any(String),
    );
    expect(authStore.notify).not.toHaveBeenCalled();
  });

  it("checks the mobile session with an explicit Cookie header", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            session: { id: "session-1" },
            user: {
              email: "qa@example.com",
              id: "user-1",
              name: "QA",
            },
          }),
          {
            status: 200,
          },
        ),
      ),
    );

    await expect(
      fetchMobileAuthSessionWithCookie({
        baseUrl: "http://localhost:3000",
        cookie: "better-auth.session_token=abc",
        fetchImpl,
      }),
    ).resolves.toEqual({
      session: { id: "session-1" },
      user: {
        email: "qa@example.com",
        id: "user-1",
        name: "QA",
      },
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3000/api/auth/get-session",
      {
        headers: {
          Cookie: "better-auth.session_token=abc",
        },
        signal: undefined,
      },
    );
  });

  it("skips the explicit mobile session check when no cookie is stored", async () => {
    const fetchImpl = vi.fn();

    await expect(
      fetchMobileAuthSessionWithCookie({
        cookie: " ",
        fetchImpl,
      }),
    ).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps provider callback errors from the routed mobile callback", () => {
    expect(
      completeMobileAuthCallback({
        error: "Provider not found",
      }),
    ).toEqual({
      message: "Ese proveedor de acceso no está disponible en este momento.",
      ok: false,
      reason: "failed",
    });

    expect(secureStore.setItem).not.toHaveBeenCalled();
    expect(authStore.notify).not.toHaveBeenCalled();
  });

  it("maps common backend auth errors to Spanish recovery copy", () => {
    expect(getLocalizedAuthErrorMessage("Invalid email")).toBe(
      "Correo o contraseña inválidos.",
    );
    expect(getLocalizedAuthErrorMessage("Provider not found")).toBe(
      "Ese proveedor de acceso no está disponible en este momento.",
    );
  });

  it("keeps signup display names from falling back to the account email", () => {
    expect(getShellCreateAccountDisplayName("ana@example.com", " Ana ")).toBe(
      "Ana",
    );
    expect(getShellCreateAccountDisplayName("ana@example.com", undefined)).toBe(
      "Miembro Rastro",
    );
  });

  it("maps password-reset backend failures to Spanish recovery copy", () => {
    expect(
      getLocalizedPasswordResetErrorMessage("Reset password disabled"),
    ).toBe("No pudimos enviar el enlace. Revisa el correo e intenta de nuevo.");
    expect(getLocalizedPasswordResetErrorMessage(undefined)).toBe(
      "No pudimos enviar el enlace. Revisa el correo e intenta de nuevo.",
    );
  });
});
