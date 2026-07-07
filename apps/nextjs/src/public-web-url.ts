import { env } from "~/env";
import { publicWebBaseUrl } from "~/public-report-detail-mapping";

export interface PublicWebRuntimeEnv {
  NODE_ENV?: "development" | "production" | "test";
  VERCEL_ENV?: "development" | "preview" | "production";
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
}

const localPublicWebBaseUrl = "http://localhost:3000";

export function resolveCanonicalPublicWebBaseUrl(
  runtimeEnv: PublicWebRuntimeEnv = env,
) {
  return (
    toHttpsOrigin(runtimeEnv.VERCEL_PROJECT_PRODUCTION_URL) ?? publicWebBaseUrl
  );
}

export function resolvePublicMetadataBaseUrl(
  runtimeEnv: PublicWebRuntimeEnv = env,
) {
  if (
    runtimeEnv.VERCEL_ENV === "production" ||
    runtimeEnv.NODE_ENV === "production"
  ) {
    return resolveCanonicalPublicWebBaseUrl(runtimeEnv);
  }

  if (runtimeEnv.VERCEL_ENV === "preview") {
    return (
      toHttpsOrigin(runtimeEnv.VERCEL_URL) ??
      resolveCanonicalPublicWebBaseUrl(runtimeEnv)
    );
  }

  return localPublicWebBaseUrl;
}

export function getCanonicalPublicWebBaseUrl() {
  return resolveCanonicalPublicWebBaseUrl();
}

export function getPublicMetadataBaseUrl() {
  return resolvePublicMetadataBaseUrl();
}

export function toCanonicalPublicUrl(path: string) {
  return new URL(path, `${getCanonicalPublicWebBaseUrl()}/`).toString();
}

function toHttpsOrigin(value: string | undefined) {
  const host = value
    ?.trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

  return host ? `https://${host}` : undefined;
}
