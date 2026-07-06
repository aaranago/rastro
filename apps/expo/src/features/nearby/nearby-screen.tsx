import type { ViewToken } from "react-native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LegendList } from "@legendapp/list";

import type {
  ReportMapPin,
  ReportMapPreview,
  ReportMapProviderState,
} from "../maps/report-map";
import type { ResourceProviderSummary } from "../resources";
import type { NearbyLocationAdapter } from "./nearby-location-adapter";
import type { NearbyReportRouteTarget } from "./nearby-navigation";
import type {
  NearbyBrowseMode,
  NearbyCoordinates,
  NearbyLocationState,
  NearbyLostReportsAdapter,
  NearbyPublicReportKind,
  NearbyRadiusKm,
  NearbySearchLocation,
} from "./nearby-types";
import type {
  NearbyLostReportCardViewModel,
  NearbyLostReportMapPinViewModel,
  NearbyLostReportsLoadState,
  NearbyLostReportsViewModel,
  NearbyUrgentLostPetAlertViewModel,
} from "./nearby-view-model";
import { ManualLocationPickerMap } from "../maps/location-picker-map";
import { getNativeMapProviderState } from "../maps/map-provider-config";
import { ReportMap } from "../maps/report-map";
import { createSponsorDeliverySessionId } from "../resources/sponsor-delivery-session";
import { getLocalSponsorPlacementForSurface } from "../resources/sponsor-surface-policy";
import { expoNearbyLocationAdapter } from "./nearby-expo-location-adapter";
import {
  applyManualNearbySearchLocation,
  buildNearbySearchQuery,
  getNearbyManualLocationOptionLabel,
  getNearbySearchLocation,
  toNearbyLocationState,
} from "./nearby-location-state";
import { nearbyManualLocationOptions } from "./nearby-locations";
import { shareNearbyLostReport } from "./nearby-share";
import { nearbyCategoryFilters, nearbyRadiusOptionsKm } from "./nearby-types";
import { buildNearbyLostReportsViewModel } from "./nearby-view-model";

const sponsorImpressionViewabilityConfig = {
  itemVisiblePercentThreshold: 60,
  minimumViewTime: 600,
};

export interface NearbyScreenProps {
  adapter: NearbyLostReportsAdapter;
  initialLocationState?: NearbyLocationState;
  initialMode?: NearbyBrowseMode;
  initialRadiusKm?: NearbyRadiusKm;
  launchSponsorProviders?: readonly ResourceProviderSummary[];
  locationAdapter?: NearbyLocationAdapter;
  locationState?: NearbyLocationState;
  manualLocationOptions?: readonly NearbySearchLocation[];
  onOpenSponsorProvider?: (providerId: string) => void;
  onOpenReport?: (target: NearbyReportRouteTarget) => void;
  onRecordSponsorDelivery?: (input: NearbySponsorDeliveryInput) => void;
  onReport?: (target: NearbyReportRouteTarget) => void;
  onShareReport?: (reportId: string) => void;
  onEnableAlerts?: () => void;
  onManualLocationPress?: (selectedLocation?: NearbySearchLocation) => void;
}

export interface NearbySponsorDeliveryInput {
  eventType: "impression" | "open";
  idempotencyKey?: string;
  placementId?: string;
  providerId: string;
  source: string;
  surface: "launch_home_banner";
}

interface NearbyShareReportRequest {
  id: string;
  reportKind: NearbyPublicReportKind;
  shareTarget: NearbyLostReportCardViewModel["shareTarget"];
}

const defaultInitialLocationState: NearbyLocationState = {
  kind: "not-requested",
};
const defaultManualMapCoordinate: NearbyCoordinates = {
  latitude: -16.5,
  longitude: -68.1193,
};
const fallbackMapGridBlocks = Array.from({ length: 12 }, (_, index) => index);

const keyExtractor = (item: NearbyLostReportCardViewModel) => item.id;

export function NearbyScreen(props: NearbyScreenProps) {
  const controller = useNearbyScreenController(props);

  return <NearbyScreenContent {...controller} />;
}

