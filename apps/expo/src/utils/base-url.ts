import { Platform } from "react-native";
import Constants from "expo-constants";

interface ExplicitBaseUrl {
  source: "env-file" | "process" | "unknown";
  url: string;
}

/**
 * Resolve the API origin used by the Expo tRPC and Better Auth clients.
 * Local Expo development follows the Metro host so Android reaches the
 * same root dev stack. Release-like builds should set
 * EXPO_PUBLIC_API_BASE_URL through app config.
 */
export const getBaseUrl = () => {
  const explicitBaseUrl = getExplicitBaseUrl();
  const localDevelopmentBaseUrl = getLocalDevelopmentBaseUrl();

  if (
    localDevelopmentBaseUrl &&
    shouldUseLocalDevelopmentBaseUrl(explicitBaseUrl)
  ) {
    return localDevelopmentBaseUrl;
  }

  if (explicitBaseUrl) {
    return explicitBaseUrl.url;
  }

  if (localDevelopmentBaseUrl) {
    return localDevelopmentBaseUrl;
  }

  throw new Error(
    "Missing Expo API base URL. Set EXPO_PUBLIC_API_BASE_URL for release-like builds or run Expo with a development host URI.",
  );
};

function getExplicitBaseUrl(): ExplicitBaseUrl | undefined {
  const extra = Constants.expoConfig?.extra;

  if (!isRecord(extra)) {
    return undefined;
  }

  const apiBaseUrl = extra.apiBaseUrl;

  if (typeof apiBaseUrl !== "string" || apiBaseUrl.trim() === "") {
    return undefined;
  }

  const apiBaseUrlSource = extra.apiBaseUrlSource;

  return {
    source:
      apiBaseUrlSource === "env-file" || apiBaseUrlSource === "process"
        ? apiBaseUrlSource
        : "unknown",
    url: apiBaseUrl,
  };
}

function getLocalDevelopmentBaseUrl(): string | undefined {
  const host =
    getHostFromHostUri(Constants.expoConfig?.hostUri) ??
    getFallbackDevelopmentHost();

  return host ? `http://${getDeviceReachableHost(host)}:3000` : undefined;
}

function shouldUseLocalDevelopmentBaseUrl(
  explicitBaseUrl: ExplicitBaseUrl | undefined,
) {
  return !explicitBaseUrl || explicitBaseUrl.source === "env-file";
}

function getHostFromHostUri(hostUri: unknown): string | undefined {
  if (typeof hostUri !== "string" || hostUri.trim() === "") {
    return undefined;
  }

  const trimmedHostUri = hostUri.trim();
  const hostUriWithProtocol = trimmedHostUri.includes("://")
    ? trimmedHostUri
    : `http://${trimmedHostUri}`;

  try {
    return new URL(hostUriWithProtocol).hostname;
  } catch {
    return trimmedHostUri.split(":")[0] ?? undefined;
  }
}

function getFallbackDevelopmentHost(): string | undefined {
  return isDevelopmentRuntime() ? "localhost" : undefined;
}

function isDevelopmentRuntime() {
  const developmentFlag = (globalThis as { __DEV__?: unknown }).__DEV__;

  return developmentFlag === true;
}

function getDeviceReachableHost(host: string): string {
  const normalizedHost = host.toLowerCase();

  if (
    Platform.OS === "android" &&
    (normalizedHost === "localhost" ||
      normalizedHost === "127.0.0.1" ||
      normalizedHost === "0.0.0.0" ||
      normalizedHost === "::1" ||
      normalizedHost === "[::1]")
  ) {
    return "10.0.2.2";
  }

  return host;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
