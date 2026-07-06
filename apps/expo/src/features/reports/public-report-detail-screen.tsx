import type { Href } from "expo-router";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import * as React from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Galeria } from "@nandorojo/galeria";

import type {
  PublicReportDetailAdapter,
  PublicReportAbuseReportResult,
  PublicReportAbuseReportInput,
  PublicReportDetailAbuseReportAction,
  PublicReportDetailType,
  PublicReportDetailViewModel,
} from "./public-report-detail";
import type { TrustSafetyReportReason } from "../trust-safety";
import { runPublicContactAction } from "../contact-actions/contact-actions";
import { openInternalRastroHref } from "../navigation/internal-rastro-links";
import { ShellIcon } from "../shell/shell-overlays";
import { shellColors } from "../shell/shell-theme";
import { useRastroShell } from "../shell/shell-provider";
import { trustSafetyReportReasonOptions } from "../trust-safety/trust-safety-model";
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

interface PublicReportActionFeedback {
  kind: "error";
  label: string;
}

export function PublicReportDetailScreen({
  adapter,
  expectedType,
  openReportAbuseOnLoad = false,
  reportId,
}: {
  adapter: PublicReportDetailAdapter;
  expectedType?: PublicReportDetailType;
  openReportAbuseOnLoad?: boolean;
  reportId?: string | string[];
}) {
  const { requestAuthPrompt, session } = useRastroShell();
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
    return (
      <PublicReportDetailContent
        isVisitor={session.kind === "visitor"}
        onReportAbuse={adapter.reportAbuse}
        onRequestMemberSignIn={() => {
          const returnTo = buildPublicReportAbuseAuthReturnTo(
            loadState.viewModel,
          );

          requestAuthPrompt({
            returnTo,
            sourceHref: `rastro://auth/sign-in?returnTo=${encodeURIComponent(
              returnTo,
            )}`,
          });
        }}
        openReportAbuseOnLoad={openReportAbuseOnLoad}
        viewModel={loadState.viewModel}
      />
    );
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
  onReportAbuse,
  onRequestMemberSignIn,
  onShare,
  openReportAbuseOnLoad = false,
  isVisitor = false,
  viewModel,
}: {
  isVisitor?: boolean;
  onOpenContactAction?: (
    action: PublicReportDetailViewModel["contactActions"][number],
  ) => void;
  onOpenLocation?: (
    action: PublicReportDetailViewModel["locationAction"],
  ) => void;
  onOpenPublicPage?: () => void;
  onReportAbuse?: (
    input: PublicReportAbuseReportInput,
  ) => Promise<PublicReportAbuseReportResult>;
  onRequestMemberSignIn?: () => void;
  onShare?: () => void;
  openReportAbuseOnLoad?: boolean;
  viewModel: PublicReportDetailViewModel;
}) {
  const router = useRouter();
  const [reportSheet, setReportSheet] = React.useState<{
    detail: string;
    error?: string;
    isOpen: boolean;
    isSubmitting: boolean;
    reason: TrustSafetyReportReason;
    success?: string;
  }>(() => ({
    detail: "",
    isOpen: Boolean(openReportAbuseOnLoad && viewModel.abuseReportAction),
    isSubmitting: false,
    reason: "other",
  }));
  const [actionFeedback, setActionFeedback] =
    React.useState<PublicReportActionFeedback | null>(null);
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
    async (action: PublicReportDetailViewModel["contactActions"][number]) => {
      if (onOpenContactAction) {
        onOpenContactAction(action);
        return;
      }

      const result = await runPublicContactAction(action, {
        openChat: ({ href }) => {
          openInternalHref(href);
        },
        openURL: openExternalUrl,
      });

      setActionFeedback(result.kind === "error" ? result : null);
    },
    [onOpenContactAction, openExternalUrl, openInternalHref],
  );
  const handleOpenLocation = React.useCallback(async () => {
    if (onOpenLocation) {
      onOpenLocation(viewModel.locationAction);
      return;
    }

    try {
      await Linking.openURL(viewModel.locationAction.url);
      setActionFeedback(null);
    } catch {
      setActionFeedback({
        kind: "error",
        label: "No pudimos abrir Mapas. Intenta de nuevo.",
      });
    }
  }, [onOpenLocation, viewModel.locationAction]);
  const handleShare = React.useCallback(async () => {
    if (onShare) {
      onShare();
      return;
    }

    try {
      await Share.share({
        message: viewModel.shareMessage,
        title: viewModel.shareTitle,
        url: viewModel.shareUrl,
      });
      setActionFeedback(null);
    } catch {
      setActionFeedback({
        kind: "error",
        label: "No pudimos compartir el reporte. Intenta de nuevo.",
      });
    }
  }, [
    onShare,
    viewModel.shareMessage,
    viewModel.shareTitle,
    viewModel.shareUrl,
  ]);
  const handleOpenPublicPage = React.useCallback(async () => {
    if (onOpenPublicPage) {
      onOpenPublicPage();
      return;
    }

    try {
      await Linking.openURL(viewModel.shareUrl);
      setActionFeedback(null);
    } catch {
      setActionFeedback({
        kind: "error",
        label: "No pudimos abrir la página pública. Intenta de nuevo.",
      });
    }
  }, [onOpenPublicPage, viewModel.shareUrl]);
  const openReportSheet = React.useCallback(() => {
    if (!viewModel.abuseReportAction) {
      return;
    }

    setReportSheet({
      detail: "",
      isOpen: true,
      isSubmitting: false,
      reason: "other",
    });
  }, [viewModel.abuseReportAction]);
  const closeReportSheet = React.useCallback(() => {
    setReportSheet((current) =>
      current.isSubmitting
        ? current
        : {
            ...current,
            isOpen: false,
          },
    );
  }, []);
  const submitReportAbuse = React.useCallback(async () => {
    if (!viewModel.abuseReportAction) {
      return;
    }

    if (isVisitor) {
      onRequestMemberSignIn?.();
      return;
    }

    const detail = reportSheet.detail.trim();

    if (detail.length < 10) {
      setReportSheet((current) => ({
        ...current,
        error: viewModel.abuseReportAction?.detailHelper,
      }));
      return;
    }

    if (!onReportAbuse) {
      setReportSheet((current) => ({
        ...current,
        error: "No pudimos enviar el reporte.",
      }));
      return;
    }

    setReportSheet((current) => ({
      ...current,
      error: undefined,
      isSubmitting: true,
    }));

    try {
      const result = await onReportAbuse({
        detail,
        reason: reportSheet.reason,
        reportId: viewModel.abuseReportAction.reportId,
      });

      setReportSheet((current) => ({
        ...current,
        isOpen: false,
        isSubmitting: false,
        success:
          result.status === "already_reported"
            ? viewModel.abuseReportAction?.successAlreadyReported
            : viewModel.abuseReportAction?.successCreated,
      }));
    } catch (error) {
      if (isUnauthorizedError(error)) {
        onRequestMemberSignIn?.();
      }

      setReportSheet((current) => ({
        ...current,
        error: isUnauthorizedError(error)
          ? viewModel.abuseReportAction?.visitorCtaLabel
          : "No pudimos enviar el reporte.",
        isSubmitting: false,
      }));
    }
  }, [
    isVisitor,
    onReportAbuse,
    onRequestMemberSignIn,
    reportSheet.detail,
    reportSheet.reason,
    viewModel.abuseReportAction,
  ]);

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
                  void handleOpenContactAction(action);
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
          onPress={() => {
            void handleOpenLocation();
          }}
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
          onPress={() => {
            void handleShare();
          }}
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
        {viewModel.abuseReportAction ? (
          <Pressable
            accessibilityLabel={viewModel.abuseReportAction.label}
            accessibilityRole="button"
            onPress={openReportSheet}
            testID="public-report-abuse-action"
            style={styles.secondaryAction}
          >
            <ShellIcon
              color={shellColors.primary}
              name="exclamationmark.triangle.fill"
              size={18}
            />
            <Text style={styles.secondaryActionText}>
              {viewModel.abuseReportAction.label}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {actionFeedback ? (
        <View
          accessibilityLabel={actionFeedback.label}
          accessibilityLiveRegion="polite"
          style={styles.actionFeedbackNotice}
          testID="public-report-action-feedback"
        >
          <ShellIcon
            color={shellColors.lost}
            name="exclamationmark.triangle.fill"
            size={18}
          />
          <Text selectable style={styles.actionFeedbackText}>
            {actionFeedback.label}
          </Text>
        </View>
      ) : null}

      {reportSheet.success ? (
        <View style={styles.reportSuccessNotice}>
          <ShellIcon
            color={shellColors.found}
            name="checkmark.seal.fill"
            size={18}
          />
          <Text selectable style={styles.reportSuccessText}>
            {reportSheet.success}
          </Text>
        </View>
      ) : null}

      {viewModel.abuseReportAction && reportSheet.isOpen ? (
        <ReportAbuseSheet
          action={viewModel.abuseReportAction}
          detail={reportSheet.detail}
          error={reportSheet.error}
          isSubmitting={reportSheet.isSubmitting}
          isVisitor={isVisitor}
          onCancel={closeReportSheet}
          onChangeDetail={(detail) => {
            setReportSheet((current) => ({
              ...current,
              detail,
              error: undefined,
            }));
          }}
          onChangeReason={(reason) => {
            setReportSheet((current) => ({
              ...current,
              error: undefined,
              reason,
            }));
          }}
          onSubmit={submitReportAbuse}
          reason={reportSheet.reason}
        />
      ) : null}

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
        onPress={() => {
          void handleOpenPublicPage();
        }}
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

export function buildPublicReportAbuseAuthReturnTo(
  viewModel: Pick<PublicReportDetailViewModel, "appPath">,
) {
  const separator = viewModel.appPath.includes("?") ? "&" : "?";

  return `${viewModel.appPath}${separator}reportar=1`;
}

function getContactActionIconName(
  kind: PublicReportDetailViewModel["contactActions"][number]["kind"],
) {
  return kind === "whatsapp" ? "phone.fill" : "message.fill";
}

function ReportAbuseSheet({
  action,
  detail,
  error,
  isSubmitting,
  isVisitor,
  onCancel,
  onChangeDetail,
  onChangeReason,
  onSubmit,
  reason,
}: {
  action: PublicReportDetailAbuseReportAction;
  detail: string;
  error?: string;
  isSubmitting: boolean;
  isVisitor: boolean;
  onCancel: () => void;
  onChangeDetail: (detail: string) => void;
  onChangeReason: (reason: TrustSafetyReportReason) => void;
  onSubmit: () => void;
  reason: TrustSafetyReportReason;
}) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible>
      <View style={styles.reportModalBackdrop}>
        <View style={styles.reportSheet}>
          <View style={styles.reportSheetHeader}>
            <View style={styles.reportSheetTitleGroup}>
              <Text selectable style={styles.reportSheetTitle}>
                {action.title}
              </Text>
              <Text selectable style={styles.reportSheetBody}>
                {action.body}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={onCancel}
              style={styles.reportSheetClose}
            >
              <ShellIcon color={shellColors.muted} name="xmark" size={18} />
            </Pressable>
          </View>

          <View style={styles.reportReasonGrid}>
            {trustSafetyReportReasonOptions.map((option) => {
              const isSelected = option.value === reason;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={option.value}
                  onPress={() => {
                    onChangeReason(option.value);
                  }}
                  style={[
                    styles.reportReasonButton,
                    isSelected ? styles.reportReasonButtonSelected : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.reportReasonText,
                      isSelected ? styles.reportReasonTextSelected : null,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text selectable style={styles.reportInputLabel}>
            {action.detailLabel}
          </Text>
          <TextInput
            editable={!isSubmitting}
            multiline
            onChangeText={onChangeDetail}
            placeholder={action.detailPlaceholder}
            placeholderTextColor={shellColors.muted}
            style={styles.reportDetailInput}
            value={detail}
          />
          <Text selectable style={styles.reportInputHelper}>
            {action.detailHelper}
          </Text>
          {error ? (
            <Text selectable style={styles.reportErrorText}>
              {error}
            </Text>
          ) : null}

          <View style={styles.reportSheetActions}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={onCancel}
              style={styles.reportCancelButton}
            >
              <Text style={styles.reportCancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: isSubmitting }}
              disabled={isSubmitting}
              onPress={onSubmit}
              style={[
                styles.reportSubmitButton,
                isSubmitting ? styles.disabledAction : null,
              ]}
            >
              <Text style={styles.reportSubmitButtonText}>
                {isVisitor ? action.visitorCtaLabel : action.submitLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function isUnauthorizedError(error: unknown) {
  if (isRecord(error) && readErrorCode(error) === "UNAUTHORIZED") {
    return true;
  }

  return error instanceof Error && error.message.includes("UNAUTHORIZED");
}

function readErrorCode(value: unknown) {
  if (!isRecord(value)) {
    return undefined;
  }

  const code = value.code;

  if (typeof code === "string") {
    return code;
  }

  return readErrorCode(value.data);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const styles = StyleSheet.create({
  actionFeedbackNotice: {
    alignItems: "flex-start",
    backgroundColor: "#FBE8E6",
    borderColor: "#F0B8B3",
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  actionFeedbackText: {
    color: shellColors.lost,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
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
  disabledAction: {
    opacity: 0.5,
  },
  reportCancelButton: {
    alignItems: "center",
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  reportCancelButtonText: {
    color: shellColors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  reportDetailInput: {
    backgroundColor: shellColors.surfaceMuted,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    color: shellColors.text,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 92,
    padding: 12,
    textAlignVertical: "top",
  },
  reportErrorText: {
    color: shellColors.lost,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  reportInputHelper: {
    color: shellColors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  reportInputLabel: {
    color: shellColors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  reportModalBackdrop: {
    backgroundColor: "rgba(16, 24, 40, 0.42)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 14,
  },
  reportReasonButton: {
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reportReasonButtonSelected: {
    backgroundColor: shellColors.primary,
    borderColor: shellColors.primary,
  },
  reportReasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reportReasonText: {
    color: shellColors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  reportReasonTextSelected: {
    color: shellColors.white,
  },
  reportSheet: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  reportSheetActions: {
    flexDirection: "row",
    gap: 10,
  },
  reportSheetBody: {
    color: shellColors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  reportSheetClose: {
    alignItems: "center",
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  reportSheetHeader: {
    flexDirection: "row",
    gap: 12,
  },
  reportSheetTitle: {
    color: shellColors.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25,
  },
  reportSheetTitleGroup: {
    flex: 1,
    gap: 4,
  },
  reportSubmitButton: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderCurve: "continuous",
    borderRadius: 14,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  reportSubmitButtonText: {
    color: shellColors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  reportSuccessNotice: {
    alignItems: "center",
    backgroundColor: "#E5F2EC",
    borderCurve: "continuous",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  reportSuccessText: {
    color: shellColors.found,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
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
