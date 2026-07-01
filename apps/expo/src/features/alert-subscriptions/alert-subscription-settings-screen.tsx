import * as React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import type {
  AlertSubscriptionNativeAdapter,
  AlertSubscriptionPushRegistrationResult,
} from "./alert-subscription-native-adapter";
import type { AlertSubscriptionSettingsViewModel } from "./alert-subscription-settings-view-model";
import type {
  AlertSubscription,
  AlertSubscriptionLocationSnapshot,
  AlertSubscriptionRadiusKm,
  AlertSubscriptionRepository,
  AlertSubscriptionsMemberSession,
  AlertSubscriptionsSessionState,
} from "./alert-subscriptions";
import { ShellIcon } from "../shell/shell-overlays";
import { shellColors } from "../shell/shell-theme";
import { expoAlertSubscriptionNativeAdapter } from "./alert-subscription-expo-native-adapter";
import {
  buildAlertSubscriptionSettingsViewModel,
  toAlertSubscriptionLocationSnapshot,
} from "./alert-subscription-settings-view-model";
import { createInMemoryAlertSubscriptionRepository } from "./alert-subscriptions";

const bottomInset = 44;
const defaultRepository = createInMemoryAlertSubscriptionRepository({
  now: () => new Date().toISOString(),
});
const defaultLastDetectedLocation: AlertSubscriptionLocationSnapshot = {
  coordinates: {
    latitude: -16.5,
    longitude: -68.1193,
  },
  countryCode: "BO",
  detectedAt: "2026-06-18T08:00:00.000Z",
  label: "Ultima ubicacion detectada en La Paz",
  locationCellLabel: "La Paz",
  source: "last",
};

export interface AlertSubscriptionSettingsScreenProps {
  nativeAdapter?: AlertSubscriptionNativeAdapter;
  repository?: AlertSubscriptionRepository;
  session: AlertSubscriptionsSessionState;
}

type PendingAction =
  | "enable"
  | "moving-alerts"
  | "pause"
  | "radius"
  | "refresh"
  | "unsubscribe";

export interface Feedback {
  message: string;
  tone: "error" | "success" | "warning";
}

interface AlertSubscriptionSettingsController {
  enableAlerts: () => Promise<void>;
  feedback: Feedback | null;
  pauseAlerts: () => Promise<void>;
  pendingAction: PendingAction | null;
  refreshArea: () => Promise<void>;
  selectRadius: (radiusKm: AlertSubscriptionRadiusKm) => Promise<void>;
  subscription: AlertSubscription | null;
  toggleMovingAlerts: (enabled: boolean) => Promise<void>;
  unsubscribeAlerts: () => Promise<void>;
  viewModel: AlertSubscriptionSettingsViewModel;
}

export function AlertSubscriptionSettingsScreen({
  nativeAdapter = expoAlertSubscriptionNativeAdapter,
  repository = defaultRepository,
  session,
}: AlertSubscriptionSettingsScreenProps) {
  const controller = useAlertSubscriptionSettingsController({
    nativeAdapter,
    repository,
    session,
  });

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInset={{ bottom: bottomInset }}
      contentInsetAdjustmentBehavior="automatic"
      scrollIndicatorInsets={{ bottom: bottomInset }}
      style={styles.screen}
      testID="alert-subscription-settings-screen"
    >
      <AlertSettingsHero viewModel={controller.viewModel} />
      <SubscriptionPanel controller={controller} />
      <FeedbackMessage feedback={controller.feedback} />
      <RadiusPanel controller={controller} />
      <DynamicAlertAreaPanel controller={controller} />
      <MovingAlertsPanel controller={controller} />
      <PolicyPanel viewModel={controller.viewModel} />
    </ScrollView>
  );
}

