import type { Database } from "@acme/db/client";
import type {
  AlertPushTokenPlatform,
  AlertSubscriptionCategory,
} from "@acme/validators";
import { and, desc, eq, gte, isNull, lte, ne, or, sql } from "@acme/db";
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
  id: string;
  matchedAt: string;
  pushTokenId: string | null;
  reportId: string;
  status: "pending" | "sent" | "failed" | "skipped";
  subscriptionId: string;
  title: string;
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
  get(input: { memberId: string }): Promise<PersistedAlertState>;
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
        "No encontramos una suscripcion de alertas para este miembro.",
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

        if (!pushToken) {
          continue;
        }

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
            pushTokenId: pushToken.id,
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
    id: row.id,
    matchedAt: row.matchedAt.toISOString(),
    pushTokenId: row.pushTokenId,
    reportId: row.reportId,
    status: row.status,
    subscriptionId: row.subscriptionId,
    title: row.title,
  };
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
