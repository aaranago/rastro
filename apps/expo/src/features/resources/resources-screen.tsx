import type { LegendListRenderItemProps } from "@legendapp/list";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LegendList } from "@legendapp/list";

import type { ReportMapProviderState } from "../maps/report-map";
import type {
  NearbyForegroundLocationResult,
  NearbyLocationAdapter,
} from "../nearby/nearby-location-adapter";
import type { NearbySearchLocation } from "../nearby/nearby-types";
import type { ResourceManualLocationOption } from "./resource-location-options";
import type {
  ResourceCategoryId,
  ResourceCoordinate,
  ResourceProviderSummary,
  ResourcesDirectoryMode,
  ResourcesDirectoryStatus,
  ResourceSearchLocation,
} from "./resource-types";
import type {
  ResourceProviderSummaryViewModel,
  ResourcesDirectoryViewModel,
} from "./resources-view-model";
import type {
  ResourceProviderDirectoryResult,
  ResourcesAdapter,
} from "./static-resources-adapter";
import { getNativeMapProviderState } from "../maps/map-provider-config";
import { expoNearbyLocationAdapter } from "../nearby/nearby-expo-location-adapter";
import {
  getResourceManualLocationMatches,
  resolveResourceManualLocationSearch,
  resourceManualLocationOptions,
} from "./resource-location-options";
import { ResourceProviderCard } from "./resource-provider-card";
import { defaultApiResourcesAdapter } from "./resources-default-api-adapter";
import { resourcesColors, resourcesShadow } from "./resources-theme";
import { buildResourcesDirectoryViewModel } from "./resources-view-model";

const defaultResourcesAdapter = defaultApiResourcesAdapter;

type ResourceScreenIconName = ComponentProps<
  typeof MaterialCommunityIcons
>["name"];

type ResourceNoticeAction = NonNullable<
  NonNullable<ResourcesDirectoryViewModel["notice"]>["actions"]
>[number];

export interface ResourcesScreenProps {
  adapter?: ResourcesAdapter;
  initialLocation?: ResourceSearchLocation;
  initialMode?: ResourcesDirectoryMode;
  radiusMeters?: number;
  isOffline?: boolean;
  locationAdapter?: NearbyLocationAdapter;
  manualLocationOptions?: readonly ResourceManualLocationOption[];
  onOpenProvider?: (providerId: string) => void;
  onReportProvider?: (providerId: string) => void;
  onManualSearchPress?: () => void;
  onUseCurrentLocationPress?: () => void;
}

