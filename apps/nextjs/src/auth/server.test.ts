import { beforeEach, describe, expect, it, vi } from "vitest";

const dbClient = vi.hoisted(() => ({
  db: {
    id: "test-db",
  },
}));

const authPackage = vi.hoisted(() => {
  interface CapturedInitAuthOptions {
    accountDeletion?: {
      cleanup?: unknown;
    };
    database?: unknown;
  }

  const authInstance = {
    api: {
      getSession: vi.fn(),
    },
  };
  const cleanupBoundary = {
    removeUnsafePublicContactData: vi.fn(),
  };
  const authDatabase = {
    id: "auth-db",
  };
  const capturedInitAuthOptions: CapturedInitAuthOptions[] = [];

  return {
    authDatabase,
    authInstance,
    capturedInitAuthOptions,
    cleanupBoundary,
    createDrizzleAccountDeletionCleanup: vi.fn(() => cleanupBoundary),
    createDrizzleAuthDatabase: vi.fn(() => authDatabase),
    initAuth: vi.fn((options: CapturedInitAuthOptions) => {
      capturedInitAuthOptions.push(options);
      return authInstance;
    }),
  };
});

const nextCookiesPlugin = vi.hoisted(() => ({
  nextCookies: vi.fn(() => ({ id: "next-cookies" })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@acme/db/client", () => dbClient);
vi.mock("@acme/auth", () => authPackage);
vi.mock("better-auth/next-js", () => nextCookiesPlugin);
vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));
vi.mock("~/env", () => ({
  env: {
    AUTH_APPLE_APP_BUNDLE_IDENTIFIER: undefined,
    AUTH_APPLE_CLIENT_ID: undefined,
    AUTH_APPLE_CLIENT_SECRET: undefined,
    AUTH_FACEBOOK_ID: undefined,
    AUTH_FACEBOOK_SECRET: undefined,
    AUTH_GOOGLE_ID: undefined,
    AUTH_GOOGLE_SECRET: undefined,
    AUTH_REQUIRE_EMAIL_VERIFICATION: false,
    AUTH_SECRET: "test-secret",
    BETTER_AUTH_URL: "http://localhost:3000",
    NODE_ENV: "test",
    RASTRO_AUTH_EMAIL_FROM: undefined,
    RASTRO_AUTH_EMAIL_WEBHOOK_SECRET: undefined,
    RASTRO_AUTH_EMAIL_WEBHOOK_URL: undefined,
    VERCEL_ENV: undefined,
    VERCEL_PROJECT_PRODUCTION_URL: undefined,
    VERCEL_URL: undefined,
  },
}));

describe("auth server", () => {
  beforeEach(() => {
    vi.resetModules();
    authPackage.createDrizzleAccountDeletionCleanup.mockClear();
    authPackage.createDrizzleAuthDatabase.mockClear();
    authPackage.initAuth.mockClear();
    authPackage.capturedInitAuthOptions.length = 0;
    nextCookiesPlugin.nextCookies.mockClear();
  });

  it("wires account deletion through the real Drizzle cleanup boundary", async () => {
    const server = await import("./server");

    expect(
      authPackage.createDrizzleAccountDeletionCleanup,
    ).toHaveBeenCalledWith(dbClient.db);
    expect(authPackage.createDrizzleAuthDatabase).toHaveBeenCalledWith(
      dbClient.db,
    );
    expect(authPackage.initAuth).toHaveBeenCalledTimes(1);
    expect(
      authPackage.capturedInitAuthOptions[0]?.accountDeletion?.cleanup,
    ).toBe(authPackage.cleanupBoundary);
    expect(authPackage.capturedInitAuthOptions[0]?.database).toBe(
      authPackage.authDatabase,
    );
    expect(server.auth).toBe(authPackage.authInstance);
  });
});
