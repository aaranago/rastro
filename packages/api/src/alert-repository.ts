import type { Database } from "@acme/db/client";
import type {
  AlertMovingAlertsPermissionState,
  AlertPushTokenPlatform,
  AlertSubscriptionCategory,
} from "@acme/validators";
import { and, asc, desc, eq, gte, isNull, lte, ne, or, sql } from "@acme/db";
import {
  AlertNotificationDelivery,
  AlertPushToken,
  AlertSubscription,
  Report,
  ReportLocation,
} from "@acme/db/schema";

import { buildReportSubjectHref } from "./chat-repository";

export type AlertSubscriptionStatus =
  | "active"
  | "needs_location"
  | "paused"
  | "unsubscribed";

export interface PersistedAlertSubscription {
  categories: AlertSubscriptionCategory[];
  createdAt: string;
  id: string;
  location: {
    label: string | null;
    latitude: number;
    locationCell: string | null;
    longitude: number;
    recordedAt: string;
  } | null;
  movingAlerts: {
    enabled: boolean;
    permissionState: AlertMovingAlertsPermissionState;
    status: "needs-background-permission" | "off" | "ready";
  };
  pausedUntil: string | null;
  radiusMeters: number;
  status: AlertSubscriptionStatus;
  unsubscribedAt: string | null;
  updatedAt: string;
}

export interface PersistedAlertPushToken {
  deviceId: string | null;
  disabledAt: string | null;
  id: string;
  lastSeenAt: string;
  platform: AlertPushTokenPlatform;
  registeredAt: string;
  token: string;
}

export interface PersistedAlertState {
  pushTokens: PersistedAlertPushToken[];
  subscription: PersistedAlertSubscription | null;
}

export interface PersistedAlertNotificationDelivery {
  body: string;
  createdAt: string;
  deepLink: string;
  failedAt: string | null;
  failureReason: string | null;
  id: string;
  matchedAt: string;
  pushTokenId: string | null;
  reportId: string;
  sentAt: string | null;
  status: "pending" | "sent" | "failed" | "skipped";
  subscriptionId: string;
  title: string;
}

export interface PendingAlertNotificationDelivery
  extends PersistedAlertNotificationDelivery {
  pushToken: PersistedAlertPushToken | null;
}

export type AlertRepositoryErrorCode = "alert_subscription_not_found";

export class AlertRepositoryError extends Error {
  code: AlertRepositoryErrorCode;

  constructor(code: AlertRepositoryErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AlertRepositoryError";
  }
}

export interface AlertRepository {
  createLostPetReportCreatedDeliveries(input: {
    reportId: string;
  }): Promise<PersistedAlertNotificationDelivery[]>;
  disablePushToken(input: {
    pushTokenId: string;
  }): Promise<PersistedAlertPushToken | null>;
  get(input: { memberId: string }): Promise<PersistedAlertState>;
  listMemberDeliveryHistory(input: {
    limit?: number;
    memberId: string;
  }): Promise<PersistedAlertNotificationDelivery[]>;
  listPendingDeliveries(input: {
    limit?: number;
  }): Promise<PendingAlertNotificationDelivery[]>;
  markDeliveryFailed(input: {
    deliveryId: string;
    reason: string;
  }): Promise<PersistedAlertNotificationDelivery | null>;
  markDeliverySent(input: {
    deliveryId: string;
  }): Promise<PersistedAlertNotificationDelivery | null>;
  markDeliverySkipped(input: {
    deliveryId: string;
    reason: string;
  }): Promise<PersistedAlertNotificationDelivery | null>;
  pause(input: {
    memberId: string;
    pausedUntil: string;
  }): Promise<PersistedAlertSubscription>;
  recordLocation(input: {
    label?: string;
    latitude: number;
    locationCell?: string;
    longitude: number;
    memberId: string;
  }): Promise<PersistedAlertSubscription>;
  registerPushToken(input: {
    deviceId?: string;
    memberId: string;
    platform: AlertPushTokenPlatform;
    token: string;
  }): Promise<PersistedAlertPushToken>;
  unsubscribe(input: { memberId: string }): Promise<PersistedAlertSubscription>;
  updateMovingAlertsPreference(input: {
    enabled: boolean;
    memberId: string;
    permissionState: AlertMovingAlertsPermissionState;
  }): Promise<PersistedAlertSubscription>;
  upsertSettings(input: {
    categories: AlertSubscriptionCategory[];
    memberId: string;
    radiusMeters: number;
  }): Promise<PersistedAlertSubscription>;
}

