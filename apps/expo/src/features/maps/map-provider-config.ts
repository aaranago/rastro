import type { ReportMapProviderState } from "./report-map";
import Constants from "expo-constants";
import { Platform } from "react-native";

export function getNativeMapProviderState(): ReportMapProviderState {
  const mapsConfig = getMapsConfig();

  if (
    Platform.OS === "android" &&
    mapsConfig?.androidGoogleMapsConfigured === false
  ) {
    return {
      kind: "error",
      message:
        "Este build no tiene Google Maps configurado. Puedes elegir por ciudad o departamento mientras se actualiza el mapa.",
    };
  }

  if (
    Platform.OS === "ios" &&
    mapsConfig?.iosGoogleMapsConfigured === false
  ) {
    return {
      kind: "error",
      message:
        "Este build no tiene Google Maps configurado. Puedes elegir por ciudad o departamento mientras se actualiza el mapa.",
    };
  }

  return { kind: "ready" };
}

function getMapsConfig():
  | {
      androidGoogleMapsConfigured?: unknown;
      iosGoogleMapsConfigured?: unknown;
    }
  | undefined {
  const extra = Constants.expoConfig?.extra as unknown;

  if (!isRecord(extra)) {
    return undefined;
  }

  const mapsConfig = extra.maps;

  return isRecord(mapsConfig) ? mapsConfig : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
