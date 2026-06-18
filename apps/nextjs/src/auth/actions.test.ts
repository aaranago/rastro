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
  getEnabledSocialAuthProviders: vi.fn(() => []),
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
});