export interface DrizzleAlertRepositoryOptions {
  now?: () => Date;
}

const defaultAlertCategories = [
  "lost_pet",
] satisfies AlertSubscriptionCategory[];
const defaultRadiusMeters = 5000;

export function createDrizzleAlertRepository(
  db: Database,
  options: DrizzleAlertRepositoryOptions = {},
): AlertRepository {
  const now = options.now ?? (() => new Date());

  const findSubscriptionByMemberId = async (memberId: string) => {
    return db.query.AlertSubscription.findFirst({
      where: eq(AlertSubscription.memberId, memberId),
    });
  };

  const loadSubscriptionOrThrow = async (memberId: string) => {
    const subscription = await findSubscriptionByMemberId(memberId);

    if (!subscription) {
      throw new AlertRepositoryError(
        "alert_subscription_not_found",
        "No encontramos una suscripción de alertas para este miembro.",
      );
    }

    return subscription;
  };

  const reloadSubscription = async (memberId: string) =>
    toPersistedAlertSubscription(
      await loadSubscriptionOrThrow(memberId),
      now(),
    );

  return {
    createLostPetReportCreatedDeliveries: async ({ reportId }) => {
      const currentTime = now();
      const cutoff = buildAlertReportCreatedCutoff(currentTime);
      const [report] = await db
        .select({
          caretakerId: Report.caretakerId,
          id: Report.id,
          locationLatitude: ReportLocation.exactLatitude,
          locationLongitude: ReportLocation.exactLongitude,
          petName: Report.petName,
          title: Report.title,
          type: Report.type,
        })
        .from(Report)
        .innerJoin(ReportLocation, eq(ReportLocation.reportId, Report.id))
        .where(
          and(
            eq(Report.id, reportId),
            eq(Report.type, "lost_pet"),
            eq(Report.status, "active"),
            isNull(Report.deletedAt),
            isNull(Report.hiddenAt),
            isNull(Report.falseReportedAt),
            gte(Report.createdAt, cutoff),
          ),
        )
        .limit(1);

      if (!report) {
        return [];
      }

      const candidates = await db
        .select({
          id: AlertSubscription.id,
          memberId: AlertSubscription.memberId,
        })
        .from(AlertSubscription)
        .where(
          and(
            ne(AlertSubscription.memberId, report.caretakerId),
            buildActiveAlertSubscriptionCondition(currentTime),
            sql`${AlertSubscription.categories} @> ARRAY['lost_pet']::alert_subscription_category[]`,
            sql`${AlertSubscription.locationPoint} IS NOT NULL`,
            sql`ST_DWithin(${AlertSubscription.locationPoint}::geography, ST_SetSRID(ST_MakePoint(${report.locationLongitude}, ${report.locationLatitude}), 4326)::geography, ${AlertSubscription.radiusMeters})`,
          ),
        );

      const deliveries: PersistedAlertNotificationDelivery[] = [];

      for (const candidate of candidates) {
        const pushToken = await findLatestActivePushToken(
          db,
          candidate.memberId,
        );

        const notification = buildLostPetNotification({
          id: report.id,
          petName: report.petName,
          title: report.title,
          type: "lost_pet",
        });
        const [createdDelivery] = await db
          .insert(AlertNotificationDelivery)
          .values({
            body: notification.body,
            deepLink: notification.deepLink,
            matchedAt: currentTime,
            memberId: candidate.memberId,
            pushTokenId: pushToken?.id ?? null,
            reportId: report.id,
            subscriptionId: candidate.id,
            title: notification.title,
          })
          .onConflictDoNothing()
          .returning();

        if (createdDelivery) {
          deliveries.push(
            toPersistedAlertNotificationDelivery(createdDelivery),
          );
        }
      }

      return deliveries;
    },
    disablePushToken: async ({ pushTokenId }) => {
      const disabledAt = now();
      const [pushToken] = await db
        .update(AlertPushToken)
        .set({
          disabledAt,
          updatedAt: disabledAt,
        })
        .where(
          and(
            eq(AlertPushToken.id, pushTokenId),
            isNull(AlertPushToken.disabledAt),
          ),
        )
        .returning();

      return pushToken ? toPersistedAlertPushToken(pushToken) : null;
    },
    get: async ({ memberId }) => {
      const [subscription, pushTokens] = await Promise.all([
        findSubscriptionByMemberId(memberId),
        findActivePushTokens(db, memberId),
      ]);

      return {
        pushTokens: pushTokens.map(toPersistedAlertPushToken),
        subscription: subscription
          ? toPersistedAlertSubscription(subscription, now())
          : null,
      };
    },
    listMemberDeliveryHistory: async ({ limit, memberId }) => {
      const rows = await db.query.AlertNotificationDelivery.findMany({
        limit: normalizeDeliveryLimit(limit),
        orderBy: [
          desc(AlertNotificationDelivery.createdAt),
          desc(AlertNotificationDelivery.id),
        ],
        where: eq(AlertNotificationDelivery.memberId, memberId),
      });

      return rows.map(toPersistedAlertNotificationDelivery);
    },
    listPendingDeliveries: async ({ limit }) => {
      const rows = await db.query.AlertNotificationDelivery.findMany({
        limit: normalizeDeliveryLimit(limit),
        orderBy: [
          asc(AlertNotificationDelivery.createdAt),
          asc(AlertNotificationDelivery.id),
        ],
        where: eq(AlertNotificationDelivery.status, "pending"),
        with: {
          pushToken: true,
        },
      });

      return Promise.all(
        rows.map((row) => toPendingAlertNotificationDelivery(db, row)),
      );
    },
    markDeliveryFailed: async ({ deliveryId, reason }) => {
      const failedAt = now();
      const [delivery] = await db
        .update(AlertNotificationDelivery)
        .set({
          failedAt,
          failureReason: normalizeDeliveryFailureReason(reason),
          sentAt: null,
          status: "failed",
          updatedAt: failedAt,
        })
        .where(
          and(
            eq(AlertNotificationDelivery.id, deliveryId),
            eq(AlertNotificationDelivery.status, "pending"),
          ),
        )
        .returning();

      return delivery ? toPersistedAlertNotificationDelivery(delivery) : null;
    },
    markDeliverySent: async ({ deliveryId }) => {
      const sentAt = now();
      const [delivery] = await db
        .update(AlertNotificationDelivery)
        .set({
          failedAt: null,
          failureReason: null,
          sentAt,
          status: "sent",
          updatedAt: sentAt,
        })
        .where(
          and(
            eq(AlertNotificationDelivery.id, deliveryId),
            eq(AlertNotificationDelivery.status, "pending"),
          ),
        )
        .returning();

      return delivery ? toPersistedAlertNotificationDelivery(delivery) : null;
    },
    markDeliverySkipped: async ({ deliveryId, reason }) => {
      const skippedAt = now();
      const [delivery] = await db
        .update(AlertNotificationDelivery)
        .set({
          failedAt: null,
          failureReason: normalizeDeliveryFailureReason(reason),
          sentAt: null,
          status: "skipped",
          updatedAt: skippedAt,
        })
        .where(
          and(
            eq(AlertNotificationDelivery.id, deliveryId),
            eq(AlertNotificationDelivery.status, "pending"),
          ),
        )
        .returning();

      return delivery ? toPersistedAlertNotificationDelivery(delivery) : null;
    },
    pause: async ({ memberId, pausedUntil }) => {
      await loadSubscriptionOrThrow(memberId);

      const pausedUntilDate = new Date(pausedUntil);
      await db
        .update(AlertSubscription)
        .set({
          pausedUntil: pausedUntilDate,
          unsubscribedAt: null,
          updatedAt: now(),
        })
        .where(eq(AlertSubscription.memberId, memberId));

      return reloadSubscription(memberId);
    },
    recordLocation: async ({
      label,
      latitude,
      locationCell,
      longitude,
      memberId,
    }) => {
      const recordedAt = now();
      await db
        .insert(AlertSubscription)
        .values({
          categories: defaultAlertCategories,
          lastLocationRecordedAt: recordedAt,
          latitude,
          locationCell: locationCell ?? null,
          locationLabel: label ?? null,
          locationPoint: {
            x: longitude,
            y: latitude,
          },
          longitude,
          memberId,
          radiusMeters: defaultRadiusMeters,
          updatedAt: recordedAt,
        })
        .onConflictDoUpdate({
          target: AlertSubscription.memberId,
          set: {
            lastLocationRecordedAt: recordedAt,
            latitude,
            locationCell: locationCell ?? null,
            locationLabel: label ?? null,
            locationPoint: {
              x: longitude,
              y: latitude,
            },
            longitude,
            updatedAt: recordedAt,
          },
        });

      return reloadSubscription(memberId);
    },
    registerPushToken: async ({ deviceId, memberId, platform, token }) => {
      const registeredAt = now();
      const [pushToken] = await db
        .insert(AlertPushToken)
        .values({
          deviceId: deviceId ?? null,
          disabledAt: null,
          lastSeenAt: registeredAt,
          memberId,
          platform,
          registeredAt,
          token,
          updatedAt: registeredAt,
        })
        .onConflictDoUpdate({
          target: AlertPushToken.token,
          set: {
            deviceId: deviceId ?? null,
            disabledAt: null,
            lastSeenAt: registeredAt,
            memberId,
            platform,
            registeredAt,
            updatedAt: registeredAt,
          },
        })
        .returning();

      if (!pushToken) {
        throw new Error("Alert push token could not be persisted.");
      }

      return toPersistedAlertPushToken(pushToken);
    },
    unsubscribe: async ({ memberId }) => {
      await loadSubscriptionOrThrow(memberId);

      const unsubscribedAt = now();
      await db
        .update(AlertSubscription)
        .set({
          pausedUntil: null,
          unsubscribedAt,
          updatedAt: unsubscribedAt,
        })
        .where(eq(AlertSubscription.memberId, memberId));

      return reloadSubscription(memberId);
    },
    updateMovingAlertsPreference: async ({
      enabled,
      memberId,
      permissionState,
    }) => {
      await loadSubscriptionOrThrow(memberId);

      const updatedAt = now();
      await db
        .update(AlertSubscription)
        .set({
          movingAlertsEnabled: enabled,
          movingAlertsPermissionState: permissionState,
          updatedAt,
        })
        .where(eq(AlertSubscription.memberId, memberId));

      return reloadSubscription(memberId);
    },
    upsertSettings: async ({ categories, memberId, radiusMeters }) => {
      const updatedAt = now();
      await db
        .insert(AlertSubscription)
        .values({
          categories,
          memberId,
          pausedUntil: null,
          radiusMeters,
          unsubscribedAt: null,
          updatedAt,
        })
        .onConflictDoUpdate({
          target: AlertSubscription.memberId,
          set: {
            categories,
            pausedUntil: null,
            radiusMeters,
            unsubscribedAt: null,
            updatedAt,
          },
        });

      return reloadSubscription(memberId);
    },
  };
}

