import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LegendList } from "@legendapp/list";

import type { NearbyLocationAdapter } from "./nearby-location-adapter";
import type { NearbyReportRouteTarget } from "./nearby-navigation";
import type {
  NearbyBrowseMode,
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

export interface NearbyScreenProps {
  adapter: NearbyLostReportsAdapter;
  initialLocationState?: NearbyLocationState;
  initialMode?: NearbyBrowseMode;
  initialRadiusKm?: NearbyRadiusKm;
  locationAdapter?: NearbyLocationAdapter;
  locationState?: NearbyLocationState;
  manualLocationOptions?: readonly NearbySearchLocation[];
  onOpenReport?: (target: NearbyReportRouteTarget) => void;
  onReport?: (reportId: string) => void;
  onShareReport?: (reportId: string) => void;
  onEnableAlerts?: () => void;
  onManualLocationPress?: (selectedLocation?: NearbySearchLocation) => void;
}

const defaultInitialLocationState: NearbyLocationState = {
  kind: "not-requested",
};

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
  locationAdapter = expoNearbyLocationAdapter,
  locationState,
  manualLocationOptions = nearbyManualLocationOptions,
  onEnableAlerts,
  onManualLocationPress,
  onOpenReport,
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
      const currentIndex = nearbyRadiusOptionsKm.indexOf(currentRadiusKm);
      const nextIndex = (currentIndex + 1) % nearbyRadiusOptionsKm.length;

      return nearbyRadiusOptionsKm[nextIndex] ?? currentRadiusKm;
    });
  }, []);

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
      if (selectedLocation && !locationState) {
        setInternalLocationState(
          applyManualNearbySearchLocation(selectedLocation),
        );
      }

      onManualLocationPress?.(selectedLocation);
    },
    [locationState, onManualLocationPress],
  );

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
    } finally {
      setIsResolvingLocation(false);
    }
  }, [locationAdapter, locationState]);

  const handleReportPress = useCallback(
    (reportId: string) => {
      onReport?.(reportId);
      setReportFeedback("Reporte enviado para revision.");
    },
    [onReport],
  );

  const renderCard = useCallback(
    ({ item }: { item: NearbyLostReportCardViewModel }) => (
      <LostReportCard
        distanceLabel={item.distanceLabel}
        id={item.id}
        lastSeenAtLabel={item.lastSeenAtLabel}
        onOpenReport={onOpenReport}
        onReport={handleReportPress}
        onShareReport={onShareReport}
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
    [handleReportPress, onOpenReport, onShareReport],
  );

  return {
    handleCategoryToggle,
    handleExpandRadius,
    handleManualLocationPress,
    handleReportPress,
    handleRetry,
    handleUseCurrentLocationPress,
    isResolvingLocation,
    manualLocationOptions,
    mode,
    onEnableAlerts,
    onOpenReport,
    onShareReport,
    radiusKm,
    renderCard,
    reportFeedback,
    selectedCategories,
    setMode,
    setRadiusKm,
    viewModel,
  };
}

function NearbyScreenContent({
  handleCategoryToggle,
  handleExpandRadius,
  handleManualLocationPress,
  handleReportPress,
  handleRetry,
  handleUseCurrentLocationPress,
  isResolvingLocation,
  manualLocationOptions,
  mode,
  onEnableAlerts,
  onOpenReport,
  onShareReport,
  radiusKm,
  renderCard,
  reportFeedback,
  selectedCategories,
  setMode,
  setRadiusKm,
  viewModel,
}: ReturnType<typeof useNearbyScreenController>) {
  if (
    viewModel.kind === "location-denied" ||
    viewModel.kind === "location-needed"
  ) {
    return (
      <LocationFallbackState
        isResolvingLocation={isResolvingLocation}
        manualLocationOptions={manualLocationOptions}
        onManualLocationPress={handleManualLocationPress}
        onUseCurrentLocationPress={handleUseCurrentLocationPress}
        viewModel={viewModel}
      />
    );
  }

  if (viewModel.mode === "map" && viewModel.kind === "ready") {
    return (
      <ScrollView
        contentContainerStyle={styles.mapContent}
        contentInsetAdjustmentBehavior="automatic"
        style={styles.screen}
      >
        <Header
          mode={mode}
          onCategoryToggle={handleCategoryToggle}
          onModeChange={setMode}
          onRadiusChange={setRadiusKm}
          radiusKm={radiusKm}
          reportFeedback={reportFeedback}
          selectedCategories={selectedCategories}
          viewModel={viewModel}
        />
        <MapBrowse
          cards={viewModel.cards}
          mapPins={viewModel.mapPins}
          onOpenReport={onOpenReport}
          onReport={handleReportPress}
          onShareReport={onShareReport}
        />
      </ScrollView>
    );
  }

  const content = getListStateContent(
    viewModel,
    handleRetry,
    handleExpandRadius,
  );

  return (
    <LegendList
      contentContainerStyle={styles.listContent}
      contentInsetAdjustmentBehavior="automatic"
      data={viewModel.kind === "ready" ? viewModel.cards : []}
      estimatedItemSize={280}
      ItemSeparatorComponent={ListSeparator}
      keyExtractor={keyExtractor}
      ListEmptyComponent={content}
      ListHeaderComponent={
        <Header
          mode={mode}
          onCategoryToggle={handleCategoryToggle}
          onEnableAlerts={onEnableAlerts}
          onModeChange={setMode}
          onRadiusChange={setRadiusKm}
          radiusKm={radiusKm}
          reportFeedback={reportFeedback}
          selectedCategories={selectedCategories}
          viewModel={viewModel}
        />
      }
      renderItem={renderCard}
      style={styles.screen}
    />
  );
}

