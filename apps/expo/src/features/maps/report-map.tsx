import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

export interface ReportMapCoordinate {
  latitude: number;
  longitude: number;
}

export interface ReportMapPin {
  coordinate: ReportMapCoordinate;
  distanceLabel?: string;
  id: string;
  label: string;
  title: string;
}

export interface ReportMapPreview {
  id: string;
  locationLabel: string;
  metaLabel?: string;
  summary: string;
  title: string;
}

export type ReportMapProviderState =
  | { kind: "ready" }
  | { kind: "loading"; message?: string }
  | { kind: "error"; message: string };

export interface ReportMapSearchOrigin {
  coordinate: ReportMapCoordinate;
  label: string;
}

export interface ReportMapMarkerGroup {
  coordinate: ReportMapCoordinate;
  id: string;
  pins: ReportMapPin[];
  title: string;
}

export interface ReportMapProps {
  cameraCenter?: ReportMapCoordinate;
  currentLocation?: ReportMapSearchOrigin;
  onCameraCenterChange?: (coordinate: ReportMapCoordinate) => void;
  onOpenReport?: (reportId: string) => void;
  onRecenter?: () => void;
  onSelectReport: (reportId: string) => void;
  pins: readonly ReportMapPin[];
  previews: readonly ReportMapPreview[];
  providerState?: ReportMapProviderState;
  selectedReportId?: string;
}

const defaultRegion = {
  latitude: -16.5,
  latitudeDelta: 0.08,
  longitude: -68.1193,
  longitudeDelta: 0.08,
};

export function ReportMap({
  currentLocation,
  cameraCenter,
  onCameraCenterChange,
  onOpenReport,
  onRecenter,
  onSelectReport,
  pins,
  previews,
  providerState = { kind: "ready" },
  selectedReportId,
}: ReportMapProps) {
  const markerGroups = clusterReportMapPins(pins);
  const initialRegion = buildInitialRegion({ currentLocation, pins });
  const controlledRegion = cameraCenter
    ? {
        latitude: cameraCenter.latitude,
        latitudeDelta: defaultRegion.latitudeDelta,
        longitude: cameraCenter.longitude,
        longitudeDelta: defaultRegion.longitudeDelta,
      }
    : undefined;
  const selectedPreview = getSelectedPreview(previews, selectedReportId);

  if (providerState.kind === "error") {
    return (
      <View style={styles.container}>
        <MapStatusPanel
          body={providerState.message}
          title="No pudimos cargar el mapa"
        />
        <ReportMapListAlternative
          onSelectReport={onSelectReport}
          previews={previews}
          selectedReportId={selectedReportId}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapFrame}>
        <MapView
          initialRegion={initialRegion}
          loadingEnabled
          mapPadding={{ bottom: 20, left: 12, right: 12, top: 12 }}
          onRegionChangeComplete={(region) =>
            onCameraCenterChange?.({
              latitude: region.latitude,
              longitude: region.longitude,
            })
          }
          region={controlledRegion}
          style={styles.map}
        >
          {markerGroups.map((group) => (
            <Marker
              coordinate={group.coordinate}
              identifier={group.id}
              key={group.id}
              onPress={() => onSelectReport(group.pins[0]?.id ?? group.id)}
              title={group.title}
            >
              <View style={styles.markerBubble}>
                <Text style={styles.markerText}>
                  {group.pins.length > 1 ? group.pins.length : "1"}
                </Text>
              </View>
            </Marker>
          ))}
          {currentLocation ? (
            <Marker
              coordinate={currentLocation.coordinate}
              identifier="current-location"
              key="current-location"
              title={currentLocation.label}
            >
              <View style={styles.currentLocationMarker}>
                <View style={styles.currentLocationDot} />
              </View>
            </Marker>
          ) : null}
        </MapView>
        {providerState.kind === "loading" ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.inkStrong} />
            <Text style={styles.loadingText}>
              {providerState.message ?? "Cargando mapa"}
            </Text>
          </View>
        ) : null}
        {onRecenter && currentLocation ? (
          <Pressable
            accessibilityLabel="Centrar en el area de busqueda"
            accessibilityRole="button"
            onPress={onRecenter}
            style={styles.recenterButton}
          >
            <Text style={styles.recenterText}>Centrar</Text>
          </Pressable>
        ) : null}
      </View>
      {selectedPreview ? (
        <ReportMapPreviewPanel
          onOpenReport={onOpenReport}
          preview={selectedPreview}
        />
      ) : null}
      <ReportMapListAlternative
        onSelectReport={onSelectReport}
        previews={previews}
        selectedReportId={selectedReportId}
      />
    </View>
  );
}

export function clusterReportMapPins(
  pins: readonly ReportMapPin[],
): ReportMapMarkerGroup[] {
  const groupsByKey = new Map<string, ReportMapPin[]>();

  for (const pin of pins) {
    const key = getCoordinateClusterKey(pin.coordinate);
    const groupPins = groupsByKey.get(key) ?? [];

    groupPins.push(pin);
    groupsByKey.set(key, groupPins);
  }

  return [...groupsByKey.entries()].map(([key, groupPins]) => ({
    coordinate: averageCoordinates(groupPins.map((pin) => pin.coordinate)),
    id: `cluster:${key}`,
    pins: groupPins,
    title:
      groupPins.length === 1
        ? (groupPins[0]?.title ?? "Reporte")
        : `${groupPins.length} reportes`,
  }));
}

