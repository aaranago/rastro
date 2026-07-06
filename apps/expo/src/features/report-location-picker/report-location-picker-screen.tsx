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
  initialDepartment?: string;
  initialMapCoordinate?: NearbyCoordinates;
  manualLocationOptions?: readonly NearbySearchLocation[];
  mapProviderState?: ReportMapProviderState;
  onCancel?: () => void;
  onConfirm: (location: ReportLocationDraft) => void;
}

type PickerMode = "list" | "map";
type MapCoordinateSource = "department" | "manual";

const defaultMapCoordinate = { latitude: -16.5, longitude: -68.1193 };

export function ReportLocationPickerScreen({
  adapter,
  initialDepartment,
  initialMapCoordinate,
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
  const [mode, setMode] = React.useState<PickerMode>("list");
  const manualLocationGroups = React.useMemo(
    () => groupManualLocationOptionsByDepartment(manualLocationOptions),
    [manualLocationOptions],
  );
  const initialDepartmentGroup = React.useMemo(() => {
    if (!initialDepartment) {
      return undefined;
    }

    return manualLocationGroups.find(
      (group) => group.department === initialDepartment,
    );
  }, [initialDepartment, manualLocationGroups]);
  const initialSelectedDepartment =
    initialDepartmentGroup?.department ??
    manualLocationGroups[0]?.department ??
    "";
  const mapPinLocationOptions = React.useMemo(
    () =>
      manualLocationOptions.filter(
        (location) => location.manualLocationKind === "map-pin",
      ),
    [manualLocationOptions],
  );
  const [mapCoordinateSource, setMapCoordinateSource] =
    React.useState<MapCoordinateSource>(
      initialMapCoordinate ? "manual" : "department",
    );
  const [mapCoordinate, setMapCoordinate] = React.useState<NearbyCoordinates>(
    initialMapCoordinate ??
      getDepartmentReferenceCoordinate(initialDepartmentGroup) ??
      getDepartmentReferenceCoordinate(manualLocationGroups[0]) ??
      defaultMapCoordinate,
  );
  const [selectedDepartment, setSelectedDepartment] = React.useState(
    initialSelectedDepartment,
  );
  const [isDepartmentMenuOpen, setDepartmentMenuOpen] = React.useState(false);
  const selectedDepartmentGroup =
    manualLocationGroups.find(
      (group) => group.department === selectedDepartment,
    ) ??
    manualLocationGroups[0] ??
    null;
  const mapPinLocation = mapPinLocationOptions[0] ?? null;
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
    try {
      applyPickerResult(await pickerAdapter.resolveCurrentLocation());
    } catch {
      applyPickerResult({
        kind: "recoverable",
        message:
          "No pudimos obtener tu ubicación actual. Elige un departamento como referencia y marca el punto en el mapa.",
        title: "Elige una ubicación manual",
      });
    }
  }, [applyPickerResult, pickerAdapter]);

  const handleManualLocation = React.useCallback(
    (location: NearbySearchLocation) => {
      if (location.manualLocationKind === "map-pin" && !location.coordinates) {
        if (mapCoordinateSource === "department") {
          const referenceCoordinate =
            getDepartmentReferenceCoordinate(selectedDepartmentGroup) ??
            defaultMapCoordinate;

          setMapCoordinate(referenceCoordinate);
        }

        setMode("map");
        setDepartmentMenuOpen(false);
        return;
      }

      setDepartmentMenuOpen(false);
      applyPickerResult(pickerAdapter.selectLocation(location));
    },
    [
      applyPickerResult,
      mapCoordinateSource,
      pickerAdapter,
      selectedDepartmentGroup,
    ],
  );

  const handleDepartmentPress = React.useCallback(
    (department: string) => {
      const nextDepartmentGroup =
        manualLocationGroups.find((group) => group.department === department) ??
        null;

      setSelectedDepartment(department);
      setDepartmentMenuOpen(false);

      if (mapCoordinateSource === "department") {
        const referenceCoordinate =
          getDepartmentReferenceCoordinate(nextDepartmentGroup) ??
          defaultMapCoordinate;

        setMapCoordinate(referenceCoordinate);
      }
    },
    [manualLocationGroups, mapCoordinateSource],
  );

  return (
    <ReportCreationScreenFrame
      contentContainerStyle={styles.content}
      footer={
        onCancel ? (
          <Pressable
            accessibilityLabel="Cancelar selección de ubicación"
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
          Ubicación del reporte
        </Text>
        <Text selectable style={styles.body}>
          Usa tu ubicación actual o elige una referencia para abrir el mapa.
          Después ajusta el pin. Por defecto publicamos una zona aproximada de
          300 m, no el punto exacto.
        </Text>
        <Pressable
          accessibilityLabel="Usar mi ubicación actual"
          accessibilityRole="button"
          onPress={handleUseCurrentLocation}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Usar mi ubicación actual</Text>
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
          cancelAccessibilityLabel="Volver a la lista de ubicaciónes"
          cancelLabel="Volver a la lista"
          onCancel={() => setMode("list")}
          onConfirm={(location) =>
            applyPickerResult(
              pickerAdapter.selectLocation(
                withSelectedDepartmentForMapPin(
                  location,
                  mapCoordinateSource === "department"
                    ? selectedDepartmentGroup
                    : null,
                ),
              ),
            )
          }
          onSelectedCoordinateChange={(coordinate) => {
            setMapCoordinateSource("manual");
            setMapCoordinate(coordinate);
          }}
          providerState={resolvedMapProviderState}
          selectedCoordinate={mapCoordinate}
        />
      ) : null}

      <ManualLocationDecisionSection
        isDepartmentMenuOpen={isDepartmentMenuOpen}
        manualLocationGroups={manualLocationGroups}
        mapPinLocation={mapPinLocation}
        onSelectDepartment={handleDepartmentPress}
        onSelectLocation={handleManualLocation}
        onToggleDepartmentMenu={() =>
          setDepartmentMenuOpen((isOpen) => !isOpen)
        }
        selectedDepartmentGroup={selectedDepartmentGroup}
      />
    </ReportCreationScreenFrame>
  );
}

