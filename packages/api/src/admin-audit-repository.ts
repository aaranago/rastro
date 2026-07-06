import type { Database } from "@acme/db/client";
import type { AdminAuditEventMetadataJson } from "@acme/db/schema";
import { and, asc, desc, eq, or, sql } from "@acme/db";
import { AdminAuditEvent } from "@acme/db/schema";

import type {
  AdminListInput,
  AdminListResult,
  AdminListSortOption,
  AdminListSortSpec,
  NormalizedAdminListInput,
} from "./admin-list-contract";
import {
  buildAdminListResult,
  compareAdminListItems,
  normalizeAdminListInput,
} from "./admin-list-contract";

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

export type AdminAuditSortBy =
  | "action"
  | "actor"
  | "createdAt"
  | "targetLabel"
  | "targetType";

export interface AdminAuditFilters {
  action?: string;
  actor?: string;
  actorId?: string;
  targetType?: string;
}

export interface AdminAuditListInput
  extends AdminListInput<AdminAuditFilters, AdminAuditSortBy> {
  action?: string;
  actor?: string;
  actorId?: string;
  limit?: number;
  targetType?: string;
}

export interface AdminAuditListResult
  extends AdminListResult<
    PersistedAdminAuditEvent,
    AdminAuditFilterOptions,
    AdminAuditSortBy
  > {
  events: PersistedAdminAuditEvent[];
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
      const normalized = normalizeAdminAuditListInput(input);
      const actor = normalized.filters.actorId ?? normalized.filters.actor;
      const searchPattern = normalized.search
        ? `%${escapeLikePattern(normalized.search)}%`
        : null;
      const filters = [
        actor
          ? or(
              eq(AdminAuditEvent.actorId, actor),
              eq(AdminAuditEvent.actorEmail, actor),
            )
          : undefined,
        normalized.filters.action
          ? eq(AdminAuditEvent.action, normalized.filters.action)
          : undefined,
        normalized.filters.targetType
          ? eq(AdminAuditEvent.targetType, normalized.filters.targetType)
          : undefined,
        searchPattern
          ? or(
              sql`${AdminAuditEvent.action} ILIKE ${searchPattern} ESCAPE '\\'`,
              sql`${AdminAuditEvent.actorEmail} ILIKE ${searchPattern} ESCAPE '\\'`,
              sql`${AdminAuditEvent.summary} ILIKE ${searchPattern} ESCAPE '\\'`,
              sql`${AdminAuditEvent.targetId} ILIKE ${searchPattern} ESCAPE '\\'`,
              sql`${AdminAuditEvent.targetLabel} ILIKE ${searchPattern} ESCAPE '\\'`,
              sql`${AdminAuditEvent.targetType} ILIKE ${searchPattern} ESCAPE '\\'`,
            )
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
        .orderBy(...buildAuditOrderBy(normalized))
        .limit(normalized.pageSize)
        .offset(normalized.offset);
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
      const events = rows.map(toPersistedAdminAuditEvent);
      const list = buildAdminListResult({
        availableFilters: buildFilterOptions(optionRows),
        availableSorts: adminAuditAvailableSorts,
        items: events,
        page: normalized.page,
        pageSize: normalized.pageSize,
        total: Number(countRow?.total ?? rows.length),
      });

      return {
        ...list,
        events,
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
      const normalized = normalizeAdminAuditListInput(input);
      const actor = normalized.filters.actorId ?? normalized.filters.actor;
      const normalizedSearch = normalized.search?.toLowerCase() ?? null;
      const filteredRows = rows
        .filter((event) =>
          actor
            ? event.actor.id === actor || event.actor.email === actor
            : true,
        )
        .filter((event) =>
          normalized.filters.action
            ? event.action === normalized.filters.action
            : true,
        )
        .filter((event) =>
          normalized.filters.targetType
            ? event.target.type === normalized.filters.targetType
            : true,
        )
        .filter((event) =>
          normalizedSearch
            ? auditEventMatchesSearch(event, normalizedSearch)
            : true,
        )
        .sort((left, right) =>
          compareAdminListItems(
            left,
            right,
            buildAuditSortSpecs(normalized.sortBy, normalized.sortDirection),
          ),
        );
      const limitedRows = filteredRows.slice(
        normalized.offset,
        normalized.offset + normalized.pageSize,
      );
      const events = limitedRows.map((event) => ({ ...event }));
      const list = buildAdminListResult({
        availableFilters: buildFilterOptions(
          rows.map((event) => ({
            action: event.action,
            actorEmail: event.actor.email,
            actorId: event.actor.id,
            targetType: event.target.type,
          })),
        ),
        availableSorts: adminAuditAvailableSorts,
        items: events,
        page: normalized.page,
        pageSize: normalized.pageSize,
        total: filteredRows.length,
      });

      return Promise.resolve({
        ...list,
        events,
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

const adminAuditAvailableSorts = [
  {
    defaultDirection: "desc",
    label: "Fecha",
    value: "createdAt",
  },
  {
    defaultDirection: "asc",
    label: "Acción",
    value: "action",
  },
  {
    defaultDirection: "asc",
    label: "Admin",
    value: "actor",
  },
  {
    defaultDirection: "asc",
    label: "Tipo de objetivo",
    value: "targetType",
  },
  {
    defaultDirection: "asc",
    label: "Objetivo",
    value: "targetLabel",
  },
] satisfies readonly AdminListSortOption<AdminAuditSortBy>[];

function normalizeAdminAuditListInput(
  input: AdminAuditListInput = {},
): NormalizedAdminListInput<AdminAuditFilters, AdminAuditSortBy> {
  return normalizeAdminListInput<AdminAuditFilters, AdminAuditSortBy>(
    {
      ...input,
      pageSize: input.pageSize ?? input.limit,
      filters: {
        ...input.filters,
        action: input.filters?.action ?? input.action,
        actor: input.filters?.actor ?? input.actor,
        actorId: input.filters?.actorId ?? input.actorId,
        targetType: input.filters?.targetType ?? input.targetType,
      },
    },
    {
      defaultFilters: {},
      defaultSortBy: "createdAt",
      defaultSortDirection: "desc",
    } satisfies {
      defaultFilters: AdminAuditFilters;
      defaultSortBy: AdminAuditSortBy;
      defaultSortDirection: "desc";
    },
  );
}

function buildAuditOrderBy(
  input: NormalizedAdminListInput<AdminAuditFilters, AdminAuditSortBy>,
) {
  const order = input.sortDirection === "asc" ? asc : desc;

  switch (input.sortBy) {
    case "action":
      return [
        order(AdminAuditEvent.action),
        desc(AdminAuditEvent.createdAt),
        asc(AdminAuditEvent.id),
      ];
    case "actor":
      return [
        order(AdminAuditEvent.actorEmail),
        desc(AdminAuditEvent.createdAt),
        asc(AdminAuditEvent.id),
      ];
    case "targetLabel":
      return [
        order(AdminAuditEvent.targetLabel),
        desc(AdminAuditEvent.createdAt),
        asc(AdminAuditEvent.id),
      ];
    case "targetType":
      return [
        order(AdminAuditEvent.targetType),
        desc(AdminAuditEvent.createdAt),
        asc(AdminAuditEvent.id),
      ];
    case "createdAt":
      return [order(AdminAuditEvent.createdAt), asc(AdminAuditEvent.id)];
  }
}

function buildAuditSortSpecs(
  sortBy: AdminAuditSortBy,
  sortDirection: "asc" | "desc",
): readonly AdminListSortSpec<PersistedAdminAuditEvent>[] {
  const secondary = [
    {
      direction: "asc",
      getValue: (event: PersistedAdminAuditEvent) => event.id,
    },
  ] satisfies readonly AdminListSortSpec<PersistedAdminAuditEvent>[];

  switch (sortBy) {
    case "action":
      return [
        { direction: sortDirection, getValue: (event) => event.action },
        { direction: "desc", getValue: (event) => event.createdAt },
        ...secondary,
      ];
    case "actor":
      return [
        { direction: sortDirection, getValue: (event) => event.actor.label },
        { direction: "desc", getValue: (event) => event.createdAt },
        ...secondary,
      ];
    case "targetLabel":
      return [
        { direction: sortDirection, getValue: (event) => event.target.label },
        { direction: "desc", getValue: (event) => event.createdAt },
        ...secondary,
      ];
    case "targetType":
      return [
        { direction: sortDirection, getValue: (event) => event.target.type },
        { direction: "desc", getValue: (event) => event.createdAt },
        ...secondary,
      ];
    case "createdAt":
      return [
        { direction: sortDirection, getValue: (event) => event.createdAt },
        ...secondary,
      ];
  }
}

function auditEventMatchesSearch(
  event: PersistedAdminAuditEvent,
  normalizedSearch: string,
) {
  return [
    event.action,
    event.actor.email,
    event.actor.id,
    event.actor.label,
    event.summary,
    event.target.id,
    event.target.label,
    event.target.type,
  ].some((value) => value?.toLowerCase().includes(normalizedSearch));
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

function toAuditActor(
  id: string | null,
  email: string | null,
): AdminAuditActor {
  return {
    email,
    id,
    label: email ?? id ?? "Admin no disponible",
  };
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

function escapeLikePattern(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}