function ReportMapPreviewPanel({
  onOpenReport,
  preview,
}: {
  onOpenReport?: (reportId: string) => void;
  preview: ReportMapPreview;
}) {
  return (
    <View style={styles.previewPanel}>
      <View style={styles.previewCopy}>
        <Text selectable style={styles.previewTitle}>
          {preview.title}
        </Text>
        <Text selectable style={styles.previewMeta}>
          {[preview.metaLabel, preview.locationLabel]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        <Text selectable numberOfLines={2} style={styles.previewSummary}>
          {preview.summary}
        </Text>
      </View>
      {onOpenReport ? (
        <Pressable
          accessibilityLabel={`Abrir ${preview.title}`}
          accessibilityRole="button"
          onPress={() => onOpenReport(preview.id)}
          style={styles.openButton}
        >
          <Text style={styles.openButtonText}>Ver</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ReportMapListAlternative({
  onSelectReport,
  previews,
  selectedReportId,
}: {
  onSelectReport: (reportId: string) => void;
  previews: readonly ReportMapPreview[];
  selectedReportId?: string;
}) {
  return (
    <View style={styles.listAlternative}>
      <Text style={styles.listTitle}>Lista accesible</Text>
      <ScrollView
        horizontal
        contentContainerStyle={styles.listContent}
        showsHorizontalScrollIndicator={false}
      >
        {previews.map((preview) => {
          const isSelected = preview.id === selectedReportId;

          return (
            <Pressable
              accessibilityLabel={`Seleccionar ${preview.title}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={preview.id}
              onPress={() => onSelectReport(preview.id)}
              style={[
                styles.listItem,
                isSelected ? styles.listItemSelected : null,
              ]}
            >
              <Text style={styles.listItemTitle}>{preview.title}</Text>
              <Text numberOfLines={1} style={styles.listItemMeta}>
                {preview.locationLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function MapStatusPanel({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.statusPanel}>
      <View style={styles.statusIcon}>
        <Text style={styles.statusIconText}>!</Text>
      </View>
      <Text selectable style={styles.statusTitle}>
        {title}
      </Text>
      <Text selectable style={styles.statusBody}>
        {body}
      </Text>
    </View>
  );
}

function getSelectedPreview(
  previews: readonly ReportMapPreview[],
  selectedReportId: string | undefined,
) {
  return (
    previews.find((preview) => preview.id === selectedReportId) ?? previews[0]
  );
}

function buildInitialRegion({
  currentLocation,
  pins,
}: {
  currentLocation?: ReportMapSearchOrigin;
  pins: readonly ReportMapPin[];
}) {
  const center =
    pins[0]?.coordinate ?? currentLocation?.coordinate ?? defaultRegion;

  return {
    latitude: center.latitude,
    latitudeDelta: defaultRegion.latitudeDelta,
    longitude: center.longitude,
    longitudeDelta: defaultRegion.longitudeDelta,
  };
}

function getCoordinateClusterKey(coordinate: ReportMapCoordinate) {
  return `${coordinate.latitude.toFixed(4)}:${coordinate.longitude.toFixed(4)}`;
}

function averageCoordinates(
  coordinates: readonly ReportMapCoordinate[],
): ReportMapCoordinate {
  const total = coordinates.reduce(
    (sum, coordinate) => ({
      latitude: sum.latitude + coordinate.latitude,
      longitude: sum.longitude + coordinate.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );
  const count = coordinates.length || 1;

  return {
    latitude: total.latitude / count,
    longitude: total.longitude / count,
  };
}

const colors = {
  bg: "#F6FAF7",
  card: "#FFFFFF",
  danger: "#BD2F2F",
  dangerSoft: "#FFE8E2",
  ink: "#1F2A25",
  inkMuted: "#66736D",
  inkStrong: "#0F7665",
  line: "#D9E6DF",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  currentLocationDot: {
    backgroundColor: colors.inkStrong,
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  currentLocationMarker: {
    alignItems: "center",
    backgroundColor: "rgba(15, 118, 101, 0.18)",
    borderColor: colors.white,
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  listAlternative: {
    gap: 8,
  },
  listContent: {
    gap: 8,
    paddingRight: 16,
  },
  listItem: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 190,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: 170,
  },
  listItemMeta: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  listItemSelected: {
    borderColor: colors.inkStrong,
    borderWidth: 2,
  },
  listItemTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 19,
  },
  listTitle: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  loadingOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.84)",
    gap: 8,
    justifyContent: "center",
    ...StyleSheet.absoluteFillObject,
  },
  loadingText: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: "800",
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
  markerBubble: {
    alignItems: "center",
    backgroundColor: colors.inkStrong,
    borderColor: colors.white,
    borderRadius: 18,
    borderWidth: 2,
    minHeight: 34,
    minWidth: 34,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  markerText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "900",
  },
  openButton: {
    alignItems: "center",
    backgroundColor: colors.inkStrong,
    borderRadius: 999,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  openButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  previewCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  previewMeta: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  previewPanel: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  previewSummary: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  previewTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
  },
  recenterButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
    position: "absolute",
    right: 12,
    top: 12,
  },
  recenterText: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: "900",
  },
  statusBody: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  statusIcon: {
    alignItems: "center",
    backgroundColor: colors.dangerSoft,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  statusIconText: {
    color: colors.danger,
    fontSize: 18,
    fontWeight: "900",
  },
  statusPanel: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  statusTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25,
    textAlign: "center",
  },
});
