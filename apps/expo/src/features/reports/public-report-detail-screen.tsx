import type { Href } from "expo-router";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import * as React from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Galeria } from "@nandorojo/galeria";

import type {
  PublicReportDetailAdapter,
  PublicReportDetailType,
  PublicReportDetailViewModel,
} from "./public-report-detail";
import { runPublicContactAction } from "../contact-actions/contact-actions";
import { openInternalRastroHref } from "../navigation/internal-rastro-links";
import { ShellIcon } from "../shell/shell-overlays";
import { shellColors } from "../shell/shell-theme";
import {
  buildPublicReportDetailViewModel,
  classifyPublicReportDetailLoadFailure,
} from "./public-report-detail";

const bottomInset = 36;

type PublicReportDetailLoadState =
  | { kind: "error" }
  | { kind: "loading" }
  | { kind: "ready"; viewModel: PublicReportDetailViewModel }
  | { kind: "unavailable" };

export function PublicReportDetailScreen({
  adapter,
  expectedType,
  reportId,
}: {
  adapter: PublicReportDetailAdapter;
  expectedType?: PublicReportDetailType;
  reportId?: string | string[];
}) {
  const resolvedReportId = normalizeReportId(reportId);
  const [loadState, setLoadState] = React.useState<PublicReportDetailLoadState>(
    { kind: "loading" },
  );
  const [requestVersion, setRequestVersion] = React.useState(0);
  const handleRetry = React.useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);

  React.useEffect(() => {
    if (!resolvedReportId) {
      setLoadState({ kind: "unavailable" });
      return;
    }

    let isCurrent = true;
    setLoadState({ kind: "loading" });

    adapter
      .getReportDetail(resolvedReportId)
      .then((report) => {
        if (!isCurrent) {
          return;
        }

        if (expectedType && report.type !== expectedType) {
          setLoadState({ kind: "unavailable" });
          return;
        }

        setLoadState({
          kind: "ready",
          viewModel: buildPublicReportDetailViewModel(report),
        });
      })
      .catch((error: unknown) => {
        if (!isCurrent) {
          return;
        }

        setLoadState({
          kind: classifyPublicReportDetailLoadFailure(error),
        });
      });

    return () => {
      isCurrent = false;
    };
  }, [adapter, expectedType, requestVersion, resolvedReportId]);

  if (loadState.kind === "ready") {
    return <PublicReportDetailContent viewModel={loadState.viewModel} />;
  }

  if (loadState.kind === "error") {
    return <PublicReportDetailErrorState onRetry={handleRetry} />;
  }

  if (loadState.kind === "unavailable") {
    return <PublicReportDetailUnavailableState />;
  }

  return <PublicReportDetailLoadingState />;
}