type NearbyHeaderViewModel = Exclude<
  NearbyLostReportsViewModel,
  { kind: "location-denied" | "location-needed" }
>;

interface HeaderProps {
  mode: NearbyBrowseMode;
  onCategoryToggle: (category: NearbyPublicReportKind) => void;
  onEnableAlerts?: () => void;
  onModeChange: (mode: NearbyBrowseMode) => void;
  onRadiusChange: (radiusKm: NearbyRadiusKm) => void;
  radiusKm: NearbyRadiusKm;
  reportFeedback?: string;
  selectedCategories: readonly NearbyPublicReportKind[];
  viewModel: NearbyHeaderViewModel;
}

function Header({
  mode,
  onCategoryToggle,
  onEnableAlerts,
  onModeChange,
  onRadiusChange,
  radiusKm,
  reportFeedback,
  selectedCategories,
  viewModel,
}: HeaderProps) {
  return (
    <View style={styles.header}>
      <HeaderTitleRow onEnableAlerts={onEnableAlerts} title={viewModel.title} />
      <HeaderStatusMessages
        reportFeedback={reportFeedback}
        viewModel={viewModel}
      />
      <HeaderLocationBlock viewModel={viewModel} />

      <View style={styles.controls}>
        <ModeSwitch mode={mode} onModeChange={onModeChange} />
        <RadiusControl
          onRadiusChange={onRadiusChange}
          radiusKm={radiusKm}
          radiusOptionsKm={viewModel.radiusOptionsKm}
        />
      </View>
      <CategoryFilterControl
        onCategoryToggle={onCategoryToggle}
        selectedCategories={selectedCategories}
      />
    </View>
  );
}

function HeaderTitleRow({
  onEnableAlerts,
  title,
}: {
  onEnableAlerts?: () => void;
  title: string;
}) {
  return (
    <View style={styles.titleRow}>
      <View style={styles.titleBlock}>
        <Text selectable style={styles.screenTitle}>
          {title}
        </Text>
      </View>
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

function HeaderLocationBlock({
  viewModel,
}: {
  viewModel: NearbyHeaderViewModel;
}) {
  if (!("locationLabel" in viewModel)) {
    return null;
  }

  const searchBoundaryLabel =
    "searchBoundaryLabel" in viewModel
      ? viewModel.searchBoundaryLabel
      : undefined;

  return (
    <View style={styles.locationBlock}>
      <Text selectable style={styles.locationSource}>
        {viewModel.locationSourceLabel}
      </Text>
      <Text selectable style={styles.locationLabel}>
        {viewModel.locationLabel}
      </Text>
      {searchBoundaryLabel ? (
        <Text selectable style={styles.searchBoundaryLabel}>
          {searchBoundaryLabel}
        </Text>
      ) : null}
    </View>
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
      return "Adopcion";
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
  onReport?: (reportId: string) => void;
  onShareReport?: (reportId: string) => void;
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
    onShareReport?.(id);
    void shareNearbyLostReport({ reportKind, shareTarget }, Share).catch(
      () => undefined,
    );
  }, [id, onShareReport, reportKind, shareTarget]);

  const handleReport = useCallback(() => {
    onReport?.(id);
  }, [id, onReport]);

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
    <View style={styles.cardPhotoFrame}>
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
          <Text style={styles.photoFallbackText}>Sin foto</Text>
        </View>
      )}
      {distanceLabel ? (
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
      <Text style={getPriorityTextStyle(urgency)}>{label}</Text>
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
  cards,
  mapPins,
  onOpenReport,
  onReport,
  onShareReport,
}: {
  cards: NearbyLostReportCardViewModel[];
  mapPins: NearbyLostReportMapPinViewModel[];
  onOpenReport?: (target: NearbyReportRouteTarget) => void;
  onReport?: (reportId: string) => void;
  onShareReport?: (reportId: string) => void;
}) {
  const featuredCard = cards[0];

  return (
    <View style={styles.mapPanel}>
      <Text selectable style={styles.mapTitle}>
        Zonas aproximadas
      </Text>
      <View style={styles.mapCanvas}>
        {mapPins.map((pin, index) => (
          <MapPin
            index={index}
            key={pin.id}
            onOpenReport={onOpenReport}
            pin={pin}
          />
        ))}
      </View>
      {featuredCard ? (
        <LostReportCard
          distanceLabel={featuredCard.distanceLabel}
          id={featuredCard.id}
          lastSeenAtLabel={featuredCard.lastSeenAtLabel}
          onOpenReport={onOpenReport}
          onReport={onReport}
          onShareReport={onShareReport}
          photoUrl={featuredCard.photoUrl}
          priorityLabel={featuredCard.priorityLabel}
          publicLocationLabel={featuredCard.publicLocationLabel}
          reportActionLabel={featuredCard.reportActionLabel}
          reportKind={featuredCard.reportKind}
          routeTarget={featuredCard.routeTarget}
          shareTarget={featuredCard.shareTarget}
          subtitle={featuredCard.subtitle}
          summary={featuredCard.summary}
          title={featuredCard.title}
          urgency={featuredCard.urgency}
          verificationBadge={featuredCard.verificationBadge}
        />
      ) : null}
    </View>
  );
}

