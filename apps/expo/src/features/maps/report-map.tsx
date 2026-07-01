import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Image } from "expo-image";

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
  photoUrl?: string;
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
          provider={PROVIDER_GOOGLE}
          region={controlledRegion}
          style={styles.map}
        >
          {markerGroups.map((group) => (
            <Marker
              coordinate={group.coordinate}
              identifier={group.id}
              key={group.id}
              onPress={() => onSelectReport(group.pins[0]?.id ?? group.id)}
              pinColor={colors.inkStrong}
              title={group.title}
            />
          ))}
          {currentLocation ? (
            <Marker
              coordinate={currentLocation.coordinate}
              identifier="current-location"
              key="current-location"
              pinColor={colors.currentLocation}
              title={currentLocation.label}
            />
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
            accessibilityLabel="Centrar en el área de búsqueda"
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
  const content = (
    <>
      <ReportMapPreviewThumb preview={preview} />
      <View style={styles.previewCopy}>
        <Text selectable style={styles.previewTitle}>
          {preview.title}
        </Text>
        <Text selectable style={styles.previewMeta}>
          {[preview.metaLabel, preview.locationLabel]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        <Text selectable numberOfLines={1} style={styles.previewSummary}>
          {preview.summary}
        </Text>
      </View>
      {onOpenReport ? (
        <View style={styles.previewAction}>
          <Text style={styles.previewActionText}>Ver</Text>
          <Text style={styles.previewActionArrow}>{">"}</Text>
        </View>
      ) : null}
    </>
  );

  if (!onOpenReport) {
    return <View style={styles.previewPanel}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={`Ver detalles de ${preview.title}`}
      accessibilityRole="button"
      onPress={() => onOpenReport(preview.id)}
      style={styles.previewPanel}
    >
      {content}
    </Pressable>
  );
}

function ReportMapPreviewThumb({ preview }: { preview: ReportMapPreview }) {
  if (preview.photoUrl) {
    return (
      <Image
        cachePolicy="memory-disk"
        contentFit="cover"
        recyclingKey={`map-preview:${preview.id}`}
        source={{ uri: preview.photoUrl }}
        style={styles.previewThumb}
        transition={120}
      />
    );
  }

  return (
    <View style={styles.previewThumbFallback}>
      <Text style={styles.previewThumbFallbackText}>?</Text>
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
      <Text style={styles.listTitle}>Reportes en este mapa</Text>
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
              {isSelected ? (
                <Text style={styles.listItemState}>Destacado</Text>
              ) : null}
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
  currentLocation: "#2F80ED",
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
    borderCurve: "continuous",
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
    backgroundColor: "#E8F3EE",
    borderColor: colors.inkStrong,
    borderWidth: 2,
  },
  listItemState: {
    color: colors.inkStrong,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 14,
    textTransform: "uppercase",
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
    backgroundColor: colors.bg,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    height: 220,
    overflow: "hidden",
  },
  previewAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 54,
    paddingHorizontal: 10,
  },
  previewActionArrow: {
    color: colors.inkStrong,
    fontSize: 16,
    fontWeight: "900",
  },
  previewActionText: {
    color: colors.inkStrong,
    fontSize: 13,
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
    borderCurve: "continuous",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10,
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
  previewThumb: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    height: 58,
    width: 58,
  },
  previewThumbFallback: {
    alignItems: "center",
    backgroundColor: colors.bg,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  previewThumbFallbackText: {
    color: colors.inkStrong,
    fontSize: 18,
    fontWeight: "900",
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
