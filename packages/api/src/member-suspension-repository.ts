import type { Database } from "@acme/db/client";
import type { ReportLocation } from "@acme/db/schema";
import type { ReportStatus, ReportType } from "@acme/validators";
import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from "@acme/db";
import {
  MemberSuspension,
  Report,
  ReportModerationAction,
  user,
} from "@acme/db/schema";

import type {
  AdminListFilterOption,
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

export type MemberSuspensionState = "active" | "revoked";

export interface PersistedMemberSuspension {
  id: string;
  memberId: string;
  reason: string;
  revokedAt: Date | null;
  revokedByAdminId: string | null;
  revokedReason: string | null;
  status: MemberSuspensionState;
  suspendedAt: Date;
  suspendedByAdminId: string | null;
  updatedAt: Date;
}

export interface AdminMemberSearchResult {
  currentSuspension: PersistedMemberSuspension | null;
  email: string;
  emailVerified: boolean;
  id: string;
  name: string;
}

export interface AdminMemberListItem extends AdminMemberSearchResult {
  createdAt: Date;
  updatedAt: Date;
}

export type AdminMemberSortBy =
  | "createdAt"
  | "email"
  | "emailVerified"
  | "name"
  | "suspensionStatus";

export type AdminMemberSuspensionFilter =
  | "any"
  | "not_suspended"
  | "suspended";

export type AdminMemberEmailVerificationFilter =
  | "any"
  | "unverified"
  | "verified";

export interface AdminMemberListFilters {
  createdFrom?: Date;
  createdTo?: Date;
  emailVerification?: AdminMemberEmailVerificationFilter;
  suspension?: AdminMemberSuspensionFilter;
}

export type AdminMemberAvailableFilters = readonly AdminListFilterOption<
  Extract<keyof AdminMemberListFilters, string>
>[];

export type AdminMemberListInput = AdminListInput<
  AdminMemberListFilters,
  AdminMemberSortBy
>;

export type AdminMemberListResult = AdminListResult<
  AdminMemberListItem,
  AdminMemberAvailableFilters,
  AdminMemberSortBy
>;

export interface AdminMemberReportSummary {
  createdAt: Date;
  hiddenAt: Date | null;
  id: string;
  locationLabel: string | null;
  status: ReportStatus;
  title: string;
  type: ReportType;
}

export interface AdminMemberModerationReportSummary {
  action: "hide" | "mark_false" | "restore" | "unmark_false";
  adminId: string | null;
  createdAt: Date;
  id: string;
  note: string | null;
  reason: string;
  reportId: string;
  reportTitle: string;
  reportType: ReportType;
}

export interface AdminMemberProfile {
  currentSuspension: PersistedMemberSuspension | null;
  member: {
    createdAt: Date;
    email: string;
    emailVerified: boolean;
    id: string;
    name: string;
    updatedAt: Date;
  };
  moderationReports: AdminMemberModerationReportSummary[];
  recentReports: AdminMemberReportSummary[];
  summary: {
    adoptionListingCount: number;
    moderationReportCount: number;
    reportCount: number;
  };
  suspensionHistory: PersistedMemberSuspension[];
}

export interface MemberSuspensionRepository {
  findActiveByMemberId(
    memberId: string,
  ): Promise<PersistedMemberSuspension | null>;
  findActiveByMemberIds(
    memberIds: readonly string[],
  ): Promise<Map<string, PersistedMemberSuspension>>;
  getMemberProfile(memberId: string): Promise<AdminMemberProfile | null>;
  listMembers(input?: AdminMemberListInput): Promise<AdminMemberListResult>;
  searchMembers(input: {
    limit?: number;
    query: string;
  }): Promise<AdminMemberSearchResult[]>;
  suspendMember(input: {
    adminId: string;
    memberId: string;
    reason: string;
  }): Promise<PersistedMemberSuspension | null>;
  unsuspendMember(input: {
    adminId: string;
    memberId: string;
    reason: string;
  }): Promise<PersistedMemberSuspension | null>;
}

type MemberSuspensionRow = typeof MemberSuspension.$inferSelect;
interface MemberListRow {
  createdAt: Date;
  email: string;
  emailVerified: boolean;
  id: string;
  name: string;
  suspensionCreatedAt: Date | null;
  suspensionId: string | null;
  suspensionMemberId: string | null;
  suspensionReason: string | null;
  suspensionRevokedAt: Date | null;
  suspensionRevokedByAdminId: string | null;
  suspensionRevokedReason: string | null;
  suspensionStatus: MemberSuspensionState | null;
  suspensionSuspendedAt: Date | null;
  suspensionSuspendedByAdminId: string | null;
  suspensionUpdatedAt: Date | null;
  updatedAt: Date;
}
type MemberReportRow = typeof Report.$inferSelect & {
  location: typeof ReportLocation.$inferSelect | null;
};

export interface ActiveMemberSuspensionSummary {
  reason: string;
  suspendedAt: Date;
  suspendedByAdminId: string | null;
}

export async function listActiveMemberSuspensionSummaries(
  db: Database,
  memberIds: readonly string[],
): Promise<Map<string, ActiveMemberSuspensionSummary>> {
  if (memberIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      memberId: MemberSuspension.memberId,
      reason: MemberSuspension.reason,
      suspendedAt: MemberSuspension.suspendedAt,
      suspendedByAdminId: MemberSuspension.suspendedByAdminId,
    })
    .from(MemberSuspension)
    .where(
      and(
        inArray(MemberSuspension.memberId, [...new Set(memberIds)]),
        eq(MemberSuspension.status, "active"),
        isNull(MemberSuspension.revokedAt),
      ),
    );

  return new Map(
    rows.map((row) => [
      row.memberId,
      {
        reason: row.reason,
        suspendedAt: row.suspendedAt,
        suspendedByAdminId: row.suspendedByAdminId,
      },
    ]),
  );
}