function useAlertSubscriptionSettingsController({
  nativeAdapter = expoAlertSubscriptionNativeAdapter,
  repository = defaultRepository,
  session,
}: AlertSubscriptionSettingsScreenProps): AlertSubscriptionSettingsController {
  const [subscription, setSubscription] =
    React.useState<AlertSubscription | null>(null);
  const [selectedRadiusKm, setSelectedRadiusKm] =
    React.useState<AlertSubscriptionRadiusKm>(5);
  const [lastDetectedLocation, setLastDetectedLocation] = React.useState(
    defaultLastDetectedLocation,
  );
  const [feedback, setFeedback] = React.useState<Feedback | null>(null);
  const [pendingAction, setPendingAction] =
    React.useState<PendingAction | null>(null);
  const viewModel = React.useMemo(
    () =>
      buildAlertSubscriptionSettingsViewModel({
        radiusKm: selectedRadiusKm,
        session,
        subscription,
      }),
    [selectedRadiusKm, session, subscription],
  );

  React.useEffect(() => {
    let isActive = true;

    if (session.kind === "visitor") {
      setSubscription(null);
      return;
    }

    repository
      .getAlertSubscription(session)
      .then((nextSubscription) => {
        if (!isActive) {
          return;
        }

        setSubscription(nextSubscription);

        if (nextSubscription) {
          setSelectedRadiusKm(nextSubscription.radiusKm);
        }
      })
      .catch(() => {
        if (isActive) {
          setFeedback({
            message: "No pudimos cargar tus alertas.",
            tone: "error",
          });
        }
      });

    return () => {
      isActive = false;
    };
  }, [repository, session]);

  const enableAlerts = React.useCallback(async () => {
    const memberSession = getMemberSession(session);

    if (!memberSession) {
      setFeedback({
        message: "Inicia sesion para activar alertas.",
        tone: "warning",
      });
      return;
    }

    setPendingAction("enable");
    setFeedback(null);

    try {
      const location = await resolveLocationSnapshot({
        lastDetectedLocation,
        nativeAdapter,
        requestPermission: true,
      });
      const enabled = await repository.enableAlertSubscription(memberSession, {
        ...buildLocationUpdateInput(location, lastDetectedLocation),
        radiusKm: selectedRadiusKm,
        reason: "manual-refresh",
      });

      setSubscription(enabled);
      setLastDetectedLocation(enabled.dynamicAlertArea?.location ?? location);
      setFeedback(
        await resolvePushRegistrationFeedback({
          memberSession,
          nativeAdapter,
          repository,
        }),
      );
    } catch (error) {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "No pudimos activar alertas.",
        tone: "error",
      });
    } finally {
      setPendingAction(null);
    }
  }, [
    lastDetectedLocation,
    nativeAdapter,
    repository,
    selectedRadiusKm,
    session,
  ]);

  const pauseAlerts = React.useCallback(async () => {
    const memberSession = getMemberSession(session);

    if (!memberSession) {
      return;
    }

    setPendingAction("pause");
    setFeedback(null);

    try {
      const paused = await repository.pauseAlertSubscription(memberSession);

      setSubscription(paused);
      setFeedback({
        message: "Alertas pausadas. Puedes reactivarlas cuando quieras.",
        tone: "success",
      });
    } catch {
      setFeedback({
        message: "No pudimos pausar alertas.",
        tone: "error",
      });
    } finally {
      setPendingAction(null);
    }
  }, [repository, session]);

  const unsubscribeAlerts = React.useCallback(async () => {
    const memberSession = getMemberSession(session);

    if (!memberSession) {
      return;
    }

    setPendingAction("unsubscribe");
    setFeedback(null);

    try {
      const nextSubscription =
        await repository.unsubscribeAlertSubscription(memberSession);

      setSubscription(nextSubscription);

      if (nextSubscription) {
        setSelectedRadiusKm(nextSubscription.radiusKm);
      }

      setFeedback({
        message: "Te desuscribiste de las alertas cercanas.",
        tone: "success",
      });
    } catch {
      setFeedback({
        message: "No pudimos desuscribirte de las alertas.",
        tone: "error",
      });
    } finally {
      setPendingAction(null);
    }
  }, [repository, session]);

  const refreshArea = React.useCallback(async () => {
    const memberSession = getMemberSession(session);

    if (!memberSession || !subscription) {
      return;
    }

    setPendingAction("refresh");
    setFeedback(null);

    try {
      const location = await resolveLocationSnapshot({
        lastDetectedLocation,
        nativeAdapter,
        requestPermission: false,
      });
      const refreshed = await repository.recordAlertAreaLocation(
        memberSession,
        {
          ...buildLocationUpdateInput(location, lastDetectedLocation),
          reason: "manual-refresh",
        },
      );

      setSubscription(refreshed);
      setLastDetectedLocation(refreshed.dynamicAlertArea?.location ?? location);
      setFeedback({
        message: "Area de alertas actualizada.",
        tone: "success",
      });
    } catch {
      setFeedback({
        message: "No pudimos actualizar el area.",
        tone: "error",
      });
    } finally {
      setPendingAction(null);
    }
  }, [lastDetectedLocation, nativeAdapter, repository, session, subscription]);

  const selectRadius = React.useCallback(
    async (radiusKm: AlertSubscriptionRadiusKm) => {
      const memberSession = getMemberSession(session);

      setSelectedRadiusKm(radiusKm);

      if (!memberSession || !subscription?.enabled) {
        return;
      }

      setPendingAction("radius");

      try {
        const existingLocation = getExistingAlertAreaLocation(
          subscription,
          lastDetectedLocation,
        );
        const updated = await repository.enableAlertSubscription(
          memberSession,
          {
            ...buildLocationUpdateInput(existingLocation, lastDetectedLocation),
            radiusKm,
            reason: "manual-refresh",
          },
        );

        setSubscription(updated);
      } catch {
        setFeedback({
          message: "No pudimos cambiar el radio.",
          tone: "error",
        });
      } finally {
        setPendingAction(null);
      }
    },
    [lastDetectedLocation, repository, session, subscription],
  );

  const toggleMovingAlerts = React.useCallback(
    async (enabled: boolean) => {
      const memberSession = getMemberSession(session);

      if (!memberSession || !subscription) {
        return;
      }

      setPendingAction("moving-alerts");

      try {
        const updated = await repository.updateMovingAlertsPreference(
          memberSession,
          {
            enabled,
            permissionState: enabled ? "foreground-only" : "not-requested",
          },
        );

        setSubscription(updated);
      } catch {
        setFeedback({
          message: "No pudimos actualizar alertas mientras me muevo.",
          tone: "error",
        });
      } finally {
        setPendingAction(null);
      }
    },
    [repository, session, subscription],
  );

  return {
    enableAlerts,
    feedback,
    pauseAlerts,
    pendingAction,
    refreshArea,
    selectRadius,
    subscription,
    toggleMovingAlerts,
    unsubscribeAlerts,
    viewModel,
  };
}

