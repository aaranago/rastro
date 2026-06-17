import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { AppStateDescriptor } from "../app-states";
import { AppStatePanel } from "../app-states";
import { ShellIcon } from "./shell-overlays";
import { useRastroShell } from "./shell-provider";
import { shellColors } from "./shell-theme";

const bottomInset = 140;

export function NearbyScreen() {
  const { copy, session } = useRastroShell();
  const screen = copy.screens.nearby;

  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      contentInset={{ bottom: bottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: bottomInset }}
      style={styles.screen}
    >
      <View style={styles.heroHeader}>
        <View style={styles.brandMark}>
          <ShellIcon
            color={shellColors.primary}
            name="pawprint.fill"
            size={28}
          />
        </View>
        <View style={styles.brandCopy}>
          <Text maxFontSizeMultiplier={1.2} style={styles.brandName}>
            {copy.brand.name}
          </Text>
          <Text maxFontSizeMultiplier={1.25} style={styles.brandTagline}>
            {copy.brand.tagline}
          </Text>
        </View>
        <SessionBadge />
      </View>

      <View style={styles.titleGroup}>
        <Text maxFontSizeMultiplier={1.2} style={styles.greeting}>
          {session.kind === "member"
            ? screen.memberGreeting
            : screen.visitorGreeting}
        </Text>
        <Text maxFontSizeMultiplier={1.25} style={styles.subtitle}>
          {screen.subtitle}
        </Text>
      </View>

      <MemberIntentBanner />

      <View style={styles.alertSurface}>
        <View style={styles.alertIcon}>
          <ShellIcon
            color={shellColors.white}
            name="megaphone.fill"
            size={22}
          />
        </View>
        <View style={styles.alertCopy}>
          <Text maxFontSizeMultiplier={1.2} style={styles.alertTitle}>
            {screen.alertTitle}
          </Text>
          <Text maxFontSizeMultiplier={1.25} style={styles.alertMeta}>
            {screen.alertMeta}
          </Text>
        </View>
        <ShellIcon color={shellColors.white} name="chevron.right" size={18} />
      </View>

      <View style={styles.filterRow}>
        <FilterPill
          icon="exclamationmark.triangle.fill"
          label={screen.filterLost}
        />
        <FilterPill icon="checkmark.seal.fill" label={screen.filterFound} />
        <FilterPill icon="eye.fill" label={screen.filterSightings} />
      </View>

      <View style={styles.mapPreview}>
        <View style={styles.mapGrid}>
          {Array.from({ length: 18 }).map((_, index) => (
            <View key={index} style={styles.mapBlock} />
          ))}
        </View>
        <View style={styles.mapPin}>
          <ShellIcon color={shellColors.white} name="pawprint.fill" size={22} />
        </View>
        <View style={styles.nearbyCard}>
          <View style={styles.petAvatar}>
            <ShellIcon
              color={shellColors.primary}
              name="pawprint.fill"
              size={26}
            />
          </View>
          <View style={styles.nearbyCardCopy}>
            <Text maxFontSizeMultiplier={1.2} style={styles.cardTitle}>
              Max
            </Text>
            <Text maxFontSizeMultiplier={1.25} style={styles.cardBody}>
              Golden Retriever
            </Text>
            <Text maxFontSizeMultiplier={1.25} style={styles.cardMeta}>
              200 m de ti
            </Text>
          </View>
        </View>
      </View>

      <EmptyState title={screen.emptyTitle} body={screen.emptyBody} />
      <Text maxFontSizeMultiplier={1.25} style={styles.locationHint}>
        {screen.locationHint}
      </Text>
    </ScrollView>
  );
}

export function ActivityScreen() {
  const { copy, model, session } = useRastroShell();
  const screen = copy.screens.activity;
  const isMember = session.kind === "member";

  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      contentInset={{ bottom: bottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: bottomInset }}
      style={styles.screen}
    >
      <MemberIntentBanner />
      <StateCard
        body={isMember ? screen.memberBody : screen.visitorBody}
        icon={isMember ? "bell.badge.fill" : "lock.fill"}
        title={isMember ? screen.memberTitle : screen.visitorTitle}
      />
      <View style={styles.quickGrid}>
        <QuickTile icon="bell.fill" label={screen.alertHistory} />
        <QuickTile icon="message.fill" label={screen.messages} />
        <QuickTile icon="arrow.triangle.2.circlepath" label={screen.updates} />
      </View>
      <ShellAppStateCard compact descriptor={model.appStates.states.empty} />
    </ScrollView>
  );
}