export function createDrizzleMemberSuspensionRepository(
  db: Database,
  options: { now?: () => Date } = {},
): MemberSuspensionRepository {
  const now = options.now ?? (() => new Date());

  const findActiveByMemberId = async (memberId: string) => {
    const row = await db.query.MemberSuspension.findFirst({
      orderBy: [desc(MemberSuspension.suspendedAt)],
      where: and(
        eq(MemberSuspension.memberId, memberId),
        eq(MemberSuspension.status, "active"),
        isNull(MemberSuspension.revokedAt),
      ),
    });

    return row ? toPersistedMemberSuspension(row) : null;
  };

  const findActiveByMemberIds = async (memberIds: readonly string[]) => {
    if (memberIds.length === 0) {
      return new Map<string, PersistedMemberSuspension>();
    }

    const rows = await db
      .select()
      .from(MemberSuspension)
      .where(
        and(
          inArray(MemberSuspension.memberId, [...new Set(memberIds)]),
          eq(MemberSuspension.status, "active"),
          isNull(MemberSuspension.revokedAt),
        ),
      );

    return new Map(
      rows.map((row) => [
        row.memberId,
        toPersistedMemberSuspension(row as MemberSuspensionRow),
      ]),
    );
  };

  const listSuspensionHistory = async (memberId: string) => {
    const rows = await db.query.MemberSuspension.findMany({
      orderBy: [desc(MemberSuspension.suspendedAt)],
      where: eq(MemberSuspension.memberId, memberId),
    });

    return rows.map(toPersistedMemberSuspension);
  };

  return {
    findActiveByMemberId,
    findActiveByMemberIds,
    getMemberProfile: async (memberId) => {
      const member = await db.query.user.findFirst({
        where: eq(user.id, memberId),
      });

      if (!member) {
        return null;
      }

      const [
        currentSuspension,
        recentReports,
        moderationReports,
        suspensionHistory,
        summary,
      ] = await Promise.all([
        findActiveByMemberId(memberId),
        listRecentMemberReports(db, memberId),
        listMemberModerationReports(db, memberId),
        listSuspensionHistory(memberId),
        getMemberSummary(db, memberId),
      ]);

      return {
        currentSuspension,
        member: {
          createdAt: member.createdAt,
          email: member.email,
          emailVerified: member.emailVerified,
          id: member.id,
          name: member.name,
          updatedAt: member.updatedAt,
        },
        moderationReports,
        recentReports,
        summary,
        suspensionHistory,
      };
    },
    listMembers: async (input = {}) => {
      const normalized = normalizeAdminListInput(input, {
        defaultFilters: defaultAdminMemberListFilters(),
        defaultSortBy: "createdAt",
        defaultSortDirection: "desc",
      });
      const activeSuspensionJoin = buildActiveSuspensionJoin();
      const whereClause = buildMemberListWhereClause(normalized);
      const [countRow] = await db
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(user)
        .leftJoin(MemberSuspension, activeSuspensionJoin)
        .where(whereClause);
      const rows = await db
        .select({
          createdAt: user.createdAt,
          email: user.email,
          emailVerified: user.emailVerified,
          id: user.id,
          name: user.name,
          suspensionCreatedAt: MemberSuspension.createdAt,
          suspensionId: MemberSuspension.id,
          suspensionMemberId: MemberSuspension.memberId,
          suspensionReason: MemberSuspension.reason,
          suspensionRevokedAt: MemberSuspension.revokedAt,
          suspensionRevokedByAdminId: MemberSuspension.revokedByAdminId,
          suspensionRevokedReason: MemberSuspension.revokedReason,
          suspensionStatus: MemberSuspension.status,
          suspensionSuspendedAt: MemberSuspension.suspendedAt,
          suspensionSuspendedByAdminId: MemberSuspension.suspendedByAdminId,
          suspensionUpdatedAt: MemberSuspension.updatedAt,
          updatedAt: user.updatedAt,
        })
        .from(user)
        .leftJoin(MemberSuspension, activeSuspensionJoin)
        .where(whereClause)
        .orderBy(...buildMemberOrderBy(normalized))
        .limit(normalized.pageSize)
        .offset(normalized.offset);

      return buildAdminListResult({
        availableFilters: adminMemberAvailableFilters,
        availableSorts: adminMemberAvailableSorts,
        items: rows.map(toAdminMemberListItem),
        page: normalized.page,
        pageSize: normalized.pageSize,
        total: Number(countRow?.total ?? rows.length),
      });
    },
    searchMembers: async ({ limit = 20, query }) => {
      const trimmedQuery = query.trim();

      if (!trimmedQuery) {
        return [];
      }

      const searchPattern = `%${escapeLikePattern(trimmedQuery)}%`;
      const rows = await db.query.user.findMany({
        limit: Math.min(Math.max(limit, 1), 50),
        orderBy: [asc(user.email)],
        where: or(
          eq(user.id, trimmedQuery),
          sql`${user.email} ILIKE ${searchPattern} ESCAPE '\\'`,
          sql`${user.name} ILIKE ${searchPattern} ESCAPE '\\'`,
        ),
      });
      const activeSuspensions = await findActiveByMemberIds(
        rows.map((row) => row.id),
      );

      return rows.map((row) => ({
        currentSuspension: activeSuspensions.get(row.id) ?? null,
        email: row.email,
        emailVerified: row.emailVerified,
        id: row.id,
        name: row.name,
      }));
    },
    suspendMember: async ({ adminId, memberId, reason }) => {
      const result = await db.transaction(async (tx) => {
        const txDb = tx as unknown as Database;
        const member = await txDb.query.user.findFirst({
          columns: {
            id: true,
          },
          where: eq(user.id, memberId),
        });

        if (!member) {
          return null;
        }

        const active = await txDb.query.MemberSuspension.findFirst({
          orderBy: [desc(MemberSuspension.suspendedAt)],
          where: and(
            eq(MemberSuspension.memberId, memberId),
            eq(MemberSuspension.status, "active"),
            isNull(MemberSuspension.revokedAt),
          ),
        });

        if (active) {
          return active;
        }

        const timestamp = now();
        const [created] = await tx
          .insert(MemberSuspension)
          .values({
            createdAt: timestamp,
            memberId,
            reason,
            status: "active",
            suspendedAt: timestamp,
            suspendedByAdminId: adminId,
            updatedAt: timestamp,
          })
          .returning();

        return created ?? null;
      });

      return result ? toPersistedMemberSuspension(result) : null;
    },
    unsuspendMember: async ({ adminId, memberId, reason }) => {
      const result = await db.transaction(async (tx) => {
        const txDb = tx as unknown as Database;
        const active = await txDb.query.MemberSuspension.findFirst({
          orderBy: [desc(MemberSuspension.suspendedAt)],
          where: and(
            eq(MemberSuspension.memberId, memberId),
            eq(MemberSuspension.status, "active"),
            isNull(MemberSuspension.revokedAt),
          ),
        });

        if (!active) {
          return null;
        }

        const timestamp = now();
        const [updated] = await tx
          .update(MemberSuspension)
          .set({
            revokedAt: timestamp,
            revokedByAdminId: adminId,
            revokedReason: reason,
            status: "revoked",
            updatedAt: timestamp,
          })
          .where(eq(MemberSuspension.id, active.id))
          .returning();

        return updated ?? null;
      });

      return result ? toPersistedMemberSuspension(result) : null;
    },
  };
}

