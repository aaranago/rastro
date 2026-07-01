import { memo, useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import type { MaterialCommunityIconName } from "../icons/safe-material-community-icon";
import { SafeMaterialCommunityIcon } from "../icons/safe-material-community-icon";
import { resourcesColors, resourcesShadow } from "./resources-theme";

type ResourceIconName = MaterialCommunityIconName;

interface ResourceProviderCardProps {
  id: string;
  name: string;
  categoryLabel: string;
  description: string;
  locationLabel: string;
  serviceAreaLabel?: string;
  distanceLabel?: string;
  isVerified: boolean;
  isSponsored: boolean;
  sponsorLabel?: string;
  sponsorDisclosure?: string;
  sponsorLogoUrl?: string;
  sponsorImageUrl?: string;
  availabilityLabel?: string;
  emergencyLabel?: string;
  imageUrl?: string;
  contactLabels: readonly string[];
  onOpenProvider?: (providerId: string) => void;
  onReportProvider?: (providerId: string) => void;
}

export const ResourceProviderCard = memo(function ResourceProviderCard({
  id,
  name,
  categoryLabel,
  description,
  locationLabel,
  serviceAreaLabel,
  distanceLabel,
  isVerified,
  isSponsored,
  sponsorLabel,
  sponsorDisclosure,
  sponsorLogoUrl,
  sponsorImageUrl,
  availabilityLabel,
  emergencyLabel,
  imageUrl,
  contactLabels,
  onOpenProvider,
  onReportProvider,
}: ResourceProviderCardProps) {
  const handleOpenProvider = useCallback(() => {
    onOpenProvider?.(id);
  }, [id, onOpenProvider]);

  const handleReportProvider = useCallback(() => {
    onReportProvider?.(id);
  }, [id, onReportProvider]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${name}`}
      onPress={handleOpenProvider}
      testID={`resource-provider-card-${id}`}
      style={({ pressed }) => getCardStyle({ isSponsored, pressed })}
    >
      <ProviderMedia
        categoryLabel={categoryLabel}
        id={id}
        imageUrl={imageUrl}
      />

      <View style={styles.content}>
        <ProviderCardHeader
          description={description}
          distanceLabel={distanceLabel}
          name={name}
        />

        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.location}>
          {locationLabel}
        </Text>
        <ProviderServiceArea label={serviceAreaLabel} />

        <ProviderMetaLine
          availabilityLabel={availabilityLabel}
          categoryLabel={categoryLabel}
          emergencyLabel={emergencyLabel}
        />

        <ProviderTrustBadges
          isSponsored={isSponsored}
          isVerified={isVerified}
          sponsorLabel={sponsorLabel}
        />

        <SponsorDisclosureText
          disclosure={sponsorDisclosure}
          isSponsored={isSponsored}
        />

        <SponsorMediaRow
          id={id}
          imageUrl={sponsorImageUrl}
          isSponsored={isSponsored}
          logoUrl={sponsorLogoUrl}
          name={name}
        />

        <ProviderActionsRow
          contactLabels={contactLabels}
          name={name}
          onReportProvider={onReportProvider ? handleReportProvider : undefined}
        />
      </View>
    </Pressable>
  );
});

function getCardStyle({
  isSponsored,
  pressed,
}: {
  isSponsored: boolean;
  pressed: boolean;
}) {
  return [
    styles.card,
    isSponsored ? styles.sponsoredCard : null,
    pressed ? styles.cardPressed : null,
  ];
}

function ProviderMedia({
  categoryLabel,
  id,
  imageUrl,
}: {
  categoryLabel: string;
  id: string;
  imageUrl?: string;
}) {
  const [didFail, setDidFail] = useState(false);
  const shouldShowImage = imageUrl && !didFail;

  return (
    <View style={styles.media} testID={`resource-provider-card-media-${id}`}>
      {shouldShowImage ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.mediaImage}
          contentFit="cover"
          onError={() => {
            setDidFail(true);
          }}
          recyclingKey={id}
        />
      ) : (
        <ResourceIcon
          color={resourcesColors.primary}
          name={getProviderIconName(categoryLabel)}
          size={34}
        />
      )}
    </View>
  );
}

function ProviderServiceArea({ label }: { label?: string }) {
  if (!label) {
    return null;
  }

  return (
    <Text ellipsizeMode="tail" numberOfLines={1} style={styles.serviceArea}>
      Cobertura: {label}
    </Text>
  );
}

function SponsorDisclosureText({
  disclosure,
  isSponsored,
}: {
  disclosure?: string;
  isSponsored: boolean;
}) {
  if (!isSponsored || !disclosure) {
    return null;
  }

  return (
    <Text selectable numberOfLines={3} style={styles.sponsorDisclosure}>
      {disclosure}
    </Text>
  );
}

function ProviderCardHeader({
  description,
  distanceLabel,
  name,
}: {
  description: string;
  distanceLabel?: string;
  name: string;
}) {
  return (
    <View style={styles.topRow}>
      <View style={styles.titleColumn}>
        <Text ellipsizeMode="tail" numberOfLines={2} style={styles.name}>
          {name}
        </Text>
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.description}>
          {description}
        </Text>
      </View>
      {distanceLabel ? <DistancePill label={distanceLabel} /> : null}
    </View>
  );
}

function SponsorMediaRow({
  id,
  imageUrl,
  isSponsored,
  logoUrl,
  name,
}: {
  id: string;
  imageUrl?: string;
  isSponsored: boolean;
  logoUrl?: string;
  name: string;
}) {
  if (!isSponsored || (!logoUrl && !imageUrl)) {
    return null;
  }

  return (
    <View
      accessibilityLabel={`Medios de patrocinio de ${name}`}
      style={styles.sponsorMediaRow}
      testID={`resource-provider-card-sponsor-media-${id}`}
    >
      {logoUrl ? (
        <SponsorImageWithFallback
          fallbackLabel="Sponsor"
          imageStyle={styles.sponsorLogo}
          recyclingKey={`${id}-sponsor-logo`}
          uri={logoUrl}
        />
      ) : null}
      {imageUrl ? (
        <SponsorImageWithFallback
          fallbackLabel="Patrocinio"
          imageStyle={styles.sponsorImage}
          recyclingKey={`${id}-sponsor-image`}
          uri={imageUrl}
        />
      ) : null}
    </View>
  );
}

function SponsorImageWithFallback({
  fallbackLabel,
  imageStyle,
  recyclingKey,
  uri,
}: {
  fallbackLabel: string;
  imageStyle: object;
  recyclingKey: string;
  uri: string;
}) {
  const [didFail, setDidFail] = useState(false);

  if (didFail) {
    return (
      <View style={[imageStyle, styles.sponsorImageFallback]}>
        <Text numberOfLines={1} style={styles.sponsorImageFallbackText}>
          {fallbackLabel}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={imageStyle}
      contentFit="cover"
      onError={() => setDidFail(true)}
      recyclingKey={recyclingKey}
    />
  );
}

function DistancePill({ label }: { label: string }) {
  return (
    <View style={styles.distancePill}>
      <ResourceIcon
        color={resourcesColors.primary}
        name="map-marker"
        size={13}
      />
      <Text selectable style={styles.distanceText}>
        {label}
      </Text>
    </View>
  );
}

function ProviderMetaLine({
  availabilityLabel,
  categoryLabel,
  emergencyLabel,
}: {
  availabilityLabel?: string;
  categoryLabel: string;
  emergencyLabel?: string;
}) {
  const labels = [categoryLabel, emergencyLabel, availabilityLabel].filter(
    Boolean,
  );

  if (!labels.length) {
    return null;
  }

  return (
    <View style={styles.metaLine}>
      <ResourceIcon
        color={resourcesColors.primary}
        name={getProviderIconName(categoryLabel)}
        size={14}
      />
      <Text ellipsizeMode="tail" numberOfLines={1} style={styles.metaText}>
        {labels.join(" · ")}
      </Text>
    </View>
  );
}

function ProviderTrustBadges({
  isSponsored,
  isVerified,
  sponsorLabel,
}: {
  isSponsored: boolean;
  isVerified: boolean;
  sponsorLabel?: string;
}) {
  if (!isSponsored && !isVerified) {
    return null;
  }

  return (
    <View style={styles.trustBadgeRow}>
      {isSponsored ? (
        <SponsorBadge label={sponsorLabel ?? "Patrocinado"} />
      ) : null}
      {isVerified ? <VerificationBadge /> : null}
    </View>
  );
}

function ProviderActionsRow({
  contactLabels,
  name,
  onReportProvider,
}: {
  contactLabels: readonly string[];
  name: string;
  onReportProvider?: () => void;
}) {
  const visibleContactLabels = contactLabels.slice(0, 2);
  const remainingContactCount = Math.max(
    0,
    contactLabels.length - visibleContactLabels.length,
  );

  return (
    <View style={styles.actionsRow}>
      {visibleContactLabels.map((label) => (
        <View key={label} style={styles.contactPill}>
          <Text selectable numberOfLines={1} style={styles.contactText}>
            {label}
          </Text>
        </View>
      ))}
      {remainingContactCount > 0 ? (
        <View style={styles.contactPill}>
          <Text selectable numberOfLines={1} style={styles.contactText}>
            +{remainingContactCount} más
          </Text>
        </View>
      ) : null}
      {onReportProvider ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Reportar ${name}`}
          hitSlop={8}
          onPress={onReportProvider}
          testID={`resource-provider-card-report-${nameToTestIdSegment(name)}`}
          style={styles.reportButton}
        >
          <ResourceIcon
            color={resourcesColors.muted}
            name="flag-outline"
            size={13}
          />
          <Text selectable numberOfLines={1} style={styles.reportText}>
            Reportar
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function nameToTestIdSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function VerificationBadge() {
  return <Badge label="Verificado" tone="blue" iconName="check-decagram" />;
}

function SponsorBadge({ label }: { label: string }) {
  return <Badge label={label} tone="sponsor" iconName="star" />;
}

function Badge({
  label,
  tone,
  iconName,
}: {
  label: string;
  tone: "blue" | "sponsor";
  iconName?: ResourceIconName;
}) {
  return (
    <View style={[styles.badge, badgeToneStyles[tone]]}>
      {iconName ? (
        <ResourceIcon color={badgeTextColors[tone]} name={iconName} size={12} />
      ) : null}
      <Text
        selectable
        style={[styles.badgeText, { color: badgeTextColors[tone] }]}
      >
        {label}
      </Text>
    </View>
  );
}

function ResourceIcon({
  color,
  name,
  size,
}: {
  color: string;
  name: ResourceIconName;
  size: number;
}) {
  return <SafeMaterialCommunityIcon color={color} name={name} size={size} />;
}

function getProviderIconName(categoryLabel: string): ResourceIconName {
  const normalizedLabel = categoryLabel.toLowerCase();

  if (normalizedLabel.includes("veterin")) {
    return "medical-bag";
  }

  if (normalizedLabel.includes("refug")) {
    return "home-heart";
  }

  if (normalizedLabel.includes("peluquer")) {
    return "content-cut";
  }

  if (normalizedLabel.includes("transporte")) {
    return "car";
  }

  return "storefront-outline";
}

const badgeTextColors = {
  blue: resourcesColors.tertiary,
  sponsor: resourcesColors.primary,
};

const badgeToneStyles = StyleSheet.create({
  blue: {
    backgroundColor: "#E1EFF5",
  },
  sponsor: {
    backgroundColor: resourcesColors.warningSoft,
  },
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: resourcesColors.border,
    borderRadius: 18,
    borderCurve: "continuous",
    padding: 12,
    backgroundColor: resourcesColors.surface,
    boxShadow: resourcesShadow.soft,
  },
  sponsoredCard: {
    borderColor: resourcesColors.primary,
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  media: {
    width: 88,
    height: 88,
    borderRadius: 16,
    borderCurve: "continuous",
    backgroundColor: resourcesColors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  topRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  titleColumn: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: resourcesColors.text,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "800",
  },
  description: {
    color: resourcesColors.primary,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
  },
  location: {
    color: resourcesColors.muted,
    fontSize: 13,
    lineHeight: 17,
  },
  serviceArea: {
    color: resourcesColors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
  },
  sponsorDisclosure: {
    color: resourcesColors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  distancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: resourcesColors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  distanceText: {
    color: resourcesColors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  metaLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    minWidth: 0,
  },
  metaText: {
    color: resourcesColors.primary,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  trustBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
  },
  sponsorMediaRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: resourcesColors.warningSoft,
    padding: 6,
  },
  sponsorLogo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderCurve: "continuous",
  },
  sponsorImage: {
    flex: 1,
    minWidth: 0,
    height: 42,
    borderRadius: 10,
    borderCurve: "continuous",
  },
  sponsorImageFallback: {
    alignItems: "center",
    backgroundColor: resourcesColors.surface,
    borderColor: resourcesColors.border,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  sponsorImageFallbackText: {
    color: resourcesColors.tertiary,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  contactPill: {
    borderRadius: 999,
    backgroundColor: resourcesColors.surfaceMuted,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  contactText: {
    color: resourcesColors.primary,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
  },
  reportButton: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  reportText: {
    color: resourcesColors.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
  },
});
