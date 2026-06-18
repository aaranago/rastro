import { describe, expect, it } from "vitest";

import { createAccountClientAdapter } from "./client";

describe("createAccountClientAdapter", () => {
  it("requests password reset through the Better Auth client with a normalized email", async () => {
    const requests: unknown[] = [];
    const adapter = createAccountClientAdapter({
      deleteUser: () =>
        Promise.resolve({ data: { success: true }, error: null }),
      requestPasswordReset: (input) => {
        requests.push(input);
        return Promise.resolve({ data: { status: true }, error: null });
      },
      signOut: () => Promise.resolve({ data: { success: true }, error: null }),
    });

    await expect(
      adapter.requestPasswordResetForEmail(" ANA@EXAMPLE.COM "),
    ).resolves.toEqual({ ok: true });
    expect(requests).toEqual([{ email: "ana@example.com" }]);
  });

  it("signs out through the Better Auth client", async () => {
    let signedOut = false;
    const adapter = createAccountClientAdapter({
      deleteUser: () =>
        Promise.resolve({ data: { success: true }, error: null }),
      requestPasswordReset: () =>
        Promise.resolve({ data: { status: true }, error: null }),
      signOut: () => {
        signedOut = true;
        return Promise.resolve({ data: { success: true }, error: null });
      },
    });

    await expect(adapter.signOut()).resolves.toEqual({ ok: true });
    expect(signedOut).toBe(true);
  });

  it("initiates account deletion through the Better Auth client", async () => {
    const requests: unknown[] = [];
    const adapter = createAccountClientAdapter({
      deleteUser: (input) => {
        requests.push(input);
        return Promise.resolve({ data: { success: true }, error: null });
      },
      requestPasswordReset: () =>
        Promise.resolve({ data: { status: true }, error: null }),
      signOut: () => Promise.resolve({ data: { success: true }, error: null }),
    });

    await expect(
      adapter.initiateAccountDeletion({
        callbackURL: "rastro://account-deleted",
      }),
    ).resolves.toEqual({ ok: true });
    expect(requests).toEqual([{ callbackURL: "rastro://account-deleted" }]);
  });
});