function useNearbyScreenController({
  adapter,
  initialLocationState = defaultInitialLocationState,
  initialMode = "list",
  initialRadiusKm = 5,
  launchSponsorProviders = [],
  locationAdapter = expoNearbyLocationAdapter,
  locationState,
  manualLocationOptions = nearbyManualLocationOptions,
  onEnableAlerts,
  onManualLocationPress,
  onOpenSponsorProvider,
  onOpenReport,
  onRecordSponsorDelivery,
  onReport,
  onShareReport,
}: NearbyScreenProps) {
  const [internalLocationState, setInternalLocationState] =
    useState<NearbyLocationState>(initialLocationState);
  const [mode, setMode] = useState<NearbyBrowseMode>(initialMode);
  const [radiusKm, setRadiusKm] = useState<NearbyRadiusKm>(initialRadiusKm);
  const [selectedCategories, setSelectedCategories] = useState<
    readonly NearbyPublicReportKind[]
  >(nearbyCategoryFilters);
  const [selectedReportId, setSelectedReportId] = useState<
    string | undefined
  >();
  const [mapCameraCenter, setMapCameraCenter] = useState<
    NearbyCoordinates | undefined
  >();
  const [isManualMapPickerOpen, setIsManualMapPickerOpen] = useState(false);
  const [isLocationChooserOpen, setIsLocationChooserOpen] = useState(false);
  const [manualMapCoordinate, setManualMapCoordinate] =
    useState<NearbyCoordinates>(defaultManualMapCoordinate);
  const [reloadKey, setReloadKey] = useState(0);
  const [reportFeedback, setReportFeedback] = useState<string | undefined>();
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [loadState, setLoadState] = useState<NearbyLostReportsLoadState>({
    kind: "loading",
  });

  const effectiveLocationState = locationState ?? internalLocationState;
  const searchLocation = getNearbySearchLocation(effectiveLocationState);
  const locationQueryKey = getLocationQueryKey(searchLocation);
  const searchQuery = useMemo(
    () =>
      buildNearbySearchQuery({
        categories: selectedCategories,
        locationState: effectiveLocationState,
        radiusKm,
      }),
    [effectiveLocationState, radiusKm, selectedCategories],
  );

  useEffect(() => {
    if (!searchQuery) {
      return;
    }

    let isActive = true;
    const request = new AbortController();

    setLoadState({ kind: "loading" });

    adapter
      .searchLostPetReports(searchQuery, { signal: request.signal })
      .then((value) => {
        if (isActive) {
          setLoadState({ kind: "success", value });
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadState({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "No pudimos cargar los reportes.",
          });
        }
      });

    return () => {
      isActive = false;
      request.abort();
    };
  }, [adapter, locationQueryKey, reloadKey, searchQuery]);

  const viewModel = useMemo(
    () =>
      buildNearbyLostReportsViewModel({
        locationState: effectiveLocationState,
        mode,
        radiusKm,
        result: loadState,
      }),
    [effectiveLocationState, loadState, mode, radiusKm],
  );

  const handleRetry = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const handleExpandRadius = useCallback(() => {
    setRadiusKm((currentRadiusKm) => {
      return getNextNearbyRadiusKm(currentRadiusKm);
    });
  }, []);

  const handleEmptyStateAction = useCallback(() => {
    if (isMaxNearbyRadiusKm(radiusKm)) {
      setIsLocationChooserOpen(true);
      return;
    }

    handleExpandRadius();
  }, [handleExpandRadius, radiusKm]);

  const handleCategoryToggle = useCallback(
    (category: NearbyPublicReportKind) => {
      setSelectedCategories((currentCategories) => {
        const isSelected = currentCategories.includes(category);
        const isAllSelected =
          currentCategories.length === nearbyCategoryFilters.length;

        if (isSelected && isAllSelected) {
          return [category];
        }

        if (isSelected && currentCategories.length === 1) {
          return nearbyCategoryFilters;
        }

        if (isSelected) {
          return currentCategories.filter((selected) => selected !== category);
        }

        return nearbyCategoryFilters.filter(
          (candidate) =>
            candidate === category || currentCategories.includes(candidate),
        );
      });
    },
    [],
  );

  const handleManualLocationPress = useCallback(
    (selectedLocation?: NearbySearchLocation) => {
      if (
        selectedLocation?.manualLocationKind === "map-pin" &&
        !selectedLocation.coordinates
      ) {
        setManualMapCoordinate(
          searchLocation?.coordinates ?? defaultManualMapCoordinate,
        );
        setIsManualMapPickerOpen(true);
        setIsLocationChooserOpen(true);

        return;
      }

      if (selectedLocation && !locationState) {
        setInternalLocationState(
          applyManualNearbySearchLocation(selectedLocation),
        );
      }

      if (selectedLocation) {
        setIsLocationChooserOpen(false);
      }

      onManualLocationPress?.(selectedLocation);
    },
    [locationState, onManualLocationPress, searchLocation?.coordinates],
  );

  const handleManualMapPinConfirm = useCallback(
    (selectedLocation: NearbySearchLocation) => {
      if (!locationState) {
        setInternalLocationState(
          applyManualNearbySearchLocation(selectedLocation),
        );
      }

      setIsManualMapPickerOpen(false);
      setIsLocationChooserOpen(false);
      onManualLocationPress?.(selectedLocation);
    },
    [locationState, onManualLocationPress],
  );

  const handleManualMapPinCancel = useCallback(() => {
    setIsManualMapPickerOpen(false);
  }, []);

  const handleUseCurrentLocationPress = useCallback(async () => {
    setIsResolvingLocation(true);

    try {
      const result = await locationAdapter.resolveForegroundLocation({
        requestPermission: true,
      });
      const nextLocationState = toNearbyLocationState(result);

      if (!locationState) {
        setInternalLocationState(nextLocationState);
      }
      setIsLocationChooserOpen(false);
    } catch {
      if (!locationState) {
        setInternalLocationState({ kind: "unavailable" });
      }
      setIsLocationChooserOpen(true);
    } finally {
      setIsResolvingLocation(false);
    }
  }, [locationAdapter, locationState]);

  const handleToggleLocationChooser = useCallback(() => {
    setIsLocationChooserOpen((isOpen) => !isOpen);
  }, []);

  const handleReportPress = useCallback(
    (target: NearbyReportRouteTarget) => {
      onReport?.(target);
      setReportFeedback("Abriendo formulario para reportar.");
    },
    [onReport],
  );

  const handleShareReport = useCallback(
    async (report: NearbyShareReportRequest) => {
      onShareReport?.(report.id);
      setReportFeedback(undefined);

      try {
        await shareNearbyLostReport(report, Share);
      } catch {
        setReportFeedback("No pudimos compartir el reporte. Intenta de nuevo.");
      }
    },
    [onShareReport],
  );

  const handleMapRecenter = useCallback(() => {
    if (searchLocation?.coordinates) {
      setMapCameraCenter(searchLocation.coordinates);
    }
  }, [searchLocation?.coordinates]);

  const renderCard = useCallback(
    ({ item }: { item: NearbyLostReportCardViewModel }) => (
      <LostReportCard
        distanceLabel={item.distanceLabel}
        id={item.id}
        lastSeenAtLabel={item.lastSeenAtLabel}
        onOpenReport={onOpenReport}
        onReport={handleReportPress}
        onShareReport={handleShareReport}
        photoUrl={item.photoUrl}
        priorityLabel={item.priorityLabel}
        publicLocationLabel={item.publicLocationLabel}
        reportActionLabel={item.reportActionLabel}
        reportKind={item.reportKind}
        routeTarget={item.routeTarget}
        shareTarget={item.shareTarget}
        subtitle={item.subtitle}
        summary={item.summary}
        title={item.title}
        urgency={item.urgency}
        verificationBadge={item.verificationBadge}
      />
    ),
    [handleReportPress, handleShareReport, onOpenReport],
  );

  return {
    handleCategoryToggle,
    handleEmptyStateAction,
    handleManualLocationPress,
    handleManualMapPinCancel,
    handleManualMapPinConfirm,
    handleMapRecenter,
    handleReportPress,
    handleRetry,
    handleShareReport,
    handleUseCurrentLocationPress,
    handleToggleLocationChooser,
    isLocationChooserOpen,
    isResolvingLocation,
    launchSponsorProviders,
    isManualMapPickerOpen,
    manualMapCoordinate,
    manualLocationOptions,
    mapCameraCenter,
    mode,
    onEnableAlerts,
    onOpenSponsorProvider,
    onOpenReport,
    onRecordSponsorDelivery,
    radiusKm,
    renderCard,
    reportFeedback,
    searchLocation,
    selectedCategories,
    selectedReportId,
    setMapCameraCenter,
    setMode,
    setRadiusKm,
    setManualMapCoordinate,
    setSelectedReportId,
    viewModel,
  };
}

function NearbyScreenContent({
  handleCategoryToggle,
  handleEmptyStateAction,
  handleManualLocationPress,
  handleManualMapPinCancel,
  handleManualMapPinConfirm,
  handleMapRecenter,
  handleReportPress,
  handleRetry,
  handleShareReport,
  handleToggleLocationChooser,
  handleUseCurrentLocationPress,
  isLocationChooserOpen,
  isManualMapPickerOpen,
  isResolvingLocation,
  launchSponsorProviders,
  manualMapCoordinate,
  manualLocationOptions,
  mapCameraCenter,
  mode,
  onEnableAlerts,
  onOpenSponsorProvider,
  onOpenReport,
  onRecordSponsorDelivery,
  radiusKm,
  renderCard,
  reportFeedback,
  searchLocation,
  selectedCategories,
  selectedReportId,
  setManualMapCoordinate,
  setMapCameraCenter,
  setMode,
  setRadiusKm,
  setSelectedReportId,
  viewModel,
}: ReturnType<typeof useNearbyScreenController>) {
  const safeAreaInsets = useSafeAreaInsets();
  const topInset = Math.max(16, safeAreaInsets.top + 8);
  const bottomInset = 156 + safeAreaInsets.bottom;

  if (
    viewModel.kind === "location-denied" ||
    viewModel.kind === "location-needed"
  ) {
    return (
      <LocationFallbackState
        bottomInset={bottomInset}
        isManualMapPickerOpen={isManualMapPickerOpen}
        isResolvingLocation={isResolvingLocation}
        manualMapCoordinate={manualMapCoordinate}
        manualLocationOptions={manualLocationOptions}
        mapProviderState={getNativeMapProviderState()}
        onManualMapPinCancel={handleManualMapPinCancel}
        onManualMapPinConfirm={handleManualMapPinConfirm}
        onManualMapCoordinateChange={setManualMapCoordinate}
        onManualLocationPress={handleManualLocationPress}
        onUseCurrentLocationPress={handleUseCurrentLocationPress}
        topInset={topInset}
        viewModel={viewModel}
      />
    );
  }

  if (viewModel.mode === "map" && viewModel.kind === "ready") {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.mapContent,
          { paddingBottom: bottomInset, paddingTop: topInset },
        ]}
        contentInset={{ bottom: bottomInset }}
        contentInsetAdjustmentBehavior="automatic"
        scrollIndicatorInsets={{ bottom: bottomInset }}
        style={styles.screen}
      >
        <Header
          isLocationChooserOpen={isLocationChooserOpen}
          isManualMapPickerOpen={isManualMapPickerOpen}
          isResolvingLocation={isResolvingLocation}
          launchSponsorProviders={launchSponsorProviders}
          manualLocationOptions={manualLocationOptions}
          manualMapCoordinate={manualMapCoordinate}
          mode={mode}
          onCategoryToggle={handleCategoryToggle}
          onOpenSponsorProvider={onOpenSponsorProvider}
          onRecordSponsorDelivery={onRecordSponsorDelivery}
          onManualLocationPress={handleManualLocationPress}
          onManualMapCoordinateChange={setManualMapCoordinate}
          onManualMapPinCancel={handleManualMapPinCancel}
          onManualMapPinConfirm={handleManualMapPinConfirm}
          onModeChange={setMode}
          onRadiusChange={setRadiusKm}
          onToggleLocationChooser={handleToggleLocationChooser}
          onUseCurrentLocationPress={handleUseCurrentLocationPress}
          radiusKm={radiusKm}
          reportFeedback={reportFeedback}
          selectedCategories={selectedCategories}
          viewModel={viewModel}
        />
        <MapBrowse
          cameraCenter={mapCameraCenter}
          cards={viewModel.cards}
          currentLocation={searchLocation}
          mapPins={viewModel.mapPins}
          onCameraCenterChange={setMapCameraCenter}
          onOpenReport={onOpenReport}
          onReport={handleReportPress}
          onRecenter={handleMapRecenter}
          onSelectReport={setSelectedReportId}
          onShareReport={handleShareReport}
          providerState={getNativeMapProviderState()}
          selectedReportId={selectedReportId}
        />
      </ScrollView>
    );
  }

  const content = getListStateContent(
    viewModel,
    handleRetry,
    handleEmptyStateAction,
  );

  return (
    <LegendList
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: bottomInset, paddingTop: topInset },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      data={viewModel.kind === "ready" ? viewModel.cards : []}
      estimatedItemSize={280}
      ItemSeparatorComponent={ListSeparator}
      keyExtractor={keyExtractor}
      ListEmptyComponent={content}
      ListHeaderComponent={
        <Header
          isLocationChooserOpen={isLocationChooserOpen}
          isManualMapPickerOpen={isManualMapPickerOpen}
          isResolvingLocation={isResolvingLocation}
          launchSponsorProviders={launchSponsorProviders}
          manualLocationOptions={manualLocationOptions}
          manualMapCoordinate={manualMapCoordinate}
          mode={mode}
          onCategoryToggle={handleCategoryToggle}
          onEnableAlerts={onEnableAlerts}
          onOpenSponsorProvider={onOpenSponsorProvider}
          onRecordSponsorDelivery={onRecordSponsorDelivery}
          onManualLocationPress={handleManualLocationPress}
          onManualMapCoordinateChange={setManualMapCoordinate}
          onManualMapPinCancel={handleManualMapPinCancel}
          onManualMapPinConfirm={handleManualMapPinConfirm}
          onModeChange={setMode}
          onRadiusChange={setRadiusKm}
          onToggleLocationChooser={handleToggleLocationChooser}
          onUseCurrentLocationPress={handleUseCurrentLocationPress}
          radiusKm={radiusKm}
          reportFeedback={reportFeedback}
          selectedCategories={selectedCategories}
          viewModel={viewModel}
        />
      }
      renderItem={renderCard}
      scrollIndicatorInsets={{ bottom: bottomInset }}
      style={styles.screen}
    />
  );
}