export function PublicReportDetailContent({
  onOpenContactAction,
  onOpenLocation,
  onOpenPublicPage,
  onShare,
  viewModel,
}: {
  onOpenContactAction?: (
    action: PublicReportDetailViewModel["contactActions"][number],
  ) => void;
  onOpenLocation?: (
    action: PublicReportDetailViewModel["locationAction"],
  ) => void;
  onOpenPublicPage?: () => void;
  onShare?: () => void;
  viewModel: PublicReportDetailViewModel;
}) {
  const router = useRouter();
  const openExternalUrl = React.useCallback((href: string) => {
    return Linking.openURL(href);
  }, []);
  const openInternalHref = React.useCallback(
    (href: string) => {
      openInternalRastroHref({
        href,
        openExternalUrl,
        routerPush: (nextHref: Href) => {
          router.push(nextHref);
        },
      });
    },
    [openExternalUrl, router],
  );
  const handleOpenContactAction = React.useCallback(
    (action: PublicReportDetailViewModel["contactActions"][number]) => {
      if (onOpenContactAction) {
        onOpenContactAction(action);
        return;
      }

      void runPublicContactAction(action, {
        openChat: ({ href }) => {
          openInternalHref(href);
        },
        openURL: openExternalUrl,
      });
    },
    [onOpenContactAction, openExternalUrl, openInternalHref],
  );
  const handleOpenLocation = React.useCallback(() => {
    if (onOpenLocation) {
      onOpenLocation(viewModel.locationAction);
      return;
    }

    void Linking.openURL(viewModel.locationAction.url).catch(() => undefined);
  }, [onOpenLocation, viewModel.locationAction]);
  const handleShare = React.useCallback(() => {
    if (onShare) {
      onShare();
      return;
    }

    void Share.share({
      message: viewModel.shareMessage,
      title: viewModel.shareTitle,
      url: viewModel.shareUrl,
    }).catch(() => undefined);
  }, [
    onShare,
    viewModel.shareMessage,
    viewModel.shareTitle,
    viewModel.shareUrl,
  ]);
  const handleOpenPublicPage = React.useCallback(() => {
    if (onOpenPublicPage) {
      onOpenPublicPage();
      return;
    }

    void Linking.openURL(viewModel.shareUrl).catch(() => undefined);
  }, [onOpenPublicPage, viewModel.shareUrl]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInset={{ bottom: bottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: bottomInset }}
      style={styles.screen}
      testID="public-report-detail-screen"
    >
      <ReportMediaGallery viewModel={viewModel} />

      <View style={styles.titleBlock}>
        <Text selectable style={styles.title}>
          {viewModel.title}
        </Text>
        {viewModel.subtitle ? (
          <Text selectable style={styles.subtitle}>
            {viewModel.subtitle}
          </Text>
        ) : null}
      </View>

      {viewModel.contactActions.length > 0 ? (
        <View style={styles.primaryActionStack}>
          {viewModel.contactActions.map((action, index) => {
            const isPrimaryAction = index === 0;
            const actionColor =
              action.kind === "whatsapp"
                ? shellColors.found
                : viewModel.accentColor;

            return (
              <Pressable
                accessibilityLabel={action.label}
                accessibilityRole="button"
                key={`${action.kind}:${action.href}`}
                onPress={() => {
                  handleOpenContactAction(action);
                }}
                testID={`public-report-contact-${action.kind}-${index}`}
                style={[
                  styles.primaryAction,
                  isPrimaryAction
                    ? { backgroundColor: actionColor }
                    : styles.secondaryContactAction,
                ]}
              >
                <ShellIcon
                  color={isPrimaryAction ? shellColors.white : actionColor}
                  name={getContactActionIconName(action.kind)}
                  size={18}
                />
                <Text
                  style={[
                    styles.primaryActionText,
                    isPrimaryAction
                      ? null
                      : [
                          styles.secondaryContactActionText,
                          { color: actionColor },
                        ],
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.secondaryActionGrid}>
        <Pressable
          accessibilityLabel={viewModel.locationAction.label}
          accessibilityRole="button"
          onPress={handleOpenLocation}
          testID="public-report-location-action"
          style={styles.secondaryAction}
        >
          <ShellIcon color={shellColors.primary} name="map.fill" size={18} />
          <Text style={styles.secondaryActionText}>
            {viewModel.locationAction.label}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`Compartir ${viewModel.title}`}
          accessibilityRole="button"
          onPress={handleShare}
          testID="public-report-share-action"
          style={styles.secondaryAction}
        >
          <ShellIcon
            color={shellColors.primary}
            name="square.and.arrow.up"
            size={18}
          />
          <Text style={styles.secondaryActionText}>Compartir</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text selectable style={styles.sectionTitle}>
          {viewModel.descriptionTitle}
        </Text>
        <Text selectable style={styles.description}>
          {viewModel.description}
        </Text>
      </View>

      <View style={styles.facts}>
        {viewModel.facts.map((fact) => (
          <View key={`${fact.label}:${fact.value}`} style={styles.factRow}>
            <View style={styles.factIcon}>
              <ShellIcon
                color={viewModel.accentColor}
                name={fact.iconName}
                size={18}
              />
            </View>
            <View style={styles.factCopy}>
              <Text selectable style={styles.factLabel}>
                {fact.label}
              </Text>
              <Text selectable style={styles.factValue}>
                {fact.value}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.privacyNotice}>
        <ShellIcon color={shellColors.primary} name="lock.fill" size={18} />
        <Text selectable style={styles.privacyText}>
          {viewModel.locationPrivacyLabel}
        </Text>
      </View>

      <Pressable
        accessibilityLabel={viewModel.publicPageLabel}
        accessibilityRole="button"
        onPress={handleOpenPublicPage}
        testID="public-report-public-page-action"
        style={styles.tertiaryAction}
      >
        <ShellIcon
          color={shellColors.primary}
          name="arrow.up.right"
          size={16}
        />
        <Text style={styles.tertiaryActionText}>
          {viewModel.publicPageLabel}
        </Text>
      </Pressable>

      {viewModel.ownerNotice ? (
        <View
          style={[
            styles.ownerNotice,
            viewModel.ownerNotice.tone === "review"
              ? styles.ownerReviewNotice
              : null,
          ]}
        >
          <Text
            selectable
            style={[
              styles.ownerNoticeTitle,
              viewModel.ownerNotice.tone === "review"
                ? styles.ownerReviewNoticeTitle
                : null,
            ]}
          >
            {viewModel.ownerNotice.title}
          </Text>
          <Text selectable style={styles.ownerNoticeBody}>
            {viewModel.ownerNotice.body}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function ReportMediaGallery({
  viewModel,
}: {
  viewModel: PublicReportDetailViewModel;
}) {
  const photoUrls = viewModel.photoUrls;
  const primaryPhotoUrl = photoUrls[0];
  const [activeIndex, setActiveIndex] = React.useState(0);
  const carouselRef = React.useRef<React.ElementRef<typeof ScrollView>>(null);
  const { width } = useWindowDimensions();
  const heroWidth = Math.max(1, Math.round(width - 36));
  const heroImageCountLabel = `${activeIndex + 1} de ${photoUrls.length}`;
  const handleHeroScrollEnd = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(
        event.nativeEvent.contentOffset.x / heroWidth,
      );
      const clampedIndex = Math.max(
        0,
        Math.min(nextIndex, photoUrls.length - 1),
      );

      setActiveIndex(clampedIndex);
    },
    [heroWidth, photoUrls.length],
  );
  const syncActiveGalleryIndex = React.useCallback(
    (event: { nativeEvent: { currentIndex: number } }) => {
      const nextIndex = Math.max(
        0,
        Math.min(event.nativeEvent.currentIndex, photoUrls.length - 1),
      );

      setActiveIndex(nextIndex);
      carouselRef.current?.scrollTo({
        animated: false,
        x: nextIndex * heroWidth,
      });
    },
    [heroWidth, photoUrls.length],
  );

  return (
    <View style={styles.gallery} testID="public-report-media-gallery">
      <View
        style={[styles.hero, primaryPhotoUrl ? null : styles.heroFallbackFrame]}
        testID="public-report-hero-media"
      >
        {primaryPhotoUrl ? (
          <Galeria hidePageIndicators={false} theme="dark" urls={photoUrls}>
            <ScrollView
              accessibilityLabel={`Fotos del reporte, ${photoUrls.length} en total`}
              contentContainerStyle={styles.heroCarouselContent}
              decelerationRate="fast"
              disableIntervalMomentum
              horizontal
              onMomentumScrollEnd={handleHeroScrollEnd}
              pagingEnabled
              ref={carouselRef}
              showsHorizontalScrollIndicator={false}
              snapToInterval={heroWidth}
              style={styles.heroCarousel}
            >
              {photoUrls.map((photoUrl, index) => (
                <Galeria.Image
                  index={index}
                  key={`hero:${photoUrl}:${index}`}
                  onIndexChange={syncActiveGalleryIndex}
                  style={StyleSheet.flatten([
                    styles.heroImageFrame,
                    { width: heroWidth },
                  ])}
                >
                  <Image
                    accessibilityLabel={`Foto ${index + 1} de ${photoUrls.length} del reporte`}
                    accessibilityRole="image"
                    cachePolicy="memory-disk"
                    contentFit="contain"
                    priority={index === 0 ? "high" : "normal"}
                    recyclingKey={photoUrl}
                    source={{ uri: photoUrl }}
                    style={styles.heroImage}
                    transition={160}
                  />
                </Galeria.Image>
              ))}
            </ScrollView>
          </Galeria>
        ) : (
          <View
            style={[
              styles.heroFallback,
              { backgroundColor: viewModel.accentSoftColor },
            ]}
            testID="public-report-hero-media-fallback"
          >
            <ShellIcon
              color={viewModel.accentColor}
              name={viewModel.heroIconName}
              size={42}
            />
            <Text
              style={[
                styles.heroFallbackText,
                { color: viewModel.accentColor },
              ]}
            >
              Foto no disponible
            </Text>
          </View>
        )}
        <View style={styles.heroTopRow}>
          <View
            style={[
              styles.typePill,
              { backgroundColor: viewModel.accentSoftColor },
            ]}
          >
            <ShellIcon
              color={viewModel.accentColor}
              name={viewModel.heroIconName}
              size={16}
            />
            <Text
              style={[styles.typePillText, { color: viewModel.accentColor }]}
            >
              {viewModel.typeLabel}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              viewModel.statusTone === "closed"
                ? styles.statusPillClosed
                : viewModel.statusTone === "review"
                  ? styles.statusPillReview
                  : { backgroundColor: viewModel.accentColor },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                viewModel.statusTone === "closed"
                  ? styles.statusPillTextClosed
                  : viewModel.statusTone === "review"
                    ? styles.statusPillTextReview
                    : null,
              ]}
            >
              {viewModel.statusLabel}
            </Text>
          </View>
        </View>
        {photoUrls.length > 1 ? (
          <View style={styles.galleryCountBadge}>
            <ShellIcon color={shellColors.white} name="camera.fill" size={14} />
            <Text style={styles.galleryCountText}>{heroImageCountLabel}</Text>
          </View>
        ) : null}
      </View>

      {photoUrls.length > 1 ? (
        <Galeria hidePageIndicators={false} theme="dark" urls={photoUrls}>
          <ScrollView
            accessibilityLabel="Galeria de fotos"
            contentContainerStyle={styles.thumbnailContent}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {photoUrls.map((photoUrl, index) => (
              <Galeria.Image
                index={index}
                key={`thumb:${photoUrl}:${index}`}
                onIndexChange={syncActiveGalleryIndex}
                style={StyleSheet.flatten([
                  styles.thumbnailButton,
                  activeIndex === index ? styles.thumbnailButtonActive : null,
                ])}
              >
                <Image
                  accessibilityLabel={`Foto ${index + 1} de ${photoUrls.length} del reporte`}
                  accessibilityRole="image"
                  cachePolicy="memory-disk"
                  contentFit="cover"
                  recyclingKey={`thumb:${photoUrl}`}
                  source={{ uri: photoUrl }}
                  style={styles.thumbnailImage}
                  transition={120}
                />
              </Galeria.Image>
            ))}
          </ScrollView>
        </Galeria>
      ) : null}

      {photoUrls.length > 1 ? (
        <View accessibilityElementsHidden style={styles.galleryDots}>
          {photoUrls.map((photoUrl, index) => (
            <View
              key={`dot:${photoUrl}:${index}`}
              style={[
                styles.galleryDot,
                activeIndex === index ? styles.galleryDotActive : null,
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function PublicReportDetailLoadingState() {
  return (
    <View style={styles.loadingScreen} testID="public-report-loading">
      <View style={styles.loadingPanel}>
        <ActivityIndicator color={shellColors.primary} />
        <Text selectable style={styles.loadingTitle}>
          Cargando reporte
        </Text>
        <Text selectable style={styles.loadingBody}>
          Estamos trayendo el detalle publico y las fotos del reporte.
        </Text>
      </View>
    </View>
  );
}

export function PublicReportDetailUnavailableState() {
  return (
    <View style={styles.stateScreen} testID="public-report-unavailable">
      <View style={styles.statePanel}>
        <View style={styles.stateIcon}>
          <ShellIcon color={shellColors.primary} name="lock.fill" size={24} />
        </View>
        <Text selectable style={styles.stateTitle}>
          Reporte no disponible
        </Text>
        <Text selectable style={styles.stateBody}>
          Este reporte fue retirado, marcado para revisión o ya no está
          disponible públicamente en Rastro.
        </Text>
      </View>
    </View>
  );
}

export function PublicReportDetailErrorState({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <View style={styles.stateScreen}>
      <View style={styles.statePanel}>
        <View style={styles.stateIcon}>
          <ShellIcon
            color={shellColors.lost}
            name="exclamationmark.triangle.fill"
            size={24}
          />
        </View>
        <Text selectable style={styles.stateTitle}>
          No pudimos cargar el reporte
        </Text>
        <Text selectable style={styles.stateBody}>
          Revisa tu conexión e intenta de nuevo. Si el problema continúa, vuelve
          a abrir el enlace más tarde.
        </Text>
        <Pressable
          accessibilityLabel="Reintentar carga del reporte"
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.retryButton}
        >
          <ShellIcon
            color={shellColors.white}
            name="arrow.clockwise"
            size={17}
          />
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function normalizeReportId(reportId: string | string[] | undefined) {
  const value = Array.isArray(reportId) ? reportId[0] : reportId;
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : undefined;
}

function getContactActionIconName(
  kind: PublicReportDetailViewModel["contactActions"][number]["kind"],
) {
  return kind === "whatsapp" ? "phone.fill" : "message.fill";
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 140,
    paddingTop: 18,
  },
  description: {
    color: shellColors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  factCopy: {
    flex: 1,
    gap: 2,
  },
  factIcon: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderCurve: "continuous",
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  factLabel: {
    color: shellColors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  factRow: {
    alignItems: "flex-start",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  factValue: {
    color: shellColors.text,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  facts: {
    gap: 10,
  },
  gallery: {
    gap: 10,
  },
  galleryCountBadge: {
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.72)",
    borderCurve: "continuous",
    borderRadius: 999,
    bottom: 12,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
    right: 12,
  },
  galleryCountText: {
    color: shellColors.white,
    fontSize: 12,
    fontWeight: "900",
  },
  galleryDot: {
    backgroundColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  galleryDotActive: {
    backgroundColor: shellColors.primary,
    width: 18,
  },
  galleryDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
  },
  hero: {
    aspectRatio: 4 / 3,
    backgroundColor: shellColors.surfaceMuted,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
    width: "100%",
  },
  heroFallback: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    justifyContent: "center",
  },
  heroFallbackFrame: {
    aspectRatio: 16 / 9,
  },
  heroFallbackText: {
    fontSize: 14,
    fontWeight: "900",
  },
  heroCarousel: {
    flex: 1,
  },
  heroCarouselContent: {
    alignItems: "stretch",
  },
  heroImage: {
    height: "100%",
    width: "100%",
  },
  heroImageFrame: {
    height: "100%",
  },
  heroTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    left: 12,
    position: "absolute",
    right: 12,
    top: 12,
  },
  loadingBody: {
    color: shellColors.muted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
  loadingPanel: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 24,
  },
  loadingScreen: {
    backgroundColor: shellColors.background,
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  loadingTitle: {
    color: shellColors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  ownerNotice: {
    backgroundColor: shellColors.primarySoft,
    borderCurve: "continuous",
    borderRadius: 18,
    gap: 4,
    padding: 14,
  },
  ownerNoticeBody: {
    color: shellColors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  ownerNoticeTitle: {
    color: shellColors.primaryDark,
    fontSize: 15,
    fontWeight: "900",
  },
  ownerReviewNotice: {
    backgroundColor: "#FFF4CC",
  },
  ownerReviewNoticeTitle: {
    color: "#6F5500",
  },
  primaryAction: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryActionStack: {
    gap: 10,
  },
  primaryActionText: {
    color: shellColors.white,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
    textAlign: "center",
  },
  privacyNotice: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderCurve: "continuous",
    borderRadius: 18,
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  privacyText: {
    color: shellColors.primaryDark,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  screen: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: 148,
    flexGrow: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  secondaryActionText: {
    color: shellColors.primary,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
    textAlign: "center",
  },
  secondaryContactAction: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderWidth: 1,
  },
  secondaryContactActionText: {
    color: shellColors.primary,
  },
  section: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  sectionTitle: {
    color: shellColors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  statusPill: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 12,
  },
  statusPillClosed: {
    backgroundColor: shellColors.surfaceMuted,
  },
  statusPillReview: {
    backgroundColor: "#FFF4CC",
  },
  statusPillText: {
    color: shellColors.white,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statusPillTextClosed: {
    color: shellColors.muted,
  },
  statusPillTextReview: {
    color: "#6F5500",
  },
  stateBody: {
    color: shellColors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  stateIcon: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderCurve: "continuous",
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  statePanel: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 24,
  },
  stateScreen: {
    backgroundColor: shellColors.background,
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  stateTitle: {
    color: shellColors.text,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 24,
    textAlign: "center",
  },
  subtitle: {
    color: shellColors.muted,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  thumbnailButton: {
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    height: 76,
    overflow: "hidden",
    width: 76,
  },
  thumbnailButtonActive: {
    borderColor: shellColors.primary,
    borderWidth: 2,
  },
  thumbnailContent: {
    gap: 10,
    paddingHorizontal: 1,
  },
  thumbnailImage: {
    height: "100%",
    width: "100%",
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderCurve: "continuous",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  retryButtonText: {
    color: shellColors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  tertiaryAction: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  tertiaryActionText: {
    color: shellColors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  title: {
    color: shellColors.text,
    fontSize: 29,
    fontWeight: "900",
    lineHeight: 34,
  },
  titleBlock: {
    gap: 5,
  },
  typePill: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    flexShrink: 1,
  },
  typePillText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
});
