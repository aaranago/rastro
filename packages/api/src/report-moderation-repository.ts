import type { Database } from "@acme/db/client";
import type { ModerationReportReason, ReportType } from "@acme/validators";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "@acme/db";
import {
  MemberSuspension,
  Report,
  ReportLocation,
  ReportModerationAction,
  ReportModerationReport,
  ReportModerationReviewItem,
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
import type { ActiveMemberSuspensionSummary } from "./member-suspension-repository";
import { listActiveMemberSuspensionSummaries } from "./member-suspension-repository";

const reportModerationTypes = [
  "lost_pet",
  "found_pet",
  "sighting",
  "adoption",
] satisfies ReportType[];

export type ReportModerationTargetType =
  | "adoption_listing"
  | "found_pet_report"
  | "lost_pet_report"
  | "sighting_report";

export type ReportModerationActionName =
  | "hide"
  | "mark_false"
  | "restore"
  | "unmark_false";

export type ReportModerationVisibilityFilter = "any" | "hidden" | "visible";
export type ReportModerationFalseReportFilter =
  | "any"
  | "marked_false"
  | "not_false";
export type ReportModerationRiskFilter =
  | "any"
  | "caretaker_suspended"
  | "none";

export type ReportModerationSortBy =
  | "city"
  | "createdAt"
  | "department"
  | "falseReportState"
  | "title"
  | "type"
  | "updatedAt"
  | "visibility";

export interface ReportModerationListFilters {
  city?: string;
  department?: string;
  falseReportState?: ReportModerationFalseReportFilter;
  reason?: string;
  risk?: ReportModerationRiskFilter;
  type?: ReportType[];
  visibility?: ReportModerationVisibilityFilter;
}

export type ReportModerationAvailableFilters = readonly AdminListFilterOption<
  Extract<keyof ReportModerationListFilters, string>
>[];

export type ReportModerationListInput = AdminListInput<
  ReportModerationListFilters,
  ReportModerationSortBy
>;

export type ReportModerationListResult = AdminListResult<
  ReportModerationQueueItem,
  ReportModerationAvailableFilters,
  ReportModerationSortBy
>;

export interface ReportModerationQueueItem {
  createdAt: Date;
  id: string;
  newestAction: {
    action: ReportModerationActionName;
    adminId: string | null;
    createdAt: Date;
    note: string | null;
    reason: string;
  } | null;
  reportCount: number;
  target: {
    caretaker: {
      displayName: string;
      email: string | null;
      memberId: string;
      suspension: ReportModerationMemberSuspension | null;
    };
    city: string;
    department: string;
    falseReport:
      | {
          markedAt: Date;
          markedByAdminId: string | null;
          note: string | null;
          reason: string | null;
        }
      | null;
    falseReportState: "marked_false" | "not_false";
    hiddenAt: Date | null;
    hiddenByAdminId: string | null;
    hiddenNote: string | null;
    hiddenReason: string | null;
    id: string;
    locationLabel: string;
    reportType: ReportType;
    status: "hidden" | "visible";
    title: string;
    type: ReportModerationTargetType;
    visibility: "hidden" | "visible";
  };
  updatedAt: Date;
}

export type ReportModerationMemberSuspension = ActiveMemberSuspensionSummary;

export interface ReportModerationRepository {
  createReportAbuseReport(input: {
    report: CreateReportAbuseReportInput;
    reporterId: string;
  }): Promise<ReportAbuseReportCreationResult | null>;
  getReportQueueItem(input: {
    id: string;
  }): Promise<ReportModerationQueueItem | null>;
  hideReportTarget(
    input: ReportModerationTransitionInput,
  ): Promise<ReportModerationQueueItem | null>;
  listReportQueue(
    input?: ReportModerationListInput,
  ): Promise<ReportModerationListResult>;
  markFalseReportTarget(
    input: ReportModerationTransitionInput,
  ): Promise<ReportModerationQueueItem | null>;
  restoreReportTarget(
    input: ReportModerationTransitionInput,
  ): Promise<ReportModerationQueueItem | null>;
  unmarkFalseReportTarget(
    input: ReportModerationTransitionInput,
  ): Promise<ReportModerationQueueItem | null>;
}

export interface ReportModerationTransitionInput {
  adminId: string;
  note?: string | null;
  reason: string;
  reportId: string;
}

export interface CreateReportAbuseReportInput {
  detail: string;
  reason: ModerationReportReason;
  reportId: string;
}

export interface ReportAbuseReportCreationResult {
  reviewItem: {
    id: string;
    reportId: string;
    reason: ModerationReportReason;
    status: "pending";
  };
  status: "already_reported" | "created";
}

export type ReportQueueRow = Pick<
  typeof Report.$inferSelect,
  | "createdAt"
  | "falseReportNote"
  | "falseReportReason"
  | "falseReportedAt"
  | "falseReportedByAdminId"
  | "hiddenAt"
  | "hiddenByAdminId"
  | "hiddenNote"
  | "hiddenReason"
  | "id"
  | "title"
  | "type"
  | "updatedAt"
> & {
  caretaker: {
    email: string;
    id: string;
    name: string;
  };
  location: Pick<
    typeof ReportLocation.$inferSelect,
    "city" | "department" | "label"
  > | null;
};

interface ReportQueueSelectRow {
  caretakerEmail: string;
  caretakerId: string;
  caretakerName: string;
  city: string;
  createdAt: Date;
  department: string;
  falseReportNote: string | null;
  falseReportReason: string | null;
  falseReportedAt: Date | null;
  falseReportedByAdminId: string | null;
  hiddenAt: Date | null;
  hiddenByAdminId: string | null;
  hiddenNote: string | null;
  hiddenReason: string | null;
  id: string;
  locationLabel: string;
  title: string;
  type: ReportType;
  updatedAt: Date;
}

export function createDrizzleReportModerationRepository(
  db: Database,
  options: { now?: () => Date } = {},
): ReportModerationRepository {
  const now = options.now ?? (() => new Date());
  const transition = async (
    action: ReportModerationActionName,
    input: ReportModerationTransitionInput,
  ): Promise<ReportModerationQueueItem | null> => {
    const changedReportId = await db.transaction(async (tx) => {
      const [report] = await tx
        .select({
          id: Report.id,
          type: Report.type,
        })
        .from(Report)
        .where(
          and(
            eq(Report.id, input.reportId),
            isNull(Report.deletedAt),
            inArray(Report.type, reportModerationTypes),
          ),
        )
        .limit(1);

      if (!report) {
        return null;
      }

      const timestamp = new Date();

      if (action === "hide") {
        await tx
          .update(Report)
          .set({
            hiddenAt: timestamp,
            hiddenByAdminId: input.adminId,
            hiddenNote: input.note ?? null,
            hiddenReason: input.reason,
          })
          .where(eq(Report.id, input.reportId));
      } else if (action === "restore") {
        await tx
          .update(Report)
          .set({
            hiddenAt: null,
            hiddenByAdminId: null,
            hiddenNote: null,
            hiddenReason: null,
          })
          .where(eq(Report.id, input.reportId));
      } else if (action === "mark_false") {
        await tx
          .update(Report)
          .set({
            falseReportNote: input.note ?? null,
            falseReportReason: input.reason,
            falseReportedAt: timestamp,
            falseReportedByAdminId: input.adminId,
          })
          .where(eq(Report.id, input.reportId));
      } else {
        await tx
          .update(Report)
          .set({
            falseReportNote: null,
            falseReportReason: null,
            falseReportedAt: null,
            falseReportedByAdminId: null,
          })
          .where(eq(Report.id, input.reportId));
      }

      await tx.insert(ReportModerationAction).values({
        action,
        adminId: input.adminId,
        note: input.note ?? null,
        reason: input.reason,
        reportId: input.reportId,
        targetType: report.type,
      });

      return report.id;
    });

    if (!changedReportId) {
      return null;
    }

    return listReportQueueItemById(db, changedReportId);
  };

  return {
    createReportAbuseReport: async ({ report, reporterId }) => {
      const creationResult = await db.transaction(async (tx) => {
        const txDb = tx as unknown as Database;
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${report.reportId}), hashtext(${report.reason}))`,
        );

        const [target] = await tx
          .select({
            caretakerId: Report.caretakerId,
            deletedAt: Report.deletedAt,
            falseReportedAt: Report.falseReportedAt,
            hiddenAt: Report.hiddenAt,
            id: Report.id,
            status: Report.status,
            type: Report.type,
          })
          .from(Report)
          .where(
            and(
              eq(Report.id, report.reportId),
              inArray(Report.type, reportModerationTypes),
            ),
          )
          .limit(1);

        if (
          !target ||
          target.deletedAt ||
          target.hiddenAt ||
          target.falseReportedAt ||
          target.status === "pending_review" ||
          target.caretakerId === reporterId
        ) {
          return { status: "target_not_found" as const };
        }

        const timestamp = now();
        const existingReviewItem =
          await txDb.query.ReportModerationReviewItem.findFirst({
            where: and(
              eq(ReportModerationReviewItem.reportId, report.reportId),
              eq(ReportModerationReviewItem.reason, report.reason),
              eq(ReportModerationReviewItem.status, "pending"),
            ),
          });
        const reviewItem =
          existingReviewItem ??
          (await insertReportModerationReviewItem(txDb, {
            reason: report.reason,
            reportId: report.reportId,
            targetType: target.type,
            timestamp,
          }));
        const existingReport =
          await txDb.query.ReportModerationReport.findFirst({
            where: and(
              eq(ReportModerationReport.reportId, report.reportId),
              eq(ReportModerationReport.reporterId, reporterId),
              eq(ReportModerationReport.reason, report.reason),
            ),
          });

        if (existingReport) {
          return {
            reviewItem,
            status: "already_reported" as const,
          };
        }

        await tx.insert(ReportModerationReport).values({
          detail: report.detail,
          reason: report.reason,
          reportId: report.reportId,
          reporterId,
          reviewItemId: reviewItem.id,
        });
        await tx
          .update(ReportModerationReviewItem)
          .set({
            lastReportedAt: timestamp,
            updatedAt: timestamp,
          })
          .where(eq(ReportModerationReviewItem.id, reviewItem.id));

        return {
          reviewItem,
          status: "created" as const,
        };
      });

      if (creationResult.status === "target_not_found") {
        return null;
      }

      return {
        reviewItem: {
          id: creationResult.reviewItem.id,
          reason: creationResult.reviewItem.reason,
          reportId: creationResult.reviewItem.reportId,
          status: "pending",
        },
        status: creationResult.status,
      };
    },
    getReportQueueItem: ({ id }) => listReportQueueItemById(db, id),
    hideReportTarget: (input) => transition("hide", input),
    listReportQueue: (input) => listReportQueuePage(db, input),
    markFalseReportTarget: (input) => transition("mark_false", input),
    restoreReportTarget: (input) => transition("restore", input),
    unmarkFalseReportTarget: (input) => transition("unmark_false", input),
  };
}

async function insertReportModerationReviewItem(
  db: Database,
  input: {
    reason: ModerationReportReason;
    reportId: string;
    targetType: ReportType;
    timestamp: Date;
  },
) {
  const [created] = await db
    .insert(ReportModerationReviewItem)
    .values({
      firstReportedAt: input.timestamp,
      lastReportedAt: input.timestamp,
      reason: input.reason,
      reportId: input.reportId,
      status: "pending",
      targetType: input.targetType,
      updatedAt: input.timestamp,
    })
    .returning();

  if (!created) {
    throw new Error("Report moderation review item could not be created.");
  }

  return created;
}

async function listReportQueueItemById(db: Database, id: string) {
  const reportId = id.startsWith("report-review-")
    ? id.slice("report-review-".length)
    : id;
  const result = await listReportQueuePage(db, {
    page: 1,
    pageSize: 1,
    filters: {},
  }, reportId);

  return result.items[0] ?? null;
}

async function listReportQueuePage(
  db: Database,
  input: ReportModerationListInput = {},
  reportId?: string,
): Promise<ReportModerationListResult> {
  const normalized = normalizeAdminListInput(input, {
    defaultFilters: defaultReportModerationListFilters(),
    defaultSortBy: "updatedAt",
    defaultSortDirection: "desc",
  });
  const filters = buildReportQueueFilters(normalized, reportId);
  const whereClause = filters.length > 0 ? and(...filters) : sql`true`;
  const [countRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(Report)
    .innerJoin(ReportLocation, eq(ReportLocation.reportId, Report.id))
    .innerJoin(user, eq(user.id, Report.caretakerId))
    .where(whereClause);
  const rows = await db
    .select({
      caretakerEmail: user.email,
      caretakerId: user.id,
      caretakerName: user.name,
      city: ReportLocation.city,
      createdAt: Report.createdAt,
      department: ReportLocation.department,
      falseReportNote: Report.falseReportNote,
      falseReportReason: Report.falseReportReason,
      falseReportedAt: Report.falseReportedAt,
      falseReportedByAdminId: Report.falseReportedByAdminId,
      hiddenAt: Report.hiddenAt,
      hiddenByAdminId: Report.hiddenByAdminId,
      hiddenNote: Report.hiddenNote,
      hiddenReason: Report.hiddenReason,
      id: Report.id,
      locationLabel: ReportLocation.label,
      title: Report.title,
      type: Report.type,
      updatedAt: Report.updatedAt,
    })
    .from(Report)
    .innerJoin(ReportLocation, eq(ReportLocation.reportId, Report.id))
    .innerJoin(user, eq(user.id, Report.caretakerId))
    .where(whereClause)
    .orderBy(...buildReportQueueOrderBy(normalized))
    .limit(normalized.pageSize)
    .offset(normalized.offset);
  const activeSuspensions = await listActiveMemberSuspensionSummaries(
    db,
    rows.map((row) => row.caretakerId),
  );
  const items = await Promise.all(
    rows.map(async (row) =>
      toReportModerationQueueItem(
        toReportQueueRow(row),
        await findLatestAction(db, row.id),
        activeSuspensions.get(row.caretakerId) ?? null,
      ),
    ),
  );

  return buildAdminListResult({
    availableFilters: reportModerationAvailableFilters,
    availableSorts: reportModerationAvailableSorts,
    items: items.filter((item) => item !== null),
    page: normalized.page,
    pageSize: normalized.pageSize,
    total: Number(countRow?.total ?? rows.length),
  });
}

function buildReportQueueFilters(
  input: NormalizedAdminListInput<
    ReportModerationListFilters,
    ReportModerationSortBy
  >,
  reportId: string | undefined,
) {
  return [
    isNull(Report.deletedAt),
    inArray(Report.type, reportModerationTypes),
    buildReportIdFilter(reportId),
    buildReportTypeFilter(input.filters.type),
    buildReportVisibilityFilter(input.filters.visibility),
    buildReportFalseReportFilter(input.filters.falseReportState),
    buildReportCityFilter(input.filters.city),
    buildReportDepartmentFilter(input.filters.department),
    buildReportReasonFilter(input.filters.reason),
    buildReportRiskFilter(input.filters.risk),
    buildReportSearchFilter(input.search),
  ].filter((filter) => filter !== undefined);
}

function buildReportIdFilter(reportId: string | undefined) {
  return reportId ? eq(Report.id, reportId) : undefined;
}

function buildReportTypeFilter(type: ReportModerationListFilters["type"]) {
  return type && type.length > 0 ? inArray(Report.type, type) : undefined;
}

function buildReportVisibilityFilter(
  visibility: ReportModerationListFilters["visibility"],
) {
  if (visibility === "hidden") {
    return sql`${Report.hiddenAt} IS NOT NULL`;
  }

  if (visibility === "visible") {
    return sql`${Report.hiddenAt} IS NULL`;
  }

  return undefined;
}

function buildReportFalseReportFilter(
  state: ReportModerationListFilters["falseReportState"],
) {
  if (state === "marked_false") {
    return sql`${Report.falseReportedAt} IS NOT NULL`;
  }

  if (state === "not_false") {
    return sql`${Report.falseReportedAt} IS NULL`;
  }

  return undefined;
}

function buildReportCityFilter(city: ReportModerationListFilters["city"]) {
  return city ? eq(ReportLocation.city, city) : undefined;
}

function buildReportDepartmentFilter(
  department: ReportModerationListFilters["department"],
) {
  return department ? eq(ReportLocation.department, department) : undefined;
}

function buildReportReasonFilter(reason: ReportModerationListFilters["reason"]) {
  return reason
    ? or(eq(Report.hiddenReason, reason), eq(Report.falseReportReason, reason))
    : undefined;
}

function buildReportRiskFilter(risk: ReportModerationListFilters["risk"]) {
  if (risk === "caretaker_suspended") {
    return activeCaretakerSuspensionExists();
  }

  if (risk === "none") {
    return sql`NOT ${activeCaretakerSuspensionExists()}`;
  }

  return undefined;
}

function buildReportSearchFilter(search: string | null) {
  const searchPattern = search ? `%${escapeLikePattern(search)}%` : null;

  return searchPattern
    ? or(
        sql`${Report.id} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${Report.title} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${Report.hiddenReason} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${Report.falseReportReason} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${ReportLocation.city} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${ReportLocation.department} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${ReportLocation.label} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${user.email} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${user.name} ILIKE ${searchPattern} ESCAPE '\\'`,
      )
    : undefined;
}

function activeCaretakerSuspensionExists() {
  return sql`EXISTS (
    SELECT 1
    FROM ${MemberSuspension}
    WHERE ${MemberSuspension.memberId} = ${Report.caretakerId}
      AND ${MemberSuspension.status} = 'active'
      AND ${MemberSuspension.revokedAt} IS NULL
  )`;
}

function buildReportQueueOrderBy(
  input: NormalizedAdminListInput<
    ReportModerationListFilters,
    ReportModerationSortBy
  >,
) {
  const order = input.sortDirection === "asc" ? asc : desc;

  switch (input.sortBy) {
    case "city":
      return [order(ReportLocation.city), desc(Report.updatedAt), asc(Report.id)];
    case "createdAt":
      return [order(Report.createdAt), asc(Report.id)];
    case "department":
      return [
        order(ReportLocation.department),
        order(ReportLocation.city),
        desc(Report.updatedAt),
        asc(Report.id),
      ];
    case "falseReportState":
      return [
        order(sql`${Report.falseReportedAt} IS NOT NULL`),
        desc(Report.updatedAt),
        asc(Report.id),
      ];
    case "title":
      return [order(Report.title), desc(Report.updatedAt), asc(Report.id)];
    case "type":
      return [order(Report.type), desc(Report.updatedAt), asc(Report.id)];
    case "visibility":
      return [
        order(sql`${Report.hiddenAt} IS NOT NULL`),
        desc(Report.updatedAt),
        asc(Report.id),
      ];
    case "updatedAt":
      return [order(Report.updatedAt), desc(Report.createdAt), asc(Report.id)];
  }
}

async function findLatestAction(db: Database, reportId: string) {
  return db.query.ReportModerationAction.findFirst({
    orderBy: [
      desc(ReportModerationAction.createdAt),
      desc(ReportModerationAction.id),
    ],
    where: eq(ReportModerationAction.reportId, reportId),
  });
}

function toReportQueueRow(row: ReportQueueSelectRow): ReportQueueRow {
  return {
    createdAt: row.createdAt,
    falseReportNote: row.falseReportNote,
    falseReportReason: row.falseReportReason,
    falseReportedAt: row.falseReportedAt,
    falseReportedByAdminId: row.falseReportedByAdminId,
    hiddenAt: row.hiddenAt,
    hiddenByAdminId: row.hiddenByAdminId,
    hiddenNote: row.hiddenNote,
    hiddenReason: row.hiddenReason,
    id: row.id,
    title: row.title,
    type: row.type,
    updatedAt: row.updatedAt,
    caretaker: {
      email: row.caretakerEmail,
      id: row.caretakerId,
      name: row.caretakerName,
    },
    location: {
      city: row.city,
      department: row.department,
      label: row.locationLabel,
    },
  };
}

export function toReportModerationQueueItem(
  report: ReportQueueRow,
  latestAction: typeof ReportModerationAction.$inferSelect | undefined,
  activeSuspension: ReportModerationMemberSuspension | null,
): ReportModerationQueueItem | null {
  if (!report.location) {
    return null;
  }

  const falseReportState = report.falseReportedAt
    ? "marked_false"
    : "not_false";
  const visibility = report.hiddenAt ? "hidden" : "visible";

  return {
    createdAt: report.createdAt,
    id: `report-review-${report.id}`,
    newestAction: latestAction
      ? {
          action: latestAction.action,
          adminId: latestAction.adminId,
          createdAt: latestAction.createdAt,
          note: latestAction.note,
          reason: latestAction.reason,
        }
      : null,
    reportCount: 1,
    target: {
      caretaker: {
        displayName: report.caretaker.name,
        email: report.caretaker.email,
        memberId: report.caretaker.id,
        suspension: activeSuspension,
      },
      city: report.location.city,
      department: report.location.department,
      falseReport: report.falseReportedAt
        ? {
            markedAt: report.falseReportedAt,
            markedByAdminId: report.falseReportedByAdminId,
            note: report.falseReportNote,
            reason: report.falseReportReason,
          }
        : null,
      falseReportState,
      hiddenAt: report.hiddenAt,
      hiddenByAdminId: report.hiddenByAdminId,
      hiddenNote: report.hiddenNote,
      hiddenReason: report.hiddenReason,
      id: report.id,
      locationLabel: report.location.label,
      reportType: report.type,
      status:
        visibility === "hidden" || falseReportState === "marked_false"
          ? "hidden"
          : "visible",
      title: report.title,
      type: toReportModerationTargetType(report.type),
      visibility,
    },
    updatedAt: report.updatedAt,
  };
}

const reportModerationAvailableSorts = [
  {
    defaultDirection: "desc",
    label: "Actualizado",
    value: "updatedAt",
  },
  {
    defaultDirection: "desc",
    label: "Creado",
    value: "createdAt",
  },
  {
    defaultDirection: "asc",
    label: "Titulo",
    value: "title",
  },
  {
    defaultDirection: "asc",
    label: "Tipo",
    value: "type",
  },
  {
    defaultDirection: "asc",
    label: "Ciudad",
    value: "city",
  },
  {
    defaultDirection: "asc",
    label: "Departamento",
    value: "department",
  },
  {
    defaultDirection: "desc",
    label: "Visibilidad",
    value: "visibility",
  },
  {
    defaultDirection: "desc",
    label: "Reporte falso",
    value: "falseReportState",
  },
] satisfies readonly AdminListSortOption<ReportModerationSortBy>[];

const reportModerationAvailableFilters = [
  {
    key: "type",
    label: "Tipo",
    options: [
      { label: "Mascota perdida", value: "lost_pet" },
      { label: "Mascota encontrada", value: "found_pet" },
      { label: "Avistamiento", value: "sighting" },
      { label: "Adopcion", value: "adoption" },
    ],
    type: "enum",
  },
  {
    key: "visibility",
    label: "Visibilidad",
    options: [
      { label: "Todos", value: "any" },
      { label: "Visible", value: "visible" },
      { label: "Oculto", value: "hidden" },
    ],
    type: "enum",
  },
  {
    key: "falseReportState",
    label: "Reporte falso",
    options: [
      { label: "Todos", value: "any" },
      { label: "Marcado falso", value: "marked_false" },
      { label: "No marcado falso", value: "not_false" },
    ],
    type: "enum",
  },
  {
    key: "city",
    label: "Ciudad",
    type: "text",
  },
  {
    key: "department",
    label: "Departamento",
    type: "text",
  },
  {
    key: "risk",
    label: "Riesgo",
    options: [
      { label: "Todos", value: "any" },
      { label: "Cuidador suspendido", value: "caretaker_suspended" },
      { label: "Sin senal", value: "none" },
    ],
    type: "enum",
  },
  {
    key: "reason",
    label: "Motivo",
    type: "text",
  },
] satisfies ReportModerationAvailableFilters;

function defaultReportModerationListFilters(): ReportModerationListFilters {
  return {
    falseReportState: "any",
    risk: "any",
    visibility: "any",
  };
}

export function compareReportModerationQueueItems(
  sortBy: ReportModerationSortBy,
  sortDirection: "asc" | "desc",
) {
  return (
    left: ReportModerationQueueItem,
    right: ReportModerationQueueItem,
  ) =>
    compareAdminListItems(
      left,
      right,
      buildReportModerationSortSpecs(sortBy, sortDirection),
    );
}

function buildReportModerationSortSpecs(
  sortBy: ReportModerationSortBy,
  sortDirection: "asc" | "desc",
): readonly AdminListSortSpec<ReportModerationQueueItem>[] {
  const secondary = [
    { direction: "asc", getValue: (item: ReportModerationQueueItem) => item.id },
  ] satisfies readonly AdminListSortSpec<ReportModerationQueueItem>[];

  switch (sortBy) {
    case "city":
      return [
        { direction: sortDirection, getValue: (item) => item.target.city },
        { direction: "desc", getValue: (item) => item.updatedAt },
        ...secondary,
      ];
    case "createdAt":
      return [
        { direction: sortDirection, getValue: (item) => item.createdAt },
        ...secondary,
      ];
    case "department":
      return [
        { direction: sortDirection, getValue: (item) => item.target.department },
        { direction: "asc", getValue: (item) => item.target.city },
        { direction: "desc", getValue: (item) => item.updatedAt },
        ...secondary,
      ];
    case "falseReportState":
      return [
        {
          direction: sortDirection,
          getValue: (item) => item.target.falseReportState === "marked_false",
        },
        { direction: "desc", getValue: (item) => item.updatedAt },
        ...secondary,
      ];
    case "title":
      return [
        { direction: sortDirection, getValue: (item) => item.target.title },
        { direction: "desc", getValue: (item) => item.updatedAt },
        ...secondary,
      ];
    case "type":
      return [
        { direction: sortDirection, getValue: (item) => item.target.reportType },
        { direction: "desc", getValue: (item) => item.updatedAt },
        ...secondary,
      ];
    case "updatedAt":
      return [
        { direction: sortDirection, getValue: (item) => item.updatedAt },
        { direction: "desc", getValue: (item) => item.createdAt },
        ...secondary,
      ];
    case "visibility":
      return [
        {
          direction: sortDirection,
          getValue: (item) => item.target.visibility === "hidden",
        },
        { direction: "desc", getValue: (item) => item.updatedAt },
        ...secondary,
      ];
  }
}

function toReportModerationTargetType(
  reportType: ReportType,
): ReportModerationTargetType {
  switch (reportType) {
    case "adoption":
      return "adoption_listing";
    case "found_pet":
      return "found_pet_report";
    case "lost_pet":
      return "lost_pet_report";
    case "sighting":
      return "sighting_report";
  }
}

function escapeLikePattern(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}
