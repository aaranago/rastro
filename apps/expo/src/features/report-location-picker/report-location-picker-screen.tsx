import * as React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ReportMapProviderState } from "../maps/report-map";
import type { NearbyLocationAdapter } from "../nearby/nearby-location-adapter";
import type {
  NearbyCoordinates,
  NearbySearchLocation,
} from "../nearby/nearby-types";
import type { ReportLocationDraft } from "../report-creation/report-location-draft";
import type { ReportLocationPickerResult } from "./report-location-picker-adapter";
import { ManualLocationPickerMap } from "../maps/location-picker-map";
import { getNativeMapProviderState } from "../maps/map-provider-config";
import { nearbyManualLocationOptions } from "../nearby/nearby-locations";
import { ReportCreationScreenFrame } from "../report-creation/report-creation-ui";
import { createReportLocationPickerAdapter } from "./report-location-picker-adapter";

export interface ReportLocationPickerScreenProps {
  adapter: NearbyLocationAdapter;
  initialMapCoordinate?: NearbyCoordinates;
  manualLocationOptions?: readonly NearbySearchLocation[];
  mapProviderState?: ReportMapProviderState;
  onCancel?: () => void;
  onConfirm: (location: ReportLocationDraft) => void;
}

type PickerMode = "list" | "map";

const defaultMapCoordinate = { latitude: -16.5, longitude: -68.1193 };

