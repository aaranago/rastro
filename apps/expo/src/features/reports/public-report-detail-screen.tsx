import type { Href } from "expo-router";
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
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import type {
  PublicReportDetailAdapter,
  PublicReportDetailType,
  PublicReportDetailViewModel,
} from "./public-report-detail";
import { runPublicContactAction } from "../contact-actions/contact-actions";
import { openInternalRastroHref } from "../navigation/internal-rastro-links";
import { ShellIcon } from "../shell/shell-overlays";
import { shellColors } from "../shell/shell-theme";
import { buildPublicReportDetailViewModel } from "./public-report-detail";

const bottomInset = 36;

type PublicReportDetailLoadState =
  | { kind: "error" }
  | { kind: "loading" }
  | { kind: "ready"; viewModel: PublicReportDetailViewModel };

export function PublicReportDetailScreen({
  adapter,
  expectedType,
  fallback,
  reportId,
}: {
  adapter: PublicReportDetailAdapter;
  expectedType?: PublicReportDetailType;
  fallback: React.ReactNode;
  reportId?: string | string[];
}) {
  const resolvedReportId = normalizeReportId(reportId);
  const [loadState, setLoadState] = React.useState<PublicReportDetailLoadState>(
    { kind: "loading" },
  );

  React.useEffect(() => {
    if (!resolvedReportId) {
      setLoadState({ kind: "error" });
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
          setLoadState({ kind: "error" });
          return;
        }

        setLoadState({
          kind: "ready",
          viewModel: buildPublicReportDetailViewModel(report),
        });
      })
      .catch(() => {
        if (isCurrent) {
          setLoadState({ kind: "error" });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [adapter, expectedType, resolvedReportId]);

  if (loadState.kind === "ready") {
    return <PublicReportDetailContent viewModel={loadState.viewModel} />;
  }

  if (loadState.kind === "error") {
    return <>{fallback}</>;
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

      {viewModel.isCurrentMember ? (
        <View style={styles.ownerNotice}>
          <Text selectable style={styles.ownerNoticeTitle}>
            Es tu reporte
          </Text>
          <Text selectable style={styles.ownerNoticeBody}>
            Comparte el enlace para que mas personas cerca de la zona puedan
            verlo.
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
  const photoUrls = viewModel.photoUrls.slice(0, 5);
  const primaryPhotoUrl = photoUrls[0];
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const selectedPhotoUrl =
    selectedIndex === null ? undefined : photoUrls[selectedIndex];
  const selectedPhotoPosition = selectedIndex === null ? 0 : selectedIndex + 1;
  const closeLightbox = React.useCallback(() => {
    setSelectedIndex(null);
  }, []);
  const openPhoto = React.useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  return (
    <View style={styles.gallery}>
      <View
        style={[styles.hero, primaryPhotoUrl ? null : styles.heroFallbackFrame]}
      >
        {primaryPhotoUrl ? (
          <Pressable
            accessibilityLabel={`Ampliar foto principal 1 de ${photoUrls.length}`}
            accessibilityRole="imagebutton"
            onPress={() => {
              openPhoto(0);
            }}
            style={styles.heroImagePressable}
          >
            <Image
              accessibilityRole="image"
              cachePolicy="memory-disk"
              contentFit="contain"
              priority="high"
              recyclingKey={primaryPhotoUrl}
              source={{ uri: primaryPhotoUrl }}
              style={styles.heroImage}
              transition={160}
            />
          </Pressable>
        ) : (
          <View
            style={[
              styles.heroFallback,
              { backgroundColor: viewModel.accentSoftColor },
            ]}
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
                : { backgroundColor: viewModel.accentColor },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                viewModel.statusTone === "closed"
                  ? styles.statusPillTextClosed
                  : null,
              ]}
            >
              {viewModel.statusLabel}
            </Text>
          </View>
        </View>
        {photoUrls.length > 1 ? (
          <View style={styles.galleryCountBadge}>
            <Text style={styles.galleryCountText}>1 de {photoUrls.length}</Text>
          </View>
        ) : null}
      </View>

      {photoUrls.length > 1 ? (
        <ScrollView
          accessibilityLabel="Galeria de fotos"
          contentContainerStyle={styles.thumbnailContent}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {photoUrls.map((photoUrl, index) => (
            <Pressable
              accessibilityLabel={`Abrir foto ${index + 1} de ${photoUrls.length}`}
              accessibilityRole="imagebutton"
              key={photoUrl}
              onPress={() => {
                openPhoto(index);
              }}
              style={styles.thumbnailButton}
            >
              <Image
                accessibilityRole="image"
                cachePolicy="memory-disk"
                contentFit="cover"
                recyclingKey={photoUrl}
                source={{ uri: photoUrl }}
                style={styles.thumbnailImage}
                transition={120}
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={closeLightbox}
        transparent
        visible={!!selectedPhotoUrl}
      >
        <View style={styles.lightbox}>
          <View style={styles.lightboxTopRow}>
            <Text style={styles.lightboxCounter}>
              {selectedPhotoPosition} de {photoUrls.length}
            </Text>
            <Pressable
              accessibilityLabel="Cerrar galeria"
              accessibilityRole="button"
              onPress={closeLightbox}
              style={styles.lightboxCloseButton}
            >
              <ShellIcon color={shellColors.white} name="xmark" size={22} />
            </Pressable>
          </View>

          {selectedPhotoUrl ? (
            <Image
              accessibilityRole="image"
              cachePolicy="memory-disk"
              contentFit="contain"
              recyclingKey={`lightbox:${selectedPhotoUrl}`}
              source={{ uri: selectedPhotoUrl }}
              style={styles.lightboxImage}
              transition={120}
            />
          ) : null}

          {photoUrls.length > 1 ? (
            <ScrollView
              contentContainerStyle={styles.lightboxThumbnailContent}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {photoUrls.map((photoUrl, index) => (
                <Pressable
                  accessibilityLabel={`Ver foto ${index + 1} de ${photoUrls.length}`}
                  accessibilityRole="imagebutton"
                  key={`lightbox:${photoUrl}`}
                  onPress={() => {
                    openPhoto(index);
                  }}
                  style={[
                    styles.lightboxThumbnailButton,
                    selectedIndex === index
                      ? styles.lightboxThumbnailButtonActive
                      : null,
                  ]}
                >
                  <Image
                    accessibilityRole="image"
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    recyclingKey={`lightbox-thumb:${photoUrl}`}
                    source={{ uri: photoUrl }}
                    style={styles.lightboxThumbnailImage}
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function PublicReportDetailLoadingState() {
  return (
    <View style={styles.loadingScreen}>
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
    backgroundColor: "rgba(17, 24, 39, 0.72)",
    borderCurve: "continuous",
    borderRadius: 999,
    bottom: 12,
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
  heroImage: {
    height: "100%",
    width: "100%",
  },
  heroImagePressable: {
    flex: 1,
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
  lightbox: {
    backgroundColor: "rgba(0, 0, 0, 0.94)",
    flex: 1,
    gap: 14,
    justifyContent: "center",
    padding: 18,
    paddingBottom: 30,
    paddingTop: 54,
  },
  lightboxCloseButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderCurve: "continuous",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  lightboxCounter: {
    color: shellColors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  lightboxImage: {
    flex: 1,
    width: "100%",
  },
  lightboxThumbnailButton: {
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    height: 62,
    overflow: "hidden",
    width: 62,
  },
  lightboxThumbnailButtonActive: {
    borderColor: shellColors.white,
    borderWidth: 2,
  },
  lightboxThumbnailContent: {
    gap: 10,
    paddingHorizontal: 2,
  },
  lightboxThumbnailImage: {
    height: "100%",
    width: "100%",
  },
  lightboxTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
  statusPillText: {
    color: shellColors.white,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statusPillTextClosed: {
    color: shellColors.muted,
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
  thumbnailContent: {
    gap: 10,
    paddingHorizontal: 1,
  },
  thumbnailImage: {
    height: "100%",
    width: "100%",
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