const adminMemberAvailableSorts = [
  {
    defaultDirection: "desc",
    label: "Fecha de alta",
    value: "createdAt",
  },
  {
    defaultDirection: "asc",
    label: "Correo",
    value: "email",
  },
  {
    defaultDirection: "asc",
    label: "Nombre",
    value: "name",
  },
  {
    defaultDirection: "desc",
    label: "Correo verificado",
    value: "emailVerified",
  },
  {
    defaultDirection: "desc",
    label: "Suspension",
    value: "suspensionStatus",
  },
] satisfies readonly AdminListSortOption<AdminMemberSortBy>[];

const adminMemberAvailableFilters = [
  {
    key: "suspension",
    label: "Suspension",
    options: [
      { label: "Todos", value: "any" },
      { label: "Suspendidos", value: "suspended" },
      { label: "Sin suspension", value: "not_suspended" },
    ],
    type: "enum",
  },
  {
    key: "emailVerification",
    label: "Verificacion de correo",
    options: [
      { label: "Todos", value: "any" },
      { label: "Verificado", value: "verified" },
      { label: "Sin verificar", value: "unverified" },
    ],
    type: "enum",
  },
  {
    key: "createdFrom",
    label: "Alta desde",
    type: "date",
  },
  {
    key: "createdTo",
    label: "Alta hasta",
    type: "date",
  },
] satisfies AdminMemberAvailableFilters;

