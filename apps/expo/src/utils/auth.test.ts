import { describe, expect, it, vi } from "vitest";

import { signInWithShellSocialProvider } from "./auth";

vi.mock("expo-secure-store", () => ({}));

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

describe("signInWithShellSocialProvider", () => {
  it("starts a Better Auth social sign-in with a mobile auth-session handoff", async () => {
    const socialRequests: unknown[] = [];
    const browserSessions: unknown[] = [];
    const persistedCookies: string[] = [];

    const result = await signInWithShellSocialProvider("google", {
      availableProviders: ["google", "facebook"],
      createCallbackURL: () => "rastro://auth/callback",
      createProxyURL: (authorizationURL) =>
        `https://auth.example.test/api/auth/expo-authorization-proxy?authorizationURL=${encodeURIComponent(authorizationURL)}`,
      messages: {
        canceled: "Cancelaste el ingreso.",
        failed: "No pudimos iniciar sesion con ese proveedor.",
        unavailable: "Ese proveedor no esta disponible.",
      },
      openAuthSession: (url, callbackURL) => {
        browserSessions.push({ callbackURL, url });
        return Promise.resolve({
          type: "success",
          url: `${callbackURL}?cookie=${encodeURIComponent("better-auth.session_token=abc")}`,
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
        callbackURL: "rastro://auth/callback",
        disableRedirect: true,
        errorCallbackURL: "rastro://auth/callback",
        provider: "google",
      },
    ]);
    expect(browserSessions).toEqual([
      {
        callbackURL: "rastro://auth/callback",
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
        failed: "No pudimos iniciar sesion con ese proveedor.",
        unavailable: "Ese proveedor no esta disponible.",
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
      message: "Provider not found",
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
        failed: "No pudimos iniciar sesion con ese proveedor.",
        unavailable: "Ese proveedor no esta disponible.",
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
});
