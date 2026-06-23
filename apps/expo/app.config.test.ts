import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ConfigContext, ExpoConfig } from "expo/config";
import { describe, expect, it } from "vitest";

import createExpoConfig from "./app.config";

describe("Expo app config", () => {
  it("declares one preferred application scheme for React Navigation linking", () => {
    const config = createExpoConfig({
      config: {} as ExpoConfig,
    } as ConfigContext);

    expect(config.scheme).toBe("rastro");
    expect(config.android?.package).toBe("bo.rastro.app");
  });

  it("pins social auth providers explicitly for EAS build profiles", () => {
    const easConfig = JSON.parse(
      readFileSync(join(__dirname, "eas.json"), "utf8"),
    ) as {
      build: Record<string, { env?: Record<string, string> }>;
    };

    for (const profile of ["development", "preview", "production"]) {
      expect(
        easConfig.build[profile]?.env?.EXPO_PUBLIC_AUTH_SOCIAL_PROVIDERS,
      ).toBe("google,facebook");
    }
  });

  it("publishes the social auth provider allowlist for documented local dev-client launches", () => {
    const config = createExpoConfig({
      config: {} as ExpoConfig,
    } as ConfigContext);

    expect(config.extra?.auth).toEqual({
      socialProviders: "google,facebook",
    });
  });

  it("configures native image picker permission copy for photos and camera", () => {
    const config = createExpoConfig({
      config: {} as ExpoConfig,
    } as ConfigContext);

    expect(config.plugins).toContainEqual([
      "expo-image-picker",
      {
        cameraPermission:
          "Rastro usa la camara para tomar fotos de reportes de mascotas.",
        microphonePermission: false,
        photosPermission:
          "Rastro usa tus fotos para adjuntarlas a reportes de mascotas.",
      },
    ]);
  });

  it("publishes the Android map-provider readiness flag only when a build-time key is set", () => {
    withEnv("EXPO_ANDROID_GOOGLE_MAPS_API_KEY", undefined, () => {
      const config = createExpoConfig({
        config: {} as ExpoConfig,
      } as ConfigContext);

      expect(config.android?.config).toBeUndefined();
      expect(config.extra?.maps).toEqual({
        androidGoogleMapsConfigured: false,
        iosGoogleMapsConfigured: false,
      });
    });

    withEnv("EXPO_ANDROID_GOOGLE_MAPS_API_KEY", "test-map-key", () => {
      const config = createExpoConfig({
        config: {} as ExpoConfig,
      } as ConfigContext);

      expect(config.android?.config).toEqual({
        googleMaps: {
          apiKey: "test-map-key",
        },
      });
      expect(config.extra?.maps).toEqual({
        androidGoogleMapsConfigured: true,
        iosGoogleMapsConfigured: false,
      });
    });
  });

  it("declares the native font plugin required by Expo vector icons", () => {
    const config = createExpoConfig({
      config: {} as ExpoConfig,
    } as ConfigContext);

    expect(config.plugins).toContain("expo-font");
  });
});

function withEnv(name: string, value: string | undefined, run: () => void) {
  const previous = process.env[name];

  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }

  try {
    run();
  } finally {
    if (previous === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previous;
    }
  }
}