function AlertSettingsHero({
  viewModel,
}: {
  viewModel: AlertSubscriptionSettingsViewModel;
}) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroIcon}>
        <ShellIcon color={shellColors.white} name="bell.badge.fill" />
      </View>
      <View style={styles.heroCopy}>
        <Text selectable style={styles.eyebrow}>
          {viewModel.statusLabel}
        </Text>
        <Text selectable style={styles.title}>
          {viewModel.title}
        </Text>
        <Text selectable style={styles.body}>
          {viewModel.body}
        </Text>
      </View>
    </View>
  );
}

function SubscriptionPanel({
  controller,
}: {
  controller: AlertSubscriptionSettingsController;
}) {
  const { pendingAction, viewModel } = controller;
  const updateEnabled = React.useCallback(
    (enabled: boolean) => {
      void (enabled ? controller.enableAlerts() : controller.pauseAlerts());
    },
    [controller],
  );

  return (
    <View style={styles.panel}>
      <View style={styles.rowHeader}>
        <View style={styles.rowCopy}>
          <Text selectable style={styles.sectionTitle}>
            Suscripcion
          </Text>
          <Text selectable style={styles.mutedText}>
            Nuevos Lost Pet Reports activos cerca de tu area dinamica.
          </Text>
        </View>
        <Switch
          disabled={!viewModel.canManage || pendingAction !== null}
          onValueChange={updateEnabled}
          value={viewModel.enabled}
        />
      </View>
      <ActionButton
        disabled={!viewModel.canManage || pendingAction !== null}
        icon={viewModel.enabled ? "bell.slash.fill" : "bell.badge.fill"}
        label={getSubscriptionActionLabel(viewModel, pendingAction)}
        onPress={
          viewModel.enabled ? controller.pauseAlerts : controller.enableAlerts
        }
        testID={
          viewModel.enabled
            ? "alert-subscription-pause-button"
            : "alert-subscription-enable-button"
        }
      />
      {controller.subscription ? (
        <ActionButton
          disabled={!viewModel.canManage || pendingAction !== null}
          icon="xmark"
          label={getUnsubscribeActionLabel(pendingAction)}
          onPress={controller.unsubscribeAlerts}
          testID="alert-subscription-unsubscribe-button"
          variant="danger"
        />
      ) : null}
    </View>
  );
}

