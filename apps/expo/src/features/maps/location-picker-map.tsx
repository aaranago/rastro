import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import type {
  NearbyCoordinates,
  NearbySearchLocation,
} from "../nearby/nearby-types";
import type { ReportMapProviderState } from "./report-map";

export interface ManualLocationPickerMapProps {
  cancelAccessibilityLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  onConfirm: (location: NearbySearchLocation) => void;
  onSelectedCoordinateChange: (coordinate: NearbyCoordinates) => void;
  providerState?: ReportMapProviderState;
  selectedCoordinate: NearbyCoordinates;
}

export function ManualLocationPickerMap({
  cancelAccessibilityLabel = "Cancelar selección de zona",
  cancelLabel = "Cancelar",
  onCancel,
  onConfirm,
  onSelectedCoordinateChange,
  providerState = { kind: "ready" },
  selectedCoordinate,
}: ManualLocationPickerMapProps) {
  const selectedLocation = toManualMapPinSearchLocation(selectedCoordinate);

  if (providerState.kind === "error") {
    return (
      <View style={styles.container}>
        <View style={styles.providerError}>
          <Text selectable style={styles.title}>
            Mapa no disponible
          </Text>
          <Text selectable style={styles.providerErrorText}>
            {providerState.message}
          </Text>
        </View>
        {onCancel ? (
          <Pressable
            accessibilityLabel={cancelAccessibilityLabel}
            accessibilityRole="button"
            onPress={onCancel}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>{cancelLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapFrame}>
        <MapView
          initialRegion={{
            latitude: selectedCoordinate.latitude,
            latitudeDelta: 0.04,
            longitude: selectedCoordinate.longitude,
            longitudeDelta: 0.04,
          }}
          onPress={(event) =>
            onSelectedCoordinateChange(event.nativeEvent.coordinate)
          }
          provider={PROVIDER_GOOGLE}
          style={styles.map}
        >
          <Marker
            coordinate={selectedCoordinate}
            draggable
            onDragEnd={(event) =>
              onSelectedCoordinateChange(event.nativeEvent.coordinate)
            }
            title="Zona elegida"
          />
        </MapView>
      </View>
      <View style={styles.summary}>
        <Text selectable style={styles.title}>
          Zona elegida en el mapa
        </Text>
        <Text selectable style={styles.coordinateText}>
          Usaremos una zona aproximada cerca del punto que marcaste.
        </Text>
      </View>
      <View style={styles.actions}>
        {onCancel ? (
          <Pressable
            accessibilityLabel={cancelAccessibilityLabel}
            accessibilityRole="button"
            onPress={onCancel}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>{cancelLabel}</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel="Confirmar punto elegido"
          accessibilityRole="button"
          onPress={() => onConfirm(selectedLocation)}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Confirmar zona</Text>
        </Pressable>
      </View>
    </View>
  );
}

function toManualMapPinSearchLocation(
  coordinate: NearbyCoordinates,
): NearbySearchLocation {
  return {
    coordinates: coordinate,
    countryCode: "BO",
    label: "Zona elegida en el mapa",
    locationCellLabel: "Zona elegida",
    manualLocationKind: "map-pin",
    source: "manual",
  };
}

const colors = {
  bg: "#F6FAF7",
  card: "#FFFFFF",
  ink: "#1F2A25",
  inkMuted: "#66736D",
  inkStrong: "#0F7665",
  line: "#D9E6DF",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  container: {
    gap: 12,
    width: "100%",
  },
  coordinateText: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  map: {
    flex: 1,
  },
  mapFrame: {
    aspectRatio: 0.9,
    backgroundColor: colors.bg,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.inkStrong,
    borderRadius: 999,
    flexGrow: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  providerError: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  providerErrorText: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: colors.inkStrong,
    fontSize: 15,
    fontWeight: "900",
  },
  summary: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
  },
});
