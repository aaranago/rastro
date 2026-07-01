import type { Database } from "@acme/db/client";
import { and, desc, eq, isNull } from "@acme/db";
import { AlertPushToken } from "@acme/db/schema";

import type { PersistedAlertPushToken } from "./alert-repository";

export async function findLatestActiveAlertPushToken(
  db: Database,
  memberId: string,
) {
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

export function toPersistedAlertPushToken(
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
