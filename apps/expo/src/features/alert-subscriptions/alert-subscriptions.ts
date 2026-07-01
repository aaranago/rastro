import type { LostPetReportRepository } from "../lost-reports/lost-reports";

export const alertSubscriptionRadiusOptionsKm = [5, 10, 20] as const;

export type AlertSubscriptionRadiusKm =
  (typeof alertSubscriptionRadiusOptionsKm)[number];

export type AlertSubscriptionsSessionState =
  | AlertSubscriptionsMemberSession
  | { kind: "visitor" };

export interface AlertSubscriptionsMemberSession {
  displayName: string;
  kind: "member";
  memberId: string;
}

export type AlertSubscriptionLocationUpdateReason =
  | "app-open"
  | "foreground"
  | "manual-refresh";

export interface AlertSubscriptionCoordinates {
  latitude: number;
  longitude: number;
}

export interface AlertSubscriptionLocationSnapshot {
  coordinates: AlertSubscriptionCoordinates;
  countryCode: "BO";
  detectedAt: string;
  label: string;
  locationCellLabel: string;
  source: "current" | "last";
}

export interface AlertSubscriptionDynamicAlertArea {
  location: AlertSubscriptionLocationSnapshot;
  reason: AlertSubscriptionLocationUpdateReason;
  resolvedAt: string;
}

export interface AlertSubscriptionLocationUpdatePolicy {
  allowedReasons: AlertSubscriptionLocationUpdateReason[];
  alwaysOnSocket: false;
  continuousPolling: false;
  locationWatcher: false;
}

export type AlertSubscriptionBackgroundLocationPermissionState =
  | "background-granted"
  | "denied"
  | "foreground-only"
  | "not-requested";

export type AlertSubscriptionMovingAlertsStatus =
  | "needs-background-permission"
  | "off"
  | "ready";

export interface AlertSubscriptionMovingAlertsPreference {
  backgroundTracking: "not-started";
  enabled: boolean;
  label: "Alertas mientras me muevo";
  permissionState: AlertSubscriptionBackgroundLocationPermissionState;
  status: AlertSubscriptionMovingAlertsStatus;
}

export interface AlertSubscription {
  createdAt: string;
  dynamicAlertArea?: AlertSubscriptionDynamicAlertArea;
  enabled: boolean;
  id: string;
  locationUpdatePolicy: AlertSubscriptionLocationUpdatePolicy;
  memberId: string;
  movingAlerts: AlertSubscriptionMovingAlertsPreference;
  notifiedLostReportIds: string[];
  radiusKm: AlertSubscriptionRadiusKm;
  updatedAt: string;
}

export interface EnableAlertSubscriptionInput {
  currentLocation?: AlertSubscriptionLocationSnapshot;
  lastDetectedLocation?: AlertSubscriptionLocationSnapshot;
  movingAlerts?: UpdateMovingAlertsPreferenceInput;
  radiusKm: AlertSubscriptionRadiusKm;
  reason: AlertSubscriptionLocationUpdateReason;
}

export interface RecordAlertAreaLocationInput {
  currentLocation?: AlertSubscriptionLocationSnapshot;
  lastDetectedLocation?: AlertSubscriptionLocationSnapshot;
  reason: AlertSubscriptionLocationUpdateReason;
}

export interface LostPetAlertNotification {
  body: string;
  deepLink: string;
  memberId: string;
  reportId: string;
  title: string;
  webUrl: string;
}

export interface MatchNewLostPetReportAlertsInput {
  lostReports: LostPetReportRepository;
}

export interface UpdateMovingAlertsPreferenceInput {
  enabled: boolean;
  permissionState: AlertSubscriptionBackgroundLocationPermissionState;
}

export type AlertSubscriptionPushPermissionStatus =
  | "denied"
  | "granted"
  | "undetermined";

export type AlertSubscriptionPushPlatform = "android" | "ios" | "web";

export interface RegisterAlertSubscriptionPushTokenInput {
  permissionStatus: AlertSubscriptionPushPermissionStatus;
  platform?: AlertSubscriptionPushPlatform;
  projectId: string;
  token: string;
}