export function buildAlertReportCreatedCutoff(now: Date) {
  return new Date(now.getTime() - 24 * 60 * 60 * 1000);
}

export function buildActiveAlertSubscriptionCondition(now: Date) {
  return and(
    isNull(AlertSubscription.unsubscribedAt),
    or(
      isNull(AlertSubscription.pausedUntil),
      lte(AlertSubscription.pausedUntil, now),
    ),
  );
}

function findActivePushTokens(db: Database, memberId: string) {
  return db.query.AlertPushToken.findMany({
    orderBy: [desc(AlertPushToken.lastSeenAt), desc(AlertPushToken.id)],
    where: and(
      eq(AlertPushToken.memberId, memberId),
      isNull(AlertPushToken.disabledAt),
    ),
  });
}

async function findLatestActivePushToken(db: Database, memberId: string) {
  const [token] = await db
    .select()
    .from(AlertPushToken)
    .where(
      and(
        eq(AlertPushToken.memberId, memberId),
        isNull(AlertPushToken.disabledAt),
      ),
    )
    .orderBy(desc(AlertPushToken.lastSeenAt), desc(AlertPushToken.id))
    .limit(1);

  return token ?? null;
}

function buildLostPetNotification(report: {
  id: string;
  petName: string | null;
  title: string;
  type: "lost_pet";
}) {
  const name = report.petName ?? report.title;

  return {
    body: `${name} fue reportada cerca de tu zona.`,
    deepLink: buildReportSubjectHref(report),
    title: "Mascota perdida cerca de ti",
  };
}