function RadiusPanel({
  controller,
}: {
  controller: AlertSubscriptionSettingsController;
}) {
  const { pendingAction, viewModel } = controller;

  return (
    <View style={styles.panel}>
      <Text selectable style={styles.sectionTitle}>
        Radio de alerta
      </Text>
      <View style={styles.radiusRow}>
        {viewModel.radiusOptions.map((option) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: option.isSelected }}
            disabled={!viewModel.canManage || pendingAction !== null}
            key={option.value}
            onPress={() => {
              void controller.selectRadius(option.value);
            }}
            style={[
              styles.radiusButton,
              option.isSelected ? styles.radiusButtonActive : null,
            ]}
          >
            <Text
              style={[
                styles.radiusText,
                option.isSelected ? styles.radiusTextActive : null,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function DynamicAlertAreaPanel({
  controller,
}: {
  controller: AlertSubscriptionSettingsController;
}) {
  const { pendingAction, viewModel } = controller;

  return (
    <View style={styles.panel}>
      <View style={styles.rowHeader}>
        <View style={styles.rowCopy}>
          <Text selectable style={styles.sectionTitle}>
            Area dinamica
          </Text>
          <DynamicAlertAreaCopy viewModel={viewModel} />
        </View>
        <ShellIcon color={shellColors.primary} name="location.fill" />
      </View>
      <ActionButton
        disabled={
          !viewModel.enabled || pendingAction !== null || !viewModel.canManage
        }
        icon="arrow.clockwise"
        label={getRefreshActionLabel(viewModel, pendingAction)}
        onPress={controller.refreshArea}
        testID="alert-subscription-refresh-button"
        variant="secondary"
      />
    </View>
  );
}

function DynamicAlertAreaCopy({
  viewModel,
}: {
  viewModel: AlertSubscriptionSettingsViewModel;
}) {
  if (!viewModel.area) {
    return (
      <Text selectable style={styles.mutedText}>
        Se define al activar alertas.
      </Text>
    );
  }

  return (
    <>
      <Text selectable style={styles.areaTitle}>
        {viewModel.area.sourceLabel}
      </Text>
      <Text selectable style={styles.mutedText}>
        {viewModel.area.label}
      </Text>
      <Text selectable style={styles.mutedText}>
        {viewModel.area.meta}
      </Text>
    </>
  );
}

function MovingAlertsPanel({
  controller,
}: {
  controller: AlertSubscriptionSettingsController;
}) {
  const { pendingAction, subscription, viewModel } = controller;

  return (
    <View style={styles.panel}>
      <View style={styles.rowHeader}>
        <View style={styles.rowCopy}>
          <Text selectable style={styles.sectionTitle}>
            {viewModel.movingAlerts.title}
          </Text>
          <Text selectable style={styles.statusText}>
            {viewModel.movingAlerts.statusLabel}
          </Text>
          <Text selectable style={styles.mutedText}>
            {viewModel.movingAlerts.body}
          </Text>
        </View>
        <Switch
          disabled={!subscription?.enabled || pendingAction !== null}
          onValueChange={(enabled) => {
            void controller.toggleMovingAlerts(enabled);
          }}
          value={viewModel.movingAlerts.enabled}
        />
      </View>
    </View>
  );
}

function PolicyPanel({
  viewModel,
}: {
  viewModel: AlertSubscriptionSettingsViewModel;
}) {
  return (
    <View style={styles.policyPanel}>
      <Text selectable style={styles.sectionTitle}>
        Bateria y permisos
      </Text>
      {viewModel.locationPolicyRows.map((row) => (
        <View key={row} style={styles.policyRow}>
          <View style={styles.policyDot} />
          <Text selectable style={styles.policyText}>
            {row}
          </Text>
        </View>
      ))}
    </View>
  );
}

function FeedbackMessage({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) {
    return null;
  }

  return (
    <Text
      selectable
      style={getFeedbackStyle(feedback.tone)}
      testID="alert-subscription-feedback"
    >
      {feedback.message}
    </Text>
  );
}

async function resolveLocationSnapshot({
  lastDetectedLocation,
  nativeAdapter,
  requestPermission,
}: {
  lastDetectedLocation: AlertSubscriptionLocationSnapshot;
  nativeAdapter: AlertSubscriptionNativeAdapter;
  requestPermission: boolean;
}) {
  const nativeSnapshot = await nativeAdapter.getForegroundLocationSnapshot({
    lastKnownMaxAgeMs: 30 * 60 * 1000,
    requestPermission,
  });
  const location = toAlertSubscriptionLocationSnapshot(nativeSnapshot);

  return location ?? lastDetectedLocation;
}

function buildLocationUpdateInput(
  location: AlertSubscriptionLocationSnapshot,
  fallback: AlertSubscriptionLocationSnapshot,
): {
  currentLocation?: AlertSubscriptionLocationSnapshot;
  lastDetectedLocation: AlertSubscriptionLocationSnapshot;
} {
  if (location.source === "current") {
    return {
      currentLocation: location,
      lastDetectedLocation: fallback,
    };
  }

  return {
    lastDetectedLocation: location,
  };
}

function getExistingAlertAreaLocation(
  subscription: AlertSubscription,
  fallback: AlertSubscriptionLocationSnapshot,
) {
  return subscription.dynamicAlertArea?.location ?? fallback;
}

async function resolvePushRegistrationFeedback({
  memberSession,
  nativeAdapter,
  repository,
}: {
  memberSession: AlertSubscriptionsMemberSession;
  nativeAdapter: AlertSubscriptionNativeAdapter;
  repository: AlertSubscriptionRepository;
}) {
  try {
    const pushRegistration = await nativeAdapter.registerForPushNotifications({
      requestPermission: true,
    });

    return persistRegisteredAlertSubscriptionPushToken({
      memberSession,
      pushRegistration,
      repository,
    });
  } catch {
    return pushRegistrationUnavailableFeedback;
  }
}

export async function persistRegisteredAlertSubscriptionPushToken({
  memberSession,
  pushRegistration,
  repository,
}: {
  memberSession: AlertSubscriptionsMemberSession;
  pushRegistration: AlertSubscriptionPushRegistrationResult;
  repository: AlertSubscriptionRepository;
}): Promise<Feedback> {
  if (pushRegistration.kind !== "registered") {
    return formatPushRegistrationFeedback(pushRegistration);
  }

  try {
    await repository.registerPushToken(memberSession, {
      permissionStatus: pushRegistration.permission.status,
      platform: pushRegistration.platform,
      projectId: pushRegistration.projectId,
      token: pushRegistration.token,
    });
  } catch {
    return {
      message:
        "Alertas activas, pero no pudimos guardar el token push. Intenta actualizar las alertas mas tarde.",
      tone: "warning",
    };
  }

  return formatPushRegistrationFeedback(pushRegistration);
}

const pushRegistrationUnavailableFeedback = {
  message:
    "Alertas activas, pero no pudimos activar notificaciones push. Intenta actualizar las alertas mas tarde.",
  tone: "warning",
} satisfies Feedback;

function getMemberSession(
  session: AlertSubscriptionsSessionState,
): AlertSubscriptionsMemberSession | null {
  return session.kind === "member" ? session : null;
}

function getSubscriptionActionLabel(
  viewModel: AlertSubscriptionSettingsViewModel,
  pendingAction: PendingAction | null,
) {
  return pendingAction === "enable" || pendingAction === "pause"
    ? "Actualizando"
    : viewModel.action.label;
}

function getUnsubscribeActionLabel(pendingAction: PendingAction | null) {
  return pendingAction === "unsubscribe" ? "Desuscribiendo" : "Desuscribirme";
}

function getRefreshActionLabel(
  viewModel: AlertSubscriptionSettingsViewModel,
  pendingAction: PendingAction | null,
) {
  return pendingAction === "refresh"
    ? "Actualizando"
    : viewModel.refreshActionLabel;
}

function formatPushRegistrationFeedback(
  pushRegistration: AlertSubscriptionPushRegistrationResult,
): Feedback {
  if (pushRegistration.kind === "registered") {
    return {
      message: "Alertas activas y notificaciones listas.",
      tone: "success",
    };
  }

  if (pushRegistration.kind === "missing-project-id") {
    return {
      message:
        "Alertas activas. Falta configurar EAS projectId para probar push real.",
      tone: "warning",
    };
  }

  if (pushRegistration.kind === "permission-denied") {
    return {
      message:
        "Alertas activas. El permiso de notificaciones esta denegado; habilitalo en ajustes para recibir avisos push.",
      tone: "warning",
    };
  }

  return {
    message:
      "Alertas activas. Necesitamos permiso de notificaciones para enviarte avisos push.",
    tone: "warning",
  };
}

function ActionButton({
  disabled = false,
  icon,
  label,
  onPress,
  testID,
  variant = "primary",
}: {
  disabled?: boolean;
  icon: string;
  label: string;
  onPress: () => void;
  testID?: string;
  variant?: "danger" | "primary" | "secondary";
}) {
  const iconColor =
    variant === "primary"
      ? shellColors.white
      : variant === "danger"
        ? shellColors.lost
        : shellColors.primary;
  const textStyle =
    variant === "primary"
      ? styles.actionButtonPrimaryText
      : variant === "danger"
        ? styles.actionButtonDangerText
        : styles.actionButtonSecondaryText;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.actionButton,
        variant === "secondary"
          ? styles.actionButtonSecondary
          : variant === "danger"
            ? styles.actionButtonDanger
            : styles.actionButtonPrimary,
        disabled ? styles.actionButtonDisabled : null,
        pressed ? styles.actionButtonPressed : null,
      ]}
    >
      <ShellIcon color={iconColor} name={icon} size={18} />
      <Text numberOfLines={2} style={textStyle}>
        {label}
      </Text>
    </Pressable>
  );
}

function getFeedbackStyle(tone: Feedback["tone"]) {
  if (tone === "error") {
    return styles.feedbackError;
  }

  if (tone === "warning") {
    return styles.feedbackWarning;
  }

  return styles.feedbackSuccess;
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderRadius: 18,
    borderCurve: "continuous",
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionButtonDisabled: {
    opacity: 0.54,
  },
  actionButtonDanger: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.lost,
  },
  actionButtonDangerText: {
    color: shellColors.lost,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  actionButtonPressed: {
    opacity: 0.82,
  },
  actionButtonPrimary: {
    backgroundColor: shellColors.primary,
    borderColor: shellColors.primary,
  },
  actionButtonPrimaryText: {
    color: shellColors.white,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  actionButtonSecondary: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
  },
  actionButtonSecondaryText: {
    color: shellColors.primary,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  areaTitle: {
    color: shellColors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  body: {
    color: shellColors.white,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  content: {
    gap: 14,
    padding: 18,
    paddingBottom: 32,
  },
  eyebrow: {
    color: "rgba(255, 255, 255, 0.76)",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  feedbackError: {
    color: shellColors.lost,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  feedbackSuccess: {
    color: shellColors.primary,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  feedbackWarning: {
    color: "#6F4B13",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  hero: {
    backgroundColor: shellColors.primary,
    borderRadius: 24,
    borderCurve: "continuous",
    boxShadow: "0 16px 30px rgba(20, 108, 90, 0.18)",
    flexDirection: "row",
    gap: 14,
    padding: 18,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 24,
    borderCurve: "continuous",
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  mutedText: {
    color: shellColors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  panel: {
    backgroundColor: shellColors.surface,
    borderColor: shellColors.border,
    borderRadius: 22,
    borderCurve: "continuous",
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  policyDot: {
    backgroundColor: shellColors.primary,
    borderRadius: 4,
    height: 8,
    marginTop: 7,
    width: 8,
  },
  policyPanel: {
    backgroundColor: shellColors.primarySoft,
    borderColor: "#A9D4C9",
    borderRadius: 22,
    borderCurve: "continuous",
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  policyRow: {
    flexDirection: "row",
    gap: 9,
  },
  policyText: {
    color: shellColors.primaryDark,
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  radiusButton: {
    alignItems: "center",
    backgroundColor: shellColors.surfaceMuted,
    borderColor: shellColors.border,
    borderRadius: 18,
    borderCurve: "continuous",
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  radiusButtonActive: {
    backgroundColor: shellColors.primary,
    borderColor: shellColors.primary,
  },
  radiusRow: {
    flexDirection: "row",
    gap: 8,
  },
  radiusText: {
    color: shellColors.primary,
    fontSize: 14,
    fontWeight: "900",
  },
  radiusTextActive: {
    color: shellColors.white,
  },
  rowCopy: {
    flex: 1,
    gap: 5,
  },
  rowHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  screen: {
    backgroundColor: shellColors.background,
    flex: 1,
  },
  sectionTitle: {
    color: shellColors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  statusText: {
    color: shellColors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  title: {
    color: shellColors.white,
    fontSize: 25,
    fontWeight: "900",
  },
});