function defaultAdminMemberListFilters(): AdminMemberListFilters {
  return {
    emailVerification: "any",
    suspension: "any",
  };
}

function buildActiveSuspensionJoin() {
  return and(
    eq(MemberSuspension.memberId, user.id),
    eq(MemberSuspension.status, "active"),
    isNull(MemberSuspension.revokedAt),
  );
}

function buildMemberListWhereClause(
  input: NormalizedAdminListInput<AdminMemberListFilters, AdminMemberSortBy>,
) {
  const filters = [
    buildMemberSearchFilter(input.search),
    buildMemberSuspensionFilter(input.filters.suspension),
    buildMemberEmailVerificationFilter(input.filters.emailVerification),
    buildMemberCreatedFromFilter(input.filters.createdFrom),
    buildMemberCreatedToFilter(input.filters.createdTo),
  ].filter((filter) => filter !== undefined);

  return filters.length > 0 ? and(...filters) : sql`true`;
}

function buildMemberSearchFilter(search: string | null) {
  const searchPattern = search ? `%${escapeLikePattern(search)}%` : null;

  return searchPattern
    ? or(
        eq(user.id, search ?? ""),
        sql`${user.email} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${user.name} ILIKE ${searchPattern} ESCAPE '\\'`,
      )
    : undefined;
}

function buildMemberSuspensionFilter(
  suspension: AdminMemberListFilters["suspension"],
) {
  if (suspension === "suspended") {
    return sql`${MemberSuspension.id} IS NOT NULL`;
  }

  if (suspension === "not_suspended") {
    return sql`${MemberSuspension.id} IS NULL`;
  }

  return undefined;
}

function buildMemberEmailVerificationFilter(
  emailVerification: AdminMemberListFilters["emailVerification"],
) {
  if (emailVerification === "verified") {
    return eq(user.emailVerified, true);
  }

  if (emailVerification === "unverified") {
    return eq(user.emailVerified, false);
  }

  return undefined;
}

function buildMemberCreatedFromFilter(
  createdFrom: AdminMemberListFilters["createdFrom"],
) {
  return createdFrom ? gte(user.createdAt, createdFrom) : undefined;
}

function buildMemberCreatedToFilter(
  createdTo: AdminMemberListFilters["createdTo"],
) {
  return createdTo ? lte(user.createdAt, createdTo) : undefined;
}

