import { describe, expect, it, vi } from "vitest";

import type { AuthDatabase } from "./index";
import {
  createAuthOptions,
  getAccountDeletionPolicy,
  prepareAccountDeletion,
} from "./index";

const testDatabase = (() => {
  throw new Error("Auth database should not be called while building config");
}) satisfies AuthDatabase;

describe("createAuthOptions", () => {
  it("builds the shared Rastro v1 auth configuration", () => {
    const config = createAuthOptions({
      database: testDatabase,
      baseUrl: "http://localhost:3000",
      productionUrl: "https://rastro.bo",
      secret: "test-secret",
      requireEmailVerification: true,
      socialProviders: {
        google: {
          clientId: "google-client-id",
          clientSecret: "google-client-secret",
        },
        facebook: {
          clientId: "facebook-client-id",
          clientSecret: "facebook-client-secret",
        },
        apple: {
          clientId: "apple-client-id",
          clientSecret: "apple-client-secret",
          appBundleIdentifier: "bo.rastro.app",
        },
      },
      trustedOrigins: ["rastro://"],
    });

    expect(config.emailAndPassword).toMatchObject({
      enabled: true,
      requireEmailVerification: true,
    });
    expect(config.socialProviders).toMatchObject({
      google: {
        clientId: "google-client-id",
        clientSecret: "google-client-secret",
        redirectURI: "https://rastro.bo/api/auth/callback/google",
      },
      facebook: {
        clientId: "facebook-client-id",
        clientSecret: "facebook-client-secret",
        redirectURI: "https://rastro.bo/api/auth/callback/facebook",
      },
      apple: {
        clientId: "apple-client-id",
        clientSecret: "apple-client-secret",
        appBundleIdentifier: "bo.rastro.app",
        redirectURI: "https://rastro.bo/api/auth/callback/apple",
      },
    });
    expect(config.socialProviders).not.toHaveProperty("discord");
    expect(config.trustedOrigins).toEqual(
      expect.arrayContaining(["expo://", "rastro://"]),
    );
  });

  it("does not enable social providers with incomplete credentials", () => {
    const config = createAuthOptions({
      database: testDatabase,
      baseUrl: "http://localhost:3000",
      productionUrl: "https://rastro.bo",
      secret: "test-secret",
      socialProviders: {
        google: {
          clientId: "google-client-id",
        },
        facebook: {
          clientSecret: "facebook-client-secret",
        },
      },
    });

    expect(config.socialProviders).not.toHaveProperty("google");
    expect(config.socialProviders).not.toHaveProperty("facebook");
  });

  it("enables email password reset requests when a sender is configured", () => {
    const sendEmail = vi.fn();

    const config = createAuthOptions({
      database: testDatabase,
      baseUrl: "http://localhost:3000",
      productionUrl: "https://rastro.bo",
      secret: "test-secret",
      passwordReset: {
        sendEmail,
        tokenExpiresInSeconds: 30 * 60,
      },
    });

    expect(config.emailAndPassword).toMatchObject({
      enabled: true,
      sendResetPassword: sendEmail,
      resetPasswordTokenExpiresIn: 30 * 60,
    });
  });

  it("runs unsafe public contact cleanup before Better Auth deletes a member", async () => {
    const calls: unknown[] = [];
    const config = createAuthOptions({
      database: testDatabase,
      baseUrl: "http://localhost:3000",
      productionUrl: "https://rastro.bo",
      secret: "test-secret",
      accountDeletion: {
        cleanup: {
          removeUnsafePublicContactData: (input) => {
            calls.push(input);
            return Promise.resolve({
              id: "unsafePublicContactData",
              status: "completed",
            });
          },
        },
      },
    });

    expect(config.user.deleteUser.enabled).toBe(true);
    await expect(
      config.user.deleteUser.beforeDelete(
        {
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          email: "ana@example.com",
          emailVerified: true,
          id: "member_123",
          name: "Ana",
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        undefined,
      ),
    ).resolves.toBeUndefined();
    expect(calls).toEqual([
      {
        memberId: "member_123",
        requirement: getAccountDeletionPolicy().requiredCleanups[0],
      },
    ]);
  });

  it("blocks account deletion when unsafe public contact cleanup fails", async () => {
    const cleanupError = new Error("contact cleanup failed");
    const config = createAuthOptions({
      database: testDatabase,
      baseUrl: "http://localhost:3000",
      productionUrl: "https://rastro.bo",
      secret: "test-secret",
      accountDeletion: {
        cleanup: {
          removeUnsafePublicContactData: () => Promise.reject(cleanupError),
        },
      },
    });

    await expect(
      config.user.deleteUser.beforeDelete(
        {
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          email: "ana@example.com",
          emailVerified: true,
          id: "member_123",
          name: "Ana",
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
        undefined,
      ),
    ).rejects.toThrow(cleanupError);
  });
});

describe("getAccountDeletionPolicy", () => {
  it("explains member deletion consequences and blocks orphaned public contact data", () => {
    const policy = getAccountDeletionPolicy();

    expect(
      policy.consequences.map((consequence) => consequence.resource),
    ).toEqual([
      "petProfiles",
      "reports",
      "listings",
      "chats",
      "publicContent",
      "moderationRecords",
    ]);
    expect(policy.consequences.every((consequence) => consequence.copy)).toBe(
      true,
    );
    expect(policy.requiredCleanups).toContainEqual({
      id: "unsafePublicContactData",
      timing: "beforeAuthUserDelete",
      blocksAccountDeletion: true,
      copy: "Rastro quitara datos publicos de contacto, como telefonos o enlaces de WhatsApp, antes de eliminar la cuenta.",
    });
  });

  it("prepares deletion by clearing unsafe public contact data first", async () => {
    const calls: unknown[] = [];

    await expect(
      prepareAccountDeletion({
        cleanup: {
          removeUnsafePublicContactData: (input) => {
            calls.push(input);
            return Promise.resolve({
              id: "unsafePublicContactData",
              removedRecords: 2,
              status: "completed",
            });
          },
        },
        memberId: "member_123",
      }),
    ).resolves.toEqual({
      cleanups: [
        {
          id: "unsafePublicContactData",
          removedRecords: 2,
          status: "completed",
        },
      ],
      policy: getAccountDeletionPolicy(),
    });
    expect(calls).toEqual([
      {
        memberId: "member_123",
        requirement: getAccountDeletionPolicy().requiredCleanups[0],
      },
    ]);
  });
});
