import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";
import { join } from "node:path";

import { auth } from "~/auth/server";

const e2eDebugHeaderName = "x-rastro-e2e-auth-debug";
const secureSessionCookieName = "__Secure-better-auth.session_token";

interface E2EAuthDebugPayload {
  cookieNames: string[];
  hasSecureSessionCookie: boolean;
  host: string | null;
  secureSessionTokenPrefix: string | null;
  secureSessionValueLength: number | null;
  secureSessionValueSha256: string | null;
  userAgent: string | null;
}

function getCookieParts(request: Request): string[] {
  return (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function getCookieValue(cookieParts: string[], cookieName: string) {
  return cookieParts
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

function hashCookieValue(cookieValue: string | undefined) {
  return cookieValue
    ? createHash("sha256").update(cookieValue).digest("hex").slice(0, 16)
    : null;
}

function isNonEmptyString(value: string | undefined): value is string {
  return value !== undefined && value.length > 0;
}

function buildE2EAuthDebugPayload(request: Request): E2EAuthDebugPayload {
  const cookieParts = getCookieParts(request);
  const secureSessionCookieValue = getCookieValue(
    cookieParts,
    secureSessionCookieName,
  );

  return {
    cookieNames: cookieParts
      .map((part) => part.split("=")[0])
      .filter(isNonEmptyString),
    hasSecureSessionCookie: secureSessionCookieValue !== undefined,
    host: request.headers.get("host"),
    secureSessionTokenPrefix:
      secureSessionCookieValue?.split(".")[0]?.slice(0, 12) ?? null,
    secureSessionValueLength: secureSessionCookieValue?.length ?? null,
    secureSessionValueSha256: hashCookieValue(secureSessionCookieValue),
    userAgent: request.headers.get("user-agent"),
  };
}

function shouldRecordE2EAuthDebug(request: Request) {
  return (
    process.env.NODE_ENV !== "production" &&
    request.url.includes("/api/auth/get-session") &&
    request.headers.get(e2eDebugHeaderName) === "1"
  );
}

function appendE2EAuthDebugPayload(debugPayload: E2EAuthDebugPayload) {
  try {
    appendFileSync(
      join(process.cwd(), ".next", "rastro-e2e-auth-debug.jsonl"),
      `${JSON.stringify(debugPayload)}\n`,
    );
  } catch {
    // Debug-only best effort.
  }
}

function recordE2EAuthDebug(request: Request) {
  if (!shouldRecordE2EAuthDebug(request)) {
    return;
  }

  const debugPayload = buildE2EAuthDebugPayload(request);
  console.info("[Rastro E2E auth debug]", debugPayload);
  appendE2EAuthDebugPayload(debugPayload);
}

const handler = (request: Request) => {
  recordE2EAuthDebug(request);
  return auth.handler(request);
};

export const GET = handler;
export const POST = handler;