function buildMemberOrderBy(
  input: NormalizedAdminListInput<AdminMemberListFilters, AdminMemberSortBy>,
) {
  const order = input.sortDirection === "asc" ? asc : desc;

  switch (input.sortBy) {
    case "createdAt":
      return [order(user.createdAt), asc(user.id)];
    case "email":
      return [order(user.email), asc(user.id)];
    case "emailVerified":
      return [order(user.emailVerified), asc(user.email), asc(user.id)];
    case "name":
      return [order(user.name), asc(user.email), asc(user.id)];
    case "suspensionStatus":
      return [
        order(sql`${MemberSuspension.id} IS NOT NULL`),
        desc(MemberSuspension.suspendedAt),
        asc(user.id),
      ];
  }
}

function buildMemberSortSpecs(
  sortBy: AdminMemberSortBy,
  sortDirection: "asc" | "desc",
): readonly AdminListSortSpec<AdminMemberListItem>[] {
  const secondary = [
    {
      direction: "asc",
      getValue: (member: AdminMemberListItem) => member.id,
    },
  ] satisfies readonly AdminListSortSpec<AdminMemberListItem>[];

  switch (sortBy) {
    case "createdAt":
      return [
        { direction: sortDirection, getValue: (member) => member.createdAt },
        ...secondary,
      ];
    case "email":
      return [
        { direction: sortDirection, getValue: (member) => member.email },
        ...secondary,
      ];
    case "emailVerified":
      return [
        {
          direction: sortDirection,
          getValue: (member) => member.emailVerified,
        },
        { direction: "asc", getValue: (member) => member.email },
        ...secondary,
      ];
    case "name":
      return [
        { direction: sortDirection, getValue: (member) => member.name },
        { direction: "asc", getValue: (member) => member.email },
        ...secondary,
      ];
    case "suspensionStatus":
      return [
        {
          direction: sortDirection,
          getValue: (member) => member.currentSuspension !== null,
        },
        {
          direction: "desc",
          getValue: (member) => member.currentSuspension?.suspendedAt,
        },
        ...secondary,
      ];
  }
}

function toAdminMemberListItem(row: MemberListRow): AdminMemberListItem {
  return {
    createdAt: row.createdAt,
    currentSuspension:
      row.suspensionId &&
      row.suspensionMemberId &&
      row.suspensionReason &&
      row.suspensionStatus &&
      row.suspensionSuspendedAt &&
      row.suspensionUpdatedAt
        ? {
            id: row.suspensionId,
            memberId: row.suspensionMemberId,
            reason: row.suspensionReason,
            revokedAt: row.suspensionRevokedAt,
            revokedByAdminId: row.suspensionRevokedByAdminId,
            revokedReason: row.suspensionRevokedReason,
            status: row.suspensionStatus,
            suspendedAt: row.suspensionSuspendedAt,
            suspendedByAdminId: row.suspensionSuspendedByAdminId,
            updatedAt: row.suspensionUpdatedAt,
          }
        : null,
    email: row.email,
    emailVerified: row.emailVerified,
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt,
  };
}

async function listRecentMemberReports(
  db: Database,
  memberId: string,
): Promise<AdminMemberReportSummary[]> {
  const rows = await db.query.Report.findMany({
    limit: 8,
    orderBy: [desc(Report.createdAt)],
    where: eq(Report.caretakerId, memberId),
    with: {
      location: true,
    },
  });

  return rows.map((row) => toMemberReportSummary(row as MemberReportRow));
}

async function listMemberModerationReports(
  db: Database,
  memberId: string,
): Promise<AdminMemberModerationReportSummary[]> {
  const rows = await db
    .select({
      action: ReportModerationAction.action,
      adminId: ReportModerationAction.adminId,
      createdAt: ReportModerationAction.createdAt,
      id: ReportModerationAction.id,
      note: ReportModerationAction.note,
      reason: ReportModerationAction.reason,
      reportId: Report.id,
      reportTitle: Report.title,
      reportType: Report.type,
    })
    .from(ReportModerationAction)
    .innerJoin(Report, eq(ReportModerationAction.reportId, Report.id))
    .where(eq(Report.caretakerId, memberId))
    .orderBy(desc(ReportModerationAction.createdAt))
    .limit(10);

  return rows;
}