export interface AlertSubscriptionRepository {
  disableAlertSubscription: (
    session: AlertSubscriptionsSessionState,
  ) => Promise<AlertSubscription>;
  enableAlertSubscription: (
    session: AlertSubscriptionsSessionState,
    input: EnableAlertSubscriptionInput,
  ) => Promise<AlertSubscription>;
  getAlertSubscription: (
    session: AlertSubscriptionsSessionState,
  ) => Promise<AlertSubscription | null>;
  matchNewLostPetReportAlerts: (
    session: AlertSubscriptionsSessionState,
    input: MatchNewLostPetReportAlertsInput,
  ) => Promise<LostPetAlertNotification[]>;
  pauseAlertSubscription: (
    session: AlertSubscriptionsSessionState,
  ) => Promise<AlertSubscription>;
  recordAlertAreaLocation: (
    session: AlertSubscriptionsSessionState,
    input: RecordAlertAreaLocationInput,
  ) => Promise<AlertSubscription>;
  registerPushToken: (
    session: AlertSubscriptionsSessionState,
    input: RegisterAlertSubscriptionPushTokenInput,
  ) => Promise<void>;
  unsubscribeAlertSubscription: (
    session: AlertSubscriptionsSessionState,
  ) => Promise<AlertSubscription | null>;
  updateMovingAlertsPreference: (
    session: AlertSubscriptionsSessionState,
    input: UpdateMovingAlertsPreferenceInput,
  ) => Promise<AlertSubscription>;
}

export interface InMemoryAlertSubscriptionRepositoryOptions {
  now?: () => string;
}

type AlertSubscriptionRepositoryErrorCode =
  | "alert_area_location_required"
  | "alert_subscription_not_found"
  | "invalid_alert_radius"
  | "visitor_cannot_manage_alert_subscription";

class AlertSubscriptionRepositoryError extends Error {
  code: AlertSubscriptionRepositoryErrorCode;

  constructor(code: AlertSubscriptionRepositoryErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AlertSubscriptionRepositoryError";
  }
}

const batteryConsciousLocationUpdatePolicy: AlertSubscriptionLocationUpdatePolicy =
  {
    allowedReasons: ["app-open", "foreground", "manual-refresh"],
    alwaysOnSocket: false,
    continuousPolling: false,
    locationWatcher: false,
  };

const defaultMovingAlertsPreference: AlertSubscriptionMovingAlertsPreference = {
  backgroundTracking: "not-started",
  enabled: false,
  label: "Alertas mientras me muevo",
  permissionState: "not-requested",
  status: "off",
};

