import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import type {
  ResourceContactOption,
  ResourceProviderProfile,
} from "./resource-types";
import type { ResourceProviderProfileViewModel } from "./resources-view-model";
import { resourcesColors, resourcesShadow } from "./resources-theme";
import { buildResourceProviderProfileViewModel } from "./resources-view-model";

interface ResourceProviderProfileProps {
  profile: ResourceProviderProfile;
  reportFeedback?: {
    body: string;
    title: string;
    tone: "info" | "success" | "error";
  };
  onContactAction?: (action: {
    providerId: string;
    kind: ResourceContactOption["kind"];
    label: string;
    value: string;
  }) => void;
  onOpenLink?: (link: {
    providerId: string;
    label: string;
    url: string;
  }) => void;
  onReportProvider?: (providerId: string) => void;
}

export function ResourceProviderProfile({
  profile,
  reportFeedback,
  onContactAction,
  onOpenLink,
  onReportProvider,
}: ResourceProviderProfileProps) {
  const viewModel = buildResourceProviderProfileViewModel(profile);
  const handleReportProvider = useCallback(() => {
    onReportProvider?.(viewModel.id);
  }, [onReportProvider, viewModel.id]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.hero}>
        {viewModel.heroImageUrl ? (
          <Image
            source={{ uri: viewModel.heroImageUrl }}
            style={styles.heroImage}
            contentFit="cover"
          />
        ) : (
          <Image
            source="sf:pawprint.fill"
            style={styles.heroIcon}
            tintColor={resourcesColors.primary}
            contentFit="contain"
          />
        )}
      </View>

      <View style={styles.header}>
        <View style={styles.logo}>
          {viewModel.logoUrl ? (
            <Image
              source={{ uri: viewModel.logoUrl }}
              style={styles.logoImage}
              contentFit="cover"
            />
          ) : (
            <Image
              source="sf:cross.case.fill"
              style={styles.logoIcon}
              tintColor={resourcesColors.primary}
              contentFit="contain"
            />
          )}
        </View>
        <Text selectable style={styles.title}>
          {viewModel.name}
        </Text>
        <Text selectable style={styles.subtitle}>
          {viewModel.subtitle}
        </Text>
        <View style={styles.badgeRow}>
          {viewModel.badges.map((badge) => (
            <ProfileBadge key={`${badge.tone}-${badge.label}`} badge={badge} />
          ))}
        </View>
        {viewModel.sponsorDisclosure ? (
          <Text selectable style={styles.sponsorDisclosure}>
            {viewModel.sponsorDisclosure}
          </Text>
        ) : null}
        <SponsorMediaPanel
          imageUrl={viewModel.sponsorImageUrl}
          logoUrl={viewModel.sponsorLogoUrl}
          providerName={viewModel.name}
        />
      </View>

      <View style={styles.actionGrid}>
        {viewModel.primaryActions.map((action) => (
          <ProfileActionButton
            key={`${action.kind}-${action.value}`}
            providerId={viewModel.id}
            kind={action.kind}
            label={action.label}
            value={action.value}
            onContactAction={onContactAction}
          />
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={handleReportProvider}
          style={({ pressed }) => [
            styles.secondaryAction,
            pressed ? styles.pressed : null,
          ]}
        >
          <Image
            source="sf:exclamationmark.bubble.fill"
            style={styles.actionIcon}
            tintColor={resourcesColors.error}
          />
          <Text selectable numberOfLines={1} style={styles.reportActionText}>
            {viewModel.reportAction.label}
          </Text>
        </Pressable>
      </View>

      {reportFeedback ? (
        <ReportFeedbackPanel feedback={reportFeedback} />
      ) : null}

      {viewModel.sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text selectable style={styles.sectionTitle}>
            {section.title}
          </Text>
          {section.rows.map((row) => (
            <View
              key={`${section.title}-${row.label}`}
              style={styles.detailRow}
            >
              <Text selectable style={styles.detailLabel}>
                {row.label}
              </Text>
              <Text selectable style={styles.detailValue}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {viewModel.optionalLinks.length > 0 ? (
        <View style={styles.section}>
          <Text selectable style={styles.sectionTitle}>
            Enlaces
          </Text>
          {viewModel.optionalLinks.map((link) => (
            <ProfileLink
              key={link.url}
              providerId={viewModel.id}
              label={link.label}
              url={link.url}
              onOpenLink={onOpenLink}
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function ReportFeedbackPanel({
  feedback,
}: {
  feedback: NonNullable<ResourceProviderProfileProps["reportFeedback"]>;
}) {
  return (
    <View
      style={[styles.reportFeedback, reportFeedbackToneStyles[feedback.tone]]}
    >
      <Text
        selectable
        style={[
          styles.reportFeedbackTitle,
          reportFeedbackTitleToneStyles[feedback.tone],
        ]}
      >
        {feedback.title}
      </Text>
      <Text selectable style={styles.reportFeedbackBody}>
        {feedback.body}
      </Text>
    </View>
  );
}

function ProfileBadge({
  badge,
}: {
  badge: ResourceProviderProfileViewModel["badges"][number];
}) {
  return (
    <View style={[styles.profileBadge, profileBadgeToneStyles[badge.tone]]}>
      <Text
        selectable
        style={[styles.profileBadgeText, profileBadgeTextStyles[badge.tone]]}
      >
        {badge.label}
      </Text>
    </View>
  );
}

function SponsorMediaPanel({
  imageUrl,
  logoUrl,
  providerName,
}: {
  imageUrl?: string;
  logoUrl?: string;
  providerName: string;
}) {
  if (!logoUrl && !imageUrl) {
    return null;
  }

  return (
    <View
      accessibilityLabel={`Medios de patrocinio de ${providerName}`}
      style={styles.sponsorMediaPanel}
    >
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={styles.sponsorLogoImage}
          contentFit="cover"
        />
      ) : null}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.sponsorBannerImage}
          contentFit="cover"
        />
      ) : null}
    </View>
  );
}

function ProfileActionButton({
  providerId,
  kind,
  label,
  value,
  onContactAction,
}: {
  providerId: string;
  kind: ResourceContactOption["kind"];
  label: string;
  value: string;
  onContactAction?: ResourceProviderProfileProps["onContactAction"];
}) {
  const handlePress = useCallback(() => {
    onContactAction?.({
      providerId,
      kind,
      label,
      value,
    });
  }, [kind, label, onContactAction, providerId, value]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [
        styles.primaryAction,
        pressed ? styles.pressed : null,
      ]}
    >
      <Image
        source={`sf:${getActionSymbol(kind)}`}
        style={styles.actionIcon}
        tintColor={resourcesColors.surface}
      />
      <Text selectable numberOfLines={1} style={styles.primaryActionText}>
        {label}
      </Text>
    </Pressable>
  );
}

function ProfileLink({
  providerId,
  label,
  url,
  onOpenLink,
}: {
  providerId: string;
  label: string;
  url: string;
  onOpenLink?: ResourceProviderProfileProps["onOpenLink"];
}) {
  const handlePress = useCallback(() => {
    onOpenLink?.({
      providerId,
      label,
      url,
    });
  }, [label, onOpenLink, providerId, url]);

  return (
    <Pressable
      accessibilityRole="link"
      onPress={handlePress}
      style={({ pressed }) => [styles.linkRow, pressed ? styles.pressed : null]}
    >
      <Text selectable style={styles.linkLabel}>
        {label}
      </Text>
      <Text selectable numberOfLines={1} style={styles.linkUrl}>
        {url}
      </Text>
    </Pressable>
  );
}

function getActionSymbol(kind: ResourceContactOption["kind"]) {
  if (kind === "phone") {
    return "phone.fill";
  }

  if (kind === "whatsapp") {
    return "message.fill";
  }

  if (kind === "directions") {
    return "location.fill";
  }

  if (kind === "email") {
    return "envelope.fill";
  }

  return "link";
}

const profileBadgeToneStyles = StyleSheet.create({
  category: {
    backgroundColor: resourcesColors.primarySoft,
  },
  verified: {
    backgroundColor: "#E1EFF5",
  },
  sponsor: {
    backgroundColor: resourcesColors.warningSoft,
  },
  emergency: {
    backgroundColor: "#FDECEC",
  },
});

const profileBadgeTextStyles = StyleSheet.create({
  category: {
    color: resourcesColors.primary,
  },
  verified: {
    color: resourcesColors.tertiary,
  },
  sponsor: {
    color: resourcesColors.primary,
  },
  emergency: {
    color: resourcesColors.error,
  },
});

const reportFeedbackToneStyles = StyleSheet.create({
  error: {
    borderColor: "#F4B6B6",
    backgroundColor: "#FDECEC",
  },
  info: {
    borderColor: "#C9DDEB",
    backgroundColor: "#F1F7FB",
  },
  success: {
    borderColor: "#BBDDC5",
    backgroundColor: "#E7F3EB",
  },
});

const reportFeedbackTitleToneStyles = StyleSheet.create({
  error: {
    color: resourcesColors.error,
  },
  info: {
    color: resourcesColors.tertiary,
  },
  success: {
    color: resourcesColors.secondary,
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: resourcesColors.background,
  },
  content: {
    padding: 18,
    paddingBottom: 36,
    gap: 16,
  },
  hero: {
    minHeight: 220,
    borderRadius: 24,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: resourcesColors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroIcon: {
    width: 56,
    height: 56,
  },
  header: {
    gap: 10,
  },
  logo: {
    width: 78,
    height: 78,
    marginTop: -54,
    marginLeft: 18,
    borderRadius: 28,
    borderCurve: "continuous",
    borderWidth: 4,
    borderColor: resourcesColors.surface,
    backgroundColor: resourcesColors.surface,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: resourcesShadow.primary,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoIcon: {
    width: 34,
    height: 34,
  },
  title: {
    color: resourcesColors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
  },
  subtitle: {
    color: resourcesColors.muted,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  profileBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  profileBadgeText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "800",
  },
  sponsorDisclosure: {
    color: resourcesColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  sponsorMediaPanel: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    borderCurve: "continuous",
    backgroundColor: resourcesColors.warningSoft,
    padding: 8,
  },
  sponsorLogoImage: {
    width: 62,
    height: 62,
    borderRadius: 16,
    borderCurve: "continuous",
  },
  sponsorBannerImage: {
    flex: 1,
    minWidth: 0,
    height: 72,
    borderRadius: 14,
    borderCurve: "continuous",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  primaryAction: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: resourcesColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    boxShadow: resourcesShadow.primary,
  },
  secondaryAction: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: resourcesColors.surface,
    borderWidth: 1,
    borderColor: resourcesColors.border,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  actionIcon: {
    width: 16,
    height: 16,
  },
  primaryActionText: {
    color: resourcesColors.surface,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "800",
  },
  reportActionText: {
    color: resourcesColors.error,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  reportFeedback: {
    gap: 5,
    borderWidth: 1,
    borderRadius: 18,
    borderCurve: "continuous",
    padding: 14,
  },
  reportFeedbackBody: {
    color: resourcesColors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  reportFeedbackTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900",
  },
  section: {
    gap: 12,
    borderWidth: 1,
    borderColor: resourcesColors.border,
    borderRadius: 18,
    borderCurve: "continuous",
    backgroundColor: resourcesColors.surface,
    padding: 16,
    boxShadow: resourcesShadow.soft,
  },
  sectionTitle: {
    color: resourcesColors.primary,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
  },
  detailRow: {
    gap: 3,
  },
  detailLabel: {
    color: resourcesColors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  detailValue: {
    color: resourcesColors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  linkRow: {
    gap: 4,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: resourcesColors.surfaceMuted,
    padding: 12,
  },
  linkLabel: {
    color: resourcesColors.primary,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "800",
  },
  linkUrl: {
    color: resourcesColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
