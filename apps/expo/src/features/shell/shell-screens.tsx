import type { Href } from "expo-router";
import * as React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";

import type {
  AppStateActionDescriptor,
  AppStateDescriptor,
  PermissionEducationAppStateDescriptor,
} from "../app-states";
import type { ShellAuthActionResult } from "./shell-auth";
import type { ShellProfileAccountSettings } from "./shell-model";
import { AppStatePanel } from "../app-states";
import { createShellProfileModel } from "./shell-model";
import { ShellIcon } from "./shell-overlays";
import { useRastroShell } from "./shell-provider";
import { shellColors } from "./shell-theme";

export const shellScreenBottomInset = 208;

export function NearbyScreen() {
  const { copy, session } = useRastroShell();
  const screen = copy.screens.nearby;

  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      contentInset={{ bottom: shellScreenBottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: shellScreenBottomInset }}
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
        <FilterPill icon="heart.fill" label={screen.filterAdoption} />
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
      contentInset={{ bottom: shellScreenBottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: shellScreenBottomInset }}
      style={styles.screen}
    >
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
      contentInset={{ bottom: shellScreenBottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: shellScreenBottomInset }}
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
              Atención veterinaria y farmacia
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
  const {
    copy,
    initiateAccountDeletion,
    requestAuthPrompt,
    requestMemberPasswordReset,
    session,
    signOutMember,
  } = useRastroShell();
  const safeAreaInsets = useSafeAreaInsets();
  const screen = copy.screens.profile;
  const profile = React.useMemo(
    () => createShellProfileModel({ copy, session }),
    [copy, session],
  );

  const bottomInset = shellScreenBottomInset + safeAreaInsets.bottom;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.screenContent,
        {
          paddingBottom: bottomInset,
          paddingTop: Math.max(18, safeAreaInsets.top + 12),
        },
      ]}
      contentInset={{ bottom: bottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: bottomInset }}
      style={styles.screen}
      testID="profile-screen"
    >
      <StateCard
        body={profile.body}
        icon={
          profile.isMember ? "person.crop.circle.fill" : "person.crop.circle"
        }
        title={profile.title}
      />
      {!profile.isMember ? (
        <ProfileVisitorAuthEntry
          label={copy.authPrompt.signIn}
          onPress={() =>
            requestAuthPrompt({
              returnTo: "/(tabs)/(profile)",
              sourceHref: "rastro://auth/sign-in?returnTo=/perfil",
            })
          }
        />
      ) : null}
      {profile.isMember ? (
        <View style={styles.profileList}>
          <ProfileRow
            href="/mis-mascotas"
            icon="pawprint.fill"
            label={screen.pets}
          />
          <ProfileRow
            href={"/mis-reportes" as Href}
            icon="doc.text.image.fill"
            label={screen.reports}
          />
          <ProfileRow
            href={"/mis-conversaciones" as Href}
            icon="message.fill"
            label={screen.conversations}
          />
          <ProfileRow
            href={"/alertas" as Href}
            icon="bell.fill"
            label={screen.alerts}
          />
          <ProfileRow
            href={"/ajustes" as Href}
            icon="gearshape.fill"
            label={screen.settings}
          />
        </View>
      ) : null}
      {profile.accountSettings ? (
        <AccountSettingsPanel
          actionFailedLabel={screen.account.actionFailed}
          onInitiateAccountDeletion={initiateAccountDeletion}
          onRequestPasswordReset={requestMemberPasswordReset}
          onSignOut={signOutMember}
          settings={profile.accountSettings}
        />
      ) : null}
      <PermissionEducationStack />
    </ScrollView>
  );
}

export function NearbyShellStateBridge() {
  return null;
}

function ProfileVisitorAuthEntry({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityHint="Abre el ingreso o la creacion de cuenta."
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.profileAuthButton,
        pressed ? styles.profileAuthButtonPressed : null,
      ]}
    >
      <ShellIcon
        color={shellColors.white}
        name="arrow.right.to.line"
        size={18}
      />
      <Text maxFontSizeMultiplier={1.15} style={styles.profileAuthButtonText}>
        {label}
      </Text>
    </Pressable>
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

