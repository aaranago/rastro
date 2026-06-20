import { Platform } from "react-native";
import Constants from "expo-constants";

import type { ReportMapProviderState } from "./report-map";

export function getNativeMapProviderState(): ReportMapProviderState {
  const mapsConfig = readMapsExtraConfig();

  if (
    Platform.OS === "android" &&
    mapsConfig.androidGoogleMapsConfigured !== true
  ) {
    return {
      kind: "error",
      message:
        "Configura EXPO_ANDROID_GOOGLE_MAPS_API_KEY para usar el mapa nativo en Android. La lista sigue disponible.",
    };
  }

  return { kind: "ready" };
}

function readMapsExtraConfig() {
  const extra = Constants.expoConfig?.extra;

  if (!isRecord(extra) || !isRecord(extra.maps)) {
    return {};
  }

  return extra.maps;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
