import { beforeEach, describe, expect, it, vi } from "vitest";

const nextNavigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const nextHeaders = vi.hoisted(() => ({
  headers: vi.fn(() => new Headers()),
}));

const authServer = vi.hoisted(() => ({
  auth: {
    api: {
      deleteUser: vi.fn(),
      requestPasswordReset: vi.fn(),
      signInEmail: vi.fn(),
      signInSocial: vi.fn(),
      signOut: vi.fn(),
      signUpEmail: vi.fn(),
    },
  },
  getEnabledSocialAuthProviders: vi.fn(() => [] as string[]),
  getSession: vi.fn(),
}));

vi.mock("next/navigation", () => nextNavigation);
vi.mock("next/headers", () => nextHeaders);
vi.mock("~/env", () => ({
  env: {
    AUTH_REQUIRE_EMAIL_VERIFICATION: false,
  },
}));
vi.mock("~/auth/server", () => authServer);

describe("auth server actions", () => {
  beforeEach(() => {
    nextNavigation.redirect.mockClear();
    nextHeaders.headers.mockClear();
    authServer.auth.api.deleteUser.mockReset();
    authServer.auth.api.requestPasswordReset.mockReset();
    authServer.auth.api.signInEmail.mockReset();
    authServer.auth.api.signInSocial.mockReset();
    authServer.auth.api.signUpEmail.mockReset();
    authServer.getEnabledSocialAuthProviders.mockReset();
    authServer.getEnabledSocialAuthProviders.mockReturnValue([]);
    authServer.getSession.mockReset();
  });

  it("redirects to the deletion integration note when account deletion is not enabled", async () => {
    const { initiateAccountDeletion } = await import("./actions");
    authServer.getSession.mockResolvedValue({
      user: {
        email: "ana@example.com",
        name: "Ana",
      },
    });
    authServer.auth.api.deleteUser.mockRejectedValue(new Error("Not Found"));

    await expect(initiateAccountDeletion()).rejects.toThrow(
      "NEXT_REDIRECT:/?auth=account-deletion-integration-needed#auth",
    );
  });

  it("redirects to the password reset integration note when reset email is not enabled", async () => {
    const { requestPasswordReset } = await import("./actions");
    const formData = new FormData();
    formData.set("email", "ana@example.com");
    authServer.auth.api.requestPasswordReset.mockRejectedValue(
      new Error("Reset password isn't enabled"),
    );

    await expect(requestPasswordReset(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/?auth=password-reset-integration-needed#auth",
    );
  });

  it("redirects to the integration note when production email delivery is not configured", async () => {
    const { initiateAccountDeletion, requestPasswordReset } = await import(
      "./actions"
    );
    const formData = new FormData();
    formData.set("email", "ana@example.com");

    authServer.getSession.mockResolvedValue({
      user: {
        email: "ana@example.com",
        name: "Ana",
      },
    });
    authServer.auth.api.requestPasswordReset.mockRejectedValue(
      new Error(
        "Password reset email delivery is not configured for production.",
      ),
    );
    authServer.auth.api.deleteUser.mockRejectedValue(
      new Error(
        "Account deletion verification email delivery is not configured for production.",
      ),
    );

    await expect(requestPasswordReset(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/?auth=password-reset-integration-needed#auth",
    );
    await expect(initiateAccountDeletion()).rejects.toThrow(
      "NEXT_REDIRECT:/?auth=account-deletion-integration-needed#auth",
    );
  });

  it("redirects to sent status when Better Auth accepts a password reset request", async () => {
    const { requestPasswordReset } = await import("./actions");
    const formData = new FormData();
    formData.set("email", "ANA@EXAMPLE.COM");
    authServer.auth.api.requestPasswordReset.mockResolvedValue({
      message:
        "If this email exists in our system, check your email for the reset link",
      status: true,
    });

    await expect(requestPasswordReset(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/?auth=password-reset-sent#auth",
    );
    expect(authServer.auth.api.requestPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          email: "ana@example.com",
          redirectTo: "/",
        },
      }),
    );
  });

  it("uses a safe returnTo as the email sign-in callback URL and final redirect", async () => {
    const { signInWithEmail } = await import("./actions");
    const formData = new FormData();
    formData.set("email", "ANA@EXAMPLE.COM");
    formData.set("password", "password123");
    formData.set(
      "returnTo",
      "/reportes/encontrados/11111111-1111-4111-8111-111111111111",
    );
    authServer.auth.api.signInEmail.mockResolvedValue({
      user: {
        id: "member-ana",
      },
    });

    await expect(signInWithEmail(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/reportes/encontrados/11111111-1111-4111-8111-111111111111",
    );
    expect(authServer.auth.api.signInEmail).toHaveBeenCalledWith({
      body: {
        callbackURL:
          "/reportes/encontrados/11111111-1111-4111-8111-111111111111",
        email: "ana@example.com",
        password: "password123",
      },
    });
  });

  it("strips unsafe returnTo values before email sign-in callbacks", async () => {
    const { signInWithEmail } = await import("./actions");
    const formData = new FormData();
    formData.set("email", "ana@example.com");
    formData.set("password", "password123");
    formData.set("returnTo", "https://evil.example/reportes/perdidos/1");
    authServer.auth.api.signInEmail.mockResolvedValue({
      user: {
        id: "member-ana",
      },
    });

    await expect(signInWithEmail(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/?auth=signin-success#auth",
    );
    expect(authServer.auth.api.signInEmail).toHaveBeenCalledWith({
      body: {
        callbackURL: "/",
        email: "ana@example.com",
        password: "password123",
      },
    });
  });

  it("uses a safe returnTo as the social sign-in callback URL", async () => {
    const { signInWithSocialProvider } = await import("./actions");
    const formData = new FormData();
    formData.set("provider", "google");
    formData.set(
      "returnTo",
      "/reportes/avistamientos/11111111-1111-4111-8111-111111111111",
    );
    authServer.getEnabledSocialAuthProviders.mockReturnValue(["google"]);
    authServer.auth.api.signInSocial.mockResolvedValue({
      url: "https://accounts.google.test/oauth",
    });

    await expect(signInWithSocialProvider(formData)).rejects.toThrow(
      "NEXT_REDIRECT:https://accounts.google.test/oauth",
    );
    expect(authServer.auth.api.signInSocial).toHaveBeenCalledWith({
      body: {
        callbackURL:
          "/reportes/avistamientos/11111111-1111-4111-8111-111111111111",
        provider: "google",
      },
    });
  });
});
