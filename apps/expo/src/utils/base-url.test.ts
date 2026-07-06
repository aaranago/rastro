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
const reactNative = vi.hoisted(() => ({
  Platform: {
    OS: "android" as "android" | "ios" | "web",
  },
}));

vi.mock("expo-constants", () => ({
  default: expoConstants,
}));
vi.mock("react-native", () => reactNative);

describe("Expo API base URL resolution", () => {
  beforeEach(() => {
    delete (globalThis as { __DEV__?: boolean }).__DEV__;
    expoConstants.expoConfig = undefined;
    reactNative.Platform.OS = "android";
  });

  it("uses the Android emulator host before an env-file tunnel during local development", () => {
    expoConstants.expoConfig = {
      extra: {
        apiBaseUrl: "https://offline-rastro-tunnel.ngrok-free.dev",
        apiBaseUrlSource: "env-file",
      },
      hostUri: "localhost:8081",
    };

    expect(getBaseUrl()).toBe("http://10.0.2.2:3000");
  });

  it("uses the Expo LAN host before an env-file tunnel during local development", () => {
    expoConstants.expoConfig = {
      extra: {
        apiBaseUrl: "https://offline-rastro-tunnel.ngrok-free.dev",
        apiBaseUrlSource: "env-file",
      },
      hostUri: "192.168.1.10:8081",
    };

    expect(getBaseUrl()).toBe("http://192.168.1.10:3000");
  });

  it("uses a process-provided explicit API base URL even when Metro has a host", () => {
    expoConstants.expoConfig = {
      extra: {
        apiBaseUrl: "https://intentional-rastro-tunnel.ngrok-free.dev",
        apiBaseUrlSource: "process",
      },
      hostUri: "localhost:8081",
    };

    expect(getBaseUrl()).toBe(
      "https://intentional-rastro-tunnel.ngrok-free.dev",
    );
  });

  it("uses unknown explicit API base config before the local development host", () => {
    expoConstants.expoConfig = {
      extra: {
        apiBaseUrl: "https://api.rastro.bo",
      },
      hostUri: "localhost:8081",
    };

    expect(getBaseUrl()).toBe("https://api.rastro.bo");
  });

  it("uses an env-file API base URL when no local development host is available", () => {
    expoConstants.expoConfig = {
      extra: {
        apiBaseUrl: "https://api.rastro.bo",
        apiBaseUrlSource: "env-file",
      },
    };

    expect(getBaseUrl()).toBe("https://api.rastro.bo");
  });

  it("uses the Android emulator host before an env-file tunnel when development host metadata is missing", () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    expoConstants.expoConfig = {
      extra: {
        apiBaseUrl: "https://offline-rastro-tunnel.ngrok-free.dev",
        apiBaseUrlSource: "env-file",
      },
    };

    expect(getBaseUrl()).toBe("http://10.0.2.2:3000");
  });

  it("uses the explicit Expo public API base URL for release-like builds", () => {
    expoConstants.expoConfig = {
      extra: {
        apiBaseUrl: "https://api.rastro.bo",
      },
    };

    expect(getBaseUrl()).toBe("https://api.rastro.bo");
  });

  it("falls back to the Expo host for local development", () => {
    expoConstants.expoConfig = {
      hostUri: "localhost:8081",
    };

    expect(getBaseUrl()).toBe("http://10.0.2.2:3000");
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
