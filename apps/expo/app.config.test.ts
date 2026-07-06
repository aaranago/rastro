import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ConfigContext, ExpoConfig } from "expo/config";
import { describe, expect, it } from "vitest";

import createExpoConfig, { loadExpoEnvFilesFromRepoRoot } from "./app.config";

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
          "Rastro usa la cámara para tomar fotos de reportes de mascotas.",
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

  it("loads only Expo-facing keys from repo-root env files", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "rastro-expo-env-"));

    writeFileSync(
      join(repoRoot, ".env"),
      [
        'CI=""',
        'PORT="3000"',
        'EXPO_PUBLIC_API_BASE_URL="http://127.0.0.1:3000"',
        'EXPO_PUBLIC_EAS_PROJECT_ID="from-env-file"',
      ].join("\n"),
    );

    withEnvSnapshot(
      ["CI", "PORT", "EXPO_PUBLIC_API_BASE_URL", "EXPO_PUBLIC_EAS_PROJECT_ID"],
      () => {
        delete process.env.CI;
        delete process.env.PORT;
        delete process.env.EXPO_PUBLIC_API_BASE_URL;
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID = "from-shell";

        loadExpoEnvFilesFromRepoRoot(repoRoot);
        const config = createExpoConfig({
          config: {} as ExpoConfig,
        } as ConfigContext);

        expect(process.env.CI).toBeUndefined();
        expect(process.env.PORT).toBeUndefined();
        expect(process.env.EXPO_PUBLIC_API_BASE_URL).toBe(
          "http://127.0.0.1:3000",
        );
        expect(process.env.EXPO_PUBLIC_EAS_PROJECT_ID).toBe("from-shell");
        expect(config.extra?.apiBaseUrl).toBe("http://127.0.0.1:3000");
        expect(config.extra?.apiBaseUrlSource).toBe("env-file");
      },
      () => {
        rmSync(repoRoot, { force: true, recursive: true });
      },
    );
  });

  it("marks preloaded API base URLs that match repo env files as env-file config", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "rastro-expo-env-"));

    writeFileSync(
      join(repoRoot, ".env"),
      'EXPO_PUBLIC_API_BASE_URL="http://preloaded-env-file.example.test:3000"\n',
    );

    withEnvSnapshot(
      ["EXPO_PUBLIC_API_BASE_URL"],
      () => {
        process.env.EXPO_PUBLIC_API_BASE_URL =
          "http://preloaded-env-file.example.test:3000";

        loadExpoEnvFilesFromRepoRoot(repoRoot);
        const config = createExpoConfig({
          config: {} as ExpoConfig,
        } as ConfigContext);

        expect(config.extra?.apiBaseUrl).toBe(
          "http://preloaded-env-file.example.test:3000",
        );
        expect(config.extra?.apiBaseUrlSource).toBe("env-file");
      },
      () => {
        rmSync(repoRoot, { force: true, recursive: true });
      },
    );
  });

  it("marks shell-provided API base URLs that differ from repo env files as explicit process config", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "rastro-expo-env-"));

    writeFileSync(
      join(repoRoot, ".env"),
      'EXPO_PUBLIC_API_BASE_URL="http://127.0.0.1:3000"\n',
    );

    withEnvSnapshot(
      ["EXPO_PUBLIC_API_BASE_URL"],
      () => {
        process.env.EXPO_PUBLIC_API_BASE_URL =
          "https://shell-runtime.example.test";

        loadExpoEnvFilesFromRepoRoot(repoRoot);

        const config = createExpoConfig({
          config: {} as ExpoConfig,
        } as ConfigContext);

        expect(config.extra?.apiBaseUrl).toBe(
          "https://shell-runtime.example.test",
        );
        expect(config.extra?.apiBaseUrlSource).toBe("process");
      },
      () => {
        rmSync(repoRoot, { force: true, recursive: true });
      },
    );
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

function withEnvSnapshot(
  names: string[],
  run: () => void,
  cleanup?: () => void,
) {
  const previous = new Map(
    names.map((name) => [name, process.env[name]] as const),
  );

  try {
    run();
  } finally {
    cleanup?.();

    for (const [name, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
}
