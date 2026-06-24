import * as React from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";

import type {
  PublicReportDetailAdapter,
  PublicReportDetailType,
  PublicReportDetailViewModel,
} from "./public-report-detail";
import { buildPublicReportDetailViewModel } from "./public-report-detail";
import { ShellIcon } from "../shell/shell-overlays";
import { shellColors } from "../shell/shell-theme";

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
  const [loadState, setLoadState] =
    React.useState<PublicReportDetailLoadState>({ kind: "loading" });

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
  onOpenPublicPage,
  onShare,
  viewModel,
}: {
  onOpenPublicPage?: () => void;
  onShare?: () => void;
  viewModel: PublicReportDetailViewModel;
}) {
  const primaryPhotoUrl = viewModel.photoUrls[0];
  const secondaryPhotoUrls = viewModel.photoUrls.slice(1, 5);
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
  }, [onShare, viewModel.shareMessage, viewModel.shareTitle, viewModel.shareUrl]);
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
      <View style={styles.hero}>
        {primaryPhotoUrl ? (
          <Image
            accessibilityRole="image"
            contentFit="cover"
            source={{ uri: primaryPhotoUrl }}
            style={styles.heroImage}
            transition={160}
          />
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
            <Text style={[styles.typePillText, { color: viewModel.accentColor }]}>
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
      </View>

      {secondaryPhotoUrls.length > 0 ? (
        <View style={styles.thumbnailRow}>
          {secondaryPhotoUrls.map((photoUrl) => (
            <Image
              accessibilityRole="image"
              contentFit="cover"
              key={photoUrl}
              source={{ uri: photoUrl }}
              style={styles.thumbnail}
              transition={120}
            />
          ))}
        </View>
      ) : null}

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

      <View style={styles.actionRow}>
        <Pressable
          accessibilityLabel={`Compartir ${viewModel.title}`}
          accessibilityRole="button"
          onPress={handleShare}
          style={[styles.primaryAction, { backgroundColor: viewModel.accentColor }]}
        >
          <ShellIcon color={shellColors.white} name="square.and.arrow.up" size={18} />
          <Text style={styles.primaryActionText}>Compartir</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={viewModel.publicPageLabel}
          accessibilityRole="button"
          onPress={handleOpenPublicPage}
          style={styles.secondaryAction}
        >
          <ShellIcon color={shellColors.primary} name="arrow.up.right" size={18} />
          <Text style={styles.secondaryActionText}>{viewModel.publicPageLabel}</Text>
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
              <ShellIcon color={viewModel.accentColor} name={fact.iconName} size={18} />
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

      {viewModel.isCurrentMember ? (
        <View style={styles.ownerNotice}>
          <Text selectable style={styles.ownerNoticeTitle}>
            Es tu reporte
          </Text>
          <Text selectable style={styles.ownerNoticeBody}>
            Comparte el enlace para que mas personas cerca de la zona puedan verlo.
          </Text>
        </View>
      ) : null}
    </ScrollView>
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

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  content: {
    gap: 14,
    padding: 18,
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
    alignItems: "center",
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
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  facts: {
    gap: 10,
  },
  hero: {
    aspectRatio: 1,
    backgroundColor: shellColors.surfaceMuted,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
  },
  heroFallback: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  heroImage: {
    height: "100%",
    width: "100%",
  },
  heroTopRow: {
    flexDirection: "row",
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
  primaryAction: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 18,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 12,
  },
  primaryActionText: {
    color: shellColors.white,
    fontSize: 15,
    fontWeight: "900",
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
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 12,
  },
  secondaryActionText: {
    color: shellColors.primary,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
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
  thumbnail: {
    aspectRatio: 1,
    borderColor: shellColors.border,
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
  },
  thumbnailRow: {
    flexDirection: "row",
    gap: 10,
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
  },
  typePillText: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
});
