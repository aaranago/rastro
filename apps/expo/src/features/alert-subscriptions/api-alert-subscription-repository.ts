import type { RouterInputs, RouterOutputs } from "../../utils/api";
import type {
  AlertSubscription,
  AlertSubscriptionDynamicAlertArea,
  AlertSubscriptionLocationSnapshot,
  AlertSubscriptionLocationUpdatePolicy,
  AlertSubscriptionMovingAlertsPreference,
  AlertSubscriptionRadiusKm,
  AlertSubscriptionRepository,
  AlertSubscriptionsMemberSession,
  AlertSubscriptionsSessionState,
  EnableAlertSubscriptionInput,
  RecordAlertAreaLocationInput,
  RegisterAlertSubscriptionPushTokenInput,
  UpdateMovingAlertsPreferenceInput,
} from "./alert-subscriptions";
import { alertSubscriptionRadiusOptionsKm } from "./alert-subscriptions";

export type ApiDateValue = Date | string;

export type ApiAlertSubscriptionStatus =
  | "active"
  | "needs_location"
  | "paused"
  | "unsubscribed";

export interface ApiAlertSubscription {
  categories: readonly string[];
  createdAt: ApiDateValue;
  id: string;
  location: {
    label: string | null;
    latitude: number;
    locationCell: string | null;
    longitude: number;
    recordedAt: ApiDateValue;
  } | null;
  pausedUntil: ApiDateValue | null;
  radiusMeters: number;
  status: ApiAlertSubscriptionStatus;
  unsubscribedAt: ApiDateValue | null;
  updatedAt: ApiDateValue;
}

interface ExpectedAlertRouterInputs {
  get: Record<string, never>;
  pause: {
    pausedUntil: string;
  };
  recordLocation: {
    label?: string;
    latitude: number;
    locationCell?: string;
    longitude: number;
  };
  registerPushToken: {
    deviceId?: string;
    platform?: AlertSubscriptionPushPlatformWithUnknown;
    token: string;
  };
  unsubscribe: Record<string, never>;
  upsertSettings: {
    categories?: readonly ["lost_pet"];
    radiusMeters: number;
  };
}

interface ExpectedAlertRouterOutputs {
  get: {
    pushTokens: readonly unknown[];
    subscription: ApiAlertSubscription | null;
  };
  pause: ApiAlertSubscription;
  recordLocation: ApiAlertSubscription;
  registerPushToken: { status: "registered" } | void;
  unsubscribe: ApiAlertSubscription | null;
  upsertSettings: ApiAlertSubscription;
}

type AlertSubscriptionPushPlatformWithUnknown =
  | "android"
  | "ios"
  | "unknown"
  | "web";

type AlertRouterInputs = RouterInputs extends { alerts: infer TAlerts }
  ? TAlerts
  : ExpectedAlertRouterInputs;

type AlertRouterOutputs = RouterOutputs extends { alerts: infer TAlerts }
  ? TAlerts
  : ExpectedAlertRouterOutputs;

type AlertProcedureInput<TProcedure extends keyof ExpectedAlertRouterInputs> =
  TProcedure extends keyof AlertRouterInputs
    ? AlertRouterInputs[TProcedure]
    : ExpectedAlertRouterInputs[TProcedure];

type AlertProcedureOutput<TProcedure extends keyof ExpectedAlertRouterOutputs> =
  TProcedure extends keyof AlertRouterOutputs
    ? AlertRouterOutputs[TProcedure]
    : ExpectedAlertRouterOutputs[TProcedure];

type AlertGetApiOutput = AlertProcedureOutput<"get">;
type AlertGetApiInput = AlertProcedureInput<"get">;
type AlertPauseApiOutput = AlertProcedureOutput<"pause">;
type AlertPauseApiInput = AlertProcedureInput<"pause">;
type AlertRecordLocationApiInput = AlertProcedureInput<"recordLocation">;
type AlertRecordLocationApiOutput = AlertProcedureOutput<"recordLocation">;
type AlertRegisterPushTokenApiInput = AlertProcedureInput<"registerPushToken">;
type AlertRegisterPushTokenApiOutput =
  AlertProcedureOutput<"registerPushToken">;
type AlertUnsubscribeApiOutput = AlertProcedureOutput<"unsubscribe">;
type AlertUnsubscribeApiInput = AlertProcedureInput<"unsubscribe">;
type AlertUpsertSettingsApiInput = AlertProcedureInput<"upsertSettings">;
type AlertUpsertSettingsApiOutput = AlertProcedureOutput<"upsertSettings">;

