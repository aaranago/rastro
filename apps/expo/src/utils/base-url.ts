import Constants from "expo-constants";

/**
 * Resolve the API origin used by the Expo tRPC and Better Auth clients.
 * Release-like builds should set EXPO_PUBLIC_API_BASE_URL through app config;
 * local Expo development can fall back to the Metro host.
 */
export const getBaseUrl = () => {
  const explicitBaseUrl = getExplicitBaseUrl();

  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(":")[0];

  if (!localhost) {
    throw new Error(
      "Missing Expo API base URL. Set EXPO_PUBLIC_API_BASE_URL for release-like builds or run Expo with a development host URI.",
    );
  }
  return `http://${localhost}:3000`;
};

function getExplicitBaseUrl(): string | undefined {
  const extra = Constants.expoConfig?.extra;

  if (!isRecord(extra)) {
    return undefined;
  }

  const apiBaseUrl = extra.apiBaseUrl;

  if (typeof apiBaseUrl !== "string" || apiBaseUrl.trim() === "") {
    return undefined;
  }

  return apiBaseUrl;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
