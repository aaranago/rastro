import { beforeEach, describe, expect, it, vi } from "vitest";

import { getNativeMapProviderState } from "./map-provider-config";

const nativeState = vi.hoisted(() => ({
  extra: {} as Record<string, unknown>,
  os: "android",
}));

vi.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      get extra() {
        return nativeState.extra;
      },
    },
  },
}));

vi.mock("react-native", () => ({
  Platform: {
    get OS() {
      return nativeState.os;
    },
  },
}));

vi.mock("react-native-maps", () => ({
  PROVIDER_GOOGLE: "google",
}));

describe("getNativeMapProviderState", () => {
  beforeEach(() => {
    nativeState.extra = {};
    nativeState.os = "android";
  });

  it("keeps native maps ready when the JS manifest does not expose map config", () => {
    expect(getNativeMapProviderState()).toEqual({ kind: "ready" });
  });

  it("surfaces a fallback when the Android build lacks a Google Maps key", () => {
    nativeState.extra = {
      maps: {
        androidGoogleMapsConfigured: false,
        iosGoogleMapsConfigured: true,
      },
    };

    expect(getNativeMapProviderState()).toEqual({
      kind: "error",
      message:
        "Este build no tiene Google Maps configurado. Puedes elegir por ciudad o departamento mientras se actualiza el mapa.",
    });
  });

  it("uses the current platform before deciding an Android map key is missing", () => {
    nativeState.extra = {
      maps: {
        androidGoogleMapsConfigured: false,
        iosGoogleMapsConfigured: false,
      },
    };
    nativeState.os = "ios";

    expect(getNativeMapProviderState()).toEqual({ kind: "ready" });
  });
});

describe("getNativeMapProvider", () => {
  beforeEach(() => {
    nativeState.extra = {};
    nativeState.os = "android";
  });

  it("uses Google Maps on Android", async () => {
    const { getNativeMapProvider } = await import("./map-provider-config");

    expect(getNativeMapProvider()).toBe("google");
  });

  it("uses Apple Maps on iOS when Google Maps is not configured", async () => {
    const { getNativeMapProvider } = await import("./map-provider-config");

    nativeState.os = "ios";
    nativeState.extra = {
      maps: {
        iosGoogleMapsConfigured: false,
      },
    };

    expect(getNativeMapProvider()).toBeUndefined();
  });

  it("uses Google Maps on iOS only when explicitly configured", async () => {
    const { getNativeMapProvider } = await import("./map-provider-config");

    nativeState.os = "ios";
    nativeState.extra = {
      maps: {
        iosGoogleMapsConfigured: true,
      },
    };

    expect(getNativeMapProvider()).toBe("google");
  });
});