interface ApiAlertSubscriptionClient {
  alerts: {
    get: {
      query: (input: AlertGetApiInput) => Promise<AlertGetApiOutput>;
    };
    pause: {
      mutate: (input: AlertPauseApiInput) => Promise<AlertPauseApiOutput>;
    };
    recordLocation: {
      mutate: (
        input: AlertRecordLocationApiInput,
      ) => Promise<AlertRecordLocationApiOutput>;
    };
    registerPushToken: {
      mutate: (
        input: AlertRegisterPushTokenApiInput,
      ) => Promise<AlertRegisterPushTokenApiOutput>;
    };
    unsubscribe: {
      mutate: (
        input: AlertUnsubscribeApiInput,
      ) => Promise<AlertUnsubscribeApiOutput>;
    };
    upsertSettings: {
      mutate: (
        input: AlertUpsertSettingsApiInput,
      ) => Promise<AlertUpsertSettingsApiOutput>;
    };
  };
}

const defaultLocationUpdatePolicy: AlertSubscriptionLocationUpdatePolicy = {
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

export function createApiAlertSubscriptionRepository({
  client,
}: {
  client: unknown;
}): AlertSubscriptionRepository {
  return {
    disableAlertSubscription(session) {
      return pauseAlertSubscription(client, session);
    },
    enableAlertSubscription(session, input) {
      const memberSession = assertMemberSession(session);

      return getAlertsClient(client)
        .upsertSettings.mutate(buildUpsertSettingsInput(input))
        .then((subscription) =>
          input.currentLocation || input.lastDetectedLocation
            ? getAlertsClient(client).recordLocation.mutate(
                buildRecordLocationInput(input),
              )
            : subscription,
        )
        .then((subscription) =>
          normalizeAlertSubscription(
            subscription as unknown as ApiAlertSubscription,
            memberSession,
          ),
        );
    },
    getAlertSubscription(session) {
      const memberSession = assertMemberSession(session);

      return getAlertsClient(client)
        .get.query(buildEmptyGetInput())
        .then((subscription) =>
          normalizeNullableAlertSubscription(
            getSubscriptionFromAlertState(subscription),
            memberSession,
          ),
        );
    },
    matchNewLostPetReportAlerts() {
      return Promise.resolve([]);
    },
    pauseAlertSubscription(session) {
      return pauseAlertSubscription(client, session);
    },
    recordAlertAreaLocation(session, input) {
      const memberSession = assertMemberSession(session);

      return getAlertsClient(client)
        .recordLocation.mutate(buildRecordLocationInput(input))
        .then((subscription) =>
          normalizeAlertSubscription(
            subscription as unknown as ApiAlertSubscription,
            memberSession,
          ),
        );
    },
    registerPushToken(session, input) {
      assertMemberSession(session);

      return getAlertsClient(client)
        .registerPushToken.mutate(buildRegisterPushTokenInput(input))
        .then(() => undefined);
    },
    unsubscribeAlertSubscription(session) {
      assertMemberSession(session);

      return getAlertsClient(client)
        .unsubscribe.mutate(buildEmptyUnsubscribeInput())
        .then(() => null);
    },
    updateMovingAlertsPreference(session, input) {
      const memberSession = assertMemberSession(session);

      return getAlertsClient(client)
        .get.query(buildEmptyGetInput())
        .then((state) => {
          const subscription = normalizeNullableAlertSubscription(
            getSubscriptionFromAlertState(state),
            memberSession,
          );

          if (!subscription) {
            throw new Error(
              "No encontramos una suscripcion de alertas para actualizar.",
            );
          }

          return {
            ...subscription,
            movingAlerts: buildLocalMovingAlertsPreference(input),
          };
        });
    },
  };
}

function pauseAlertSubscription(
  client: unknown,
  session: AlertSubscriptionsSessionState,
) {
  const memberSession = assertMemberSession(session);

  return getAlertsClient(client)
    .pause.mutate(buildPauseInput())
    .then((subscription) =>
      normalizeAlertSubscription(
        subscription as unknown as ApiAlertSubscription,
        memberSession,
      ),
    );
}

function buildUpsertSettingsInput(
  input: EnableAlertSubscriptionInput,
): AlertUpsertSettingsApiInput {
  return {
    categories: ["lost_pet"],
    radiusMeters: input.radiusKm * 1000,
  } as unknown as AlertUpsertSettingsApiInput;
}

function buildEmptyGetInput(): AlertGetApiInput {
  return {} as unknown as AlertGetApiInput;
}

function buildEmptyUnsubscribeInput(): AlertUnsubscribeApiInput {
  return {} as unknown as AlertUnsubscribeApiInput;
}

function buildPauseInput(): AlertPauseApiInput {
  return {
    pausedUntil: "9999-12-31T23:59:59.999Z",
  } as unknown as AlertPauseApiInput;
}

function buildRecordLocationInput(
  input: RecordAlertAreaLocationInput,
): AlertRecordLocationApiInput {
  const location = input.currentLocation ?? input.lastDetectedLocation;

  if (!location) {
    throw new Error("La suscripcion necesita una ubicacion para alertas.");
  }

  return {
    label: location.label,
    latitude: location.coordinates.latitude,
    locationCell: location.locationCellLabel,
    longitude: location.coordinates.longitude,
  } as unknown as AlertRecordLocationApiInput;
}

function buildRegisterPushTokenInput(
  input: RegisterAlertSubscriptionPushTokenInput,
): AlertRegisterPushTokenApiInput {
  return {
    deviceId: input.projectId,
    platform: input.platform ?? "unknown",
    token: input.token,
  } as unknown as AlertRegisterPushTokenApiInput;
}

function normalizeAlertSubscription(
  subscription: ApiAlertSubscription,
  session: AlertSubscriptionsMemberSession,
): AlertSubscription {
  return {
    createdAt: normalizeDateValue(subscription.createdAt),
    dynamicAlertArea: subscription.location
      ? normalizeDynamicAlertArea(subscription.location)
      : undefined,
    enabled: isEnabledAlertSubscriptionStatus(subscription.status),
    id: subscription.id,
    locationUpdatePolicy: normalizeLocationUpdatePolicy(),
    memberId: session.memberId,
    movingAlerts: { ...defaultMovingAlertsPreference },
    notifiedLostReportIds: [],
    radiusKm: normalizeRadiusMeters(subscription.radiusMeters),
    updatedAt: normalizeDateValue(subscription.updatedAt),
  };
}

function normalizeNullableAlertSubscription(
  subscription: unknown,
  session: AlertSubscriptionsMemberSession,
) {
  return subscription
    ? normalizeAlertSubscription(subscription as ApiAlertSubscription, session)
    : null;
}

function getSubscriptionFromAlertState(output: unknown) {
  if (isRecord(output) && "subscription" in output) {
    return output.subscription;
  }

  return output;
}

function isEnabledAlertSubscriptionStatus(status: ApiAlertSubscriptionStatus) {
  return status === "active" || status === "needs_location";
}

function normalizeDynamicAlertArea(
  location: NonNullable<ApiAlertSubscription["location"]>,
): AlertSubscriptionDynamicAlertArea {
  const recordedAt = normalizeDateValue(location.recordedAt);

  return {
    location: normalizeLocationSnapshot(location),
    reason: "manual-refresh",
    resolvedAt: recordedAt,
  };
}

function normalizeLocationSnapshot(
  location: NonNullable<ApiAlertSubscription["location"]>,
): AlertSubscriptionLocationSnapshot {
  return {
    coordinates: {
      latitude: location.latitude,
      longitude: location.longitude,
    },
    countryCode: "BO",
    detectedAt: normalizeDateValue(location.recordedAt),
    label: location.label ?? "Ubicacion registrada en Bolivia",
    locationCellLabel: location.locationCell ?? "Bolivia",
    source: "last",
  };
}

function normalizeLocationUpdatePolicy(): AlertSubscriptionLocationUpdatePolicy {
  return {
    allowedReasons: [...defaultLocationUpdatePolicy.allowedReasons],
    alwaysOnSocket: false,
    continuousPolling: false,
    locationWatcher: false,
  };
}

function buildLocalMovingAlertsPreference({
  enabled,
  permissionState,
}: UpdateMovingAlertsPreferenceInput): AlertSubscriptionMovingAlertsPreference {
  return {
    backgroundTracking: "not-started",
    enabled,
    label: "Alertas mientras me muevo",
    permissionState,
    status: enabled
      ? permissionState === "background-granted"
        ? "ready"
        : "needs-background-permission"
      : "off",
  };
}

function normalizeRadiusMeters(radiusMeters: number) {
  const radiusKm = radiusMeters / 1000;

  if (
    alertSubscriptionRadiusOptionsKm.includes(
      radiusKm as AlertSubscriptionRadiusKm,
    )
  ) {
    return radiusKm as AlertSubscriptionRadiusKm;
  }

  throw new Error("Alerts API returned an unsupported alert radius.");
}

function normalizeDateValue(value: ApiDateValue) {
  return value instanceof Date ? value.toISOString() : value;
}

function assertMemberSession(
  session: AlertSubscriptionsSessionState,
): AlertSubscriptionsMemberSession {
  if (session.kind === "visitor") {
    throw new Error("Inicia sesion para administrar alertas.");
  }

  return session;
}

function getAlertsClient(
  client: unknown,
): ApiAlertSubscriptionClient["alerts"] {
  const alerts = (client as Partial<ApiAlertSubscriptionClient>).alerts;

  if (!alerts) {
    throw new Error("Alerts API client is not available.");
  }

  return alerts;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