export function createInMemoryAlertSubscriptionRepository(
  options: InMemoryAlertSubscriptionRepositoryOptions = {},
): AlertSubscriptionRepository {
  const now = options.now ?? (() => "2026-01-01T00:00:00.000Z");
  const subscriptions = new Map<string, AlertSubscription>();
  const pushRegistrations = new Map<
    string,
    RegisterAlertSubscriptionPushTokenInput
  >();
  const pauseAlertSubscription = (
    session: AlertSubscriptionsSessionState,
  ): Promise<AlertSubscription> => {
    assertMemberCanManageAlertSubscription(session);

    const current = subscriptions.get(session.memberId);

    if (!current) {
      throw new AlertSubscriptionRepositoryError(
        "alert_subscription_not_found",
        "No se encontro una suscripcion de alertas para esta persona.",
      );
    }

    const updated: AlertSubscription = {
      ...current,
      enabled: false,
      updatedAt: now(),
    };

    subscriptions.set(session.memberId, updated);

    return Promise.resolve(cloneAlertSubscription(updated));
  };

  return {
    disableAlertSubscription(session) {
      return pauseAlertSubscription(session);
    },
    enableAlertSubscription(session, input) {
      assertMemberCanManageAlertSubscription(session);
      assertAlertRadius(input.radiusKm);

      const timestamp = now();
      const current = subscriptions.get(session.memberId);
      const next: AlertSubscription = {
        createdAt: current?.createdAt ?? timestamp,
        dynamicAlertArea: resolveDynamicAlertArea({
          currentLocation: input.currentLocation,
          lastDetectedLocation: input.lastDetectedLocation,
          reason: input.reason,
          resolvedAt: timestamp,
        }),
        enabled: true,
        id: current?.id ?? `alert-subscription-${subscriptions.size + 1}`,
        locationUpdatePolicy: cloneLocationUpdatePolicy(
          batteryConsciousLocationUpdatePolicy,
        ),
        memberId: session.memberId,
        movingAlerts: buildMovingAlertsPreference(
          input.movingAlerts ?? current?.movingAlerts,
        ),
        notifiedLostReportIds: current?.notifiedLostReportIds
          ? [...current.notifiedLostReportIds]
          : [],
        radiusKm: input.radiusKm,
        updatedAt: timestamp,
      };

      subscriptions.set(session.memberId, next);

      return Promise.resolve(cloneAlertSubscription(next));
    },
    getAlertSubscription(session) {
      assertMemberCanManageAlertSubscription(session);

      const subscription = subscriptions.get(session.memberId);

      return Promise.resolve(
        subscription ? cloneAlertSubscription(subscription) : null,
      );
    },
    async matchNewLostPetReportAlerts(session, input) {
      assertMemberCanManageAlertSubscription(session);

      const current = subscriptions.get(session.memberId);

      if (!current?.enabled || !current.dynamicAlertArea) {
        return [];
      }

      const searchResult = await input.lostReports.searchActiveLostPetReports(
        session,
        {
          location: {
            coordinates: {
              ...current.dynamicAlertArea.location.coordinates,
            },
            countryCode: current.dynamicAlertArea.location.countryCode,
            label: current.dynamicAlertArea.location.label,
            locationCellLabel:
              current.dynamicAlertArea.location.locationCellLabel,
            source: current.dynamicAlertArea.location.source,
          },
          radiusKm: current.radiusKm,
          strategy: "postgis_radius",
        },
      );
      const notified = new Set(current.notifiedLostReportIds);
      const newReports = searchResult.reports.filter(
        (report) => !notified.has(report.id),
      );
      const notifications = newReports.map((report) =>
        toLostPetAlertNotification({
          memberId: session.memberId,
          report,
        }),
      );

      if (newReports.length > 0) {
        subscriptions.set(session.memberId, {
          ...current,
          notifiedLostReportIds: [
            ...current.notifiedLostReportIds,
            ...newReports.map((report) => report.id),
          ],
          updatedAt: now(),
        });
      }

      return notifications;
    },
    pauseAlertSubscription,
    recordAlertAreaLocation(session, input) {
      assertMemberCanManageAlertSubscription(session);

      const current = subscriptions.get(session.memberId);

      if (!current) {
        throw new AlertSubscriptionRepositoryError(
          "alert_subscription_not_found",
          "No se encontro una suscripcion de alertas para esta persona.",
        );
      }

      const timestamp = now();
      const updated: AlertSubscription = {
        ...current,
        dynamicAlertArea: resolveDynamicAlertArea({
          currentLocation: input.currentLocation,
          lastDetectedLocation: input.lastDetectedLocation,
          reason: input.reason,
          resolvedAt: timestamp,
        }),
        updatedAt: timestamp,
      };

      subscriptions.set(session.memberId, updated);

      return Promise.resolve(cloneAlertSubscription(updated));
    },
    registerPushToken(session, input) {
      assertMemberCanManageAlertSubscription(session);

      pushRegistrations.set(session.memberId, { ...input });

      return Promise.resolve();
    },
    unsubscribeAlertSubscription(session) {
      assertMemberCanManageAlertSubscription(session);

      subscriptions.delete(session.memberId);
      pushRegistrations.delete(session.memberId);

      return Promise.resolve(null);
    },
    updateMovingAlertsPreference(session, input) {
      assertMemberCanManageAlertSubscription(session);

      const current = subscriptions.get(session.memberId);

      if (!current) {
        throw new AlertSubscriptionRepositoryError(
          "alert_subscription_not_found",
          "No se encontro una suscripcion de alertas para esta persona.",
        );
      }

      const updated: AlertSubscription = {
        ...current,
        movingAlerts: buildMovingAlertsPreference(input),
        updatedAt: now(),
      };

      subscriptions.set(session.memberId, updated);

      return Promise.resolve(cloneAlertSubscription(updated));
    },
  };
}

