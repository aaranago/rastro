import { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import { resourcesColors, resourcesShadow } from "./resources-theme";

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
      style={({ pressed }) => getCardStyle({ isSponsored, pressed })}
    >
      <ProviderMedia id={id} imageUrl={imageUrl} />

      <View style={styles.content}>
        <ProviderCardHeader
          description={description}
          distanceLabel={distanceLabel}
          name={name}
        />

        <Text selectable numberOfLines={1} style={styles.location}>
          {locationLabel}
        </Text>
        <ProviderServiceArea label={serviceAreaLabel} />

        <ProviderBadgeRow
          availabilityLabel={availabilityLabel}
          categoryLabel={categoryLabel}
          emergencyLabel={emergencyLabel}
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

function ProviderMedia({ id, imageUrl }: { id: string; imageUrl?: string }) {
  return (
    <View style={styles.media}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.mediaImage}
          contentFit="cover"
          recyclingKey={id}
        />
      ) : (
        <Image
          source="sf:pawprint.fill"
          style={styles.mediaIcon}
          tintColor={resourcesColors.primary}
          contentFit="contain"
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
    <Text selectable numberOfLines={2} style={styles.serviceArea}>
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
        <Text selectable numberOfLines={2} style={styles.name}>
          {name}
        </Text>
        <Text selectable numberOfLines={1} style={styles.description}>
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
    >
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={styles.sponsorLogo}
          contentFit="cover"
          recyclingKey={`${id}-sponsor-logo`}
        />
      ) : null}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.sponsorImage}
          contentFit="cover"
          recyclingKey={`${id}-sponsor-image`}
        />
      ) : null}
    </View>
  );
}

function DistancePill({ label }: { label: string }) {
  return (
    <View style={styles.distancePill}>
      <Image
        source="sf:location.fill"
        style={styles.inlineIcon}
        tintColor={resourcesColors.primary}
      />
      <Text selectable style={styles.distanceText}>
        {label}
      </Text>
    </View>
  );
}

function ProviderBadgeRow({
  availabilityLabel,
  categoryLabel,
  emergencyLabel,
  isSponsored,
  isVerified,
  sponsorLabel,
}: {
  availabilityLabel?: string;
  categoryLabel: string;
  emergencyLabel?: string;
  isSponsored: boolean;
  isVerified: boolean;
  sponsorLabel?: string;
}) {
  return (
    <View style={styles.badgeRow}>
      <Badge label={categoryLabel} tone="neutral" />
      {isSponsored ? (
        <SponsorBadge label={sponsorLabel ?? "Patrocinado"} />
      ) : null}
      {isVerified ? <VerificationBadge /> : null}
      {emergencyLabel ? <Badge label={emergencyLabel} tone="blue" /> : null}
      {availabilityLabel ? (
        <Badge label={availabilityLabel} tone="green" />
      ) : null}
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
          style={styles.reportButton}
        >
          <Text selectable numberOfLines={1} style={styles.reportText}>
            Reportar
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function VerificationBadge() {
  return (
    <Badge label="Verificado" tone="blue" iconName="checkmark.seal.fill" />
  );
}

function SponsorBadge({ label }: { label: string }) {
  return <Badge label={label} tone="sponsor" iconName="star.fill" />;
}

function Badge({
  label,
  tone,
  iconName,
}: {
  label: string;
  tone: "neutral" | "blue" | "green" | "sponsor";
  iconName?: string;
}) {
  return (
    <View style={[styles.badge, badgeToneStyles[tone]]}>
      {iconName ? (
        <Image
          source={`sf:${iconName}`}
          style={styles.badgeIcon}
          tintColor={badgeTextColors[tone]}
        />
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

const badgeTextColors = {
  neutral: resourcesColors.primary,
  blue: resourcesColors.tertiary,
  green: resourcesColors.secondary,
  sponsor: resourcesColors.primary,
};

const badgeToneStyles = StyleSheet.create({
  neutral: {
    backgroundColor: resourcesColors.primarySoft,
  },
  blue: {
    backgroundColor: "#E1EFF5",
  },
  green: {
    backgroundColor: "#E7F3EB",
  },
  sponsor: {
    backgroundColor: resourcesColors.warningSoft,
  },
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 14,
    borderWidth: 1,
    borderColor: resourcesColors.border,
    borderRadius: 18,
    borderCurve: "continuous",
    padding: 14,
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
  mediaIcon: {
    width: 34,
    height: 34,
  },
  content: {
    flex: 1,
    gap: 8,
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
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
  },
  description: {
    color: resourcesColors.primary,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
  },
  location: {
    color: resourcesColors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  serviceArea: {
    color: resourcesColors.text,
    fontSize: 13,
    lineHeight: 18,
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
  inlineIcon: {
    width: 13,
    height: 13,
  },
  distanceText: {
    color: resourcesColors.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeIcon: {
    width: 12,
    height: 12,
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
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
  },
  contactPill: {
    borderRadius: 999,
    backgroundColor: resourcesColors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  contactText: {
    color: resourcesColors.primary,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
  },
  reportButton: {
    minHeight: 32,
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reportText: {
    color: resourcesColors.muted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
  },
});
