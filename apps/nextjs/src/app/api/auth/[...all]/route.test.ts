import { appendFileSync } from "node:fs";

import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({
  handler: vi.fn(() => new Response("ok")),
}));

vi.mock("node:fs", () => ({
  appendFileSync: vi.fn(),
}));

vi.mock("~/auth/server", () => ({
  auth: authMock,
}));

describe("auth API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates GET and POST requests to Better Auth", async () => {
    const route = await import("./route");
    const request = new Request("http://localhost:3000/api/auth/sign-in");

    await route.GET(request);
    await route.POST(request);

    expect(authMock.handler).toHaveBeenCalledTimes(2);
    expect(authMock.handler).toHaveBeenNthCalledWith(1, request);
    expect(authMock.handler).toHaveBeenNthCalledWith(2, request);
  });

  it("records get-session cookie diagnostics only for E2E debug requests", async () => {
    const route = await import("./route");
    const request = new Request("http://localhost:3000/api/auth/get-session", {
      headers: {
        cookie:
          "other=value; __Secure-better-auth.session_token=token.parts.value",
        host: "localhost:3000",
        "user-agent": "vitest",
        "x-rastro-e2e-auth-debug": "1",
      },
    });

    await route.GET(request);

    expect(appendFileSync).toHaveBeenCalledTimes(1);
    const [, debugLine] = vi.mocked(appendFileSync).mock.calls[0] ?? [];
    expect(JSON.parse(String(debugLine))).toMatchObject({
      cookieNames: ["other", "__Secure-better-auth.session_token"],
      hasSecureSessionCookie: true,
      host: "localhost:3000",
      secureSessionTokenPrefix: "token",
      secureSessionValueLength: "token.parts.value".length,
      userAgent: "vitest",
    });
  });
});
