import type { LegendListRenderItemProps } from "@legendapp/list";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LegendList } from "@legendapp/list";

import type {
  ResourceCategoryId,
  ResourceProviderSummary,
  ResourcesDirectoryMode,
  ResourcesDirectoryStatus,
  ResourceSearchLocation,
} from "./resource-types";
import type {
  ResourceCategoryOption,
  ResourceProviderSummaryViewModel,
  ResourcesDirectoryViewModel,
} from "./resources-view-model";
import type { ResourcesAdapter } from "./static-resources-adapter";
import { ResourceProviderCard } from "./resource-provider-card";
import { resourcesColors, resourcesShadow } from "./resources-theme";
import {
  buildResourcesDirectoryViewModel,
  resourceCategoryOptions,
} from "./resources-view-model";
import { createStaticResourcesAdapter } from "./static-resources-adapter";

const defaultResourcesAdapter = createStaticResourcesAdapter();

interface ResourcesScreenProps {
  adapter?: ResourcesAdapter;
  initialLocation?: ResourceSearchLocation;
  initialMode?: ResourcesDirectoryMode;
  radiusMeters?: number;
  isOffline?: boolean;
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
  onOpenProvider,
  onReportProvider,
  onManualSearchPress,
  onUseCurrentLocationPress,
}: ResourcesScreenProps) {
  const [mode, setMode] = useState<ResourcesDirectoryMode>(initialMode);
  const [location, setLocation] =
    useState<ResourceSearchLocation>(initialLocation);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<
    ResourceCategoryId[]
  >([]);
  const [providers, setProviders] = useState<
    readonly ResourceProviderSummary[]
  >([]);
  const [status, setStatus] = useState<ResourcesDirectoryStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
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

    adapter
      .searchProviders(searchQuery)
      .then((nextProviders) => {
        if (isCurrent) {
          setProviders(nextProviders);
          setStatus("ready");
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setStatus("error");
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

  const viewModel = useMemo(
    () =>
      buildResourcesDirectoryViewModel({
        providers,
        selectedCategoryIds,
        location,
        mode,
        status,
        isOffline,
        errorMessage,
      }),
    [
      errorMessage,
      isOffline,
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

  const handleRefresh = useCallback(() => {
    setReloadVersion((current) => current + 1);
  }, []);

  const handleModeChange = useCallback((nextMode: ResourcesDirectoryMode) => {
    setMode(nextMode);
  }, []);

  const handleUseCurrentLocation = useCallback(() => {
    setLocation({
      kind: "current",
    });
    onUseCurrentLocationPress?.();
  }, [onUseCurrentLocationPress]);

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

  const renderProvider = useCallback(
    ({ item }: LegendListRenderItemProps<ResourceProviderSummaryViewModel>) => (
      <ResourceProviderCard
        id={item.id}
        name={item.name}
        categoryLabel={item.categoryLabel}
        description={item.description}
        locationLabel={item.locationLabel}
        distanceLabel={item.distanceLabel}
        isVerified={item.isVerified}
        isSponsored={item.isSponsored}
        sponsorLabel={item.sponsorLabel}
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
      selectedCategoryIds={selectedCategoryIds}
      onModeChange={handleModeChange}
      onManualSearchPress={onManualSearchPress}
      onUseCurrentLocationPress={handleUseCurrentLocation}
      onSelectAllCategories={handleSelectAllCategories}
      onToggleCategory={handleToggleCategory}
    />
  );

  return (
    <View style={styles.root}>
      <LegendList
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
              primaryActionLabel="Buscar otra zona"
              onPrimaryAction={onManualSearchPress}
            />
          ) : null
        }
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        refreshing={status === "loading"}
        onRefresh={handleRefresh}
      />
    </View>
  );
}

function ResourcesHeader({
  viewModel,
  mode,
  selectedCategoryIds,
  onModeChange,
  onManualSearchPress,
  onUseCurrentLocationPress,
  onSelectAllCategories,
  onToggleCategory,
}: {
  viewModel: ResourcesDirectoryViewModel;
  mode: ResourcesDirectoryMode;
  selectedCategoryIds: readonly ResourceCategoryId[];
  onModeChange: (mode: ResourcesDirectoryMode) => void;
  onManualSearchPress?: () => void;
  onUseCurrentLocationPress: () => void;
  onSelectAllCategories: () => void;
  onToggleCategory: (categoryId: ResourceCategoryId) => void;
}) {
  const renderCategory = useCallback(
    ({ item }: LegendListRenderItemProps<ResourceCategoryOption>) => (
      <CategoryChip
        id={item.id}
        label={item.label}
        isSelected={selectedCategoryIds.includes(item.id)}
        onToggleCategory={onToggleCategory}
      />
    ),
    [onToggleCategory, selectedCategoryIds],
  );

  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleIcon}>
          <Image
            source="sf:pawprint.fill"
            style={styles.titleIconImage}
            tintColor={resourcesColors.surface}
          />
        </View>
        <View style={styles.titleCopy}>
          <Text selectable style={styles.screenTitle}>
            Recursos
          </Text>
          <Text selectable style={styles.locationLabel}>
            {viewModel.location.label}
          </Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onManualSearchPress}
          style={({ pressed }) => [
            styles.searchButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Image
            source="sf:magnifyingglass"
            style={styles.searchIcon}
            tintColor={resourcesColors.muted}
          />
          <Text selectable numberOfLines={1} style={styles.searchText}>
            Ciudad, barrio o punto en Bolivia
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Usar ubicación actual"
          onPress={onUseCurrentLocationPress}
          style={({ pressed }) => [
            styles.iconButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Image
            source="sf:location.fill"
            style={styles.iconButtonImage}
            tintColor={resourcesColors.surface}
          />
        </Pressable>
      </View>

      <View style={styles.segmented}>
        <ModeButton
          label="Lista"
          iconName="list.bullet"
          mode="list"
          activeMode={mode}
          onModeChange={onModeChange}
        />
        <ModeButton
          label="Mapa"
          iconName="map.fill"
          mode="map"
          activeMode={mode}
          onModeChange={onModeChange}
        />
      </View>

      <View style={styles.categoriesBlock}>
        <Pressable
          accessibilityRole="button"
          onPress={onSelectAllCategories}
          style={({ pressed }) => [
            styles.categoryChip,
            selectedCategoryIds.length === 0
              ? styles.categoryChipSelected
              : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text
            selectable
            style={[
              styles.categoryChipText,
              selectedCategoryIds.length === 0
                ? styles.categoryChipTextSelected
                : null,
            ]}
          >
            Todos
          </Text>
        </Pressable>
        <LegendList
          horizontal
          data={resourceCategoryOptions}
          renderItem={renderCategory}
          keyExtractor={categoryKeyExtractor}
          estimatedItemSize={116}
          ItemSeparatorComponent={CategorySeparator}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryListContent}
        />
      </View>

      {mode === "map" ? <ResourcesMapPreview viewModel={viewModel} /> : null}

      {viewModel.notice && viewModel.state !== "empty" ? (
        <ResourcesStatePanel
          title={viewModel.notice.title}
          body={viewModel.notice.body}
          primaryActionLabel={
            viewModel.state === "location_denied"
              ? "Buscar zona manual"
              : undefined
          }
          secondaryActionLabel={
            viewModel.state === "location_denied" ? "Usar ubicación" : undefined
          }
          onPrimaryAction={onManualSearchPress}
          onSecondaryAction={onUseCurrentLocationPress}
        />
      ) : null}
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
  iconName: string;
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
      style={({ pressed }) => [
        styles.modeButton,
        isActive ? styles.modeButtonActive : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Image
        source={`sf:${iconName}`}
        style={styles.modeIcon}
        tintColor={isActive ? resourcesColors.surface : resourcesColors.muted}
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
      onPress={handlePress}
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

function ResourcesMapPreview({
  viewModel,
}: {
  viewModel: ResourcesDirectoryViewModel;
}) {
  return (
    <View style={styles.mapPreview}>
      <View style={styles.mapPinPrimary}>
        <Image
          source="sf:cross.case.fill"
          style={styles.mapPinIcon}
          tintColor={resourcesColors.surface}
        />
      </View>
      <View style={styles.mapPinSecondary}>
        <Image
          source="sf:house.fill"
          style={styles.mapPinIcon}
          tintColor={resourcesColors.surface}
        />
      </View>
      <View style={styles.mapPanel}>
        <Text selectable style={styles.mapTitle}>
          Vista de mapa
        </Text>
        <Text selectable style={styles.mapCopy}>
          {viewModel.results.length} recursos por radio PostGIS. Las zonas son
          aproximadas.
        </Text>
      </View>
    </View>
  );
}

function ResourcesStatePanel({
  title,
  body,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
}: {
  title: string;
  body: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}) {
  return (
    <View style={styles.statePanel}>
      <Text selectable style={styles.stateTitle}>
        {title}
      </Text>
      <Text selectable style={styles.stateBody}>
        {body}
      </Text>
      {primaryActionLabel ? (
        <View style={styles.stateActions}>
          <Pressable
            accessibilityRole="button"
            onPress={onPrimaryAction}
            style={({ pressed }) => [
              styles.statePrimaryButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text selectable style={styles.statePrimaryText}>
              {primaryActionLabel}
            </Text>
          </Pressable>
          {secondaryActionLabel ? (
            <Pressable
              accessibilityRole="button"
              onPress={onSecondaryAction}
              style={({ pressed }) => [
                styles.stateSecondaryButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text selectable style={styles.stateSecondaryText}>
                {secondaryActionLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
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

function categoryKeyExtractor(category: ResourceCategoryOption) {
  return category.id;
}

function ProviderSeparator() {
  return <View style={styles.providerSeparator} />;
}

function CategorySeparator() {
  return <View style={styles.categorySeparator} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: resourcesColors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
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
  searchText: {
    flex: 1,
    color: resourcesColors.muted,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
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
  categoryListContent: {
    paddingRight: 2,
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
  mapPreview: {
    minHeight: 190,
    borderRadius: 22,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: "#F2E4E2",
    borderWidth: 1,
    borderColor: resourcesColors.border,
    padding: 16,
    justifyContent: "flex-end",
  },
  mapPinPrimary: {
    position: "absolute",
    top: 44,
    left: "42%",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: resourcesColors.primary,
    boxShadow: resourcesShadow.primary,
  },
  mapPinSecondary: {
    position: "absolute",
    top: 86,
    right: 42,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: resourcesColors.tertiary,
    boxShadow: resourcesShadow.soft,
  },
  mapPinIcon: {
    width: 18,
    height: 18,
  },
  mapPanel: {
    gap: 4,
    borderRadius: 16,
    borderCurve: "continuous",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    padding: 14,
  },
  mapTitle: {
    color: resourcesColors.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
  },
  mapCopy: {
    color: resourcesColors.muted,
    fontSize: 13,
    lineHeight: 18,
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
