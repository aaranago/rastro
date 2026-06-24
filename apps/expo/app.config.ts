import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import type { ConfigContext, ExpoConfig } from "expo/config";

const defaultEasProjectId = "ba6b6ed0-beb7-429a-9410-19dc361607f3";
const defaultLocationWhenInUsePermission =
  "Rastro usa tu ubicacion mientras usas la app para actualizar tu area de alertas y mostrar reportes cercanos.";
const defaultPhotosPermission =
  "Rastro usa tus fotos para adjuntarlas a reportes de mascotas.";
const defaultCameraPermission =
  "Rastro usa la camara para tomar fotos de reportes de mascotas.";
const defaultSocialAuthProviders = "google,facebook";

loadExpoEnvFilesFromRepoRoot();

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiBaseUrl = readOptionalUrlEnv("EXPO_PUBLIC_API_BASE_URL");
  const easProjectId =
    readOptionalEnv("EXPO_PUBLIC_EAS_PROJECT_ID") ?? defaultEasProjectId;
  const easConfig = isRecord(config.extra?.eas) ? config.extra.eas : {};
  const authConfig = isRecord(config.extra?.auth) ? config.extra.auth : {};
  const socialAuthProviders =
    readOptionalEnv("EXPO_PUBLIC_AUTH_SOCIAL_PROVIDERS") ??
    defaultSocialAuthProviders;
  const androidGoogleMapsApiKey = readOptionalEnv(
    "EXPO_ANDROID_GOOGLE_MAPS_API_KEY",
  );
  const iosGoogleMapsApiKey = readOptionalEnv("EXPO_IOS_GOOGLE_MAPS_API_KEY");
  const locationWhenInUsePermission =
    readOptionalEnv("EXPO_LOCATION_WHEN_IN_USE_PERMISSION") ??
    defaultLocationWhenInUsePermission;
  const photosPermission =
    readOptionalEnv("EXPO_IMAGE_PICKER_PHOTOS_PERMISSION") ??
    defaultPhotosPermission;
  const cameraPermission =
    readOptionalEnv("EXPO_IMAGE_PICKER_CAMERA_PERMISSION") ??
    defaultCameraPermission;
  const androidConfig = isRecord(config.android?.config)
    ? config.android.config
    : {};
  const androidGoogleMapsConfig = isRecord(androidConfig.googleMaps)
    ? androidConfig.googleMaps
    : {};
  const iosConfig = isRecord(config.ios?.config) ? config.ios.config : {};

  return {
    ...config,
    name: "Rastro",
    slug: "rastro",
    scheme: "rastro",
    version: "0.1.0",
    orientation: "portrait",
    icon: "./assets/icon-light.png",
    userInterfaceStyle: "automatic",
    updates: {
      fallbackToCacheTimeout: 0,
    },
    newArchEnabled: true,
    assetBundlePatterns: ["**/*"],
    ios: {
      bundleIdentifier: "bo.rastro.app",
      supportsTablet: true,
      icon: {
        light: "./assets/icon-light.png",
        dark: "./assets/icon-dark.png",
      },
      ...(iosGoogleMapsApiKey
        ? {
            config: {
              ...iosConfig,
              googleMapsApiKey: iosGoogleMapsApiKey,
            },
          }
        : {}),
    },
    android: {
      package: "bo.rastro.app",
      adaptiveIcon: {
        foregroundImage: "./assets/icon-light.png",
        backgroundColor: "#1F104A",
      },
      edgeToEdgeEnabled: true,
      ...(androidGoogleMapsApiKey
        ? {
            config: {
              ...androidConfig,
              googleMaps: {
                ...androidGoogleMapsConfig,
                apiKey: androidGoogleMapsApiKey,
              },
            },
          }
        : {}),
    },
    extra: {
      ...config.extra,
      eas: {
        ...easConfig,
        projectId: easProjectId,
      },
      auth: {
        ...authConfig,
        socialProviders: socialAuthProviders,
      },
      ...(apiBaseUrl ? { apiBaseUrl } : {}),
      maps: {
        ...(isRecord(config.extra?.maps) ? config.extra.maps : {}),
        androidGoogleMapsConfigured: Boolean(androidGoogleMapsApiKey),
        iosGoogleMapsConfigured: Boolean(iosGoogleMapsApiKey),
      },
    },
    experiments: {
      autolinkingModuleResolution: true,
      tsconfigPaths: true,
      typedRoutes: true,
      reactCompiler: true,
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-web-browser",
      [
        "expo-location",
        {
          locationWhenInUsePermission,
        },
      ],
      [
        "expo-image-picker",
        {
          cameraPermission,
          microphonePermission: false,
          photosPermission,
        },
      ],
      "expo-font",
      "expo-notifications",
      "@react-native-community/datetimepicker",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#E4E4E7",
          image: "./assets/icon-light.png",
          dark: {
            backgroundColor: "#18181B",
            image: "./assets/icon-dark.png",
          },
        },
      ],
    ],
  };
};

export function loadExpoEnvFilesFromRepoRoot(
  repoRoot = join(__dirname, "..", ".."),
): void {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = join(repoRoot, fileName);

    if (existsSync(envPath)) {
      const env = parseEnv(readFileSync(envPath, "utf8"));

      for (const [name, value] of Object.entries(env)) {
        if (!name.startsWith("EXPO_") || process.env[name] !== undefined) {
          continue;
        }

        process.env[name] = value;
      }
    }
  }
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();

  return value ? value : undefined;
}

function readOptionalUrlEnv(name: string): string | undefined {
  const value = readOptionalEnv(name);

  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("URL must use http or https.");
    }
  } catch {
    throw new Error(`${name} must be an absolute http(s) URL.`);
  }

  return value.replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