export function ResourcesScreen({
  adapter = defaultResourcesAdapter,
  initialLocation = {
    kind: "none",
  },
  initialMode = "list",
  radiusMeters = 5000,
  isOffline = false,
  locationAdapter = expoNearbyLocationAdapter,
  manualLocationOptions = resourceManualLocationOptions,
  onOpenProvider,
  onReportProvider,
  onManualSearchPress,
  onUseCurrentLocationPress,
}: ResourcesScreenProps) {
  const safeAreaInsets = useSafeAreaInsets();
  const [mode, setMode] = useState<ResourcesDirectoryMode>(initialMode);
  const [location, setLocation] =
    useState<ResourceSearchLocation>(initialLocation);
  const [manualSearchText, setManualSearchText] = useState(() =>
    getInitialManualSearchText(initialLocation),
  );
  const [manualSearchFeedback, setManualSearchFeedback] = useState<
    string | undefined
  >();
  const [isManualSearchFocused, setIsManualSearchFocused] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [selectedMapProviderId, setSelectedMapProviderId] = useState<
    string | undefined
  >();
  const [mapCameraCenter, setMapCameraCenter] = useState<
    ResourceCoordinate | undefined
  >();
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<
    ResourceCategoryId[]
  >([]);
  const [providers, setProviders] = useState<
    readonly ResourceProviderSummary[]
  >([]);
  const [status, setStatus] = useState<ResourcesDirectoryStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isOfflineContent, setIsOfflineContent] = useState(false);
  const [isStaleContent, setIsStaleContent] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);

  const searchQuery = useMemo(
    () => ({
      location,
      radiusMeters,
      categoryIds: selectedCategoryIds,
      strategy: "postgis_radius" as const,
    }),
    [location, radiusMeters, selectedCategoryIds],
  );

  useEffect(() => {
    let isCurrent = true;

    setStatus("loading");
    setErrorMessage(undefined);

    const searchProviders: Promise<ResourceProviderDirectoryResult> =
      adapter.searchProviderDirectory !== undefined
        ? adapter.searchProviderDirectory(searchQuery)
        : adapter.searchProviders(searchQuery).then((nextProviders) => ({
            providers: nextProviders,
          }));

    searchProviders
      .then((result) => {
        if (isCurrent) {
          setProviders(result.providers);
          setIsOfflineContent(result.isOffline === true);
          setIsStaleContent(result.isStale === true);
          setStatus("ready");
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setStatus("error");
          setIsOfflineContent(false);
          setIsStaleContent(false);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "No pudimos cargar recursos.",
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [adapter, reloadVersion, searchQuery]);

  useEffect(() => {
    if (location.kind === "manual" && !isManualSearchFocused) {
      setManualSearchText(location.label);
    }
  }, [isManualSearchFocused, location]);

  const viewModel = useMemo(
    () =>
      buildResourcesDirectoryViewModel({
        providers,
        selectedCategoryIds,
        location,
        mode,
        status,
        isOffline: isOffline || isOfflineContent,
        isStale: isStaleContent,
        errorMessage,
      }),
    [
      errorMessage,
      isOffline,
      isOfflineContent,
      isStaleContent,
      location,
      mode,
      providers,
      selectedCategoryIds,
      status,
    ],
  );

  const listData = getVisibleResults(viewModel);
  const { width } = useWindowDimensions();
  const estimatedItemSize = width > 520 ? 132 : 156;
  const listBottomInset = Math.max(safeAreaInsets.bottom + 168, 188);
  const manualLocationMatches = useMemo(
    () =>
      getResourceManualLocationMatches(manualSearchText, manualLocationOptions),
    [manualLocationOptions, manualSearchText],
  );

  const handleRefresh = useCallback(() => {
    setReloadVersion((current) => current + 1);
  }, []);

  const handleModeChange = useCallback((nextMode: ResourcesDirectoryMode) => {
    setMode(nextMode);
  }, []);

  const applyManualLocation = useCallback(
    (option: ResourceManualLocationOption) => {
      setLocation(option.location);
      setManualSearchText(option.location.label);
      setManualSearchFeedback(undefined);
      setIsManualSearchFocused(false);
      if (option.location.coordinate) {
        setMapCameraCenter(option.location.coordinate);
      }
    },
    [],
  );

  const handleManualSearchSubmit = useCallback(() => {
    onManualSearchPress?.();

    const matchedLocation = resolveResourceManualLocationSearch(
      manualSearchText,
      manualLocationOptions,
    );

    if (!matchedLocation) {
      setManualSearchFeedback(
        "Elige una zona de Bolivia de la lista para buscar.",
      );
      setIsManualSearchFocused(true);
      return;
    }

    applyManualLocation(matchedLocation);
  }, [
    applyManualLocation,
    manualLocationOptions,
    manualSearchText,
    onManualSearchPress,
  ]);

  const handleUseCurrentLocation = useCallback(async () => {
    onUseCurrentLocationPress?.();
    setIsResolvingLocation(true);
    setManualSearchFeedback(undefined);

    try {
      const result = await locationAdapter.resolveForegroundLocation({
        lastKnownMaxAgeMs: 30 * 60 * 1000,
        requestPermission: true,
      });
      const resolvedLocation = toResourceSearchLocationFromForeground(result);

      if (resolvedLocation) {
        setLocation(resolvedLocation);
        setManualSearchText(resolvedLocation.label ?? "Ubicación actual");
        if ("coordinate" in resolvedLocation && resolvedLocation.coordinate) {
          setMapCameraCenter(resolvedLocation.coordinate);
        }
        return;
      }

      if (
        result.kind === "permission-denied" ||
        result.kind === "permission-required"
      ) {
        setLocation({
          kind: "denied",
          label: "Ubicación desactivada",
        });
        return;
      }

      setManualSearchFeedback(
        result.kind === "unavailable" && result.reason === "outside-bolivia"
          ? "La ubicación detectada está fuera de Bolivia."
          : "No pudimos obtener tu ubicación. Busca por zona.",
      );
    } catch {
      setManualSearchFeedback(
        "No pudimos obtener tu ubicación. Busca por zona.",
      );
    } finally {
      setIsResolvingLocation(false);
    }
  }, [locationAdapter, onUseCurrentLocationPress]);

  const handleSelectAllCategories = useCallback(() => {
    setSelectedCategoryIds([]);
  }, []);

  const handleToggleCategory = useCallback((categoryId: ResourceCategoryId) => {
    setSelectedCategoryIds((current) => {
      if (current.includes(categoryId)) {
        return current.filter((id) => id !== categoryId);
      }

      return [...current, categoryId];
    });
  }, []);

  const handleNoticeAction = useCallback(
    (kind: ResourceNoticeAction["kind"]) => {
      if (kind === "manual_search") {
        onManualSearchPress?.();
        return;
      }

      if (kind === "show_all") {
        setSelectedCategoryIds([]);
        return;
      }

      if (kind === "use_current_location") {
        void handleUseCurrentLocation();
        return;
      }

      handleRefresh();
    },
    [handleRefresh, handleUseCurrentLocation, onManualSearchPress],
  );

  const renderProvider = useCallback(
    ({ item }: LegendListRenderItemProps<ResourceProviderSummaryViewModel>) => (
      <ResourceProviderCard
        id={item.id}
        name={item.name}
        categoryLabel={item.categoryLabel}
        description={item.description}
        locationLabel={item.locationLabel}
        serviceAreaLabel={item.serviceAreaLabel}
        distanceLabel={item.distanceLabel}
        isVerified={item.isVerified}
        isSponsored={item.isSponsored}
        sponsorLabel={item.sponsorLabel}
        sponsorDisclosure={item.sponsorDisclosure}
        sponsorLogoUrl={item.sponsorLogoUrl}
        sponsorImageUrl={item.sponsorImageUrl}
        availabilityLabel={item.availabilityLabel}
        emergencyLabel={item.emergencyLabel}
        imageUrl={item.logoUrl ?? item.photoUrl}
        contactLabels={item.contactLabels}
        onOpenProvider={onOpenProvider}
        onReportProvider={onReportProvider}
      />
    ),
    [onOpenProvider, onReportProvider],
  );

  const header = (
    <ResourcesHeader
      viewModel={viewModel}
      mode={mode}
      location={location}
      manualLocationMatches={manualLocationMatches}
      manualSearchFeedback={manualSearchFeedback}
      manualSearchText={manualSearchText}
      selectedCategoryIds={selectedCategoryIds}
      selectedMapProviderId={selectedMapProviderId}
      mapCameraCenter={mapCameraCenter}
      isManualSearchFocused={isManualSearchFocused}
      isResolvingLocation={isResolvingLocation}
      onModeChange={handleModeChange}
      onManualSearchTextChange={setManualSearchText}
      onManualSearchFocus={() => {
        setIsManualSearchFocused(true);
        onManualSearchPress?.();
      }}
      onManualSearchBlur={() => {
        setTimeout(() => setIsManualSearchFocused(false), 120);
      }}
      onManualSearchSubmit={handleManualSearchSubmit}
      onSelectManualLocation={applyManualLocation}
      onUseCurrentLocationPress={handleUseCurrentLocation}
      onSelectAllCategories={handleSelectAllCategories}
      onToggleCategory={handleToggleCategory}
      onOpenProvider={onOpenProvider}
      onSelectMapProvider={setSelectedMapProviderId}
      onMapCameraCenterChange={setMapCameraCenter}
      onNoticeAction={handleNoticeAction}
    />
  );

  return (
    <View style={styles.root} testID="resources-screen">
      <LegendList
        testID="resources-list"
        data={listData}
        renderItem={renderProvider}
        keyExtractor={providerKeyExtractor}
        estimatedItemSize={estimatedItemSize}
        ItemSeparatorComponent={ProviderSeparator}
        ListHeaderComponent={header}
        ListEmptyComponent={
          viewModel.state === "empty" ? (
            <ResourcesStatePanel
              title={viewModel.notice?.title ?? "No hay servicios cerca"}
              body={
                viewModel.notice?.body ??
                "Prueba con otra ubicación o cambia los filtros."
              }
              actions={viewModel.notice?.actions}
              onAction={handleNoticeAction}
            />
          ) : null
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: listBottomInset },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        refreshing={status === "loading"}
        onRefresh={handleRefresh}
        scrollIndicatorInsets={{ bottom: listBottomInset }}
      />
    </View>
  );
}

function ResourcesHeader({
  viewModel,
  mode,
  location,
  manualLocationMatches,
  manualSearchFeedback,
  manualSearchText,
  selectedCategoryIds,
  selectedMapProviderId,
  mapCameraCenter,
  isManualSearchFocused,
  isResolvingLocation,
  onModeChange,
  onManualSearchTextChange,
  onManualSearchFocus,
  onManualSearchBlur,
  onManualSearchSubmit,
  onSelectManualLocation,
  onUseCurrentLocationPress,
  onSelectAllCategories,
  onToggleCategory,
  onOpenProvider,
  onSelectMapProvider,
  onMapCameraCenterChange,
  onNoticeAction,
}: {
  viewModel: ResourcesDirectoryViewModel;
  mode: ResourcesDirectoryMode;
  location: ResourceSearchLocation;
  manualLocationMatches: readonly ResourceManualLocationOption[];
  manualSearchFeedback?: string;
  manualSearchText: string;
  selectedCategoryIds: readonly ResourceCategoryId[];
  selectedMapProviderId?: string;
  mapCameraCenter?: ResourceCoordinate;
  isManualSearchFocused: boolean;
  isResolvingLocation: boolean;
  onModeChange: (mode: ResourcesDirectoryMode) => void;
  onManualSearchTextChange: (value: string) => void;
  onManualSearchFocus: () => void;
  onManualSearchBlur: () => void;
  onManualSearchSubmit: () => void;
  onSelectManualLocation: (option: ResourceManualLocationOption) => void;
  onUseCurrentLocationPress: () => void;
  onSelectAllCategories: () => void;
  onToggleCategory: (categoryId: ResourceCategoryId) => void;
  onOpenProvider?: (providerId: string) => void;
  onSelectMapProvider: (providerId: string) => void;
  onMapCameraCenterChange: (coordinate: ResourceCoordinate) => void;
  onNoticeAction: (kind: ResourceNoticeAction["kind"]) => void;
}) {
  return (
    <View style={styles.header}>
      <ResourcesHeaderTitle locationLabel={viewModel.location.label} />
      <ResourcesSearchSection
        isFocused={isManualSearchFocused}
        isResolvingLocation={isResolvingLocation}
        manualSearchFeedback={manualSearchFeedback}
        manualSearchText={manualSearchText}
        matches={manualLocationMatches}
        onBlur={onManualSearchBlur}
        onChangeText={onManualSearchTextChange}
        onFocus={onManualSearchFocus}
        onSelectManualLocation={onSelectManualLocation}
        onSubmit={onManualSearchSubmit}
        onUseCurrentLocationPress={onUseCurrentLocationPress}
      />

      <DirectoryPresentation viewModel={viewModel} />

      <SearchBoundaryPanel viewModel={viewModel} />

      <ResourcesModeSelector activeMode={mode} onModeChange={onModeChange} />
      <ResourceCategoryFilterRow
        categories={viewModel.categories}
        resultSummaryLabel={viewModel.resultSummaryLabel}
        selectedCategoryIds={selectedCategoryIds}
        onSelectAllCategories={onSelectAllCategories}
        onToggleCategory={onToggleCategory}
      />

      <ResourcesMapSlot
        cameraCenter={mapCameraCenter}
        location={location}
        mode={mode}
        onCameraCenterChange={onMapCameraCenterChange}
        onOpenProvider={onOpenProvider}
        onSelectProvider={onSelectMapProvider}
        selectedProviderId={selectedMapProviderId}
        viewModel={viewModel}
      />
      <ResourcesNoticeSlot
        viewModel={viewModel}
        onNoticeAction={onNoticeAction}
      />
    </View>
  );
}

function ResourcesMapSlot({
  cameraCenter,
  location,
  mode,
  onCameraCenterChange,
  onOpenProvider,
  onSelectProvider,
  selectedProviderId,
  viewModel,
}: {
  cameraCenter?: ResourceCoordinate;
  location: ResourceSearchLocation;
  mode: ResourcesDirectoryMode;
  onCameraCenterChange: (coordinate: ResourceCoordinate) => void;
  onOpenProvider?: (providerId: string) => void;
  onSelectProvider: (providerId: string) => void;
  selectedProviderId?: string;
  viewModel: ResourcesDirectoryViewModel;
}) {
  if (mode !== "map") {
    return null;
  }

  return (
    <ResourcesMapPanel
      cameraCenter={cameraCenter}
      location={location}
      onCameraCenterChange={onCameraCenterChange}
      onOpenProvider={onOpenProvider}
      onSelectProvider={onSelectProvider}
      selectedProviderId={selectedProviderId}
      viewModel={viewModel}
    />
  );
}

function ResourcesNoticeSlot({
  viewModel,
  onNoticeAction,
}: {
  viewModel: ResourcesDirectoryViewModel;
  onNoticeAction: (kind: ResourceNoticeAction["kind"]) => void;
}) {
  if (!viewModel.notice || viewModel.state === "empty") {
    return null;
  }

  return (
    <ResourcesStatePanel
      title={viewModel.notice.title}
      body={viewModel.notice.body}
      actions={viewModel.notice.actions}
      onAction={onNoticeAction}
    />
  );
}

function ResourcesHeaderTitle({ locationLabel }: { locationLabel: string }) {
  return (
    <View style={styles.titleRow}>
      <View style={styles.titleIcon}>
        <ResourceScreenIcon
          color={resourcesColors.surface}
          name="paw"
          size={23}
        />
      </View>
      <View style={styles.titleCopy}>
        <Text selectable style={styles.screenTitle}>
          Recursos
        </Text>
        <Text selectable style={styles.locationLabel}>
          {locationLabel}
        </Text>
      </View>
    </View>
  );
}

function ResourcesSearchSection({
  isFocused,
  isResolvingLocation,
  manualSearchFeedback,
  manualSearchText,
  matches,
  onBlur,
  onChangeText,
  onFocus,
  onSelectManualLocation,
  onSubmit,
  onUseCurrentLocationPress,
}: {
  isFocused: boolean;
  isResolvingLocation: boolean;
  manualSearchFeedback?: string;
  manualSearchText: string;
  matches: readonly ResourceManualLocationOption[];
  onBlur: () => void;
  onChangeText: (value: string) => void;
  onFocus: () => void;
  onSelectManualLocation: (option: ResourceManualLocationOption) => void;
  onSubmit: () => void;
  onUseCurrentLocationPress: () => void;
}) {
  return (
    <View style={styles.searchSection}>
      <View style={styles.searchRow}>
        <View style={styles.searchButton}>
          <ResourceScreenIcon
            color={resourcesColors.muted}
            name="magnify"
            size={18}
          />
          <TextInput
            accessibilityLabel="Buscar ciudad, barrio o punto en Bolivia"
            autoCapitalize="words"
            autoCorrect={false}
            onBlur={onBlur}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onSubmitEditing={onSubmit}
            placeholder="Ciudad, barrio o punto en Bolivia"
            placeholderTextColor={resourcesColors.muted}
            returnKeyType="search"
            style={styles.searchInput}
            testID="resources-search-input"
            value={manualSearchText}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Usar ubicación actual"
          disabled={isResolvingLocation}
          onPress={onUseCurrentLocationPress}
          testID="resources-current-location"
          style={({ pressed }) => [
            styles.iconButton,
            pressed ? styles.pressed : null,
            isResolvingLocation ? styles.disabled : null,
          ]}
        >
          {isResolvingLocation ? (
            <ActivityIndicator color={resourcesColors.surface} size="small" />
          ) : (
            <ResourceScreenIcon
              color={resourcesColors.surface}
              name="crosshairs-gps"
              size={21}
            />
          )}
        </Pressable>
      </View>

      {isFocused || manualSearchFeedback ? (
        <ManualLocationSuggestions
          feedback={manualSearchFeedback}
          matches={matches}
          onSelectManualLocation={onSelectManualLocation}
        />
      ) : null}
    </View>
  );
}

function ResourcesModeSelector({
  activeMode,
  onModeChange,
}: {
  activeMode: ResourcesDirectoryMode;
  onModeChange: (mode: ResourcesDirectoryMode) => void;
}) {
  return (
    <View style={styles.segmented}>
      <ModeButton
        label="Lista"
        iconName="format-list-bulleted"
        mode="list"
        activeMode={activeMode}
        onModeChange={onModeChange}
      />
      <ModeButton
        label="Mapa"
        iconName="map"
        mode="map"
        activeMode={activeMode}
        onModeChange={onModeChange}
      />
    </View>
  );
}

function ResourceCategoryFilterRow({
  categories,
  resultSummaryLabel,
  selectedCategoryIds,
  onSelectAllCategories,
  onToggleCategory,
}: {
  categories: ResourcesDirectoryViewModel["categories"];
  resultSummaryLabel: string;
  selectedCategoryIds: readonly ResourceCategoryId[];
  onSelectAllCategories: () => void;
  onToggleCategory: (categoryId: ResourceCategoryId) => void;
}) {
  const hasAllCategoriesSelected = selectedCategoryIds.length === 0;

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoriesBlock}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: hasAllCategoriesSelected }}
          onPress={onSelectAllCategories}
          testID="resources-category-all"
          style={({ pressed }) => [
            styles.categoryChip,
            hasAllCategoriesSelected ? styles.categoryChipSelected : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text
            selectable
            style={[
              styles.categoryChipText,
              hasAllCategoriesSelected ? styles.categoryChipTextSelected : null,
            ]}
          >
            Todos
          </Text>
        </Pressable>
        <ScrollView
          horizontal
          contentContainerStyle={styles.categoryListContent}
          showsHorizontalScrollIndicator={false}
        >
          {categories.map((category) => (
            <View key={category.id} style={styles.categoryChipWrap}>
              <CategoryChip
                id={category.id}
                label={category.label}
                isSelected={category.isSelected}
                onToggleCategory={onToggleCategory}
              />
              <CategorySeparator />
            </View>
          ))}
        </ScrollView>
      </View>

      <Text selectable style={styles.resultSummary}>
        {resultSummaryLabel}
      </Text>
    </View>
  );
}

function DirectoryPresentation({
  viewModel,
}: {
  viewModel: ResourcesDirectoryViewModel;
}) {
  return (
    <View style={styles.directoryPanel}>
      <View style={styles.directoryHeaderRow}>
        <Text selectable style={styles.directoryLabel}>
          {viewModel.presentation.sectionLabel}
        </Text>
        <Text selectable style={styles.directoryAccessLabel}>
          {viewModel.access.requiresSignIn
            ? "Requiere iniciar sesión"
            : "Disponible sin iniciar sesión"}
        </Text>
      </View>
      <Text selectable style={styles.directoryTitle}>
        {viewModel.presentation.resultKindLabel}
      </Text>
      <Text selectable style={styles.directoryBody}>
        {viewModel.presentation.recoverySeparationCopy}
      </Text>
    </View>
  );
}

function SearchBoundaryPanel({
  viewModel,
}: {
  viewModel: ResourcesDirectoryViewModel;
}) {
  return (
    <View style={styles.boundaryPanel}>
      <View style={styles.boundaryTitleRow}>
        <ResourceScreenIcon
          color={resourcesColors.tertiary}
          name="crosshairs-gps"
          size={16}
        />
        <Text selectable style={styles.boundaryTitle}>
          {viewModel.searchBoundary.title}
        </Text>
      </View>
      <Text selectable style={styles.boundaryBody}>
        {viewModel.searchBoundary.body}
      </Text>
      <Text selectable style={styles.boundaryPrecision}>
        {viewModel.searchBoundary.precisionLabel}
      </Text>
    </View>
  );
}

function ModeButton({
  label,
  iconName,
  mode,
  activeMode,
  onModeChange,
}: {
  label: string;
  iconName: ResourceScreenIconName;
  mode: ResourcesDirectoryMode;
  activeMode: ResourcesDirectoryMode;
  onModeChange: (mode: ResourcesDirectoryMode) => void;
}) {
  const handlePress = useCallback(() => {
    onModeChange(mode);
  }, [mode, onModeChange]);
  const isActive = activeMode === mode;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      testID={`resources-mode-${mode}`}
      style={({ pressed }) => [
        styles.modeButton,
        isActive ? styles.modeButtonActive : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <ResourceScreenIcon
        color={isActive ? resourcesColors.surface : resourcesColors.muted}
        name={iconName}
        size={16}
      />
      <Text
        selectable
        style={[styles.modeText, isActive ? styles.modeTextActive : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CategoryChip({
  id,
  label,
  isSelected,
  onToggleCategory,
}: {
  id: ResourceCategoryId;
  label: string;
  isSelected: boolean;
  onToggleCategory: (categoryId: ResourceCategoryId) => void;
}) {
  const handlePress = useCallback(() => {
    onToggleCategory(id);
  }, [id, onToggleCategory]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={handlePress}
      testID={`resources-category-${id}`}
      style={({ pressed }) => [
        styles.categoryChip,
        isSelected ? styles.categoryChipSelected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text
        selectable
        style={[
          styles.categoryChipText,
          isSelected ? styles.categoryChipTextSelected : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ManualLocationSuggestions({
  feedback,
  matches,
  onSelectManualLocation,
}: {
  feedback?: string;
  matches: readonly ResourceManualLocationOption[];
  onSelectManualLocation: (option: ResourceManualLocationOption) => void;
}) {
  return (
    <View style={styles.searchSuggestionsPanel}>
      {feedback ? (
        <Text selectable style={styles.searchFeedback}>
          {feedback}
        </Text>
      ) : null}
      <ScrollView
        testID="resources-location-suggestions"
        horizontal
        contentContainerStyle={styles.searchSuggestionsContent}
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
      >
        {matches.map((option) => (
          <ManualLocationChip
            key={option.location.label}
            option={option}
            onSelectManualLocation={onSelectManualLocation}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ManualLocationChip({
  option,
  onSelectManualLocation,
}: {
  option: ResourceManualLocationOption;
  onSelectManualLocation: (option: ResourceManualLocationOption) => void;
}) {
  const handlePress = useCallback(() => {
    onSelectManualLocation(option);
  }, [onSelectManualLocation, option]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      testID={`resources-location-${toTestIdSegment(option.location.label)}`}
      style={({ pressed }) => [
        styles.searchSuggestionChip,
        pressed ? styles.pressed : null,
      ]}
    >
      <ResourceScreenIcon
        color={resourcesColors.primary}
        name="map-marker"
        size={15}
      />
      <Text numberOfLines={1} style={styles.searchSuggestionText}>
        {option.location.label}
      </Text>
    </Pressable>
  );
}

function ResourcesMapPanel({
  cameraCenter,
  location,
  onCameraCenterChange,
  onOpenProvider,
  onSelectProvider,
  selectedProviderId,
  viewModel,
}: {
  cameraCenter?: ResourceCoordinate;
  location: ResourceSearchLocation;
  onCameraCenterChange: (coordinate: ResourceCoordinate) => void;
  onOpenProvider?: (providerId: string) => void;
  onSelectProvider: (providerId: string) => void;
  selectedProviderId?: string;
  viewModel: ResourcesDirectoryViewModel;
}) {
  const providerState = getNativeMapProviderState();
  const pins = viewModel.results.filter(hasMapCoordinate);
  const selectedProvider =
    pins.find((provider) => provider.id === selectedProviderId) ?? pins[0];
  const currentLocation = getMapSearchCoordinate(location);

  if (pins.length === 0) {
    return (
      <View style={styles.mapEmptyPanel} testID="resources-map-panel">
        <ResourceScreenIcon
          color={resourcesColors.primary}
          name="map-marker-off"
          size={28}
        />
        <Text selectable style={styles.mapEmptyTitle}>
          Sin puntos para mapa
        </Text>
        <Text selectable style={styles.mapEmptyBody}>
          Estos resultados todavía no tienen zona pública aproximada.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.resourceMapPanel} testID="resources-map-panel">
      <View style={styles.resourceMapHeader}>
        <View>
          <Text selectable style={styles.resourceMapTitle}>
            Mapa de servicios
          </Text>
          <Text selectable style={styles.resourceMapMeta}>
            {viewModel.resultSummaryLabel}
          </Text>
        </View>
        <Text selectable style={styles.resourceMapPrivacy}>
          Zona aprox.
        </Text>
      </View>

      {providerState.kind === "error" ? (
        <ResourcesMapStatusPanel providerState={providerState} />
      ) : (
        <View style={styles.resourceMapFrame}>
          <MapView
            initialRegion={buildResourceMapRegion({
              cameraCenter,
              currentLocation,
              pins,
            })}
            loadingEnabled
            mapPadding={{ bottom: 12, left: 12, right: 12, top: 12 }}
            onRegionChangeComplete={(region) =>
              onCameraCenterChange({
                latitude: region.latitude,
                longitude: region.longitude,
              })
            }
            provider={PROVIDER_GOOGLE}
            style={styles.resourceMap}
          >
            {pins.map((provider) => (
              <Marker
                coordinate={provider.approximateLocation}
                identifier={provider.id}
                key={provider.id}
                onPress={() => onSelectProvider(provider.id)}
                title={provider.name}
              >
                <View
                  style={[
                    styles.resourceMapMarker,
                    provider.id === selectedProvider?.id
                      ? styles.resourceMapMarkerSelected
                      : null,
                  ]}
                >
                  <ResourceScreenIcon
                    color={resourcesColors.surface}
                    name={getMapMarkerIcon(provider.categoryLabel)}
                    size={18}
                  />
                </View>
              </Marker>
            ))}
            {currentLocation ? (
              <Marker
                coordinate={currentLocation}
                identifier="resource-search-origin"
                title="Zona de búsqueda"
              >
                <View style={styles.currentLocationMarker}>
                  <View style={styles.currentLocationDot} />
                </View>
              </Marker>
            ) : null}
          </MapView>
        </View>
      )}

      {selectedProvider ? (
        <ResourceMapSelectedProvider
          onOpenProvider={onOpenProvider}
          provider={selectedProvider}
        />
      ) : null}

      <ScrollView
        horizontal
        contentContainerStyle={styles.mapProviderList}
        showsHorizontalScrollIndicator={false}
      >
        {pins.map((provider) => {
          const isSelected = provider.id === selectedProvider?.id;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={`map-list:${provider.id}`}
              onPress={() => onSelectProvider(provider.id)}
              testID={`resources-map-provider-${provider.id}`}
              style={[
                styles.mapProviderChip,
                isSelected ? styles.mapProviderChipSelected : null,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.mapProviderChipText,
                  isSelected ? styles.mapProviderChipTextSelected : null,
                ]}
              >
                {provider.name}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.mapProviderChipMeta,
                  isSelected ? styles.mapProviderChipTextSelected : null,
                ]}
              >
                {provider.locationLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ResourceMapSelectedProvider({
  onOpenProvider,
  provider,
}: {
  onOpenProvider?: (providerId: string) => void;
  provider: ResourceProviderSummaryViewModel & {
    approximateLocation: ResourceCoordinate;
  };
}) {
  const handleOpen = useCallback(() => {
    onOpenProvider?.(provider.id);
  }, [onOpenProvider, provider.id]);

  const content = (
    <>
      <View style={styles.mapSelectedIcon}>
        <ResourceScreenIcon
          color={resourcesColors.primary}
          name={getMapMarkerIcon(provider.categoryLabel)}
          size={21}
        />
      </View>
      <View style={styles.mapSelectedCopy}>
        <Text numberOfLines={1} style={styles.mapSelectedTitle}>
          {provider.name}
        </Text>
        <Text numberOfLines={1} style={styles.mapSelectedMeta}>
          {[provider.distanceLabel, provider.locationLabel]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      {onOpenProvider ? (
        <Text style={styles.mapSelectedAction}>Ver</Text>
      ) : null}
    </>
  );

  if (!onOpenProvider) {
    return (
      <View
        style={styles.mapSelectedProvider}
        testID="resources-map-selected-provider"
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handleOpen}
      testID="resources-map-selected-provider"
      style={({ pressed }) => [
        styles.mapSelectedProvider,
        pressed ? styles.pressed : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

function ResourcesMapStatusPanel({
  providerState,
}: {
  providerState: Extract<ReportMapProviderState, { kind: "error" }>;
}) {
  return (
    <View style={styles.mapStatusPanel}>
      <ResourceScreenIcon
        color={resourcesColors.tertiary}
        name="alert-outline"
        size={28}
      />
      <Text selectable style={styles.mapStatusTitle}>
        Mapa no disponible
      </Text>
      <Text selectable style={styles.mapStatusBody}>
        {providerState.message}
      </Text>
    </View>
  );
}

function ResourcesStatePanel({
  title,
  body,
  actions,
  onAction,
}: {
  title: string;
  body: string;
  actions?: readonly ResourceNoticeAction[];
  onAction?: (kind: ResourceNoticeAction["kind"]) => void;
}) {
  return (
    <View style={styles.statePanel}>
      <Text selectable style={styles.stateTitle}>
        {title}
      </Text>
      <Text selectable style={styles.stateBody}>
        {body}
      </Text>
      {actions !== undefined && actions.length > 0 ? (
        <View style={styles.stateActions}>
          {actions.map((action, index) => (
            <StateActionButton
              key={action.kind}
              action={action}
              isPrimary={index === 0}
              onAction={onAction}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function StateActionButton({
  action,
  isPrimary,
  onAction,
}: {
  action: ResourceNoticeAction;
  isPrimary: boolean;
  onAction?: (kind: ResourceNoticeAction["kind"]) => void;
}) {
  const handlePress = useCallback(() => {
    onAction?.(action.kind);
  }, [action.kind, onAction]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [
        isPrimary ? styles.statePrimaryButton : styles.stateSecondaryButton,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text
        selectable
        style={isPrimary ? styles.statePrimaryText : styles.stateSecondaryText}
      >
        {action.label}
      </Text>
    </Pressable>
  );
}

function getVisibleResults(viewModel: ResourcesDirectoryViewModel) {
  if (
    viewModel.state === "loading" ||
    viewModel.state === "error" ||
    viewModel.state === "location_denied"
  ) {
    return [];
  }

  return viewModel.results;
}

function providerKeyExtractor(provider: ResourceProviderSummaryViewModel) {
  return provider.id;
}

function ProviderSeparator() {
  return <View style={styles.providerSeparator} />;
}

function CategorySeparator() {
  return <View style={styles.categorySeparator} />;
}

function ResourceScreenIcon({
  color,
  name,
  size,
}: {
  color: string;
  name: ResourceScreenIconName;
  size: number;
}) {
  return <MaterialCommunityIcons color={color} name={name} size={size} />;
}

function toTestIdSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getInitialManualSearchText(location: ResourceSearchLocation) {
  return location.kind === "manual" ? location.label : "";
}

function toResourceSearchLocationFromForeground(
  result: NearbyForegroundLocationResult,
): ResourceSearchLocation | undefined {
  if (result.kind !== "available") {
    return undefined;
  }

  return toResourceSearchLocationFromNearby(result.location);
}

function toResourceSearchLocationFromNearby(
  location: NearbySearchLocation,
): ResourceSearchLocation | undefined {
  if (!location.coordinates) {
    return undefined;
  }

  return {
    coordinate: { ...location.coordinates },
    countryCode: "BO",
    kind: location.source === "last" ? "last" : "current",
    label: location.label,
    locationCellLabel: location.locationCellLabel,
  };
}

function hasMapCoordinate(
  provider: ResourceProviderSummaryViewModel,
): provider is ResourceProviderSummaryViewModel & {
  approximateLocation: ResourceCoordinate & { label: string };
} {
  return (
    provider.approximateLocation !== undefined &&
    Number.isFinite(provider.approximateLocation.latitude) &&
    Number.isFinite(provider.approximateLocation.longitude)
  );
}

function getMapSearchCoordinate(
  location: ResourceSearchLocation,
): ResourceCoordinate | undefined {
  return "coordinate" in location ? location.coordinate : undefined;
}

function buildResourceMapRegion({
  cameraCenter,
  currentLocation,
  pins,
}: {
  cameraCenter?: ResourceCoordinate;
  currentLocation?: ResourceCoordinate;
  pins: readonly (ResourceProviderSummaryViewModel & {
    approximateLocation: ResourceCoordinate;
  })[];
}) {
  const center =
    cameraCenter ?? currentLocation ?? pins[0]?.approximateLocation;

  return {
    latitude: center?.latitude ?? -16.5,
    latitudeDelta: 0.08,
    longitude: center?.longitude ?? -68.1193,
    longitudeDelta: 0.08,
  };
}

function getMapMarkerIcon(categoryLabel: string): ResourceScreenIconName {
  const normalizedLabel = categoryLabel.toLowerCase();

  if (normalizedLabel.includes("veterin")) {
    return "medical-bag";
  }

  if (normalizedLabel.includes("refug")) {
    return "home-heart";
  }

  if (normalizedLabel.includes("pelu")) {
    return "content-cut";
  }

  if (normalizedLabel.includes("alimento")) {
    return "food-variant";
  }

  if (normalizedLabel.includes("tienda")) {
    return "storefront-outline";
  }

  if (normalizedLabel.includes("transporte")) {
    return "car-estate";
  }

  return "paw";
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: resourcesColors.background,
  },
  listContent: {
    padding: 16,
  },
  header: {
    gap: 16,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titleIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: resourcesColors.primary,
    boxShadow: resourcesShadow.primary,
  },
  titleIconImage: {
    width: 23,
    height: 23,
  },
  titleCopy: {
    flex: 1,
    minWidth: 0,
  },
  screenTitle: {
    color: resourcesColors.primary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
  },
  locationLabel: {
    color: resourcesColors.muted,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  searchSection: {
    gap: 8,
  },
  searchButton: {
    minHeight: 52,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    borderCurve: "continuous",
    backgroundColor: resourcesColors.surface,
    borderWidth: 1,
    borderColor: resourcesColors.border,
    paddingHorizontal: 14,
    boxShadow: resourcesShadow.soft,
  },
  searchIcon: {
    width: 18,
    height: 18,
  },
  searchInput: {
    flex: 1,
    color: resourcesColors.text,
    fontSize: 15,
    fontWeight: "600",
    minHeight: 44,
    padding: 0,
  },
  searchSuggestionsPanel: {
    gap: 8,
    marginTop: -6,
  },
  searchSuggestionsContent: {
    gap: 8,
    paddingRight: 2,
  },
  searchSuggestionChip: {
    alignItems: "center",
    backgroundColor: resourcesColors.surface,
    borderColor: resourcesColors.border,
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    maxWidth: 220,
    minHeight: 36,
    paddingHorizontal: 11,
  },
  searchSuggestionText: {
    color: resourcesColors.text,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17,
  },
  searchFeedback: {
    color: resourcesColors.tertiary,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  directoryPanel: {
    gap: 8,
    borderRadius: 18,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: resourcesColors.border,
    backgroundColor: resourcesColors.surface,
    padding: 14,
    boxShadow: resourcesShadow.soft,
  },
  directoryHeaderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  directoryLabel: {
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: resourcesColors.primarySoft,
    color: resourcesColors.primary,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  directoryAccessLabel: {
    color: resourcesColors.secondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  directoryTitle: {
    color: resourcesColors.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
  },
  directoryBody: {
    color: resourcesColors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  boundaryPanel: {
    gap: 7,
    borderRadius: 18,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#C9DDEB",
    backgroundColor: "#F1F7FB",
    padding: 14,
  },
  boundaryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  boundaryIcon: {
    width: 16,
    height: 16,
  },
  boundaryTitle: {
    flex: 1,
    color: resourcesColors.tertiary,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
  },
  boundaryBody: {
    color: resourcesColors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  boundaryPrecision: {
    color: resourcesColors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: resourcesColors.primary,
    boxShadow: resourcesShadow.primary,
  },
  disabled: {
    opacity: 0.72,
  },
  iconButtonImage: {
    width: 20,
    height: 20,
  },
  segmented: {
    flexDirection: "row",
    gap: 6,
    borderRadius: 18,
    borderCurve: "continuous",
    backgroundColor: resourcesColors.surfaceMuted,
    padding: 5,
  },
  modeButton: {
    minHeight: 42,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 14,
    borderCurve: "continuous",
  },
  modeButtonActive: {
    backgroundColor: resourcesColors.primary,
  },
  modeIcon: {
    width: 16,
    height: 16,
  },
  modeText: {
    color: resourcesColors.muted,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },
  modeTextActive: {
    color: resourcesColors.surface,
  },
  categoriesBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categorySection: {
    gap: 8,
  },
  categoryListContent: {
    paddingRight: 2,
  },
  categoryChipWrap: {
    flexDirection: "row",
  },
  categoryChip: {
    minHeight: 40,
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: resourcesColors.surface,
    borderWidth: 1,
    borderColor: resourcesColors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  categoryChipSelected: {
    backgroundColor: resourcesColors.primary,
    borderColor: resourcesColors.primary,
  },
  categoryChipText: {
    color: resourcesColors.muted,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "800",
  },
  categoryChipTextSelected: {
    color: resourcesColors.surface,
  },
  providerSeparator: {
    height: 12,
  },
  categorySeparator: {
    width: 8,
  },
  resultSummary: {
    color: resourcesColors.primary,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
  },
  resourceMapPanel: {
    backgroundColor: resourcesColors.surface,
    borderColor: resourcesColors.border,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    boxShadow: resourcesShadow.soft,
    gap: 12,
    padding: 12,
  },
  resourceMapHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  resourceMapTitle: {
    color: resourcesColors.text,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
  },
  resourceMapMeta: {
    color: resourcesColors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  resourceMapPrivacy: {
    backgroundColor: resourcesColors.primarySoft,
    borderRadius: 999,
    color: resourcesColors.primary,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  resourceMapFrame: {
    height: 260,
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: resourcesColors.surfaceMuted,
    borderWidth: 1,
    borderColor: resourcesColors.border,
  },
  resourceMap: {
    flex: 1,
  },
  resourceMapMarker: {
    alignItems: "center",
    backgroundColor: resourcesColors.primary,
    borderColor: resourcesColors.surface,
    borderRadius: 22,
    borderWidth: 2,
    boxShadow: resourcesShadow.primary,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 42,
  },
  resourceMapMarkerSelected: {
    backgroundColor: resourcesColors.tertiary,
    minHeight: 48,
    minWidth: 48,
  },
  currentLocationMarker: {
    alignItems: "center",
    backgroundColor: "rgba(15, 118, 101, 0.18)",
    borderColor: resourcesColors.surface,
    borderRadius: 16,
    borderWidth: 2,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  currentLocationDot: {
    backgroundColor: resourcesColors.primary,
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  mapSelectedProvider: {
    alignItems: "center",
    backgroundColor: resourcesColors.surfaceMuted,
    borderColor: resourcesColors.border,
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 62,
    padding: 10,
  },
  mapSelectedIcon: {
    alignItems: "center",
    backgroundColor: resourcesColors.primarySoft,
    borderRadius: 13,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  mapSelectedCopy: {
    flex: 1,
    minWidth: 0,
  },
  mapSelectedTitle: {
    color: resourcesColors.text,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
  },
  mapSelectedMeta: {
    color: resourcesColors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
  },
  mapSelectedAction: {
    color: resourcesColors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  mapProviderList: {
    gap: 8,
    paddingRight: 2,
  },
  mapProviderChip: {
    borderColor: resourcesColors.border,
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 210,
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapProviderChipSelected: {
    backgroundColor: resourcesColors.primary,
    borderColor: resourcesColors.primary,
  },
  mapProviderChipText: {
    color: resourcesColors.text,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
  },
  mapProviderChipMeta: {
    color: resourcesColors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  mapProviderChipTextSelected: {
    color: resourcesColors.surface,
  },
  mapStatusPanel: {
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  mapStatusTitle: {
    color: resourcesColors.tertiary,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
  },
  mapStatusBody: {
    color: resourcesColors.text,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  mapEmptyPanel: {
    alignItems: "center",
    backgroundColor: resourcesColors.surface,
    borderColor: resourcesColors.border,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  mapEmptyTitle: {
    color: resourcesColors.text,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
  },
  mapEmptyBody: {
    color: resourcesColors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  statePanel: {
    gap: 10,
    borderRadius: 18,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: resourcesColors.border,
    backgroundColor: resourcesColors.surface,
    padding: 16,
    boxShadow: resourcesShadow.soft,
  },
  stateTitle: {
    color: resourcesColors.text,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
  },
  stateBody: {
    color: resourcesColors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  stateActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statePrimaryButton: {
    minHeight: 42,
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: resourcesColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statePrimaryText: {
    color: resourcesColors.surface,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "800",
  },
  stateSecondaryButton: {
    minHeight: 42,
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: resourcesColors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  stateSecondaryText: {
    color: resourcesColors.primary,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
});