async function getMemberSummary(
  db: Database,
  memberId: string,
): Promise<AdminMemberProfile["summary"]> {
  const [reportCountRow, adoptionCountRow, moderationCountRow] =
    await Promise.all([
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(Report)
        .where(eq(Report.caretakerId, memberId)),
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(Report)
        .where(
          and(eq(Report.caretakerId, memberId), eq(Report.type, "adoption")),
        ),
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(ReportModerationAction)
        .innerJoin(Report, eq(ReportModerationAction.reportId, Report.id))
        .where(eq(Report.caretakerId, memberId)),
    ]);

  return {
    adoptionListingCount: Number(adoptionCountRow[0]?.count ?? 0),
    moderationReportCount: Number(moderationCountRow[0]?.count ?? 0),
    reportCount: Number(reportCountRow[0]?.count ?? 0),
  };
}

function toMemberReportSummary(row: MemberReportRow): AdminMemberReportSummary {
  return {
    createdAt: row.createdAt,
    hiddenAt: row.hiddenAt,
    id: row.id,
    locationLabel: row.location?.label ?? null,
    status: row.status,
    title: row.title,
    type: row.type,
  };
}

function toPersistedMemberSuspension(
  row: MemberSuspensionRow,
): PersistedMemberSuspension {
  return {
    id: row.id,
    memberId: row.memberId,
    reason: row.reason,
    revokedAt: row.revokedAt,
    revokedByAdminId: row.revokedByAdminId,
    revokedReason: row.revokedReason,
    status: row.status,
    suspendedAt: row.suspendedAt,
    suspendedByAdminId: row.suspendedByAdminId,
    updatedAt: row.updatedAt,
  };
}

function escapeLikePattern(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}

export interface InMemoryMember {
  createdAt?: Date;
  email: string;
  emailVerified?: boolean;
  id: string;
  name: string;
  updatedAt?: Date;
}

