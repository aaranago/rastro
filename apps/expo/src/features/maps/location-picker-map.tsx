import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import type {
  NearbyCoordinates,
  NearbySearchLocation,
} from "../nearby/nearby-types";
import type { ReportMapProviderState } from "./report-map";

export interface ManualLocationPickerMapProps {
  onCancel?: () => void;
  onConfirm: (location: NearbySearchLocation) => void;
  onSelectedCoordinateChange: (coordinate: NearbyCoordinates) => void;
  providerState?: ReportMapProviderState;
  selectedCoordinate: NearbyCoordinates;
}

export function ManualLocationPickerMap({
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
            accessibilityLabel="Cancelar seleccion de punto"
            accessibilityRole="button"
            onPress={onCancel}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
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
          style={styles.map}
        >
          <Marker
            coordinate={selectedCoordinate}
            draggable
            onDragEnd={(event) =>
              onSelectedCoordinateChange(event.nativeEvent.coordinate)
            }
            title="Punto elegido"
          />
        </MapView>
      </View>
      <View style={styles.summary}>
        <Text selectable style={styles.title}>
          Punto elegido
        </Text>
        <Text selectable style={styles.coordinateText}>
          {selectedLocation.label}
        </Text>
      </View>
      <View style={styles.actions}>
        {onCancel ? (
          <Pressable
            accessibilityLabel="Cancelar seleccion de punto"
            accessibilityRole="button"
            onPress={onCancel}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel="Confirmar punto elegido"
          accessibilityRole="button"
          onPress={() => onConfirm(selectedLocation)}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Confirmar punto</Text>
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
    label: `Pin manual ${formatCoordinate(coordinate.latitude)}, ${formatCoordinate(coordinate.longitude)}`,
    locationCellLabel: "Punto elegido",
    manualLocationKind: "map-pin",
    source: "manual",
  };
}

function formatCoordinate(value: number) {
  return value.toFixed(4);
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