export function ResourcesScreen() {
  const { copy, model } = useRastroShell();
  const screen = copy.screens.resources;

  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      contentInset={{ bottom: bottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: bottomInset }}
      style={styles.screen}
    >
      <View style={styles.titleGroup}>
        <Text maxFontSizeMultiplier={1.2} style={styles.greeting}>
          {screen.title}
        </Text>
        <Text maxFontSizeMultiplier={1.25} style={styles.subtitle}>
          {screen.subtitle}
        </Text>
      </View>
      <View style={styles.quickGrid}>
        <QuickTile icon="cross.case.fill" label={screen.vets} />
        <QuickTile icon="house.fill" label={screen.shelters} />
        <QuickTile
          icon="takeoutbag.and.cup.and.straw.fill"
          label={screen.food}
        />
        <QuickTile icon="phone.fill" label={screen.emergency} />
      </View>
      <View style={styles.resourceCard}>
        <View style={styles.resourceHeader}>
          <View style={styles.resourceIcon}>
            <ShellIcon
              color={shellColors.primary}
              name="stethoscope"
              size={24}
            />
          </View>
          <View style={styles.resourceCopy}>
            <Text maxFontSizeMultiplier={1.2} style={styles.cardTitle}>
              Vet 24h Sopocachi
            </Text>
            <Text maxFontSizeMultiplier={1.25} style={styles.cardBody}>
              Atencion veterinaria y farmacia
            </Text>
          </View>
        </View>
        <Text maxFontSizeMultiplier={1.15} style={styles.sponsorLabel}>
          {screen.sponsorLabel}
        </Text>
      </View>
      <EmptyState title={screen.emptyTitle} />
      <ShellAppStateCard descriptor={model.appStates.states["offline-stale"]} />
    </ScrollView>
  );
}

export function ProfileScreen() {
  const { copy, session } = useRastroShell();
  const screen = copy.screens.profile;
  const isMember = session.kind === "member";

  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      contentInset={{ bottom: bottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: bottomInset }}
      style={styles.screen}
    >
      <MemberIntentBanner />
      <StateCard
        body={isMember ? screen.memberBody : screen.visitorBody}
        icon={isMember ? "person.crop.circle.fill" : "person.crop.circle"}
        title={isMember ? screen.memberTitle : screen.visitorTitle}
      />
      <View style={styles.profileList}>
        <ProfileRow icon="pawprint.fill" label={screen.pets} />
        <ProfileRow icon="doc.text.fill" label={screen.reports} />
        <ProfileRow icon="bell.fill" label={screen.alerts} />
        <ProfileRow icon="gearshape.fill" label={screen.settings} />
      </View>
      <PermissionEducationStack />
    </ScrollView>
  );
}

export function NearbyShellStateBridge() {
  return (
    <View style={styles.routeBridge}>
      <NearbyPermissionEducation compact />
    </View>
  );
}

function SessionBadge() {
  const { copy, session } = useRastroShell();
  const label =
    session.kind === "member" ? copy.shell.signedIn : copy.shell.signedOut;

  return (
    <View style={styles.sessionBadge}>
      <Text maxFontSizeMultiplier={1.15} style={styles.sessionBadgeText}>
        {label}
      </Text>
    </View>
  );
}

function MemberIntentBanner() {
  const { copy, state } = useRastroShell();

  if (!state.memberIntent) {
    return null;
  }

  return (
    <View style={styles.intentBanner}>
      <ShellIcon
        color={shellColors.primary}
        name="checkmark.circle.fill"
        size={22}
      />
      <Text maxFontSizeMultiplier={1.2} style={styles.intentBannerText}>
        {copy.shell.memberIntentReady(state.memberIntent.label)}
      </Text>
    </View>
  );
}

function FilterPill({ icon, label }: { icon: string; label: string }) {
  return (
    <Pressable accessibilityRole="button" style={styles.filterPill}>
      <ShellIcon color={shellColors.primary} name={icon} size={16} />
      <Text maxFontSizeMultiplier={1.15} style={styles.filterText}>
        {label}
      </Text>
    </Pressable>
  );
}

