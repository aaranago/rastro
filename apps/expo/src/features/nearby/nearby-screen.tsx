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

import type {
  NearbyBrowseMode,
  NearbyLocationState,
  NearbyLostReportsAdapter,
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
import {
  defaultNearbyLostReportsAdapter,
  nearbyBoliviaLocations,
  nearbyManualLocationOptions,
} from "./nearby-fixtures";
import { shareNearbyLostReport } from "./nearby-share";
import { buildNearbyLostReportsViewModel } from "./nearby-view-model";

export interface NearbyScreenProps {
  adapter?: NearbyLostReportsAdapter;
  initialLocationState?: NearbyLocationState;
  initialMode?: NearbyBrowseMode;
  initialRadiusKm?: NearbyRadiusKm;
  locationState?: NearbyLocationState;
  manualLocationOptions?: readonly NearbySearchLocation[];
  onOpenReport?: (reportId: string) => void;
  onShareReport?: (reportId: string) => void;
  onEnableAlerts?: () => void;
  onManualLocationPress?: (selectedLocation?: NearbySearchLocation) => void;
}

const defaultInitialLocationState: NearbyLocationState = {
  kind: "ready",
  location: nearbyBoliviaLocations.lastDetected,
};

const keyExtractor = (item: NearbyLostReportCardViewModel) => item.id;

export function NearbyScreen({
  adapter = defaultNearbyLostReportsAdapter,
  initialLocationState = defaultInitialLocationState,
  initialMode = "list",
  initialRadiusKm = 5,
  locationState,
  manualLocationOptions = nearbyManualLocationOptions,
  onEnableAlerts,
  onManualLocationPress,
  onOpenReport,
  onShareReport,
}: NearbyScreenProps) {
  const [internalLocationState, setInternalLocationState] =
    useState<NearbyLocationState>(initialLocationState);
  const [mode, setMode] = useState<NearbyBrowseMode>(initialMode);
  const [radiusKm, setRadiusKm] = useState<NearbyRadiusKm>(initialRadiusKm);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadState, setLoadState] = useState<NearbyLostReportsLoadState>({
    kind: "loading",
  });

  const effectiveLocationState = locationState ?? internalLocationState;
  const searchLocation = getSearchLocation(effectiveLocationState);
  const locationQueryKey = getLocationQueryKey(searchLocation);

  useEffect(() => {
    if (!searchLocation) {
      return;
    }

    let isActive = true;

    adapter
      .searchLostPetReports({ location: searchLocation, radiusKm })
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
    };
  }, [adapter, locationQueryKey, radiusKm, reloadKey, searchLocation]);

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

  const handleManualLocationPress = useCallback(
    (selectedLocation?: NearbySearchLocation) => {
      if (selectedLocation && !locationState) {
        setInternalLocationState({
          kind: "ready",
          location: selectedLocation,
        });
      }

      onManualLocationPress?.(selectedLocation);
    },
    [locationState, onManualLocationPress],
  );

  const renderCard = useCallback(
    ({ item }: { item: NearbyLostReportCardViewModel }) => (
      <LostReportCard
        distanceLabel={item.distanceLabel}
        id={item.id}
        lastSeenAtLabel={item.lastSeenAtLabel}
        onOpenReport={onOpenReport}
        onShareReport={onShareReport}
        photoUrl={item.photoUrl}
        priorityLabel={item.priorityLabel}
        publicLocationLabel={item.publicLocationLabel}
        reportKind={item.reportKind}
        shareTarget={item.shareTarget}
        subtitle={item.subtitle}
        summary={item.summary}
        title={item.title}
        urgency={item.urgency}
        verificationBadge={item.verificationBadge}
      />
    ),
    [onOpenReport, onShareReport],
  );

  if (viewModel.kind === "location-denied") {
    return (
      <LocationFallbackState
        manualLocationOptions={manualLocationOptions}
        onManualLocationPress={handleManualLocationPress}
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
          onModeChange={setMode}
          onRadiusChange={setRadiusKm}
          radiusKm={radiusKm}
          viewModel={viewModel}
        />
        <MapBrowse
          cards={viewModel.cards}
          mapPins={viewModel.mapPins}
          onOpenReport={onOpenReport}
          onShareReport={onShareReport}
        />
      </ScrollView>
    );
  }

  const content = getListStateContent(viewModel, handleRetry);

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
          onEnableAlerts={onEnableAlerts}
          onModeChange={setMode}
          onRadiusChange={setRadiusKm}
          radiusKm={radiusKm}
          viewModel={viewModel}
        />
      }
      renderItem={renderCard}
      style={styles.screen}
    />
  );
}

