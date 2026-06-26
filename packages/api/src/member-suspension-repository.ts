import type { Database } from "@acme/db/client";
import type { ReportLocation } from "@acme/db/schema";
import type { ReportStatus, ReportType } from "@acme/validators";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "@acme/db";
import {
  MemberSuspension,
  Report,
  ReportModerationAction,
  user,
} from "@acme/db/schema";

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
  action: "hide" | "restore";
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