function QuickTile({ icon, label }: { icon: string; label: string }) {
  return (
    <Pressable accessibilityRole="button" style={styles.quickTile}>
      <ShellIcon color={shellColors.primary} name={icon} size={22} />
      <Text maxFontSizeMultiplier={1.2} style={styles.quickTileLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

function ProfileRow({ icon, label }: { icon: string; label: string }) {
  return (
    <Pressable accessibilityRole="button" style={styles.profileRow}>
      <View style={styles.profileRowIcon}>
        <ShellIcon color={shellColors.primary} name={icon} size={20} />
      </View>
      <Text maxFontSizeMultiplier={1.2} style={styles.profileRowLabel}>
        {label}
      </Text>
      <ShellIcon color={shellColors.muted} name="chevron.right" size={17} />
    </Pressable>
  );
}

function StateCard({
  body,
  icon,
  title,
}: {
  body: string;
  icon: string;
  title: string;
}) {
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIcon}>
        <ShellIcon color={shellColors.primary} name={icon} size={30} />
      </View>
      <Text maxFontSizeMultiplier={1.2} style={styles.stateTitle}>
        {title}
      </Text>
      <Text maxFontSizeMultiplier={1.25} style={styles.stateBody}>
        {body}
      </Text>
    </View>
  );
}

function NearbyPermissionEducation({ compact }: { compact: boolean }) {
  const { model } = useRastroShell();

  return (
    <ShellAppStateCard
      compact={compact}
      descriptor={model.appStates.permissionEducation.location}
    />
  );
}

function PermissionEducationStack() {
  const { model } = useRastroShell();

  return (
    <View style={styles.permissionStack}>
      <Text maxFontSizeMultiplier={1.2} selectable style={styles.sectionTitle}>
        Permisos sin sorpresa
      </Text>
      <ShellAppStateCard
        compact
        descriptor={model.appStates.permissionEducation.notifications}
      />
      <ShellAppStateCard
        compact
        descriptor={model.appStates.permissionEducation["photos-camera"]}
      />
      <ShellAppStateCard
        compact
        descriptor={model.appStates.permissionEducation["background-location"]}
      />
    </View>
  );
}

function ShellAppStateCard({
  compact = false,
  descriptor,
}: {
  compact?: boolean;
  descriptor: AppStateDescriptor;
}) {
  return (
    <AppStatePanel
      descriptor={descriptor}
      layout={compact ? "compact" : "embedded"}
    />
  );
}

function EmptyState({ body, title }: { body?: string; title: string }) {
  return (
    <View style={styles.emptyState}>
      <Text maxFontSizeMultiplier={1.2} style={styles.emptyTitle}>
        {title}
      </Text>
      {body ? (
        <Text maxFontSizeMultiplier={1.25} style={styles.emptyBody}>
          {body}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  alertCopy: {
    flex: 1,
    gap: 2,
  },
  alertIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  alertMeta: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 14,
    fontWeight: "600",
  },
  alertSurface: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderRadius: 32,
    boxShadow: "0 16px 28px rgba(20, 108, 90, 0.18)",
    flexDirection: "row",
    gap: 12,
    minHeight: 74,
    padding: 10,
  },
  alertTitle: {
    color: shellColors.white,
    fontSize: 17,
    fontWeight: "800",
  },
  brandCopy: {
    flex: 1,
    gap: 2,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  brandName: {
    color: shellColors.primary,
    fontSize: 24,
    fontWeight: "900",
  },
  brandTagline: {
    color: shellColors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  cardBody: {
    color: shellColors.muted,
    fontSize: 14,
  },
  cardMeta: {
    color: shellColors.sighting,
    fontSize: 14,
    fontWeight: "800",
  },
  cardTitle: {
    color: shellColors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  emptyBody: {
    color: shellColors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  emptyState: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
    padding: 18,
  },
  emptyTitle: {
    color: shellColors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  filterPill: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 14,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterText: {
    color: shellColors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  greeting: {
    color: shellColors.text,
    fontSize: 25,
    fontWeight: "900",
  },
  heroHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  intentBanner: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderColor: "#A9D4C9",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    padding: 14,
  },
  intentBannerText: {
    color: shellColors.primaryDark,
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  locationHint: {
    color: shellColors.muted,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  mapBlock: {
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    borderRadius: 8,
    height: 34,
    width: "30%",
  },
  mapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    opacity: 0.78,
  },
  mapPin: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderColor: shellColors.white,
    borderRadius: 26,
    borderWidth: 4,
    height: 52,
    justifyContent: "center",
    left: "50%",
    position: "absolute",
    top: 92,
    width: 52,
  },
  mapPreview: {
    backgroundColor: "#DDEFE9",
    borderColor: shellColors.border,
    borderRadius: 28,
    borderWidth: 1,
    minHeight: 300,
    overflow: "hidden",
    padding: 18,
  },
  nearbyCard: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderRadius: 22,
    bottom: 18,
    flexDirection: "row",
    gap: 12,
    left: 18,
    minHeight: 84,
    padding: 12,
    position: "absolute",
    right: 64,
  },
  nearbyCardCopy: {
    flex: 1,
    gap: 1,
  },
  petAvatar: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 30,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  profileList: {
    gap: 10,
  },
  permissionStack: {
    gap: 10,
  },
  profileRow: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 62,
    padding: 12,
  },
  profileRowIcon: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  profileRowLabel: {
    color: shellColors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickTile: {
    alignItems: "flex-start",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 10,
    minHeight: 112,
    padding: 16,
  },
  quickTileLabel: {
    color: shellColors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  resourceCard: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  resourceCopy: {
    flex: 1,
    gap: 2,
  },
  resourceHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  resourceIcon: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  screen: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
  screenContent: {
    gap: 18,
    padding: 18,
    paddingBottom: 32,
  },
  routeBridge: {
    backgroundColor: shellColors.background,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  sectionTitle: {
    color: shellColors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  sessionBadge: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sessionBadgeText: {
    color: shellColors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  sponsorLabel: {
    alignSelf: "flex-start",
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 14,
    color: shellColors.muted,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stateBody: {
    color: shellColors.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
  },
  stateCard: {
    alignItems: "center",
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    padding: 24,
  },
  stateIcon: {
    alignItems: "center",
    backgroundColor: shellColors.primarySoft,
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  stateTitle: {
    color: shellColors.text,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: shellColors.muted,
    fontSize: 16,
    lineHeight: 22,
  },
  titleGroup: {
    gap: 6,
  },
});