function Header({
  mode,
  onEnableAlerts,
  onModeChange,
  onRadiusChange,
  radiusKm,
  viewModel,
}: {
  mode: NearbyBrowseMode;
  onEnableAlerts?: () => void;
  onModeChange: (mode: NearbyBrowseMode) => void;
  onRadiusChange: (radiusKm: NearbyRadiusKm) => void;
  radiusKm: NearbyRadiusKm;
  viewModel: Exclude<NearbyLostReportsViewModel, { kind: "location-denied" }>;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View>
          <Text selectable style={styles.eyebrow}>
            Cerca
          </Text>
          <Text selectable style={styles.screenTitle}>
            {viewModel.title}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onEnableAlerts}
          style={styles.alertIconButton}
        >
          <Text style={styles.alertIconText}>!</Text>
        </Pressable>
      </View>

      {viewModel.kind === "ready" && viewModel.urgentAlert ? (
        <UrgentAlert alert={viewModel.urgentAlert} />
      ) : null}

      {"offlineLabel" in viewModel && viewModel.offlineLabel ? (
        <Text selectable style={styles.offlineLabel}>
          {viewModel.offlineLabel}
        </Text>
      ) : null}

      <HeaderLocationBlock viewModel={viewModel} />

      <View style={styles.controls}>
        <ModeSwitch mode={mode} onModeChange={onModeChange} />
        <RadiusControl
          onRadiusChange={onRadiusChange}
          radiusKm={radiusKm}
          radiusOptionsKm={viewModel.radiusOptionsKm}
        />
      </View>
    </View>
  );
}

function HeaderLocationBlock({
  viewModel,
}: {
  viewModel: Exclude<NearbyLostReportsViewModel, { kind: "location-denied" }>;
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
  onShareReport,
  photoUrl,
  priorityLabel,
  publicLocationLabel,
  reportKind,
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
  onOpenReport?: (reportId: string) => void;
  onShareReport?: (reportId: string) => void;
  photoUrl?: string;
  priorityLabel: string;
  publicLocationLabel: string;
  reportKind: NearbyLostReportCardViewModel["reportKind"];
  shareTarget: NearbyLostReportCardViewModel["shareTarget"];
  subtitle: string;
  summary: string;
  title: string;
  urgency: NearbyLostReportCardViewModel["urgency"];
  verificationBadge?: NearbyLostReportCardViewModel["verificationBadge"];
}) {
  const handleOpenReport = useCallback(() => {
    onOpenReport?.(id);
  }, [id, onOpenReport]);

  const handleShareReport = useCallback(() => {
    onShareReport?.(id);
    void shareNearbyLostReport({ reportKind, shareTarget }, Share).catch(
      () => undefined,
    );
  }, [id, onShareReport, reportKind, shareTarget]);

  return (
    <Pressable
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
          onShareReport={handleShareReport}
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
  onShareReport,
}: {
  lastSeenAtLabel: string;
  onShareReport: () => void;
}) {
  return (
    <View style={styles.cardFooter}>
      <Text selectable style={styles.timeCopy}>
        {lastSeenAtLabel}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onShareReport}
        style={styles.shareButton}
      >
        <Text style={styles.shareText}>Compartir</Text>
      </Pressable>
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
  onShareReport,
}: {
  cards: NearbyLostReportCardViewModel[];
  mapPins: NearbyLostReportMapPinViewModel[];
  onOpenReport?: (reportId: string) => void;
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
          onShareReport={onShareReport}
          photoUrl={featuredCard.photoUrl}
          priorityLabel={featuredCard.priorityLabel}
          publicLocationLabel={featuredCard.publicLocationLabel}
          reportKind={featuredCard.reportKind}
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
  onOpenReport?: (reportId: string) => void;
  pin: NearbyLostReportMapPinViewModel;
}) {
  const handlePress = useCallback(() => {
    onOpenReport?.(pin.id);
  }, [onOpenReport, pin.id]);
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
        {pin.distanceLabel ?? pin.label}
      </Text>
    </Pressable>
  );
}

function LocationFallbackState({
  manualLocationOptions,
  onManualLocationPress,
  viewModel,
}: {
  manualLocationOptions: readonly NearbySearchLocation[];
  onManualLocationPress: (selectedLocation?: NearbySearchLocation) => void;
  viewModel: Extract<NearbyLostReportsViewModel, { kind: "location-denied" }>;
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
        onPress={() => onManualLocationPress()}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonText}>
          {viewModel.manualLocationActionLabel}
        </Text>
      </Pressable>
      <View style={styles.manualOptions}>
        {manualLocationOptions.map((option) => (
          <Pressable
            accessibilityRole="button"
            key={option.label}
            onPress={() => onManualLocationPress(option)}
            style={styles.manualOptionButton}
          >
            <Text selectable style={styles.manualOptionText}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function getListStateContent(
  viewModel: Exclude<NearbyLostReportsViewModel, { kind: "location-denied" }>,
  onRetry: () => void,
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
  onAction,
  title,
  variant,
}: {
  actionLabel?: string;
  body: string;
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

function getSearchLocation(
  locationState: NearbyLocationState,
): NearbySearchLocation | undefined {
  if (locationState.kind === "ready") {
    return locationState.location;
  }

  if (locationState.kind === "denied" || locationState.kind === "unavailable") {
    return locationState.manualLocation;
  }

  return undefined;
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
    justifyContent: "space-between",
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
  eyebrow: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  fallbackContent: {
    alignItems: "center",
    gap: 18,
    padding: 24,
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
  header: {
    gap: 16,
  },
  listContent: {
    gap: 18,
    padding: 16,
    paddingBottom: 32,
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
    paddingBottom: 32,
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
  shareButton: {
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    fontSize: 13,
    fontWeight: "700",
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
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
