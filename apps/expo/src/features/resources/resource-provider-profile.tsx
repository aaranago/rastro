import * as React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import type { MaterialCommunityIconName } from "../icons/safe-material-community-icon";
import type {
  ResourceContactOption,
  ResourceProviderProfile as ResourceProviderProfileData,
} from "./resource-types";
import type { ResourceProviderProfileViewModel } from "./resources-view-model";
import { SafeMaterialCommunityIcon } from "../icons/safe-material-community-icon";
import { resourcesColors, resourcesShadow } from "./resources-theme";
import { buildResourceProviderProfileViewModel } from "./resources-view-model";

type ResourceIconName = MaterialCommunityIconName;

export interface ResourceProviderProfileProps {
  bottomInset?: number;
  profile: ResourceProviderProfileData;
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
  bottomInset = 208,
  profile,
  reportFeedback,
  onContactAction,
  onOpenLink,
  onReportProvider,
}: ResourceProviderProfileProps) {
  const viewModel = buildResourceProviderProfileViewModel(profile);
  const scrollBottomInset = Math.max(bottomInset, 156);
  const handleReportProvider = React.useCallback(() => {
    onReportProvider?.(viewModel.id);
  }, [onReportProvider, viewModel.id]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: scrollBottomInset },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      contentInset={{ bottom: scrollBottomInset }}
      scrollIndicatorInsets={{ bottom: scrollBottomInset }}
      style={styles.root}
      testID="resource-provider-profile-screen"
    >
      <View style={styles.contentFrame}>
        <View style={styles.summaryCard} testID="resource-provider-summary">
          <View style={styles.identityRow}>
            <RemoteImageWithFallback
              accessibilityLabel={`Logo de ${viewModel.name}`}
              fallback={
                <ResourceIcon
                  color={resourcesColors.primary}
                  name={getCategoryIcon(profile.categoryId)}
                  size={30}
                />
              }
              style={styles.logoImage}
              uri={viewModel.logoUrl}
            />
            <View style={styles.identityCopy}>
              <Text
                maxFontSizeMultiplier={1.15}
                selectable
                style={styles.title}
              >
                {viewModel.name}
              </Text>
              <Text
                maxFontSizeMultiplier={1.2}
                selectable
                style={styles.subtitle}
              >
                {viewModel.subtitle}
              </Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            {viewModel.badges.map((badge) => (
              <ProfileBadge
                key={`${badge.tone}-${badge.label}`}
                badge={badge}
              />
            ))}
          </View>

          <View style={styles.factGrid}>
            {viewModel.quickFacts.map((fact) => (
              <ProfileFact key={`${fact.label}-${fact.value}`} fact={fact} />
            ))}
          </View>

          {viewModel.sponsorDisclosure ? (
            <Text selectable style={styles.sponsorDisclosure}>
              {viewModel.sponsorDisclosure}
            </Text>
          ) : null}
        </View>

        {viewModel.primaryActions.length > 0 ? (
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
          </View>
        ) : null}

        <ProviderMediaGallery
          categoryLabel={viewModel.categoryLabel}
          items={viewModel.mediaItems}
          providerName={viewModel.name}
        />

        <SponsorMediaPanel
          imageUrl={viewModel.sponsorImageUrl}
          logoUrl={viewModel.sponsorLogoUrl}
          providerName={viewModel.name}
        />

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

        <View style={styles.safetyCard}>
          <View style={styles.safetyCopy}>
            <Text selectable style={styles.safetyTitle}>
              Seguridad
            </Text>
            <Text selectable style={styles.safetyBody}>
              Avisa si los datos no coinciden, hay fraude o el servicio parece
              riesgoso.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={handleReportProvider}
            testID="resource-provider-report-button"
            style={({ pressed }) => [
              styles.reportButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <ResourceIcon
              color={resourcesColors.error}
              name="flag-outline"
              size={18}
            />
            <Text
              maxFontSizeMultiplier={1.1}
              numberOfLines={1}
              style={styles.reportActionText}
            >
              {viewModel.reportAction.label}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function ProviderMediaGallery({
  categoryLabel,
  items,
  providerName,
}: {
  categoryLabel: string;
  items: ResourceProviderProfileViewModel["mediaItems"];
  providerName: string;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [frameWidth, setFrameWidth] = React.useState(0);
  const handleFrameLayout = React.useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      setFrameWidth(Math.round(event.nativeEvent.layout.width));
    },
    [],
  );

  if (items.length === 0) {
    return (
      <View
        onLayout={handleFrameLayout}
        style={[styles.mediaFrame, styles.mediaFallback]}
        testID="resource-provider-media"
      >
        <ResourceIcon
          color={resourcesColors.primary}
          name="image-off"
          size={34}
        />
        <Text selectable style={styles.mediaFallbackTitle}>
          Sin foto del proveedor
        </Text>
        <Text selectable style={styles.mediaFallbackBody}>
          {categoryLabel}
        </Text>
      </View>
    );
  }

  if (items.length === 1) {
    const [item] = items;

    if (!item) {
      return null;
    }

    return (
      <View style={styles.mediaGroup}>
        <View
          onLayout={handleFrameLayout}
          style={styles.mediaFrame}
          testID="resource-provider-media"
        >
          <RemoteImageWithFallback
            accessibilityLabel={item.accessibilityLabel}
            fallback={
              <View style={styles.mediaImageFallback}>
                <ResourceIcon
                  color={resourcesColors.primary}
                  name="image-broken-variant"
                  size={32}
                />
                <Text selectable style={styles.mediaFallbackTitle}>
                  No pudimos cargar esta foto
                </Text>
              </View>
            }
            priority="high"
            recyclingKey={item.url}
            style={styles.mediaImage}
            uri={item.url}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mediaGroup}>
      <ScrollView
        accessibilityLabel={`Fotos de ${providerName}`}
        contentContainerStyle={styles.mediaCarouselContent}
        decelerationRate="fast"
        horizontal
        onMomentumScrollEnd={(event) => {
          const width = event.nativeEvent.layoutMeasurement.width;
          const nextIndex = width
            ? Math.round(event.nativeEvent.contentOffset.x / width)
            : 0;

          setActiveIndex(Math.max(0, Math.min(nextIndex, items.length - 1)));
        }}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.mediaFrame}
        testID="resource-provider-media"
        onLayout={handleFrameLayout}
      >
        {items.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.mediaSlide,
              frameWidth > 0 ? { width: frameWidth } : null,
            ]}
            testID={`resource-provider-media-slide-${index}`}
          >
            <RemoteImageWithFallback
              accessibilityLabel={item.accessibilityLabel}
              fallback={
                <View style={styles.mediaImageFallback}>
                  <ResourceIcon
                    color={resourcesColors.primary}
                    name="image-broken-variant"
                    size={32}
                  />
                  <Text selectable style={styles.mediaFallbackTitle}>
                    No pudimos cargar esta foto
                  </Text>
                </View>
              }
              priority={index === 0 ? "high" : "normal"}
              recyclingKey={item.url}
              style={styles.mediaImage}
              uri={item.url}
            />
          </View>
        ))}
      </ScrollView>

      {items.length > 1 ? (
        <View style={styles.mediaFooter}>
          <View accessibilityElementsHidden style={styles.galleryDots}>
            {items.map((item, index) => (
              <View
                key={`dot:${item.id}`}
                style={[
                  styles.galleryDot,
                  activeIndex === index ? styles.galleryDotActive : null,
                ]}
              />
            ))}
          </View>
          <Text selectable style={styles.mediaCount}>
            {activeIndex + 1} de {items.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function RemoteImageWithFallback({
  accessibilityLabel,
  contentFit = "cover",
  fallback,
  priority,
  recyclingKey,
  style,
  uri,
}: {
  accessibilityLabel: string;
  contentFit?: "contain" | "cover";
  fallback: React.ReactNode;
  priority?: "high" | "low" | "normal";
  recyclingKey?: string;
  style: object;
  uri?: string;
}) {
  const [didFail, setDidFail] = React.useState(false);

  React.useEffect(() => {
    setDidFail(false);
  }, [uri]);

  if (!uri || didFail) {
    return <View style={[style, styles.remoteImageFallback]}>{fallback}</View>;
  }

  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      cachePolicy="memory-disk"
      contentFit={contentFit}
      onError={() => setDidFail(true)}
      priority={priority}
      recyclingKey={recyclingKey ?? uri}
      source={{ uri }}
      style={style}
      transition={160}
    />
  );
}

function ReportFeedbackPanel({
  feedback,
}: {
  feedback: NonNullable<ResourceProviderProfileProps["reportFeedback"]>;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
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

function ProfileFact({
  fact,
}: {
  fact: ResourceProviderProfileViewModel["quickFacts"][number];
}) {
  const tone = fact.tone ?? "default";

  return (
    <View style={[styles.factItem, factToneStyles[tone]]}>
      <ResourceIcon
        color={factToneTextColors[tone]}
        name={fact.iconName as ResourceIconName}
        size={18}
      />
      <View style={styles.factCopy}>
        <Text
          selectable
          style={[styles.factLabel, { color: factToneTextColors[tone] }]}
        >
          {fact.label}
        </Text>
        <Text selectable numberOfLines={2} style={styles.factValue}>
          {fact.value}
        </Text>
      </View>
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
      testID="resource-provider-sponsor-media"
    >
      {logoUrl ? (
        <RemoteImageWithFallback
          accessibilityLabel={`Logo de patrocinio de ${providerName}`}
          fallback={
            <ResourceIcon
              color={resourcesColors.tertiary}
              name="star"
              size={24}
            />
          }
          style={styles.sponsorLogoImage}
          uri={logoUrl}
        />
      ) : null}
      {imageUrl ? (
        <RemoteImageWithFallback
          accessibilityLabel={`Imagen de patrocinio de ${providerName}`}
          fallback={
            <View style={styles.sponsorBannerFallback}>
              <ResourceIcon
                color={resourcesColors.tertiary}
                name="image-off"
                size={24}
              />
              <Text selectable style={styles.sponsorFallbackText}>
                Patrocinio local
              </Text>
            </View>
          }
          style={styles.sponsorBannerImage}
          uri={imageUrl}
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
  const handlePress = React.useCallback(() => {
    onContactAction?.({
      providerId,
      kind,
      label,
      value,
    });
  }, [kind, label, onContactAction, providerId, value]);
  const displayLabel = getCompactActionLabel(kind, label);

  return (
    <Pressable
      accessibilityLabel={displayLabel}
      accessibilityRole="button"
      onPress={handlePress}
      testID={`resource-provider-contact-${kind}`}
      style={({ pressed }) => [
        styles.primaryAction,
        pressed ? styles.pressed : null,
      ]}
    >
      <ResourceIcon
        color={resourcesColors.surface}
        name={getActionIcon(kind)}
      />
      <Text
        maxFontSizeMultiplier={1.1}
        numberOfLines={1}
        style={styles.primaryActionText}
      >
        {displayLabel}
      </Text>
    </Pressable>
  );
}

function getCompactActionLabel(
  kind: ResourceContactOption["kind"],
  fallbackLabel: string,
) {
  if (kind === "phone") {
    return "Llamar";
  }

  if (kind === "whatsapp") {
    return "WhatsApp";
  }

  if (kind === "website") {
    return "Web";
  }

  if (kind === "email") {
    return "Correo";
  }

  if (kind === "directions") {
    return "Mapa";
  }

  if (isWhatsAppLikeLabel(fallbackLabel)) {
    return "Social";
  }

  return fallbackLabel.length > 12 ? "Social" : fallbackLabel;
}

function isWhatsAppLikeLabel(label: string) {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();

  return normalized.includes("whatsapp") || normalized === "wame";
}

function getProfileLinkDisplayLabel(label: string) {
  const trimmedLabel = label.trim();

  if (trimmedLabel.length === 0 || isWhatsAppLikeLabel(trimmedLabel)) {
    return "Enlace externo";
  }

  return trimmedLabel;
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
  const displayLabel = getProfileLinkDisplayLabel(label);
  const handlePress = React.useCallback(() => {
    onOpenLink?.({
      providerId,
      label: displayLabel,
      url,
    });
  }, [displayLabel, onOpenLink, providerId, url]);

  return (
    <Pressable
      accessibilityLabel={displayLabel}
      accessibilityRole="link"
      onPress={handlePress}
      testID={`resource-provider-link-${toTestIdSegment(displayLabel)}`}
      style={({ pressed }) => [styles.linkRow, pressed ? styles.pressed : null]}
    >
      <ResourceIcon
        color={resourcesColors.primary}
        name={getLinkIcon(displayLabel, url)}
      />
      <View style={styles.linkCopy}>
        <Text selectable style={styles.linkLabel}>
          {displayLabel}
        </Text>
        <Text selectable numberOfLines={1} style={styles.linkUrl}>
          {url}
        </Text>
      </View>
      <ResourceIcon
        color={resourcesColors.muted}
        name="chevron-right"
        size={18}
      />
    </Pressable>
  );
}

function ResourceIcon({
  color,
  name,
  size = 20,
}: {
  color: string;
  name: ResourceIconName;
  size?: number;
}) {
  return (
    <SafeMaterialCommunityIcon
      accessibilityElementsHidden
      color={color}
      importantForAccessibility="no"
      name={name}
      size={size}
    />
  );
}

function toTestIdSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getActionIcon(kind: ResourceContactOption["kind"]): ResourceIconName {
  if (kind === "phone") {
    return "phone";
  }

  if (kind === "whatsapp") {
    return "whatsapp";
  }

  if (kind === "directions") {
    return "map-marker";
  }

  if (kind === "email") {
    return "email-outline";
  }

  if (kind === "website") {
    return "web";
  }

  return "link-variant";
}

function getCategoryIcon(
  categoryId: ResourceProviderProfileData["categoryId"],
): ResourceIconName {
  if (categoryId === "veterinary") {
    return "medical-bag";
  }

  if (categoryId === "shelter") {
    return "home-heart";
  }

  if (categoryId === "groomer") {
    return "content-cut";
  }

  if (categoryId === "pet_food") {
    return "food-variant";
  }

  if (categoryId === "trainer") {
    return "hand-heart";
  }

  if (categoryId === "pet_store") {
    return "storefront-outline";
  }

  if (categoryId === "transport") {
    return "car-estate";
  }

  return "paw";
}

function getLinkIcon(label: string, url: string): ResourceIconName {
  const normalized = `${label} ${url}`.toLowerCase();

  if (normalized.includes("instagram")) {
    return "instagram";
  }

  if (normalized.includes("facebook")) {
    return "facebook";
  }

  if (normalized.includes("whatsapp")) {
    return "whatsapp";
  }

  if (normalized.includes("web") || normalized.includes("sitio")) {
    return "web";
  }

  return "open-in-new";
}

const factToneTextColors = {
  default: resourcesColors.primary,
  success: resourcesColors.secondary,
  warning: resourcesColors.tertiary,
};

const factToneStyles = StyleSheet.create({
  default: {
    backgroundColor: resourcesColors.surfaceMuted,
    borderColor: resourcesColors.border,
  },
  success: {
    backgroundColor: "#E7F3EB",
    borderColor: "#BBDDC5",
  },
  warning: {
    backgroundColor: "#F1F7FB",
    borderColor: "#C9DDEB",
  },
});

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
    backgroundColor: "#FDECEC",
    borderColor: "#F4B6B6",
  },
  info: {
    backgroundColor: "#F1F7FB",
    borderColor: "#C9DDEB",
  },
  success: {
    backgroundColor: "#E7F3EB",
    borderColor: "#BBDDC5",
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
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  content: {
    alignItems: "center",
    padding: 16,
  },
  contentFrame: {
    gap: 12,
    maxWidth: 620,
    width: "100%",
  },
  detailLabel: {
    color: resourcesColors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    textTransform: "uppercase",
  },
  detailRow: {
    gap: 3,
  },
  detailValue: {
    color: resourcesColors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  factCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  factGrid: {
    gap: 8,
  },
  factItem: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  factLabel: {
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 13,
    textTransform: "uppercase",
  },
  factValue: {
    color: resourcesColors.text,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  galleryDot: {
    backgroundColor: resourcesColors.border,
    borderCurve: "continuous",
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  galleryDotActive: {
    backgroundColor: resourcesColors.primary,
    width: 18,
  },
  galleryDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  identityCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  identityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  linkCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  linkLabel: {
    color: resourcesColors.primary,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
  },
  linkRow: {
    alignItems: "center",
    backgroundColor: resourcesColors.surfaceMuted,
    borderCurve: "continuous",
    borderRadius: 14,
    flexDirection: "row",
    gap: 10,
    minHeight: 52,
    padding: 12,
  },
  linkUrl: {
    color: resourcesColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  logoImage: {
    alignItems: "center",
    backgroundColor: resourcesColors.primarySoft,
    borderColor: resourcesColors.surface,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 2,
    height: 62,
    justifyContent: "center",
    overflow: "hidden",
    width: 62,
  },
  mediaCarouselContent: {
    alignItems: "stretch",
  },
  mediaCount: {
    color: resourcesColors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  mediaFallback: {
    alignItems: "center",
    backgroundColor: resourcesColors.primarySoft,
    borderColor: resourcesColors.border,
    borderWidth: 1,
    gap: 6,
    justifyContent: "center",
  },
  mediaFallbackBody: {
    color: resourcesColors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 17,
  },
  mediaFallbackTitle: {
    color: resourcesColors.primary,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
    textAlign: "center",
  },
  mediaFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  mediaFrame: {
    alignSelf: "stretch",
    aspectRatio: 16 / 9,
    backgroundColor: resourcesColors.surfaceMuted,
    borderCurve: "continuous",
    borderRadius: 18,
    overflow: "hidden",
    width: "100%",
  },
  mediaGroup: {
    gap: 8,
  },
  mediaImage: {
    height: "100%",
    width: "100%",
  },
  mediaImageFallback: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    justifyContent: "center",
    padding: 14,
  },
  mediaSlide: {
    height: "100%",
    width: "100%",
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: resourcesColors.primary,
    borderCurve: "continuous",
    borderRadius: 14,
    boxShadow: resourcesShadow.primary,
    flexDirection: "row",
    flexGrow: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
    minWidth: 150,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  primaryActionText: {
    color: resourcesColors.surface,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 18,
  },
  profileBadge: {
    borderCurve: "continuous",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  profileBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 15,
  },
  remoteImageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  reportActionText: {
    color: resourcesColors.error,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 17,
  },
  reportButton: {
    alignItems: "center",
    backgroundColor: resourcesColors.surface,
    borderColor: "#F4B6B6",
    borderCurve: "continuous",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reportFeedback: {
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
    padding: 14,
  },
  reportFeedbackBody: {
    color: resourcesColors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  reportFeedbackTitle: {
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
  },
  root: {
    backgroundColor: resourcesColors.background,
    flex: 1,
  },
  safetyBody: {
    color: resourcesColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  safetyCard: {
    alignItems: "center",
    backgroundColor: "#FFF8F8",
    borderColor: "#F4B6B6",
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    padding: 14,
  },
  safetyCopy: {
    flex: 1,
    gap: 4,
    minWidth: 190,
  },
  safetyTitle: {
    color: resourcesColors.error,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
  },
  section: {
    backgroundColor: resourcesColors.surface,
    borderColor: resourcesColors.border,
    borderCurve: "continuous",
    borderRadius: 16,
    borderWidth: 1,
    boxShadow: resourcesShadow.soft,
    gap: 12,
    padding: 15,
  },
  sectionTitle: {
    color: resourcesColors.primary,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 21,
  },
  sponsorBannerFallback: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  sponsorBannerImage: {
    borderCurve: "continuous",
    borderRadius: 12,
    flex: 1,
    height: 66,
    minWidth: 0,
  },
  sponsorDisclosure: {
    color: resourcesColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  sponsorFallbackText: {
    color: resourcesColors.tertiary,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17,
  },
  sponsorLogoImage: {
    backgroundColor: resourcesColors.surface,
    borderCurve: "continuous",
    borderRadius: 12,
    height: 54,
    overflow: "hidden",
    width: 54,
  },
  sponsorMediaPanel: {
    alignItems: "center",
    backgroundColor: resourcesColors.warningSoft,
    borderCurve: "continuous",
    borderRadius: 16,
    flexDirection: "row",
    gap: 10,
    minHeight: 78,
    padding: 8,
  },
  subtitle: {
    color: resourcesColors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: resourcesColors.surface,
    borderColor: resourcesColors.border,
    borderCurve: "continuous",
    borderRadius: 18,
    borderWidth: 1,
    boxShadow: resourcesShadow.soft,
    gap: 12,
    padding: 14,
  },
  title: {
    color: resourcesColors.text,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 29,
  },
});