function ManualLocationDecisionSection({
  isDepartmentMenuOpen,
  manualLocationGroups,
  mapPinLocation,
  onSelectDepartment,
  onSelectLocation,
  onToggleDepartmentMenu,
  selectedDepartmentGroup,
}: {
  isDepartmentMenuOpen: boolean;
  manualLocationGroups: readonly ManualLocationDepartmentGroup[];
  mapPinLocation: NearbySearchLocation | null;
  onSelectDepartment: (department: string) => void;
  onSelectLocation: (location: NearbySearchLocation) => void;
  onToggleDepartmentMenu: () => void;
  selectedDepartmentGroup: ManualLocationDepartmentGroup | null;
}) {
  if (!selectedDepartmentGroup) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text selectable style={styles.sectionTitle}>
        Punto del reporte
      </Text>
      <View style={styles.selectPanel}>
        <DepartmentTrigger
          isDepartmentMenuOpen={isDepartmentMenuOpen}
          onPress={onToggleDepartmentMenu}
          selectedDepartment={selectedDepartmentGroup.department}
        />
        {isDepartmentMenuOpen ? (
          <DepartmentMenu
            groups={manualLocationGroups}
            onSelectDepartment={onSelectDepartment}
            selectedDepartment={selectedDepartmentGroup.department}
          />
        ) : null}
        <View style={styles.decisionList}>
          {mapPinLocation ? (
            <Pressable
              accessibilityLabel={`Marcar punto exacto en ${selectedDepartmentGroup.department}`}
              accessibilityRole="button"
              onPress={() => onSelectLocation(mapPinLocation)}
              style={[styles.decisionCard, styles.decisionCardPrimary]}
            >
              <View style={styles.optionCopy}>
                <Text selectable style={styles.decisionTitle}>
                  Marcar punto exacto en el mapa
                </Text>
                <Text selectable style={styles.decisionMeta}>
                  Ajusta el pin en el mapa. Rastro muestra una zona de 300 m
                  salvo que actives el punto exacto público.
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function DepartmentTrigger({
  isDepartmentMenuOpen,
  onPress,
  selectedDepartment,
}: {
  isDepartmentMenuOpen: boolean;
  onPress: () => void;
  selectedDepartment: string;
}) {
  return (
    <Pressable
      accessibilityLabel={`Cambiar departamento. Selección actual: ${selectedDepartment}`}
      accessibilityRole="button"
      accessibilityState={{ expanded: isDepartmentMenuOpen }}
      onPress={onPress}
      style={styles.departmentTrigger}
    >
      <View style={styles.optionCopy}>
        <Text selectable style={styles.optionTitle}>
          {selectedDepartment}
        </Text>
        <Text selectable style={styles.optionMeta}>
          Referencia para abrir el mapa
        </Text>
      </View>
      <Text style={styles.departmentTriggerText}>
        {isDepartmentMenuOpen ? "Cerrar" : "Cambiar"}
      </Text>
    </Pressable>
  );
}

function DepartmentMenu({
  groups,
  onSelectDepartment,
  selectedDepartment,
}: {
  groups: readonly ManualLocationDepartmentGroup[];
  onSelectDepartment: (department: string) => void;
  selectedDepartment: string;
}) {
  return (
    <View style={styles.departmentMenu}>
      {groups.map((group) => {
        const isSelected = group.department === selectedDepartment;

        return (
          <Pressable
            accessibilityLabel={`Mostrar ciudades de ${group.department}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={group.department}
            onPress={() => onSelectDepartment(group.department)}
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

function getDepartmentReferenceCoordinate(
  group: ManualLocationDepartmentGroup | null | undefined,
) {
  return group?.locations.find((location) => location.coordinates)?.coordinates;
}

function withSelectedDepartmentForMapPin(
  location: NearbySearchLocation,
  selectedDepartmentGroup: ManualLocationDepartmentGroup | null,
): NearbySearchLocation {
  if (location.manualLocationKind !== "map-pin" || !selectedDepartmentGroup) {
    return location;
  }

  const referenceLocation =
    selectedDepartmentGroup.locations.find(
      (candidate) => candidate.department && candidate.municipality,
    ) ?? selectedDepartmentGroup.locations[0];
  const department =
    referenceLocation?.department ?? selectedDepartmentGroup.department;
  const municipality =
    referenceLocation?.municipality ??
    referenceLocation?.label ??
    selectedDepartmentGroup.department;

  return {
    ...location,
    department,
    label: `Punto manual en ${municipality}`,
    locationCellLabel: `Departamento de ${department}`,
    municipality,
  };
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
    { department: "Potosí", municipality: "Potosí" },
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
  decisionCard: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  decisionCardPrimary: {
    backgroundColor: "#E3F3EE",
    borderColor: "#BFE0D5",
  },
  decisionList: {
    gap: 8,
  },
  decisionMeta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  decisionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
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
  optionCopy: {
    flex: 1,
    gap: 4,
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