function assertMemberCanManageAlertSubscription(
  session: AlertSubscriptionsSessionState,
): asserts session is AlertSubscriptionsMemberSession {
  if (session.kind === "visitor") {
    throw new AlertSubscriptionRepositoryError(
      "visitor_cannot_manage_alert_subscription",
      "Los visitantes no pueden administrar una suscripcion de alertas.",
    );
  }
}

function assertAlertRadius(radiusKm: AlertSubscriptionRadiusKm) {
  if (!alertSubscriptionRadiusOptionsKm.includes(radiusKm)) {
    throw new AlertSubscriptionRepositoryError(
      "invalid_alert_radius",
      "El radio de alerta debe ser 5, 10 o 20 km.",
    );
  }
}

function resolveDynamicAlertArea({
  currentLocation,
  lastDetectedLocation,
  reason,
  resolvedAt,
}: {
  currentLocation?: AlertSubscriptionLocationSnapshot;
  lastDetectedLocation?: AlertSubscriptionLocationSnapshot;
  reason: AlertSubscriptionLocationUpdateReason;
  resolvedAt: string;
}): AlertSubscriptionDynamicAlertArea {
  const location = currentLocation ?? lastDetectedLocation;

  if (!location) {
    throw new AlertSubscriptionRepositoryError(
      "alert_area_location_required",
      "La suscripcion necesita una ubicacion actual o la ultima ubicacion detectada.",
    );
  }

  return {
    location: cloneLocationSnapshot(location),
    reason,
    resolvedAt,
  };
}

function cloneAlertSubscription(
  subscription: AlertSubscription,
): AlertSubscription {
  return {
    ...subscription,
    dynamicAlertArea: subscription.dynamicAlertArea
      ? {
          ...subscription.dynamicAlertArea,
          location: cloneLocationSnapshot(
            subscription.dynamicAlertArea.location,
          ),
        }
      : undefined,
    locationUpdatePolicy: cloneLocationUpdatePolicy(
      subscription.locationUpdatePolicy,
    ),
    movingAlerts: { ...subscription.movingAlerts },
    notifiedLostReportIds: [...subscription.notifiedLostReportIds],
  };
}

function toLostPetAlertNotification({
  memberId,
  report,
}: {
  memberId: string;
  report: Awaited<
    ReturnType<LostPetReportRepository["searchActiveLostPetReports"]>
  >["reports"][number];
}): LostPetAlertNotification {
  return {
    body: `${report.petName} fue reportada cerca de ${report.locationCellLabel}.`,
    deepLink: report.shareTarget.appDeepLink,
    memberId,
    reportId: report.id,
    title: "Mascota perdida cerca de ti",
    webUrl: report.shareTarget.webUrl,
  };
}

function cloneLocationUpdatePolicy(
  policy: AlertSubscriptionLocationUpdatePolicy,
): AlertSubscriptionLocationUpdatePolicy {
  return {
    ...policy,
    allowedReasons: [...policy.allowedReasons],
  };
}

function buildMovingAlertsPreference(
  input?:
    | UpdateMovingAlertsPreferenceInput
    | AlertSubscriptionMovingAlertsPreference,
): AlertSubscriptionMovingAlertsPreference {
  if (!input) {
    return { ...defaultMovingAlertsPreference };
  }

  return {
    backgroundTracking: "not-started",
    enabled: input.enabled,
    label: "Alertas mientras me muevo",
    permissionState: input.permissionState,
    status: getMovingAlertsStatus(input),
  };
}

function getMovingAlertsStatus({
  enabled,
  permissionState,
}: UpdateMovingAlertsPreferenceInput): AlertSubscriptionMovingAlertsStatus {
  if (!enabled) {
    return "off";
  }

  return permissionState === "background-granted"
    ? "ready"
    : "needs-background-permission";
}

function cloneLocationSnapshot(
  location: AlertSubscriptionLocationSnapshot,
): AlertSubscriptionLocationSnapshot {
  return {
    ...location,
    coordinates: { ...location.coordinates },
  };
}