export function createInMemoryMemberSuspensionRepository({
  members,
  moderationReports = [],
  now = () => new Date(),
  recentReports = [],
  suspensions = [],
}: {
  members: readonly InMemoryMember[];
  moderationReports?: readonly AdminMemberModerationReportSummary[];
  now?: () => Date;
  recentReports?: readonly (AdminMemberReportSummary & { memberId: string })[];
  suspensions?: readonly PersistedMemberSuspension[];
}): MemberSuspensionRepository {
  const memberRows = members.map((member) => ({
    createdAt: member.createdAt ?? new Date("2026-06-26T12:00:00.000Z"),
    emailVerified: member.emailVerified ?? false,
    updatedAt: member.updatedAt ?? new Date("2026-06-26T12:00:00.000Z"),
    ...member,
  }));
  const suspensionRows = suspensions.map((suspension) => ({ ...suspension }));
  let nextSuspensionId = suspensionRows.length + 1;

  const findActiveByMemberId = (memberId: string) =>
    Promise.resolve(
      suspensionRows.find(
        (suspension) =>
          suspension.memberId === memberId &&
          suspension.status === "active" &&
          suspension.revokedAt === null,
      ) ?? null,
    );
  const findActiveByMemberIds = async (memberIds: readonly string[]) => {
    const result = new Map<string, PersistedMemberSuspension>();

    for (const memberId of memberIds) {
      const suspension = await findActiveByMemberId(memberId);

      if (suspension) {
        result.set(memberId, suspension);
      }
    }

    return result;
  };

  return {
    findActiveByMemberId,
    findActiveByMemberIds,
    getMemberProfile: async (memberId) => {
      const member = memberRows.find((candidate) => candidate.id === memberId);

      if (!member) {
        return null;
      }

      const memberReports = recentReports
        .filter((report) => report.memberId === memberId)
        .map(({ memberId: _memberId, ...report }) => report);
      const memberModerationReports = moderationReports.filter((report) =>
        report.reportId.startsWith(memberId),
      );
      const history = suspensionRows
        .filter((suspension) => suspension.memberId === memberId)
        .sort(
          (left, right) =>
            right.suspendedAt.getTime() - left.suspendedAt.getTime(),
        );

      return {
        currentSuspension: (await findActiveByMemberId(memberId)) ?? null,
        member: {
          createdAt: member.createdAt,
          email: member.email,
          emailVerified: member.emailVerified,
          id: member.id,
          name: member.name,
          updatedAt: member.updatedAt,
        },
        moderationReports: memberModerationReports,
        recentReports: memberReports,
        summary: {
          adoptionListingCount: memberReports.filter(
            (report) => report.type === "adoption",
          ).length,
          moderationReportCount: memberModerationReports.length,
          reportCount: memberReports.length,
        },
        suspensionHistory: history,
      };
    },
    listMembers: async (input = {}) => {
      const normalized = normalizeAdminListInput(input, {
        defaultFilters: defaultAdminMemberListFilters(),
        defaultSortBy: "createdAt",
        defaultSortDirection: "desc",
      });
      const normalizedSearch = normalized.search?.toLowerCase() ?? null;
      const items = await Promise.all(
        memberRows.map(async (member) => ({
          createdAt: member.createdAt,
          currentSuspension: await findActiveByMemberId(member.id),
          email: member.email,
          emailVerified: member.emailVerified,
          id: member.id,
          name: member.name,
          updatedAt: member.updatedAt,
        })),
      );
      const filteredItems = items
        .filter((member) =>
          normalizedSearch
            ? [
                member.email,
                member.id,
                member.name,
              ].some((value) => value.toLowerCase().includes(normalizedSearch))
            : true,
        )
        .filter((member) =>
          normalized.filters.suspension === "suspended"
            ? member.currentSuspension !== null
            : true,
        )
        .filter((member) =>
          normalized.filters.suspension === "not_suspended"
            ? member.currentSuspension === null
            : true,
        )
        .filter((member) =>
          normalized.filters.emailVerification === "verified"
            ? member.emailVerified
            : true,
        )
        .filter((member) =>
          normalized.filters.emailVerification === "unverified"
            ? !member.emailVerified
            : true,
        )
        .filter((member) =>
          normalized.filters.createdFrom
            ? member.createdAt >= normalized.filters.createdFrom
            : true,
        )
        .filter((member) =>
          normalized.filters.createdTo
            ? member.createdAt <= normalized.filters.createdTo
            : true,
        )
        .sort((left, right) =>
          compareAdminListItems(
            left,
            right,
            buildMemberSortSpecs(normalized.sortBy, normalized.sortDirection),
          ),
        );

      return buildAdminListResult({
        availableFilters: adminMemberAvailableFilters,
        availableSorts: adminMemberAvailableSorts,
        items: filteredItems.slice(
          normalized.offset,
          normalized.offset + normalized.pageSize,
        ),
        page: normalized.page,
        pageSize: normalized.pageSize,
        total: filteredItems.length,
      });
    },
    searchMembers: async ({ limit = 20, query }) => {
      const normalizedQuery = query.trim().toLowerCase();

      if (!normalizedQuery) {
        return [];
      }

      const rows = memberRows
        .filter(
          (member) =>
            member.id.toLowerCase() === normalizedQuery ||
            member.email.toLowerCase().includes(normalizedQuery) ||
            member.name.toLowerCase().includes(normalizedQuery),
        )
        .sort((left, right) => left.email.localeCompare(right.email))
        .slice(0, limit);
      const activeSuspensions = await findActiveByMemberIds(
        rows.map((row) => row.id),
      );

      return rows.map((member) => ({
        currentSuspension: activeSuspensions.get(member.id) ?? null,
        email: member.email,
        emailVerified: member.emailVerified,
        id: member.id,
        name: member.name,
      }));
    },
    suspendMember: async ({ adminId, memberId, reason }) => {
      if (!memberRows.some((member) => member.id === memberId)) {
        return null;
      }

      const active = await findActiveByMemberId(memberId);

      if (active) {
        return active;
      }

      const timestamp = now();
      const created = {
        id: `member-suspension-${nextSuspensionId++}`,
        memberId,
        reason,
        revokedAt: null,
        revokedByAdminId: null,
        revokedReason: null,
        status: "active",
        suspendedAt: timestamp,
        suspendedByAdminId: adminId,
        updatedAt: timestamp,
      } satisfies PersistedMemberSuspension;

      suspensionRows.push(created);

      return created;
    },
    unsuspendMember: async ({ adminId, memberId, reason }) => {
      const active = await findActiveByMemberId(memberId);

      if (!active) {
        return null;
      }

      const timestamp = now();
      active.status = "revoked";
      active.revokedAt = timestamp;
      active.revokedByAdminId = adminId;
      active.revokedReason = reason;
      active.updatedAt = timestamp;

      return active;
    },
  };
}
