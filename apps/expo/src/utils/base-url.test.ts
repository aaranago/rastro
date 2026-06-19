import { beforeEach, describe, expect, it, vi } from "vitest";

import { getBaseUrl } from "./base-url";

const expoConstants = vi.hoisted(() => ({
  expoConfig: undefined as
    | {
        extra?: Record<string, unknown>;
        hostUri?: string;
      }
    | undefined,
}));

vi.mock("expo-constants", () => ({
  default: expoConstants,
}));

describe("Expo API base URL resolution", () => {
  beforeEach(() => {
    expoConstants.expoConfig = undefined;
  });

  it("uses the explicit Expo public API base URL before the host fallback", () => {
    expoConstants.expoConfig = {
      extra: {
        apiBaseUrl: "https://api.rastro.bo",
      },
      hostUri: "192.168.1.10:8081",
    };

    expect(getBaseUrl()).toBe("https://api.rastro.bo");
  });

  it("falls back to the Expo host for local development", () => {
    expoConstants.expoConfig = {
      hostUri: "192.168.1.10:8081",
    };

    expect(getBaseUrl()).toBe("http://192.168.1.10:3000");
  });

  it("throws a configuration error when no explicit URL or Expo host is available", () => {
    expoConstants.expoConfig = {
      extra: {},
    };

    expect(() => getBaseUrl()).toThrowError(
      "Missing Expo API base URL. Set EXPO_PUBLIC_API_BASE_URL for release-like builds or run Expo with a development host URI.",
    );
  });
});
