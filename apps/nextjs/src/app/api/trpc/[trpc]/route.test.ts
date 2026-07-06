import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchAdapter = vi.hoisted(() => ({
  fetchRequestHandler: vi.fn(),
}));
const api = vi.hoisted(() => ({
  appRouter: { router: true },
  createTRPCContext: vi.fn(),
}));
const authServer = vi.hoisted(() => ({
  auth: { auth: true },
}));
const nextEnv = vi.hoisted(() => ({
  env: {
    BETTER_AUTH_URL: undefined as string | undefined,
    RASTRO_ADMIN_EMAILS: "",
    VERCEL_PROJECT_PRODUCTION_URL: undefined as string | undefined,
    VERCEL_URL: undefined as string | undefined,
  },
}));

vi.mock("@trpc/server/adapters/fetch", () => fetchAdapter);
vi.mock("@acme/api", () => api);
vi.mock("~/auth/server", () => authServer);
vi.mock("~/env", () => nextEnv);

function nextRequest(url: string, init?: RequestInit) {
  const request = new Request(url, init) as NextRequest;

  Object.defineProperty(request, "nextUrl", {
    value: new URL(url),
  });

  return request;
}

describe("tRPC API route CORS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nextEnv.env.BETTER_AUTH_URL = undefined;
    nextEnv.env.RASTRO_ADMIN_EMAILS = "";
    nextEnv.env.VERCEL_PROJECT_PRODUCTION_URL = undefined;
    nextEnv.env.VERCEL_URL = undefined;
  });

  it("allows same-origin preflight without wildcard CORS", async () => {
    const { OPTIONS } = await import("./route");

    const response = OPTIONS(
      nextRequest("http://localhost:3000/api/trpc/report.nearby", {
        headers: {
          origin: "http://localhost:3000",
        },
        method: "OPTIONS",
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3000",
    );
    expect(response.headers.get("access-control-allow-origin")).not.toBe("*");
    expect(response.headers.get("vary")).toContain("Origin");
  });

  it("rejects untrusted browser origins before invoking tRPC", async () => {
    fetchAdapter.fetchRequestHandler.mockResolvedValue(new Response("ok"));
    const { POST } = await import("./route");

    const response = await POST(
      nextRequest("http://localhost:3000/api/trpc/report.nearby", {
        headers: {
          origin: "https://evil.example",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(403);
    expect(fetchAdapter.fetchRequestHandler).not.toHaveBeenCalled();
  });

  it("allows configured production origins and applies CORS to tRPC responses", async () => {
    nextEnv.env.BETTER_AUTH_URL = "https://app.rastro.bo";
    nextEnv.env.RASTRO_ADMIN_EMAILS = "admin@rastro.bo";
    fetchAdapter.fetchRequestHandler.mockResolvedValue(
      Response.json({ ok: true }),
    );
    const { GET } = await import("./route");

    const response = await GET(
      nextRequest("http://localhost:3000/api/trpc/report.nearby", {
        headers: {
          origin: "https://app.rastro.bo",
        },
        method: "GET",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://app.rastro.bo",
    );
    expect(response.headers.get("access-control-allow-credentials")).toBe(
      "true",
    );
    expect(fetchAdapter.fetchRequestHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "/api/trpc",
        router: api.appRouter,
      }),
    );
  });
});