type NearbyHeaderViewModel = Exclude<
  NearbyLostReportsViewModel,
  { kind: "location-denied" | "location-needed" }
>;

interface HeaderProps {
  isLocationChooserOpen: boolean;
  isManualMapPickerOpen: boolean;
  isResolvingLocation: boolean;
  launchSponsorProviders: readonly ResourceProviderSummary[];
  manualLocationOptions: readonly NearbySearchLocation[];
  manualMapCoordinate: NearbyCoordinates;
  mode: NearbyBrowseMode;
  onCategoryToggle: (category: NearbyPublicReportKind) => void;
  onEnableAlerts?: () => void;
  onOpenSponsorProvider?: (providerId: string) => void;
  onRecordSponsorDelivery?: (input: NearbySponsorDeliveryInput) => void;
  onManualLocationPress: (selectedLocation?: NearbySearchLocation) => void;
  onManualMapCoordinateChange: (coordinate: NearbyCoordinates) => void;
  onManualMapPinCancel: () => void;
  onManualMapPinConfirm: (selectedLocation: NearbySearchLocation) => void;
  onModeChange: (mode: NearbyBrowseMode) => void;
  onRadiusChange: (radiusKm: NearbyRadiusKm) => void;
  onToggleLocationChooser: () => void;
  onUseCurrentLocationPress: () => void;
  radiusKm: NearbyRadiusKm;
  reportFeedback?: string;
  selectedCategories: readonly NearbyPublicReportKind[];
  viewModel: NearbyHeaderViewModel;
}

function Header({
  isLocationChooserOpen,
  isManualMapPickerOpen,
  isResolvingLocation,
  launchSponsorProviders,
  manualLocationOptions,
  manualMapCoordinate,
  mode,
  onCategoryToggle,
  onEnableAlerts,
  onOpenSponsorProvider,
  onRecordSponsorDelivery,
  onManualLocationPress,
  onManualMapCoordinateChange,
  onManualMapPinCancel,
  onManualMapPinConfirm,
  onModeChange,
  onRadiusChange,
  onToggleLocationChooser,
  onUseCurrentLocationPress,
  radiusKm,
  reportFeedback,
  selectedCategories,
  viewModel,
}: HeaderProps) {
  return (
    <View style={styles.header}>
      <HeaderContextRow
        isLocationChooserOpen={isLocationChooserOpen}
        onEnableAlerts={onEnableAlerts}
        onToggleLocationChooser={onToggleLocationChooser}
        radiusKm={radiusKm}
        viewModel={viewModel}
      />
      {isLocationChooserOpen ? (
        <ReadyLocationChooser
          isManualMapPickerOpen={isManualMapPickerOpen}
          isResolvingLocation={isResolvingLocation}
          manualLocationOptions={manualLocationOptions}
          manualMapCoordinate={manualMapCoordinate}
          onManualLocationPress={onManualLocationPress}
          onManualMapCoordinateChange={onManualMapCoordinateChange}
          onManualMapPinCancel={onManualMapPinCancel}
          onManualMapPinConfirm={onManualMapPinConfirm}
          onUseCurrentLocationPress={onUseCurrentLocationPress}
        />
      ) : null}
      <HeaderStatusMessages
        reportFeedback={reportFeedback}
        viewModel={viewModel}
      />
      <LaunchSponsorBanner
        onOpenSponsorProvider={onOpenSponsorProvider}
        onRecordSponsorDelivery={onRecordSponsorDelivery}
        providers={launchSponsorProviders}
      />
      <View style={styles.controls}>
        <RadiusControl
          onRadiusChange={onRadiusChange}
          radiusKm={radiusKm}
          radiusOptionsKm={viewModel.radiusOptionsKm}
        />
        <CategoryFilterStrip
          onCategoryToggle={onCategoryToggle}
          selectedCategories={selectedCategories}
        />
        <ModeSwitch mode={mode} onModeChange={onModeChange} />
      </View>
    </View>
  );
}