function toPersistedAlertSubscription(
  row: typeof AlertSubscription.$inferSelect,
  currentTime: Date,
): PersistedAlertSubscription {
  return {
    categories: [...row.categories],
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    location:
      row.latitude !== null &&
      row.longitude !== null &&
      row.lastLocationRecordedAt !== null
        ? {
            label: row.locationLabel,
            latitude: row.latitude,
            locationCell: row.locationCell,
            longitude: row.longitude,
            recordedAt: row.lastLocationRecordedAt.toISOString(),
          }
        : null,
    movingAlerts: {
      enabled: row.movingAlertsEnabled,
      permissionState: row.movingAlertsPermissionState,
      status: getMovingAlertsStatus({
        enabled: row.movingAlertsEnabled,
        permissionState: row.movingAlertsPermissionState,
      }),
    },
    pausedUntil: row.pausedUntil?.toISOString() ?? null,
    radiusMeters: row.radiusMeters,
    status: getAlertSubscriptionStatus(row, currentTime),
    unsubscribedAt: row.unsubscribedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toPersistedAlertPushToken(
  row: typeof AlertPushToken.$inferSelect,
): PersistedAlertPushToken {
  return {
    deviceId: row.deviceId,
    disabledAt: row.disabledAt?.toISOString() ?? null,
    id: row.id,
    lastSeenAt: row.lastSeenAt.toISOString(),
    platform: row.platform,
    registeredAt: row.registeredAt.toISOString(),
    token: row.token,
  };
}

function toPersistedAlertNotificationDelivery(
  row: typeof AlertNotificationDelivery.$inferSelect,
): PersistedAlertNotificationDelivery {
  return {
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    deepLink: row.deepLink,
    failedAt: row.failedAt?.toISOString() ?? null,
    failureReason: row.failureReason,
    id: row.id,
    matchedAt: row.matchedAt.toISOString(),
    pushTokenId: row.pushTokenId,
    reportId: row.reportId,
    sentAt: row.sentAt?.toISOString() ?? null,
    status: row.status,
    subscriptionId: row.subscriptionId,
    title: row.title,
  };
}

async function toPendingAlertNotificationDelivery(
  db: Database,
  row: typeof AlertNotificationDelivery.$inferSelect & {
    pushToken: typeof AlertPushToken.$inferSelect | null;
  },
): Promise<PendingAlertNotificationDelivery> {
  const activePushToken =
    row.pushToken && !row.pushToken.disabledAt
      ? row.pushToken
      : await findLatestActivePushToken(db, row.memberId);

  return {
    ...toPersistedAlertNotificationDelivery(row),
    pushToken: activePushToken
      ? toPersistedAlertPushToken(activePushToken)
      : null,
  };
}

function normalizeDeliveryLimit(limit: number | undefined) {
  if (limit === undefined) {
    return 100;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 500);
}

function normalizeDeliveryFailureReason(reason: string) {
  const trimmed = reason.trim();

  if (trimmed.length === 0) {
    return "No se pudo procesar la entrega de alerta.";
  }

  return trimmed.slice(0, 1000);
}

function getAlertSubscriptionStatus(
  row: typeof AlertSubscription.$inferSelect,
  currentTime: Date,
): AlertSubscriptionStatus {
  if (row.unsubscribedAt) {
    return "unsubscribed";
  }

  if (row.pausedUntil && row.pausedUntil > currentTime) {
    return "paused";
  }

  if (
    !row.lastLocationRecordedAt ||
    row.latitude === null ||
    row.longitude === null
  ) {
    return "needs_location";
  }

  return "active";
}

function getMovingAlertsStatus({
  enabled,
  permissionState,
}: {
  enabled: boolean;
  permissionState: AlertMovingAlertsPermissionState;
}): PersistedAlertSubscription["movingAlerts"]["status"] {
  if (!enabled) {
    return "off";
  }

  return permissionState === "background-granted"
    ? "ready"
    : "needs-background-permission";
}