function ProfileRow({
  href,
  icon,
  label,
}: {
  href?: Href;
  icon: string;
  label: string;
}) {
  const row = (
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

  return href ? (
    <Link asChild href={href}>
      {row}
    </Link>
  ) : (
    row
  );
}

type AccountAction = "password-reset" | "delete-account" | "sign-out";

interface AccountFeedback {
  message: string;
  tone: "error" | "success";
}

function AccountSettingsPanel({
  actionFailedLabel,
  onInitiateAccountDeletion,
  onRequestPasswordReset,
  onSignOut,
  settings,
}: {
  actionFailedLabel: string;
  onInitiateAccountDeletion: () => Promise<ShellAuthActionResult>;
  onRequestPasswordReset: () => Promise<ShellAuthActionResult>;
  onSignOut: () => Promise<ShellAuthActionResult>;
  settings: ShellProfileAccountSettings;
}) {
  const [feedback, setFeedback] = React.useState<AccountFeedback | null>(null);
  const [pendingAction, setPendingAction] =
    React.useState<AccountAction | null>(null);
  const canRequestPasswordReset = Boolean(settings.email);

  const runAccountAction = React.useCallback(
    async ({
      action,
      request,
      successMessage,
    }: {
      action: AccountAction;
      request: () => Promise<ShellAuthActionResult>;
      successMessage?: string;
    }) => {
      setPendingAction(action);
      setFeedback(null);

      const result = await request();

      setPendingAction(null);

      if (!result.ok) {
        setFeedback({
          message: result.message ?? actionFailedLabel,
          tone: "error",
        });
        return;
      }

      if (successMessage) {
        setFeedback({
          message: successMessage,
          tone: "success",
        });
      }
    },
    [actionFailedLabel],
  );

  const requestPasswordReset = React.useCallback(() => {
    void runAccountAction({
      action: "password-reset",
      request: onRequestPasswordReset,
      successMessage: settings.passwordResetSuccess,
    });
  }, [onRequestPasswordReset, runAccountAction, settings.passwordResetSuccess]);

  const initiateDeletion = React.useCallback(() => {
    void runAccountAction({
      action: "delete-account",
      request: onInitiateAccountDeletion,
      successMessage: settings.deletionSuccess,
    });
  }, [onInitiateAccountDeletion, runAccountAction, settings.deletionSuccess]);

  const signOut = React.useCallback(() => {
    void runAccountAction({
      action: "sign-out",
      request: onSignOut,
    });
  }, [onSignOut, runAccountAction]);

  return (
    <View style={styles.accountPanel}>
      <View style={styles.accountHeader}>
        <Text maxFontSizeMultiplier={1.2} style={styles.sectionTitle}>
          {settings.title}
        </Text>
        {settings.email ? (
          <View style={styles.emailBadge}>
            <Text maxFontSizeMultiplier={1.15} style={styles.emailLabel}>
              {settings.emailLabel}
            </Text>
            <Text maxFontSizeMultiplier={1.15} style={styles.emailValue}>
              {settings.email}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.accountBlock}>
        <View style={styles.accountCopy}>
          <Text maxFontSizeMultiplier={1.2} style={styles.accountBlockTitle}>
            {settings.passwordResetTitle}
          </Text>
          <Text maxFontSizeMultiplier={1.25} style={styles.accountBlockBody}>
            {settings.passwordResetBody ?? settings.passwordResetUnavailable}
          </Text>
        </View>
        <AccountActionButton
          disabled={!canRequestPasswordReset}
          icon="key.fill"
          isPending={pendingAction === "password-reset"}
          label={settings.passwordResetAction}
          onPress={requestPasswordReset}
          pendingLabel={settings.passwordResetPending}
        />
      </View>

      <View style={styles.accountDivider} />

      <View style={styles.accountBlock}>
        <View style={styles.accountCopy}>
          <Text maxFontSizeMultiplier={1.2} style={styles.accountBlockTitle}>
            {settings.deletionTitle}
          </Text>
          <Text maxFontSizeMultiplier={1.25} style={styles.accountBlockBody}>
            {settings.deletionBody}
          </Text>
          <View style={styles.deletionImpactList}>
            {settings.deletionImpacts.map((impact) => (
              <View key={impact} style={styles.deletionImpactRow}>
                <View style={styles.deletionBullet} />
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={styles.deletionImpactText}
                >
                  {impact}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <AccountActionButton
          icon="trash.fill"
          isPending={pendingAction === "delete-account"}
          label={settings.deletionAction}
          onPress={initiateDeletion}
          pendingLabel={settings.deletionPending}
          tone="danger"
        />
      </View>

      <View style={styles.accountDivider} />

      <AccountActionButton
        icon="rectangle.portrait.and.arrow.right"
        isPending={pendingAction === "sign-out"}
        label={settings.signOutAction}
        onPress={signOut}
        pendingLabel={settings.signOutPending}
        tone="secondary"
      />

      {feedback ? (
        <Text
          maxFontSizeMultiplier={1.2}
          style={
            feedback.tone === "success"
              ? styles.accountFeedbackSuccess
              : styles.accountFeedbackError
          }
        >
          {feedback.message}
        </Text>
      ) : null}
    </View>
  );
}

function AccountActionButton({
  disabled = false,
  icon,
  isPending,
  label,
  onPress,
  pendingLabel,
  tone = "primary",
}: {
  disabled?: boolean;
  icon: string;
  isPending: boolean;
  label: string;
  onPress: () => void;
  pendingLabel: string;
  tone?: "danger" | "primary" | "secondary";
}) {
  const isDisabled = disabled || isPending;
  const buttonStyle =
    tone === "danger"
      ? styles.accountButtonDanger
      : tone === "secondary"
        ? styles.accountButtonSecondary
        : styles.accountButtonPrimary;
  const iconColor =
    tone === "danger"
      ? shellColors.lost
      : tone === "secondary"
        ? shellColors.primary
        : shellColors.white;
  const labelStyle =
    tone === "primary"
      ? styles.accountButtonLabelOnPrimary
      : tone === "danger"
        ? styles.accountButtonLabelDanger
        : styles.accountButtonLabel;

  return (
    <Pressable
      accessibilityLabel={isPending ? pendingLabel : label}
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.accountButton,
        buttonStyle,
        isDisabled ? styles.accountButtonDisabled : null,
        pressed ? styles.accountButtonPressed : null,
      ]}
    >
      <ShellIcon color={iconColor} name={icon} size={18} />
      <Text
        maxFontSizeMultiplier={1.15}
        numberOfLines={2}
        style={isDisabled ? styles.accountButtonLabelDisabled : labelStyle}
      >
        {isPending ? pendingLabel : label}
      </Text>
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

function PermissionEducationStack() {
  const { model } = useRastroShell();

  return (
    <View style={styles.permissionStack}>
      <Text maxFontSizeMultiplier={1.2} selectable style={styles.sectionTitle}>
        Permisos sin sorpresa
      </Text>
      <ShellPermissionEducationCard
        compact
        descriptor={model.appStates.permissionEducation.notifications}
      />
      <ShellPermissionEducationCard
        compact
        descriptor={model.appStates.permissionEducation["photos-camera"]}
      />
      <ShellPermissionEducationCard
        compact
        descriptor={model.appStates.permissionEducation["background-location"]}
      />
    </View>
  );
}

function ShellPermissionEducationCard({
  compact,
  descriptor,
  onActionPress,
  statusMessage,
}: {
  compact?: boolean;
  descriptor: PermissionEducationAppStateDescriptor;
  onActionPress?: (action: AppStateActionDescriptor) => void;
  statusMessage?: string | null;
}) {
  return (
    <View
      style={[
        styles.permissionCard,
        compact ? styles.permissionCardCompact : null,
      ]}
    >
      <View style={styles.permissionHeader}>
        <View style={styles.permissionIcon}>
          <ShellIcon
            color={shellColors.sighting}
            fallback={getPermissionIconFallback(descriptor.iconName)}
            name={descriptor.iconName ?? "info.circle.fill"}
            size={26}
          />
        </View>
        <View style={styles.permissionTitleGroup}>
          <Text maxFontSizeMultiplier={1.15} style={styles.permissionTitle}>
            {descriptor.title}
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={styles.permissionBody}>
            {descriptor.body}
          </Text>
        </View>
      </View>

      <View style={styles.permissionReasons}>
        {descriptor.reasons.map((reason) => (
          <View key={reason} style={styles.permissionReasonRow}>
            <View style={styles.permissionReasonDot} />
            <Text maxFontSizeMultiplier={1.15} style={styles.permissionReason}>
              {reason}
            </Text>
          </View>
        ))}
      </View>

      {statusMessage ? (
        <Text maxFontSizeMultiplier={1.15} style={styles.permissionStatus}>
          {statusMessage}
        </Text>
      ) : null}

      {onActionPress ? (
        <View style={styles.permissionActions}>
          {descriptor.actions.map((action) => (
            <Pressable
              accessibilityLabel={action.accessibilityLabel ?? action.label}
              accessibilityRole="button"
              key={action.id}
              onPress={() => onActionPress(action)}
              style={({ pressed }) => [
                styles.permissionAction,
                action.variant === "secondary"
                  ? styles.permissionActionSecondary
                  : styles.permissionActionPrimary,
                pressed ? styles.permissionActionPressed : null,
              ]}
            >
              {action.iconName ? (
                <ShellIcon
                  color={
                    action.variant === "secondary"
                      ? shellColors.primary
                      : shellColors.white
                  }
                  fallback={getPermissionIconFallback(action.iconName)}
                  name={action.iconName}
                  size={18}
                />
              ) : null}
              <Text
                maxFontSizeMultiplier={1.1}
                numberOfLines={2}
                style={
                  action.variant === "secondary"
                    ? styles.permissionActionTextSecondary
                    : styles.permissionActionTextPrimary
                }
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const permissionIconFallbacks = [
  ["location", "GPS"],
  ["magnifyingglass", "BUS"],
  ["camera", "IMG"],
  ["bell", "!"],
  ["figure", "MOV"],
] as const;

function getPermissionIconFallback(iconName?: string) {
  return (
    permissionIconFallbacks.find(([needle]) =>
      iconName?.includes(needle),
    )?.[1] ?? "i"
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
  accountBlock: {
    gap: 12,
  },
  accountBlockBody: {
    color: shellColors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  accountBlockTitle: {
    color: shellColors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  accountButton: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  accountButtonDanger: {
    backgroundColor: "#FFF1F0",
    borderColor: "#F0B7B4",
  },
  accountButtonDisabled: {
    opacity: 0.56,
  },
  accountButtonLabel: {
    color: shellColors.primary,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  accountButtonLabelDisabled: {
    color: shellColors.muted,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  accountButtonLabelDanger: {
    color: shellColors.lost,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  accountButtonLabelOnPrimary: {
    color: shellColors.white,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  accountButtonPressed: {
    opacity: 0.82,
  },
  accountButtonPrimary: {
    backgroundColor: shellColors.primary,
    borderColor: shellColors.primary,
  },
  accountButtonSecondary: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
  },
  accountCopy: {
    gap: 5,
  },
  accountDivider: {
    backgroundColor: shellColors.border,
    height: 1,
  },
  accountFeedbackError: {
    color: shellColors.lost,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  accountFeedbackSuccess: {
    color: shellColors.primary,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  accountHeader: {
    gap: 10,
  },
  accountPanel: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
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
  deletionBullet: {
    backgroundColor: shellColors.primary,
    borderRadius: 4,
    height: 8,
    marginTop: 7,
    width: 8,
  },
  deletionImpactList: {
    gap: 7,
    paddingTop: 4,
  },
  deletionImpactRow: {
    flexDirection: "row",
    gap: 8,
  },
  deletionImpactText: {
    color: shellColors.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  emailBadge: {
    alignSelf: "flex-start",
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 16,
    gap: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emailLabel: {
    color: shellColors.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  emailValue: {
    color: shellColors.text,
    fontSize: 13,
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
  permissionAction: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  permissionActionPressed: {
    opacity: 0.82,
  },
  permissionActionPrimary: {
    backgroundColor: shellColors.sighting,
    borderColor: shellColors.sighting,
  },
  permissionActionSecondary: {
    backgroundColor: shellColors.surface,
    borderColor: "#B9D7EA",
  },
  permissionActionTextPrimary: {
    color: shellColors.white,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  permissionActionTextSecondary: {
    color: shellColors.primary,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  permissionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  permissionBody: {
    color: shellColors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  permissionCard: {
    backgroundColor: shellColors.surface,
    borderColor: "#B9D7EA",
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  permissionCardCompact: {
    borderRadius: 18,
    gap: 10,
    padding: 12,
  },
  permissionHeader: {
    flexDirection: "row",
    gap: 10,
  },
  permissionIcon: {
    alignItems: "center",
    backgroundColor: "#E5F0F8",
    borderColor: "#B9D7EA",
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  permissionReason: {
    color: shellColors.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  permissionReasonDot: {
    backgroundColor: shellColors.sighting,
    borderRadius: 3,
    height: 6,
    marginTop: 7,
    width: 6,
  },
  permissionReasonRow: {
    flexDirection: "row",
    gap: 8,
  },
  permissionReasons: {
    gap: 6,
  },
  permissionStatus: {
    backgroundColor: shellColors.surfaceMuted,
    borderRadius: 14,
    color: shellColors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  permissionTitle: {
    color: shellColors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  permissionTitleGroup: {
    flex: 1,
    gap: 3,
  },
  profileList: {
    gap: 10,
  },
  profileAuthButton: {
    alignItems: "center",
    backgroundColor: shellColors.primary,
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  profileAuthButtonPressed: {
    opacity: 0.84,
  },
  profileAuthButtonText: {
    color: shellColors.white,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
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
    paddingBottom: shellScreenBottomInset,
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