function HeaderContextRow({
  isLocationChooserOpen,
  onEnableAlerts,
  onToggleLocationChooser,
  radiusKm,
  viewModel,
}: {
  isLocationChooserOpen: boolean;
  onEnableAlerts?: () => void;
  onToggleLocationChooser: () => void;
  radiusKm: NearbyRadiusKm;
  viewModel: NearbyHeaderViewModel;
}) {
  const locationLabel =
    "locationLabel" in viewModel ? viewModel.locationLabel : viewModel.title;

  return (
    <View style={styles.contextRow}>
      <View style={styles.contextCopy}>
        <Text selectable numberOfLines={1} style={styles.contextTitle}>
          {locationLabel}
        </Text>
        <Text selectable numberOfLines={1} style={styles.contextMeta}>
          Radio de {radiusKm} km
        </Text>
      </View>
      <View style={styles.contextActions}>
        <Pressable
          accessibilityLabel={
            isLocationChooserOpen
              ? "Ocultar cambio de ubicación"
              : "Cambiar ubicación de búsqueda"
          }
          accessibilityRole="button"
          onPress={onToggleLocationChooser}
          style={styles.changeLocationButton}
          testID="nearby-change-location-button"
        >
          <Text style={styles.changeLocationText}>
            {isLocationChooserOpen ? "Listo" : "Cambiar zona"}
          </Text>
        </Pressable>
        {onEnableAlerts ? (
          <Pressable
            accessibilityLabel="Activar alertas cercanas"
            accessibilityRole="button"
            onPress={onEnableAlerts}
            style={styles.alertIconButton}
          >
            <Text style={styles.alertIconText}>!</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ReadyLocationChooser({
  isManualMapPickerOpen,
  isResolvingLocation,
  manualLocationOptions,
  manualMapCoordinate,
  onManualLocationPress,
  onManualMapCoordinateChange,
  onManualMapPinCancel,
  onManualMapPinConfirm,
  onUseCurrentLocationPress,
}: {
  isManualMapPickerOpen: boolean;
  isResolvingLocation: boolean;
  manualLocationOptions: readonly NearbySearchLocation[];
  manualMapCoordinate: NearbyCoordinates;
  onManualLocationPress: (selectedLocation?: NearbySearchLocation) => void;
  onManualMapCoordinateChange: (coordinate: NearbyCoordinates) => void;
  onManualMapPinCancel: () => void;
  onManualMapPinConfirm: (selectedLocation: NearbySearchLocation) => void;
  onUseCurrentLocationPress: () => void;
}) {
  return (
    <View style={styles.locationChooser} testID="nearby-location-chooser">
      <Pressable
        accessibilityRole="button"
        disabled={isResolvingLocation}
        onPress={onUseCurrentLocationPress}
        style={[
          styles.locationChooserPrimary,
          isResolvingLocation ? styles.locationChooserDisabled : null,
        ]}
        testID="nearby-use-current-location"
      >
        <Text style={styles.locationChooserPrimaryText}>
          {isResolvingLocation ? "Buscando ubicación" : "Usar mi ubicación"}
        </Text>
      </Pressable>
      <View style={styles.readyManualOptions}>
        {manualLocationOptions.map((option) => (
          <Pressable
            accessibilityRole="button"
            key={option.label}
            onPress={() => onManualLocationPress(option)}
            style={styles.readyManualOption}
            testID={`nearby-location-${toNearbyTestIdSegment(option.label)}`}
          >
            <Text numberOfLines={1} style={styles.readyManualOptionText}>
              {getNearbyManualLocationOptionLabel(option)}
            </Text>
          </Pressable>
        ))}
      </View>
      {isManualMapPickerOpen ? (
        <ManualLocationPickerMap
          onCancel={onManualMapPinCancel}
          onConfirm={onManualMapPinConfirm}
          onSelectedCoordinateChange={onManualMapCoordinateChange}
          providerState={getNativeMapProviderState()}
          selectedCoordinate={manualMapCoordinate}
        />
      ) : null}
    </View>
  );
}

function HeaderStatusMessages({
  reportFeedback,
  viewModel,
}: {
  reportFeedback?: string;
  viewModel: NearbyHeaderViewModel;
}) {
  const urgentAlert = viewModel.kind === "ready" ? viewModel.urgentAlert : null;
  const offlineLabel =
    "offlineLabel" in viewModel ? viewModel.offlineLabel : undefined;

  return (
    <>
      {urgentAlert ? <UrgentAlert alert={urgentAlert} /> : null}
      {offlineLabel ? (
        <Text selectable style={styles.offlineLabel}>
          {offlineLabel}
        </Text>
      ) : null}
      {reportFeedback ? (
        <Text selectable style={styles.feedbackLabel}>
          {reportFeedback}
        </Text>
      ) : null}
    </>
  );
}

function ModeSwitch({
  mode,
  onModeChange,
}: {
  mode: NearbyBrowseMode;
  onModeChange: (mode: NearbyBrowseMode) => void;
}) {
  return (
    <View style={styles.segmentedControl}>
      <SegmentButton
        isActive={mode === "list"}
        label="Lista"
        onPress={() => onModeChange("list")}
      />
      <SegmentButton
        isActive={mode === "map"}
        label="Mapa"
        onPress={() => onModeChange("map")}
      />
    </View>
  );
}

function SegmentButton({
  isActive,
  label,
  onPress,
}: {
  isActive: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={[
        styles.segmentButton,
        isActive ? styles.segmentButtonActive : null,
      ]}
    >
      <Text
        style={[styles.segmentText, isActive ? styles.segmentTextActive : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function RadiusControl({
  onRadiusChange,
  radiusKm,
  radiusOptionsKm,
}: {
  onRadiusChange: (radiusKm: NearbyRadiusKm) => void;
  radiusKm: NearbyRadiusKm;
  radiusOptionsKm: readonly NearbyRadiusKm[];
}) {
  return (
    <View style={styles.radiusControl}>
      {radiusOptionsKm.map((option) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: option === radiusKm }}
          key={option}
          onPress={() => onRadiusChange(option)}
          style={[
            styles.radiusButton,
            option === radiusKm ? styles.radiusButtonActive : null,
          ]}
        >
          <Text
            style={[
              styles.radiusText,
              option === radiusKm ? styles.radiusTextActive : null,
            ]}
          >
            {option} km
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function CategoryFilterStrip({
  onCategoryToggle,
  selectedCategories,
}: {
  onCategoryToggle: (category: NearbyPublicReportKind) => void;
  selectedCategories: readonly NearbyPublicReportKind[];
}) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.categoryFilterContent}
      showsHorizontalScrollIndicator={false}
    >
      <CategoryFilterControl
        onCategoryToggle={onCategoryToggle}
        selectedCategories={selectedCategories}
      />
    </ScrollView>
  );
}

function CategoryFilterControl({
  onCategoryToggle,
  selectedCategories,
}: {
  onCategoryToggle: (category: NearbyPublicReportKind) => void;
  selectedCategories: readonly NearbyPublicReportKind[];
}) {
  return (
    <View style={styles.categoryFilters}>
      {nearbyCategoryFilters.map((category) => {
        const isActive = selectedCategories.includes(category);

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            key={category}
            onPress={() => onCategoryToggle(category)}
            style={[
              styles.categoryButton,
              isActive ? styles.categoryButtonActive : null,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                isActive ? styles.categoryTextActive : null,
              ]}
            >
              {formatCategoryFilterLabel(category)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function formatCategoryFilterLabel(category: NearbyPublicReportKind) {
  switch (category) {
    case "adoption-listing":
      return "Adopción";
    case "found-pet-report":
      return "Encontradas";
    case "lost-pet-report":
      return "Perdidas";
    case "sighting-report":
      return "Vistas";
  }
}

function UrgentAlert({ alert }: { alert: NearbyUrgentLostPetAlertViewModel }) {
  return (
    <View style={styles.urgentAlert}>
      <View style={styles.urgentIcon}>
        <Text style={styles.urgentIconText}>!</Text>
      </View>
      <View style={styles.urgentTextBlock}>
        <Text selectable style={styles.urgentTitle}>
          {alert.title}
        </Text>
        <Text selectable style={styles.urgentMessage}>
          {alert.message}
        </Text>
      </View>
    </View>
  );
}

function LaunchSponsorBanner({
  onOpenSponsorProvider,
  onRecordSponsorDelivery,
  providers,
}: {
  onOpenSponsorProvider?: (providerId: string) => void;
  onRecordSponsorDelivery?: (input: NearbySponsorDeliveryInput) => void;
  providers: readonly ResourceProviderSummary[];
}) {
  const recordedImpressionsRef = useRef<Set<string>>(new Set());
  const sponsorDeliverySessionIdRef = useRef(createSponsorDeliverySessionId());
  const sponsors = useMemo(
    () =>
      providers.flatMap((provider) => {
        const placement = getLocalSponsorPlacementForSurface(
          provider.activeSponsorPlacements ?? provider.sponsorPlacement,
          "launch_home_banner",
        );

        return placement ? [{ placement, provider }] : [];
      }),
    [providers],
  );
  const recordSponsorImpression = useCallback(
    (sponsor: LaunchSponsorItem) => {
      if (!onRecordSponsorDelivery) {
        return;
      }

      const impressionKey = `${sponsor.provider.id}:${sponsor.placement.placementId ?? sponsor.placement.label}`;

      if (recordedImpressionsRef.current.has(impressionKey)) {
        return;
      }

      recordedImpressionsRef.current.add(impressionKey);
      onRecordSponsorDelivery({
        eventType: "impression",
        idempotencyKey: `launch-home:${sponsorDeliverySessionIdRef.current}:${sponsor.provider.id}:impression`,
        ...(sponsor.placement.placementId
          ? { placementId: sponsor.placement.placementId }
          : {}),
        providerId: sponsor.provider.id,
        source: "nearby-launch-banner",
        surface: "launch_home_banner",
      });
    },
    [onRecordSponsorDelivery],
  );
  const handleViewableSponsorItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<LaunchSponsorItem>[] }) => {
      for (const viewableItem of viewableItems) {
        if (viewableItem.isViewable) {
          recordSponsorImpression(viewableItem.item);
        }
      }
    },
    [recordSponsorImpression],
  );

  if (sponsors.length === 0) {
    return null;
  }

  return (
    <View style={styles.launchSponsorSection}>
      <Text selectable style={styles.launchSponsorSectionTitle}>
        Patrocinadores locales
      </Text>
      <FlatList
        data={sponsors}
        horizontal
        contentContainerStyle={styles.launchSponsorContent}
        keyExtractor={({ placement, provider }) =>
          `${provider.id}:${placement.placementId ?? placement.label}`
        }
        onViewableItemsChanged={handleViewableSponsorItemsChanged}
        renderItem={({ item: { placement, provider } }) => (
          <LaunchSponsorCard
            onOpenSponsorProvider={onOpenSponsorProvider}
            onRecordSponsorDelivery={onRecordSponsorDelivery}
            placement={placement}
            provider={provider}
          />
        )}
        showsHorizontalScrollIndicator={false}
        testID="nearby-launch-sponsor-list"
        viewabilityConfig={sponsorImpressionViewabilityConfig}
      />
    </View>
  );
}

interface LaunchSponsorItem {
  placement: NonNullable<ResourceProviderSummary["sponsorPlacement"]>;
  provider: ResourceProviderSummary;
}

function LaunchSponsorCard({
  onOpenSponsorProvider,
  onRecordSponsorDelivery,
  placement,
  provider,
}: {
  onOpenSponsorProvider?: (providerId: string) => void;
  onRecordSponsorDelivery?: (input: NearbySponsorDeliveryInput) => void;
  placement: LaunchSponsorItem["placement"];
  provider: ResourceProviderSummary;
}) {
  return (
    <Pressable
      accessibilityLabel={`Abrir patrocinador ${provider.name}`}
      accessibilityRole="button"
      onPress={() => {
        onRecordSponsorDelivery?.({
          eventType: "open",
          ...(placement.placementId
            ? { placementId: placement.placementId }
            : {}),
          providerId: provider.id,
          source: "nearby-launch-banner",
          surface: "launch_home_banner",
        });
        onOpenSponsorProvider?.(provider.id);
      }}
      style={({ pressed }) => [
        styles.launchSponsorCard,
        pressed ? styles.pressed : null,
      ]}
    >
      {(placement.imageUrl ?? provider.photoUrl) ? (
        <Image
          accessibilityLabel={`Imagen de patrocinio de ${provider.name}`}
          contentFit="cover"
          source={{ uri: placement.imageUrl ?? provider.photoUrl }}
          style={styles.launchSponsorImage}
        />
      ) : null}
      <View style={styles.launchSponsorCopy}>
        <Text numberOfLines={1} style={styles.launchSponsorPill}>
          {placement.label}
        </Text>
        <Text numberOfLines={1} style={styles.launchSponsorName}>
          {provider.name}
        </Text>
        <Text numberOfLines={2} style={styles.launchSponsorDisclosure}>
          {placement.disclosure}
        </Text>
      </View>
    </Pressable>
  );
}

const LostReportCard = memo(function LostReportCard({
  distanceLabel,
  id,
  lastSeenAtLabel,
  onOpenReport,
  onReport,
  onShareReport,
  photoUrl,
  priorityLabel,
  publicLocationLabel,
  reportActionLabel,
  reportKind,
  routeTarget,
  shareTarget,
  subtitle,
  summary,
  title,
  urgency,
  verificationBadge,
}: {
  distanceLabel?: string;
  id: string;
  lastSeenAtLabel: string;
  onOpenReport?: (target: NearbyReportRouteTarget) => void;
  onReport?: (target: NearbyReportRouteTarget) => void;
  onShareReport?: (report: NearbyShareReportRequest) => void;
  photoUrl?: string;
  priorityLabel: string;
  publicLocationLabel: string;
  reportActionLabel: string;
  reportKind: NearbyLostReportCardViewModel["reportKind"];
  routeTarget: NearbyReportRouteTarget;
  shareTarget: NearbyLostReportCardViewModel["shareTarget"];
  subtitle: string;
  summary: string;
  title: string;
  urgency: NearbyLostReportCardViewModel["urgency"];
  verificationBadge?: NearbyLostReportCardViewModel["verificationBadge"];
}) {
  const handleOpenReport = useCallback(() => {
    onOpenReport?.(routeTarget);
  }, [onOpenReport, routeTarget]);

  const handleShareReport = useCallback(() => {
    onShareReport?.({ id, reportKind, shareTarget });
  }, [id, onShareReport, reportKind, shareTarget]);

  const handleReport = useCallback(() => {
    onReport?.(routeTarget);
  }, [onReport, routeTarget]);

  return (
    <Pressable
      accessibilityLabel={`Abrir ${title}`}
      accessibilityRole="button"
      onPress={handleOpenReport}
      style={getCardStyle(urgency)}
    >
      <ReportCardPhotoFrame
        distanceLabel={distanceLabel}
        id={id}
        photoUrl={photoUrl}
      />
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <ReportCardTitleBlock subtitle={subtitle} title={title} />
          <PriorityPill label={priorityLabel} urgency={urgency} />
        </View>

        <Text selectable style={styles.locationCopy}>
          {publicLocationLabel}
        </Text>
        <VerificationBadge badge={verificationBadge} />
        <Text selectable style={styles.summaryCopy} numberOfLines={3}>
          {summary}
        </Text>
        <ReportCardFooter
          lastSeenAtLabel={lastSeenAtLabel}
          onReport={onReport ? handleReport : undefined}
          onShareReport={handleShareReport}
          reportActionLabel={reportActionLabel}
          title={title}
        />
      </View>
    </Pressable>
  );
});

function ReportCardPhotoFrame({
  distanceLabel,
  id,
  photoUrl,
}: {
  distanceLabel?: string;
  id: string;
  photoUrl?: string;
}) {
  return (
    <View
      style={[
        styles.cardPhotoFrame,
        photoUrl ? null : styles.cardPhotoFrameCompact,
      ]}
    >
      {photoUrl ? (
        <Image
          contentFit="cover"
          recyclingKey={id}
          source={photoUrl}
          style={styles.cardPhoto}
          transition={120}
        />
      ) : (
        <View style={styles.photoFallback}>
          <View style={styles.photoFallbackMark}>
            <Text style={styles.photoFallbackMarkText}>?</Text>
          </View>
          <View style={styles.photoFallbackCopy}>
            <Text style={styles.photoFallbackText}>Sin foto por ahora</Text>
            <Text style={styles.photoFallbackSubtext}>
              Revisa la descripción y la zona aproximada.
            </Text>
            {distanceLabel ? (
              <Text style={styles.photoFallbackDistance}>{distanceLabel}</Text>
            ) : null}
          </View>
        </View>
      )}
      {photoUrl && distanceLabel ? (
        <View style={styles.distancePill}>
          <Text selectable style={styles.distanceText}>
            {distanceLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ReportCardTitleBlock({
  subtitle,
  title,
}: {
  subtitle: string;
  title: string;
}) {
  return (
    <View style={styles.cardTitleBlock}>
      <Text selectable style={styles.cardTitle}>
        {title}
      </Text>
      {subtitle ? (
        <Text selectable style={styles.cardSubtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function PriorityPill({
  label,
  urgency,
}: {
  label: string;
  urgency: NearbyLostReportCardViewModel["urgency"];
}) {
  return (
    <View style={getPriorityPillStyle(urgency)}>
      <Text style={getPriorityTextStyle(urgency)}>
        {formatVisiblePriorityLabel(label)}
      </Text>
    </View>
  );
}

function VerificationBadge({
  badge,
}: {
  badge?: NearbyLostReportCardViewModel["verificationBadge"];
}) {
  if (!badge?.visible) {
    return null;
  }

  return (
    <Text selectable style={styles.verificationCopy}>
      {badge.label}
    </Text>
  );
}

function ReportCardFooter({
  lastSeenAtLabel,
  onReport,
  onShareReport,
  reportActionLabel,
  title,
}: {
  lastSeenAtLabel: string;
  onReport?: () => void;
  onShareReport: () => void;
  reportActionLabel: string;
  title: string;
}) {
  return (
    <View style={styles.cardFooter}>
      <Text selectable style={styles.timeCopy}>
        {lastSeenAtLabel}
      </Text>
      <View style={styles.cardFooterActions}>
        <Pressable
          accessibilityLabel={`Compartir ${title}`}
          accessibilityRole="button"
          onPress={onShareReport}
          style={styles.cardFooterButton}
        >
          <Text style={styles.shareText}>Compartir</Text>
        </Pressable>
        {onReport ? (
          <Pressable
            accessibilityLabel={`Reportar ${title}`}
            accessibilityRole="button"
            onPress={onReport}
            style={[styles.cardFooterButton, styles.reportCardButton]}
          >
            <Text style={styles.reportCardButtonText}>{reportActionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function getCardStyle(urgency: NearbyLostReportCardViewModel["urgency"]) {
  return [styles.card, urgency === "reduced" ? styles.cardReduced : null];
}

function getPriorityPillStyle(
  urgency: NearbyLostReportCardViewModel["urgency"],
) {
  return [
    styles.priorityPill,
    urgency === "reduced" ? styles.priorityPillReduced : null,
  ];
}

function getPriorityTextStyle(
  urgency: NearbyLostReportCardViewModel["urgency"],
) {
  return [
    styles.priorityText,
    urgency === "reduced" ? styles.priorityTextReduced : null,
  ];
}

function MapBrowse({
  cameraCenter,
  cards,
  currentLocation,
  mapPins,
  onCameraCenterChange,
  onOpenReport,
  onReport,
  onRecenter,
  onSelectReport,
  onShareReport,
  providerState,
  selectedReportId,
}: {
  cameraCenter?: NearbyCoordinates;
  cards: NearbyLostReportCardViewModel[];
  currentLocation?: NearbySearchLocation;
  mapPins: NearbyLostReportMapPinViewModel[];
  onCameraCenterChange: (coordinate: NearbyCoordinates) => void;
  onOpenReport?: (target: NearbyReportRouteTarget) => void;
  onReport?: (target: NearbyReportRouteTarget) => void;
  onRecenter: () => void;
  onSelectReport: (reportId: string | undefined) => void;
  onShareReport: (report: NearbyShareReportRequest) => void;
  providerState: ReportMapProviderState;
  selectedReportId?: string;
}) {
  const selectedMapReportId = cards.some((card) => card.id === selectedReportId)
    ? selectedReportId
    : cards[0]?.id;
  const selectedCard = cards.find((card) => card.id === selectedMapReportId);
  const reportPins = mapPins.map(toReportMapPin);
  const previews = cards.map(toReportMapPreview);
  const currentMapLocation = currentLocation?.coordinates
    ? {
        coordinate: currentLocation.coordinates,
        label: formatMapSearchOriginLabel(currentLocation),
      }
    : undefined;
  const handleOpenReport = useCallback(
    (reportId: string) => {
      const card = cards.find((candidate) => candidate.id === reportId);

      if (card) {
        onOpenReport?.(card.routeTarget);
      }
    },
    [cards, onOpenReport],
  );

  return (
    <View style={styles.mapPanel}>
      <Text selectable style={styles.mapTitle}>
        Zonas aproximadas
      </Text>
      {selectedCard ? (
        <MapSelectedReportActions
          onOpenReport={onOpenReport}
          onReport={onReport}
          onShareReport={onShareReport}
          report={selectedCard}
        />
      ) : null}
      <ReportMap
        cameraCenter={cameraCenter}
        currentLocation={currentMapLocation}
        onCameraCenterChange={onCameraCenterChange}
        onOpenReport={handleOpenReport}
        onRecenter={currentMapLocation ? onRecenter : undefined}
        onSelectReport={onSelectReport}
        pins={reportPins}
        previews={previews}
        providerState={providerState}
        selectedReportId={selectedMapReportId}
      />
    </View>
  );
}

function MapSelectedReportActions({
  onOpenReport,
  onReport,
  onShareReport,
  report,
}: {
  onOpenReport?: (target: NearbyReportRouteTarget) => void;
  onReport?: (target: NearbyReportRouteTarget) => void;
  onShareReport: (report: NearbyShareReportRequest) => void;
  report: NearbyLostReportCardViewModel;
}) {
  return (
    <View
      accessibilityLabel={`Acciones para ${report.title}`}
      style={styles.mapActionStrip}
      testID="nearby-map-report-actions"
    >
      <View style={styles.mapActionCopy}>
        <Text numberOfLines={1} selectable style={styles.mapActionTitle}>
          {report.title}
        </Text>
        <Text numberOfLines={1} selectable style={styles.mapActionMeta}>
          {report.publicLocationLabel}
        </Text>
      </View>
      <View style={styles.mapActionButtons}>
        <Pressable
          accessibilityLabel={`Compartir ${report.title}`}
          accessibilityRole="button"
          onPress={() => {
            onShareReport({
              id: report.id,
              reportKind: report.reportKind,
              shareTarget: report.shareTarget,
            });
          }}
          style={styles.cardFooterButton}
        >
          <Text style={styles.shareText}>Compartir</Text>
        </Pressable>
        {onReport ? (
          <Pressable
            accessibilityLabel={`Reportar ${report.title}`}
            accessibilityRole="button"
            onPress={() => {
              onReport(report.routeTarget);
            }}
            style={[styles.cardFooterButton, styles.reportCardButton]}
          >
            <Text style={styles.reportCardButtonText}>
              {report.reportActionLabel}
            </Text>
          </Pressable>
        ) : null}
        {onOpenReport ? (
          <Pressable
            accessibilityLabel={`Abrir ${report.title}`}
            accessibilityRole="button"
            onPress={() => {
              onOpenReport(report.routeTarget);
            }}
            style={styles.mapOpenButton}
          >
            <Text style={styles.mapOpenButtonText}>Ver</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function toReportMapPin(pin: NearbyLostReportMapPinViewModel): ReportMapPin {
  return {
    coordinate: pin.coordinates,
    distanceLabel: pin.distanceLabel,
    id: pin.id,
    label: pin.label,
    title: pin.title,
  };
}

function toReportMapPreview(
  card: NearbyLostReportCardViewModel,
): ReportMapPreview {
  return {
    id: card.id,
    locationLabel: card.publicLocationLabel,
    metaLabel:
      card.distanceLabel ?? formatVisiblePriorityLabel(card.priorityLabel),
    photoUrl: card.photoUrl,
    summary: card.summary,
    title: card.title,
  };
}

function formatVisiblePriorityLabel(label: string) {
  if (label === "Adopcion") {
    return "Adopción";
  }

  return label;
}

function formatMapSearchOriginLabel(location: NearbySearchLocation) {
  if (location.source === "current") {
    return "Tu ubicación";
  }

  if (location.source === "last") {
    return "Última ubicación detectada";
  }

  if (location.manualLocationKind === "map-pin") {
    return "Punto elegido para la búsqueda";
  }

  return `Centro de búsqueda: ${location.locationCellLabel}`;
}

function LocationFallbackState({
  bottomInset,
  isManualMapPickerOpen,
  isResolvingLocation,
  manualMapCoordinate,
  manualLocationOptions,
  mapProviderState,
  onManualMapCoordinateChange,
  onManualMapPinCancel,
  onManualMapPinConfirm,
  onManualLocationPress,
  onUseCurrentLocationPress,
  topInset,
  viewModel,
}: {
  bottomInset: number;
  isManualMapPickerOpen: boolean;
  isResolvingLocation: boolean;
  manualMapCoordinate: NearbyCoordinates;
  manualLocationOptions: readonly NearbySearchLocation[];
  mapProviderState: ReportMapProviderState;
  onManualMapCoordinateChange: (coordinate: NearbyCoordinates) => void;
  onManualMapPinCancel: () => void;
  onManualMapPinConfirm: (selectedLocation: NearbySearchLocation) => void;
  onManualLocationPress: (selectedLocation?: NearbySearchLocation) => void;
  onUseCurrentLocationPress: () => void;
  topInset: number;
  viewModel: Extract<
    NearbyLostReportsViewModel,
    { kind: "location-denied" | "location-needed" }
  >;
}) {
  return (
    <ScrollView
      contentContainerStyle={[
        styles.fallbackContent,
        { paddingBottom: bottomInset, paddingTop: topInset },
      ]}
      contentInset={{ bottom: bottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: bottomInset }}
      style={styles.screen}
    >
      <BoliviaSearchIllustration />
      <Text selectable style={styles.fallbackTitle}>
        {viewModel.title}
      </Text>
      <Text selectable style={styles.fallbackMessage}>
        {viewModel.message}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={isResolvingLocation}
        onPress={onUseCurrentLocationPress}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>
          {isResolvingLocation
            ? "Buscando ubicación"
            : viewModel.useCurrentLocationActionLabel}
        </Text>
      </Pressable>
      <Text selectable style={styles.manualOptionsTitle}>
        {viewModel.manualLocationActionLabel}
      </Text>
      <View style={styles.manualOptions}>
        {manualLocationOptions.map((option) => (
          <Pressable
            accessibilityRole="button"
            key={option.label}
            onPress={() => onManualLocationPress(option)}
            style={styles.manualOptionButton}
          >
            <Text selectable style={styles.manualOptionText}>
              {getNearbyManualLocationOptionLabel(option)}
            </Text>
          </Pressable>
        ))}
      </View>
      {isManualMapPickerOpen ? (
        <ManualLocationPickerMap
          onCancel={onManualMapPinCancel}
          onConfirm={onManualMapPinConfirm}
          onSelectedCoordinateChange={onManualMapCoordinateChange}
          providerState={mapProviderState}
          selectedCoordinate={manualMapCoordinate}
        />
      ) : null}
    </ScrollView>
  );
}

function BoliviaSearchIllustration() {
  return (
    <View
      accessibilityLabel="Mapa ilustrado de Bolivia"
      accessibilityRole="image"
      style={styles.fallbackIllustration}
    >
      <View style={styles.fallbackMapGrid}>
        {fallbackMapGridBlocks.map((index) => (
          <View key={index} style={styles.fallbackMapGridBlock} />
        ))}
      </View>
      <View style={styles.boliviaShape}>
        <View style={[styles.boliviaShapePart, styles.boliviaShapeNorth]} />
        <View style={[styles.boliviaShapePart, styles.boliviaShapeWest]} />
        <View style={[styles.boliviaShapePart, styles.boliviaShapeCenter]} />
        <View style={[styles.boliviaShapePart, styles.boliviaShapeEast]} />
        <View style={[styles.boliviaShapePart, styles.boliviaShapeSouth]} />
      </View>
      <View style={[styles.fallbackMapPin, styles.fallbackMapPinWest]}>
        <View style={styles.fallbackMapPinDot} />
      </View>
      <View style={[styles.fallbackMapPin, styles.fallbackMapPinEast]}>
        <View style={styles.fallbackMapPinDot} />
      </View>
      <Text maxFontSizeMultiplier={1.1} style={styles.fallbackMapLabel}>
        Bolivia
      </Text>
    </View>
  );
}

function getListStateContent(
  viewModel: Exclude<
    NearbyLostReportsViewModel,
    { kind: "location-denied" | "location-needed" }
  >,
  onRetry: () => void,
  onExpandRadius: () => void,
) {
  if (viewModel.kind === "loading") {
    return (
      <StatusPanel
        body={viewModel.locationLabel}
        title="Cargando reportes cercanos"
        variant="loading"
      />
    );
  }

  if (viewModel.kind === "error") {
    return (
      <StatusPanel
        actionLabel={viewModel.retryLabel}
        body={viewModel.message}
        onAction={onRetry}
        title={viewModel.title}
        variant="error"
      />
    );
  }

  if (viewModel.kind === "empty") {
    return (
      <StatusPanel
        actionLabel={viewModel.radiusActionLabel}
        body={viewModel.message}
        meta={viewModel.offlineLabel}
        onAction={onExpandRadius}
        title={viewModel.title}
        variant="empty"
      />
    );
  }

  return null;
}

function StatusPanel({
  actionLabel,
  body,
  meta,
  onAction,
  title,
  variant,
}: {
  actionLabel?: string;
  body: string;
  meta?: string;
  onAction?: () => void;
  title: string;
  variant: "loading" | "error" | "empty";
}) {
  return (
    <View style={styles.statusPanel}>
      {variant === "loading" ? (
        <ActivityIndicator color={colors.inkStrong} />
      ) : (
        <View style={styles.statusIcon}>
          <Text style={styles.statusIconText}>
            {variant === "error" ? "!" : "0"}
          </Text>
        </View>
      )}
      <Text selectable style={styles.statusTitle}>
        {title}
      </Text>
      <Text selectable style={styles.statusBody}>
        {body}
      </Text>
      {meta ? (
        <Text selectable style={styles.statusMeta}>
          {meta}
        </Text>
      ) : null}
      {actionLabel ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ListSeparator() {
  return <View style={styles.listSeparator} />;
}

function getNextNearbyRadiusKm(radiusKm: NearbyRadiusKm): NearbyRadiusKm {
  const currentIndex = nearbyRadiusOptionsKm.indexOf(radiusKm);
  const nextIndex =
    currentIndex === -1
      ? 0
      : Math.min(currentIndex + 1, nearbyRadiusOptionsKm.length - 1);

  return nearbyRadiusOptionsKm[nextIndex] ?? radiusKm;
}

function isMaxNearbyRadiusKm(radiusKm: NearbyRadiusKm) {
  return radiusKm === nearbyRadiusOptionsKm[nearbyRadiusOptionsKm.length - 1];
}

function getLocationQueryKey(location: NearbySearchLocation | undefined) {
  if (!location) {
    return "no-location";
  }

  return [
    location.source,
    location.countryCode,
    location.label,
    location.locationCellLabel,
    location.manualLocationKind,
    location.coordinates?.latitude,
    location.coordinates?.longitude,
  ].join(":");
}

function toNearbyTestIdSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const colors = {
  bg: "#f6faf7",
  card: "#ffffff",
  chip: "#e8f3ee",
  danger: "#bd2f2f",
  dangerSoft: "#ffe8e2",
  ink: "#1f2a25",
  inkMuted: "#66736d",
  inkSoft: "#8b9791",
  inkStrong: "#0f7665",
  line: "#d9e6df",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  alertIconButton: {
    alignItems: "center",
    backgroundColor: colors.chip,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  alertIconText: {
    color: colors.inkStrong,
    fontSize: 18,
    fontWeight: "800",
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderCurve: "continuous",
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardReduced: {
    backgroundColor: "#fbfcfc",
    borderColor: "#e4e9e7",
  },
  cardBody: {
    gap: 10,
    padding: 16,
  },
  cardFooter: {
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 10,
  },
  cardFooterActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-start",
    width: "100%",
  },
  cardFooterButton: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cardPhoto: {
    height: "100%",
    width: "100%",
  },
  cardPhotoFrame: {
    aspectRatio: 1.75,
    backgroundColor: colors.chip,
    overflow: "hidden",
  },
  cardPhotoFrameCompact: {
    aspectRatio: 4.2,
    minHeight: 84,
  },
  cardSubtitle: {
    color: colors.inkMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 2,
  },
  cardTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  controls: {
    gap: 8,
  },
  categoryButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  categoryButtonActive: {
    backgroundColor: colors.inkStrong,
    borderColor: colors.inkStrong,
  },
  categoryFilters: {
    flexDirection: "row",
    gap: 8,
  },
  categoryFilterContent: {
    paddingRight: 24,
  },
  categoryText: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: "800",
  },
  categoryTextActive: {
    color: colors.white,
  },
  boliviaShape: {
    height: 196,
    position: "absolute",
    width: 176,
  },
  boliviaShapeCenter: {
    height: 76,
    left: 56,
    top: 62,
    transform: [{ rotate: "7deg" }],
    width: 74,
  },
  boliviaShapeEast: {
    height: 88,
    left: 102,
    top: 56,
    transform: [{ rotate: "-12deg" }],
    width: 56,
  },
  boliviaShapeNorth: {
    height: 58,
    left: 68,
    top: 14,
    transform: [{ rotate: "-10deg" }],
    width: 76,
  },
  boliviaShapePart: {
    backgroundColor: colors.inkStrong,
    borderColor: "rgba(255, 255, 255, 0.68)",
    borderCurve: "continuous",
    borderRadius: 22,
    borderWidth: 2,
    position: "absolute",
  },
  boliviaShapeSouth: {
    height: 72,
    left: 52,
    top: 122,
    transform: [{ rotate: "-5deg" }],
    width: 64,
  },
  boliviaShapeWest: {
    height: 92,
    left: 18,
    top: 58,
    transform: [{ rotate: "16deg" }],
    width: 62,
  },
  contextCopy: {
    flex: 1,
    minWidth: 0,
  },
  contextMeta: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  contextRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  contextActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  contextTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27,
  },
  changeLocationButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  changeLocationText: {
    color: colors.inkStrong,
    fontSize: 12,
    fontWeight: "900",
  },
  distancePill: {
    backgroundColor: colors.card,
    borderRadius: 999,
    bottom: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    position: "absolute",
  },
  distanceText: {
    color: colors.inkStrong,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  fallbackContent: {
    alignItems: "center",
    gap: 12,
    padding: 18,
    paddingBottom: 140,
    paddingTop: 16,
  },
  fallbackIllustration: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.chip,
    borderCurve: "continuous",
    borderRadius: 28,
    justifyContent: "center",
    maxWidth: 190,
    overflow: "hidden",
    position: "relative",
    width: "54%",
  },
  fallbackMapGrid: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    opacity: 0.42,
    padding: 18,
  },
  fallbackMapGridBlock: {
    backgroundColor: colors.card,
    borderCurve: "continuous",
    borderRadius: 16,
    height: "28%",
    width: "29%",
  },
  fallbackMapLabel: {
    bottom: 20,
    color: colors.inkStrong,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0,
    position: "absolute",
  },
  fallbackMapPin: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.inkStrong,
    borderRadius: 999,
    borderWidth: 3,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    width: 28,
  },
  fallbackMapPinDot: {
    backgroundColor: colors.inkStrong,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  fallbackMapPinEast: {
    right: "28%",
    top: "38%",
  },
  fallbackMapPinWest: {
    left: "31%",
    top: "47%",
  },
  fallbackMessage: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
    textAlign: "center",
  },
  fallbackTitle: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 31,
    maxWidth: 320,
    textAlign: "center",
  },
  feedbackLabel: {
    alignSelf: "flex-start",
    backgroundColor: colors.chip,
    borderRadius: 999,
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  header: {
    gap: 10,
  },
  listContent: {
    gap: 12,
    padding: 16,
    paddingBottom: 140,
  },
  listSeparator: {
    height: 18,
  },
  launchSponsorCard: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 92,
    overflow: "hidden",
    padding: 10,
    width: 286,
  },
  launchSponsorContent: {
    gap: 10,
    paddingRight: 2,
  },
  launchSponsorCopy: {
    flex: 1,
    gap: 4,
    justifyContent: "center",
    minWidth: 0,
  },
  launchSponsorDisclosure: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  launchSponsorImage: {
    backgroundColor: colors.chip,
    borderCurve: "continuous",
    borderRadius: 14,
    height: 72,
    width: 72,
  },
  launchSponsorName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
  },
  launchSponsorPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.chip,
    borderRadius: 999,
    color: colors.inkStrong,
    fontSize: 11,
    fontWeight: "900",
    maxWidth: "100%",
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  launchSponsorSection: {
    gap: 8,
  },
  launchSponsorSectionTitle: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
    textTransform: "uppercase",
  },
  locationCopy: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  verificationCopy: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
  },
  manualOptionButton: {
    backgroundColor: colors.chip,
    borderCurve: "continuous",
    borderRadius: 18,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  manualOptionText: {
    color: colors.inkStrong,
    fontSize: 15,
    fontWeight: "800",
  },
  manualOptions: {
    alignSelf: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  manualOptionsTitle: {
    color: colors.inkMuted,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    textAlign: "center",
  },
  locationChooser: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  locationChooserDisabled: {
    opacity: 0.62,
  },
  locationChooserPrimary: {
    alignItems: "center",
    backgroundColor: colors.inkStrong,
    borderRadius: 999,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  locationChooserPrimaryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  mapContent: {
    gap: 12,
    padding: 16,
    paddingBottom: 140,
  },
  mapPanel: {
    gap: 10,
  },
  mapActionButtons: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mapActionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  mapActionMeta: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  mapActionStrip: {
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    padding: 12,
  },
  mapActionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
  },
  mapOpenButton: {
    alignItems: "center",
    backgroundColor: colors.inkStrong,
    borderRadius: 999,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  mapOpenButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  mapTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25,
  },
  offlineLabel: {
    alignSelf: "flex-start",
    backgroundColor: colors.dangerSoft,
    borderRadius: 999,
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  photoFallback: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  photoFallbackCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  photoFallbackDistance: {
    color: colors.inkStrong,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
    lineHeight: 16,
  },
  photoFallbackMark: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  photoFallbackMarkText: {
    color: colors.inkStrong,
    fontSize: 17,
    fontWeight: "900",
  },
  photoFallbackSubtext: {
    color: colors.inkMuted,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  photoFallbackText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.inkStrong,
    borderRadius: 999,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900",
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  priorityPill: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  priorityPillReduced: {
    backgroundColor: "#edf0f2",
  },
  priorityText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  priorityTextReduced: {
    color: colors.inkMuted,
  },
  radiusButton: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: 14,
  },
  radiusButtonActive: {
    backgroundColor: colors.inkStrong,
    borderColor: colors.inkStrong,
  },
  radiusControl: {
    flexDirection: "row",
    gap: 8,
  },
  radiusText: {
    color: colors.inkMuted,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
  radiusTextActive: {
    color: colors.white,
  },
  screen: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  segmentButtonActive: {
    backgroundColor: colors.card,
  },
  segmentText: {
    color: colors.inkMuted,
    fontSize: 15,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: colors.inkStrong,
  },
  segmentedControl: {
    backgroundColor: colors.chip,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    padding: 4,
  },
  reportCardButton: {
    borderColor: colors.danger,
  },
  reportCardButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "900",
  },
  readyManualOption: {
    backgroundColor: colors.chip,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: "100%",
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  readyManualOptionText: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: "900",
  },
  readyManualOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  shareText: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: "900",
  },
  statusBody: {
    color: colors.inkMuted,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 290,
    textAlign: "center",
  },
  statusIcon: {
    alignItems: "center",
    backgroundColor: colors.chip,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  statusIconText: {
    color: colors.inkStrong,
    fontSize: 18,
    fontWeight: "900",
  },
  statusMeta: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "center",
  },
  statusPanel: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderCurve: "continuous",
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 24,
  },
  statusTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
    maxWidth: 300,
    textAlign: "center",
  },
  summaryCopy: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  timeCopy: {
    color: colors.inkSoft,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  urgentAlert: {
    alignItems: "center",
    backgroundColor: "#ccebe2",
    borderCurve: "continuous",
    borderRadius: 24,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  urgentIcon: {
    alignItems: "center",
    backgroundColor: colors.inkStrong,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  urgentIconText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "900",
  },
  urgentMessage: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
  },
  urgentTextBlock: {
    flex: 1,
    gap: 2,
  },
  urgentTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
});
