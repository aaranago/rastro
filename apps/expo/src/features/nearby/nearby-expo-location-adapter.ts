import * as Location from "expo-location";

import type {
  NativeLocationObject,
  NativePermissionResponse,
} from "./nearby-location-adapter";
import { createNearbyLocationAdapter } from "./nearby-location-adapter";

export const expoNearbyLocationAdapter = createNearbyLocationAdapter({
  location: {
    accuracy: {
      balanced: Location.Accuracy.Balanced,
    },
    getCurrentPositionAsync: async (options) =>
      (await Location.getCurrentPositionAsync(
        options as Location.LocationOptions,
      )) as NativeLocationObject,
    getForegroundPermissionsAsync: async () =>
      (await Location.getForegroundPermissionsAsync()) as NativePermissionResponse,
    getLastKnownPositionAsync: async (options) =>
      (await Location.getLastKnownPositionAsync(
        options as Location.LocationLastKnownOptions,
      )) as NativeLocationObject | null,
    requestForegroundPermissionsAsync: async () =>
      (await Location.requestForegroundPermissionsAsync()) as NativePermissionResponse,
  },
});