function MapPin({
  index,
  onOpenReport,
  pin,
}: {
  index: number;
  onOpenReport?: (target: NearbyReportRouteTarget) => void;
  pin: NearbyLostReportMapPinViewModel;
}) {
  const handlePress = useCallback(() => {
    onOpenReport?.(pin.routeTarget);
  }, [onOpenReport, pin.routeTarget]);
  const position =
    mapPinPositions[index % mapPinPositions.length] ?? mapPinPositions[0];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={[styles.mapPin, position]}
    >
      <Text selectable style={styles.mapPinTitle}>
        {pin.title}
      </Text>
      <Text selectable style={styles.mapPinMeta}>
        {formatMapPinMeta(pin)}
      </Text>
    </Pressable>
  );
}

function formatMapPinMeta(pin: NearbyLostReportMapPinViewModel) {
  return [pin.distanceLabel, pin.label].filter(Boolean).join(" · ");
}

function LocationFallbackState({
  isResolvingLocation,
  manualLocationOptions,
  onManualLocationPress,
  onUseCurrentLocationPress,
  viewModel,
}: {
  isResolvingLocation: boolean;
  manualLocationOptions: readonly NearbySearchLocation[];
  onManualLocationPress: (selectedLocation?: NearbySearchLocation) => void;
  onUseCurrentLocationPress: () => void;
  viewModel: Extract<
    NearbyLostReportsViewModel,
    { kind: "location-denied" | "location-needed" }
  >;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.fallbackContent}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
    >
      <View style={styles.fallbackIllustration}>
        <Text style={styles.fallbackIllustrationText}>?</Text>
      </View>
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
            ? "Buscando ubicacion"
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
    </ScrollView>
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
  mapBlue: "#2f6f95",
  mapGreen: "#b8dfc8",
  mapRose: "#f2c6cc",
  white: "#ffffff",
};

const mapPinPositions = [
  { left: "12%", top: "20%" },
  { right: "12%", top: "34%" },
  { left: "28%", bottom: "20%" },
  { right: "26%", bottom: "12%" },
] as const;

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
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  cardFooterActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
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
    gap: 12,
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
    flexWrap: "wrap",
    gap: 8,
  },
  categoryText: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: "800",
  },
  categoryTextActive: {
    color: colors.white,
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
    gap: 18,
    padding: 24,
    paddingBottom: 140,
    paddingTop: 54,
  },
  fallbackIllustration: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.chip,
    borderCurve: "continuous",
    borderRadius: 28,
    justifyContent: "center",
    width: "78%",
  },
  fallbackIllustrationText: {
    color: colors.inkStrong,
    fontSize: 64,
    fontWeight: "900",
  },
  fallbackMessage: {
    color: colors.inkMuted,
    fontSize: 17,
    lineHeight: 27,
    maxWidth: 320,
    textAlign: "center",
  },
  fallbackTitle: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36,
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
    gap: 16,
  },
  listContent: {
    gap: 18,
    padding: 16,
    paddingBottom: 140,
  },
  listSeparator: {
    height: 18,
  },
  locationBlock: {
    gap: 4,
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
  locationLabel: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 25,
  },
  locationSource: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  manualOptionButton: {
    backgroundColor: colors.chip,
    borderCurve: "continuous",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  manualOptionText: {
    color: colors.inkStrong,
    fontSize: 15,
    fontWeight: "800",
  },
  manualOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  manualOptionsTitle: {
    color: colors.inkMuted,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    textAlign: "center",
  },
  mapCanvas: {
    aspectRatio: 0.9,
    backgroundColor: colors.mapGreen,
    borderColor: colors.line,
    borderCurve: "continuous",
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  mapContent: {
    gap: 18,
    padding: 16,
    paddingBottom: 140,
  },
  mapPanel: {
    gap: 14,
  },
  mapPin: {
    backgroundColor: colors.white,
    borderColor: colors.inkStrong,
    borderRadius: 18,
    borderWidth: 2,
    gap: 2,
    maxWidth: 126,
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: "absolute",
  },
  mapPinMeta: {
    color: colors.inkMuted,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  mapPinTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  mapTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
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
    flex: 1,
    justifyContent: "center",
  },
  photoFallbackText: {
    color: colors.inkMuted,
    fontSize: 14,
    fontWeight: "800",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.inkStrong,
    borderRadius: 999,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900",
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
  screenTitle: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },
  searchBoundaryLabel: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
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
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
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