export function ReportLocationPickerScreen({
  adapter,
  initialMapCoordinate = defaultMapCoordinate,
  manualLocationOptions = nearbyManualLocationOptions,
  mapProviderState,
  onCancel,
  onConfirm,
}: ReportLocationPickerScreenProps) {
  const pickerAdapter = React.useMemo(
    () => createReportLocationPickerAdapter(adapter),
    [adapter],
  );
  const [feedback, setFeedback] =
    React.useState<ReportLocationPickerResult | null>(null);
  const [mapCoordinate, setMapCoordinate] =
    React.useState<NearbyCoordinates>(initialMapCoordinate);
  const [mode, setMode] = React.useState<PickerMode>("list");
  const manualLocationGroups = React.useMemo(
    () => groupManualLocationOptionsByDepartment(manualLocationOptions),
    [manualLocationOptions],
  );
  const mapPinLocationOptions = React.useMemo(
    () =>
      manualLocationOptions.filter(
        (location) => location.manualLocationKind === "map-pin",
      ),
    [manualLocationOptions],
  );
  const [selectedDepartment, setSelectedDepartment] = React.useState(
    () => manualLocationGroups[0]?.department ?? "",
  );
  const [isDepartmentMenuOpen, setDepartmentMenuOpen] = React.useState(false);
  const selectedDepartmentGroup =
    manualLocationGroups.find(
      (group) => group.department === selectedDepartment,
    ) ??
    manualLocationGroups[0] ??
    null;
  const resolvedMapProviderState =
    mapProviderState ?? getNativeMapProviderState();

  const applyPickerResult = React.useCallback(
    (result: ReportLocationPickerResult) => {
      if (result.kind === "selected") {
        onConfirm(result.location);
        return;
      }

      setFeedback(result);
    },
    [onConfirm],
  );

  const handleUseCurrentLocation = React.useCallback(async () => {
    applyPickerResult(await pickerAdapter.resolveCurrentLocation());
  }, [applyPickerResult, pickerAdapter]);

  const handleManualLocation = React.useCallback(
    (location: NearbySearchLocation) => {
      if (location.manualLocationKind === "map-pin" && !location.coordinates) {
        setMode("map");
        setDepartmentMenuOpen(false);
        return;
      }

      setDepartmentMenuOpen(false);
      applyPickerResult(pickerAdapter.selectLocation(location));
    },
    [applyPickerResult, pickerAdapter],
  );

  const handleDepartmentPress = React.useCallback((department: string) => {
    setSelectedDepartment(department);
    setDepartmentMenuOpen(false);
  }, []);

  return (
    <ReportCreationScreenFrame
      contentContainerStyle={styles.content}
      footer={
        onCancel ? (
          <Pressable
            accessibilityLabel="Cancelar seleccion de ubicacion"
            accessibilityRole="button"
            onPress={onCancel}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
        ) : undefined
      }
      style={styles.screen}
    >
      <View style={styles.section}>
        <Text selectable style={styles.title}>
          Ubicacion del reporte
        </Text>
        <Text selectable style={styles.body}>
          Usamos tu ubicacion solo para ubicar este reporte. Puedes elegir una
          ciudad, un departamento o un punto en el mapa.
        </Text>
        <Pressable
          accessibilityLabel="Usar mi ubicacion actual"
          accessibilityRole="button"
          onPress={handleUseCurrentLocation}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Usar mi ubicacion actual</Text>
        </Pressable>
      </View>

      {feedback?.kind === "recoverable" ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.feedback}
        >
          <Text selectable style={styles.feedbackTitle}>
            {feedback.title}
          </Text>
          <Text selectable style={styles.body}>
            {feedback.message}
          </Text>
        </View>
      ) : null}

      {mode === "map" ? (
        <ManualLocationPickerMap
          onCancel={() => setMode("list")}
          onConfirm={(location) =>
            applyPickerResult(pickerAdapter.selectLocation(location))
          }
          onSelectedCoordinateChange={setMapCoordinate}
          providerState={resolvedMapProviderState}
          selectedCoordinate={mapCoordinate}
        />
      ) : null}

      <View style={styles.section}>
        <Text selectable style={styles.sectionTitle}>
          Elegir por departamento
        </Text>
        {selectedDepartmentGroup ? (
          <View style={styles.selectPanel}>
            <Text selectable style={styles.fieldLabel}>
              Departamento
            </Text>
            <Pressable
              accessibilityLabel={`Cambiar departamento. Seleccion actual: ${selectedDepartmentGroup.department}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: isDepartmentMenuOpen }}
              onPress={() => setDepartmentMenuOpen((isOpen) => !isOpen)}
              style={styles.departmentTrigger}
            >
              <View style={styles.optionCopy}>
                <Text selectable style={styles.optionTitle}>
                  {selectedDepartmentGroup.department}
                </Text>
                <Text selectable style={styles.optionMeta}>
                  {getDepartmentSummary(selectedDepartmentGroup)}
                </Text>
              </View>
              <Text style={styles.departmentTriggerText}>
                {isDepartmentMenuOpen ? "Cerrar" : "Cambiar"}
              </Text>
            </Pressable>

            {isDepartmentMenuOpen ? (
              <View style={styles.departmentMenu}>
                {manualLocationGroups.map((group) => {
                  const isSelected =
                    group.department === selectedDepartmentGroup.department;

                  return (
                    <Pressable
                      accessibilityLabel={`Mostrar ciudades de ${group.department}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={group.department}
                      onPress={() => handleDepartmentPress(group.department)}
                      style={[
                        styles.departmentRow,
                        isSelected ? styles.departmentRowActive : null,
                      ]}
                    >
                      <Text
                        selectable
                        style={[
                          styles.departmentRowText,
                          isSelected ? styles.departmentRowTextActive : null,
                        ]}
                      >
                        {group.department}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.optionList}>
              {selectedDepartmentGroup.locations.map((location) => (
                <Pressable
                  accessibilityLabel={`Elegir ${location.label}`}
                  accessibilityRole="button"
                  key={`${location.source}:${location.label}`}
                  onPress={() => handleManualLocation(location)}
                  style={styles.option}
                >
                  <View style={styles.optionCopy}>
                    <Text selectable style={styles.optionTitle}>
                      {location.label}
                    </Text>
                    <Text selectable style={styles.optionMeta}>
                      {getLocationMetaLabel(location)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.optionList}>
          {mapPinLocationOptions.map((location) => (
            <Pressable
              accessibilityLabel="Elegir punto en el mapa"
              accessibilityRole="button"
              key={`${location.source}:${location.label}`}
              onPress={() => handleManualLocation(location)}
              style={[styles.option, styles.mapOption]}
            >
              <View style={styles.optionCopy}>
                <Text selectable style={styles.optionTitle}>
                  {location.label}
                </Text>
                <Text selectable style={styles.optionMeta}>
                  Punto exacto elegido por ti
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </ReportCreationScreenFrame>
  );
}

interface ManualLocationDepartmentGroup {
  department: string;
  locations: NearbySearchLocation[];
}

function groupManualLocationOptionsByDepartment(
  options: readonly NearbySearchLocation[],
): ManualLocationDepartmentGroup[] {
  const groups: ManualLocationDepartmentGroup[] = [];

  for (const location of options) {
    if (location.manualLocationKind === "map-pin") {
      continue;
    }

    const department = getLocationDepartmentLabel(location);
    const existingGroup = groups.find(
      (group) => group.department === department,
    );

    if (existingGroup) {
      existingGroup.locations.push(location);
      continue;
    }

    groups.push({
      department,
      locations: [location],
    });
  }

  return groups;
}

function getLocationDepartmentLabel(location: NearbySearchLocation) {
  if (location.department) {
    return location.department;
  }

  const knownArea = getKnownBoliviaArea(location);

  return knownArea?.department ?? "Bolivia";
}

function getLocationMetaLabel(location: NearbySearchLocation) {
  return `Departamento de ${getLocationDepartmentLabel(location)}`;
}

function getDepartmentSummary(group: ManualLocationDepartmentGroup) {
  return group.locations.length === 1
    ? `${group.locations[0]?.label ?? group.department} disponible`
    : `${group.locations.length} ciudades disponibles`;
}

function getKnownBoliviaArea(location: NearbySearchLocation) {
  const label = `${location.label} ${location.locationCellLabel}`;
  const areas = [
    { department: "La Paz", municipality: "La Paz" },
    { department: "Santa Cruz", municipality: "Santa Cruz de la Sierra" },
    { department: "Cochabamba", municipality: "Cochabamba" },
    { department: "Chuquisaca", municipality: "Sucre" },
    { department: "Tarija", municipality: "Tarija" },
    { department: "Oruro", municipality: "Oruro" },
    { department: "Potosi", municipality: "Potosi" },
    { department: "Beni", municipality: "Trinidad" },
    { department: "Pando", municipality: "Cobija" },
  ] as const;

  return areas.find(
    (area) =>
      label.includes(area.department) || label.includes(area.municipality),
  );
}

const colors = {
  bg: "#F7FAF8",
  border: "#D9E6DF",
  ink: "#1F2A25",
  muted: "#66736D",
  panel: "#FFFFFF",
  primary: "#0F7665",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  content: {
    gap: 16,
    paddingHorizontal: 16,
  },
  departmentMenu: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  departmentRow: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  departmentRowActive: {
    backgroundColor: "#E6F4EF",
  },
  departmentRowText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  departmentRowTextActive: {
    color: colors.primary,
    fontWeight: "900",
  },
  departmentTrigger: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 56,
    padding: 14,
  },
  departmentTriggerText: {
    color: colors.primary,
    flexShrink: 0,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textTransform: "uppercase",
  },
  feedback: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  feedbackTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
  },
  option: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  optionCopy: {
    flex: 1,
    gap: 4,
  },
  optionList: {
    gap: 8,
  },
  optionMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  optionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  mapOption: {
    borderStyle: "dashed",
  },
  screen: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "900",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
  },
  selectPanel: {
    gap: 8,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
});
