import type { Database } from "@acme/db/client";
import type { AdminAuditEventMetadataJson } from "@acme/db/schema";
import { and, asc, desc, eq, or, sql } from "@acme/db";
import { AdminAuditEvent } from "@acme/db/schema";

export interface AdminAuditActor {
  email: string | null;
  id: string | null;
  label: string;
}

export interface PersistedAdminAuditEvent {
  action: string;
  actor: AdminAuditActor;
  createdAt: Date;
  id: string;
  metadata: AdminAuditEventMetadataJson | null;
  source: string | null;
  summary: string;
  target: {
    id: string;
    label: string;
    type: string;
  };
}

export interface AdminAuditFilterOptions {
  actions: string[];
  actors: AdminAuditActor[];
  targetTypes: string[];
}

export interface AdminAuditListInput {
  actor?: string;
  action?: string;
  actorId?: string;
  limit?: number;
  targetType?: string;
}

export interface AdminAuditListResult {
  availableFilters: AdminAuditFilterOptions;
  events: PersistedAdminAuditEvent[];
  total: number;
}

export interface RecordAdminAuditEventInput {
  action: string;
  actor: {
    email?: string | null;
    id: string;
  };
  createdAt?: Date;
  metadata?: AdminAuditEventMetadataJson | null;
  source?: string | null;
  summary: string;
  target: {
    id: string;
    label: string;
    type: string;
  };
}

export interface AdminAuditRepository {
  list(input?: AdminAuditListInput): Promise<AdminAuditListResult>;
  record(input: RecordAdminAuditEventInput): Promise<PersistedAdminAuditEvent>;
}

export function createDrizzleAdminAuditRepository(
  db: Database,
): AdminAuditRepository {
  return {
    list: async (input = {}) => {
      const actor = input.actorId ?? input.actor;
      const filters = [
        actor
          ? or(
              eq(AdminAuditEvent.actorId, actor),
              eq(AdminAuditEvent.actorEmail, actor),
            )
          : undefined,
        input.action ? eq(AdminAuditEvent.action, input.action) : undefined,
        input.targetType
          ? eq(AdminAuditEvent.targetType, input.targetType)
          : undefined,
      ].filter((filter) => filter !== undefined);
      const whereClause = filters.length > 0 ? and(...filters) : sql`true`;
      const [countRow] = await db
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(AdminAuditEvent)
        .where(whereClause);
      const rows = await db
        .select()
        .from(AdminAuditEvent)
        .where(whereClause)
        .orderBy(desc(AdminAuditEvent.createdAt))
        .limit(clampAuditLimit(input.limit));
      const optionRows = await db
        .select({
          action: AdminAuditEvent.action,
          actorEmail: AdminAuditEvent.actorEmail,
          actorId: AdminAuditEvent.actorId,
          targetType: AdminAuditEvent.targetType,
        })
        .from(AdminAuditEvent)
        .orderBy(asc(AdminAuditEvent.action), asc(AdminAuditEvent.targetType))
        .limit(500);

      return {
        availableFilters: buildFilterOptions(optionRows),
        events: rows.map(toPersistedAdminAuditEvent),
        total: Number(countRow?.total ?? rows.length),
      };
    },
    record: async (input) => {
      const [row] = await db
        .insert(AdminAuditEvent)
        .values({
          action: input.action,
          actorEmail: input.actor.email ?? null,
          actorId: input.actor.id,
          createdAt: input.createdAt,
          metadata: cleanMetadata(input.metadata),
          source: input.source ?? null,
          summary: input.summary,
          targetId: input.target.id,
          targetLabel: input.target.label,
          targetType: input.target.type,
        })
        .returning();

      if (!row) {
        throw new Error("Admin audit event could not be persisted.");
      }

      return toPersistedAdminAuditEvent(row);
    },
  };
}

export function createInMemoryAdminAuditRepository({
  events = [],
  now = () => new Date("2026-06-26T16:00:00.000Z"),
}: {
  events?: readonly PersistedAdminAuditEvent[];
  now?: () => Date;
} = {}): AdminAuditRepository {
  const rows = events.map((event) => ({ ...event }));
  let nextId = rows.length + 1;

  return {
    list: (input = {}) => {
      const actor = input.actorId ?? input.actor;
      const filteredRows = rows
        .filter((event) =>
          actor ? event.actor.id === actor || event.actor.email === actor : true,
        )
        .filter((event) =>
          input.action ? event.action === input.action : true,
        )
        .filter((event) =>
          input.targetType ? event.target.type === input.targetType : true,
        )
        .sort(
          (left, right) =>
            right.createdAt.getTime() - left.createdAt.getTime(),
        );
      const limitedRows = filteredRows.slice(0, clampAuditLimit(input.limit));

      return Promise.resolve({
        availableFilters: buildFilterOptions(
          rows.map((event) => ({
            action: event.action,
            actorEmail: event.actor.email,
            actorId: event.actor.id,
            targetType: event.target.type,
          })),
        ),
        events: limitedRows.map((event) => ({ ...event })),
        total: filteredRows.length,
      });
    },
    record: (input) => {
      const event = {
        action: input.action,
        actor: toAuditActor(input.actor.id, input.actor.email ?? null),
        createdAt: input.createdAt ?? now(),
        id: `admin-audit-event-${nextId++}`,
        metadata: cleanMetadata(input.metadata),
        source: input.source ?? null,
        summary: input.summary,
        target: { ...input.target },
      } satisfies PersistedAdminAuditEvent;

      rows.push(event);

      return Promise.resolve({ ...event });
    },
  };
}

function toPersistedAdminAuditEvent(
  row: typeof AdminAuditEvent.$inferSelect,
): PersistedAdminAuditEvent {
  return {
    action: row.action,
    actor: toAuditActor(row.actorId, row.actorEmail),
    createdAt: row.createdAt,
    id: row.id,
    metadata: row.metadata ?? null,
    source: row.source,
    summary: row.summary,
    target: {
      id: row.targetId,
      label: row.targetLabel,
      type: row.targetType,
    },
  };
}

function buildFilterOptions(
  rows: readonly {
    action: string;
    actorEmail: string | null;
    actorId: string | null;
    targetType: string;
  }[],
): AdminAuditFilterOptions {
  const actions = new Set<string>();
  const actors = new Map<string, AdminAuditActor>();
  const targetTypes = new Set<string>();

  for (const row of rows) {
    actions.add(row.action);
    targetTypes.add(row.targetType);

    if (row.actorId) {
      actors.set(row.actorId, toAuditActor(row.actorId, row.actorEmail));
    }
  }

  return {
    actions: [...actions].sort((left, right) => left.localeCompare(right)),
    actors: [...actors.values()].sort((left, right) =>
      left.label.localeCompare(right.label),
    ),
    targetTypes: [...targetTypes].sort((left, right) =>
      left.localeCompare(right),
    ),
  };
}

function toAuditActor(id: string | null, email: string | null): AdminAuditActor {
  return {
    email,
    id,
    label: email ?? id ?? "Admin no disponible",
  };
}

function clampAuditLimit(limit = 50) {
  return Math.min(Math.max(limit, 1), 100);
}

function cleanMetadata(
  metadata: AdminAuditEventMetadataJson | null | undefined,
): AdminAuditEventMetadataJson | null {
  if (!metadata) {
    return null;
  }

  const cleaned = Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );

  return Object.keys(cleaned).length > 0 ? cleaned : null;
}
