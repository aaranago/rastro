import type { Database } from "@acme/db/client";
import type {
  CreateResourceProviderReportInput,
  ModerationReportReason,
  ResourceProviderVerificationStatus,
} from "@acme/validators";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "@acme/db";
import {
  MemberSuspension,
  ResourceProvider,
  ResourceProviderLocation,
  ResourceProviderModerationReport,
  ResourceProviderModerationReviewItem,
} from "@acme/db/schema";

import type {
  AdminListFilterOption,
  AdminListInput,
  AdminListResult,
  AdminListSortOption,
  AdminListSortSpec,
  NormalizedAdminListInput,
} from "./admin-list-contract";
import type { ActiveMemberSuspensionSummary } from "./member-suspension-repository";
import {
  buildAdminListResult,
  compareAdminListItems,
  normalizeAdminListInput,
} from "./admin-list-contract";
import { listActiveMemberSuspensionSummaries } from "./member-suspension-repository";

export type ResourceProviderModerationReviewStatus =
  | "dismissed_false_report"
  | "pending"
  | "resolved_action_taken"
  | "resolved_no_action";

export type ResourceProviderModerationResolutionStatus = Exclude<
  ResourceProviderModerationReviewStatus,
  "pending"
>;

export type ResourceProviderModerationReporterSuspension =
  ActiveMemberSuspensionSummary;

export interface ResourceProviderModerationReporter {
  displayName: string;
  email: string | null;
  memberId: string | null;
  suspension: ResourceProviderModerationReporterSuspension | null;
}

export type ResourceProviderModerationReporterSuspensionFilter =
  | "any"
  | "none"
  | "reporter_suspended";

export type ResourceProviderModerationSortBy =
  | "city"
  | "createdAt"
  | "department"
  | "lastReportedAt"
  | "providerName"
  | "reason"
  | "status"
  | "verification";

export interface ResourceProviderModerationListFilters {
  city?: string;
  department?: string;
  reason?: ModerationReportReason[];
  reporterSuspension?: ResourceProviderModerationReporterSuspensionFilter;
  status?: ResourceProviderModerationReviewStatus[];
  verification?: ResourceProviderVerificationStatus[];
}

export type ResourceProviderModerationAvailableFilters =
  readonly AdminListFilterOption<
    Extract<keyof ResourceProviderModerationListFilters, string>
  >[];

export type ResourceProviderModerationListInput = AdminListInput<
  ResourceProviderModerationListFilters,
  ResourceProviderModerationSortBy
>;

export type ResourceProviderModerationListResult = AdminListResult<
  ResourceProviderModerationQueueItem,
  ResourceProviderModerationAvailableFilters,
  ResourceProviderModerationSortBy
>;

export interface ResourceProviderModerationQueueItem {
  createdAt: Date;
  id: string;
  lastReportedAt: Date;
  newestReport: {
    createdAt: Date;
    detail: string;
    reporter: ResourceProviderModerationReporter;
  };
  provider: {
    city: string;
    department: string;
    id: string;
    locationLabel: string;
    name: string;
    verificationStatus: ResourceProviderVerificationStatus;
  };
  reason: ModerationReportReason;
  reportCount: number;
  resolution: {
    note: string | null;
    reason: string | null;
    resolvedAt: Date;
    resolvedByAdminId: string | null;
  } | null;
  status: ResourceProviderModerationReviewStatus;
}

export interface ResourceProviderReportCreationResult {
  reviewItem: ResourceProviderModerationQueueItem;
  status: "already_reported" | "created";
}

export interface ResourceProviderModerationRepository {
  createResourceProviderReport(input: {
    report: CreateResourceProviderReportInput;
    reporterId: string;
  }): Promise<ResourceProviderReportCreationResult | null>;
  getResourceProviderQueueItem(input: {
    reviewItemId: string;
  }): Promise<ResourceProviderModerationQueueItem | null>;
  listResourceProviderQueue(
    input?: ResourceProviderModerationListInput,
  ): Promise<ResourceProviderModerationListResult>;
  resolveResourceProviderReviewItem(input: {
    adminId: string;
    resolutionNote?: string | null;
    resolutionReason: string;
    reviewItemId: string;
    status: ResourceProviderModerationResolutionStatus;
  }): Promise<ResourceProviderModerationQueueItem | null>;
}

type ResourceProviderReviewItemRow =
  typeof ResourceProviderModerationReviewItem.$inferSelect & {
    provider:
      | (typeof ResourceProvider.$inferSelect & {
          location: {
            approximateLocationLabel: string;
            city: string;
            department: string;
          } | null;
        })
      | null;
    reports: (typeof ResourceProviderModerationReport.$inferSelect & {
      reporter: {
        email: string;
        id: string;
        name: string;
      } | null;
    })[];
  };

export function createDrizzleResourceProviderModerationRepository(
  db: Database,
  options: { now?: () => Date } = {},
): ResourceProviderModerationRepository {
  const now = options.now ?? (() => new Date());

  return {
    createResourceProviderReport: async ({ report, reporterId }) => {
      const creationResult = await db.transaction(async (tx) => {
        const txDb = tx as unknown as Database;
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${report.providerId}), hashtext(${report.reason}))`,
        );

        const provider = await txDb.query.ResourceProvider.findFirst({
          where: and(
            eq(ResourceProvider.id, report.providerId),
            isNull(ResourceProvider.deletedAt),
          ),
          with: {
            location: true,
          },
        });

        if (!provider?.location) {
          return { status: "target_not_found" as const };
        }

        const timestamp = now();
        const existingReviewItem =
          await txDb.query.ResourceProviderModerationReviewItem.findFirst({
            where: and(
              eq(
                ResourceProviderModerationReviewItem.providerId,
                report.providerId,
              ),
              eq(ResourceProviderModerationReviewItem.reason, report.reason),
              eq(ResourceProviderModerationReviewItem.status, "pending"),
            ),
          });
        const reviewItem =
          existingReviewItem ??
          (await insertResourceProviderReviewItem(txDb, {
            providerId: report.providerId,
            reason: report.reason,
            timestamp,
          }));
        const existingReport =
          await txDb.query.ResourceProviderModerationReport.findFirst({
            where: and(
              eq(
                ResourceProviderModerationReport.providerId,
                report.providerId,
              ),
              eq(ResourceProviderModerationReport.reporterId, reporterId),
              eq(ResourceProviderModerationReport.reason, report.reason),
            ),
          });

        if (existingReport) {
          return {
            reviewItemId: reviewItem.id,
            status: "already_reported" as const,
          };
        }

        await tx.insert(ResourceProviderModerationReport).values({
          detail: report.detail,
          providerId: report.providerId,
          reason: report.reason,
          reporterId,
          reviewItemId: reviewItem.id,
        });
        await tx
          .update(ResourceProviderModerationReviewItem)
          .set({
            lastReportedAt: timestamp,
            updatedAt: timestamp,
          })
          .where(eq(ResourceProviderModerationReviewItem.id, reviewItem.id));

        return {
          reviewItemId: reviewItem.id,
          status: "created" as const,
        };
      });

      if (creationResult.status === "target_not_found") {
        return null;
      }

      const reviewItem = await listResourceProviderQueueItemById(
        db,
        creationResult.reviewItemId,
      );

      if (!reviewItem) {
        throw new Error("Resource Provider moderation item could not reload.");
      }

      return {
        reviewItem,
        status: creationResult.status,
      };
    },
    getResourceProviderQueueItem: ({ reviewItemId }) =>
      listResourceProviderQueueItemById(db, reviewItemId),
    listResourceProviderQueue: (input) =>
      listResourceProviderQueuePage(db, input),
    resolveResourceProviderReviewItem: async (input) => {
      const timestamp = now();
      const [updated] = await db
        .update(ResourceProviderModerationReviewItem)
        .set({
          resolvedAt: timestamp,
          resolvedByAdminId: input.adminId,
          resolutionNote: input.resolutionNote ?? null,
          resolutionReason: input.resolutionReason,
          status: input.status,
          updatedAt: timestamp,
        })
        .where(eq(ResourceProviderModerationReviewItem.id, input.reviewItemId))
        .returning({ id: ResourceProviderModerationReviewItem.id });

      if (!updated) {
        return null;
      }

      return listResourceProviderQueueItemById(db, updated.id);
    },
  };
}

async function insertResourceProviderReviewItem(
  db: Database,
  input: {
    providerId: string;
    reason: ModerationReportReason;
    timestamp: Date;
  },
) {
  const [created] = await db
    .insert(ResourceProviderModerationReviewItem)
    .values({
      firstReportedAt: input.timestamp,
      lastReportedAt: input.timestamp,
      providerId: input.providerId,
      reason: input.reason,
      status: "pending",
      updatedAt: input.timestamp,
    })
    .returning();

  if (!created) {
    throw new Error("Resource Provider moderation item could not be created.");
  }

  return created;
}

async function listResourceProviderQueueItemById(
  db: Database,
  reviewItemId: string,
) {
  const items = await listResourceProviderQueueItems(db, {
    reviewItemIds: [reviewItemId],
  });

  return items[0] ?? null;
}

async function listResourceProviderQueuePage(
  db: Database,
  input: ResourceProviderModerationListInput = {},
): Promise<ResourceProviderModerationListResult> {
  const normalized = normalizeAdminListInput(input, {
    defaultFilters: defaultResourceProviderModerationListFilters(),
    defaultSortBy: "lastReportedAt",
    defaultSortDirection: "desc",
  });
  const filters = buildResourceProviderQueueFilters(normalized);
  const whereClause = filters.length > 0 ? and(...filters) : sql`true`;
  const [countRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(ResourceProviderModerationReviewItem)
    .innerJoin(
      ResourceProvider,
      eq(ResourceProvider.id, ResourceProviderModerationReviewItem.providerId),
    )
    .innerJoin(
      ResourceProviderLocation,
      eq(ResourceProviderLocation.providerId, ResourceProvider.id),
    )
    .where(whereClause);
  const rows = await db
    .select({
      id: ResourceProviderModerationReviewItem.id,
    })
    .from(ResourceProviderModerationReviewItem)
    .innerJoin(
      ResourceProvider,
      eq(ResourceProvider.id, ResourceProviderModerationReviewItem.providerId),
    )
    .innerJoin(
      ResourceProviderLocation,
      eq(ResourceProviderLocation.providerId, ResourceProvider.id),
    )
    .where(whereClause)
    .orderBy(...buildResourceProviderQueueOrderBy(normalized))
    .limit(normalized.pageSize)
    .offset(normalized.offset);
  const orderedIds = rows.map((row) => row.id);
  const items = await listResourceProviderQueueItems(db, {
    reviewItemIds: orderedIds,
  });
  const itemById = new Map(items.map((item) => [item.id, item]));

  return buildAdminListResult({
    availableFilters: resourceProviderModerationAvailableFilters,
    availableSorts: resourceProviderModerationAvailableSorts,
    items: orderedIds
      .map((id) => itemById.get(id))
      .filter((item) => item !== undefined),
    page: normalized.page,
    pageSize: normalized.pageSize,
    total: Number(countRow?.total ?? rows.length),
  });
}

function buildResourceProviderQueueFilters(
  input: NormalizedAdminListInput<
    ResourceProviderModerationListFilters,
    ResourceProviderModerationSortBy
  >,
) {
  return [
    isNull(ResourceProvider.deletedAt),
    buildResourceProviderStatusFilter(input.filters.status),
    buildResourceProviderReasonFilter(input.filters.reason),
    buildResourceProviderVerificationFilter(input.filters.verification),
    buildResourceProviderCityFilter(input.filters.city),
    buildResourceProviderDepartmentFilter(input.filters.department),
    buildResourceProviderReporterSuspensionFilter(
      input.filters.reporterSuspension,
    ),
    buildResourceProviderSearchFilter(input.search),
  ].filter((filter) => filter !== undefined);
}

function buildResourceProviderStatusFilter(
  status: ResourceProviderModerationListFilters["status"],
) {
  return status && status.length > 0
    ? inArray(ResourceProviderModerationReviewItem.status, status)
    : undefined;
}

function buildResourceProviderReasonFilter(
  reason: ResourceProviderModerationListFilters["reason"],
) {
  return reason && reason.length > 0
    ? inArray(ResourceProviderModerationReviewItem.reason, reason)
    : undefined;
}

function buildResourceProviderVerificationFilter(
  verification: ResourceProviderModerationListFilters["verification"],
) {
  return verification && verification.length > 0
    ? inArray(ResourceProvider.verificationStatus, verification)
    : undefined;
}

function buildResourceProviderCityFilter(
  city: ResourceProviderModerationListFilters["city"],
) {
  return city ? eq(ResourceProviderLocation.city, city) : undefined;
}

function buildResourceProviderDepartmentFilter(
  department: ResourceProviderModerationListFilters["department"],
) {
  return department
    ? eq(ResourceProviderLocation.department, department)
    : undefined;
}

function buildResourceProviderReporterSuspensionFilter(
  reporterSuspension: ResourceProviderModerationListFilters["reporterSuspension"],
) {
  if (reporterSuspension === "reporter_suspended") {
    return suspendedReporterExists();
  }

  if (reporterSuspension === "none") {
    return sql`NOT ${suspendedReporterExists()}`;
  }

  return undefined;
}

function buildResourceProviderSearchFilter(search: string | null) {
  const searchPattern = search ? `%${escapeLikePattern(search)}%` : null;

  return searchPattern
    ? or(
        sql`${ResourceProvider.name} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${ResourceProviderLocation.city} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${ResourceProviderLocation.department} ILIKE ${searchPattern} ESCAPE '\\'`,
        sql`${ResourceProviderLocation.approximateLocationLabel} ILIKE ${searchPattern} ESCAPE '\\'`,
      )
    : undefined;
}

function suspendedReporterExists() {
  return sql`EXISTS (
    SELECT 1
    FROM ${ResourceProviderModerationReport}
    INNER JOIN ${MemberSuspension}
      ON ${MemberSuspension.memberId} = ${ResourceProviderModerationReport.reporterId}
     AND ${MemberSuspension.status} = 'active'
     AND ${MemberSuspension.revokedAt} IS NULL
    WHERE ${ResourceProviderModerationReport.reviewItemId} = ${ResourceProviderModerationReviewItem.id}
  )`;
}

function buildResourceProviderQueueOrderBy(
  input: NormalizedAdminListInput<
    ResourceProviderModerationListFilters,
    ResourceProviderModerationSortBy
  >,
) {
  const order = input.sortDirection === "asc" ? asc : desc;

  switch (input.sortBy) {
    case "city":
      return [
        order(ResourceProviderLocation.city),
        desc(ResourceProviderModerationReviewItem.lastReportedAt),
        asc(ResourceProviderModerationReviewItem.id),
      ];
    case "createdAt":
      return [
        order(ResourceProviderModerationReviewItem.createdAt),
        asc(ResourceProviderModerationReviewItem.id),
      ];
    case "department":
      return [
        order(ResourceProviderLocation.department),
        order(ResourceProviderLocation.city),
        desc(ResourceProviderModerationReviewItem.lastReportedAt),
        asc(ResourceProviderModerationReviewItem.id),
      ];
    case "providerName":
      return [
        order(ResourceProvider.name),
        desc(ResourceProviderModerationReviewItem.lastReportedAt),
        asc(ResourceProviderModerationReviewItem.id),
      ];
    case "reason":
      return [
        order(ResourceProviderModerationReviewItem.reason),
        desc(ResourceProviderModerationReviewItem.lastReportedAt),
        asc(ResourceProviderModerationReviewItem.id),
      ];
    case "status":
      return [
        order(ResourceProviderModerationReviewItem.status),
        desc(ResourceProviderModerationReviewItem.lastReportedAt),
        asc(ResourceProviderModerationReviewItem.id),
      ];
    case "verification":
      return [
        order(ResourceProvider.verificationStatus),
        desc(ResourceProviderModerationReviewItem.lastReportedAt),
        asc(ResourceProviderModerationReviewItem.id),
      ];
    case "lastReportedAt":
      return [
        order(ResourceProviderModerationReviewItem.lastReportedAt),
        desc(ResourceProviderModerationReviewItem.createdAt),
        asc(ResourceProviderModerationReviewItem.id),
      ];
  }
}

async function listResourceProviderQueueItems(
  db: Database,
  options: { reviewItemIds: readonly string[] },
): Promise<ResourceProviderModerationQueueItem[]> {
  if (options.reviewItemIds.length === 0) {
    return [];
  }

  const rows = await db.query.ResourceProviderModerationReviewItem.findMany({
    where: inArray(ResourceProviderModerationReviewItem.id, [
      ...new Set(options.reviewItemIds),
    ]),
    with: {
      provider: {
        with: {
          location: true,
        },
      },
      reports: {
        orderBy: [
          desc(ResourceProviderModerationReport.createdAt),
          desc(ResourceProviderModerationReport.id),
        ],
        with: {
          reporter: true,
        },
      },
    },
  });
  const activeSuspensions = await listActiveMemberSuspensionSummaries(
    db,
    rows
      .flatMap((row) => row.reports.map((report) => report.reporterId))
      .filter((memberId): memberId is string => Boolean(memberId)),
  );

  return rows
    .map((row) =>
      toResourceProviderModerationQueueItem(
        row as ResourceProviderReviewItemRow,
        activeSuspensions,
      ),
    )
    .filter((item) => item !== null);
}

function toResourceProviderModerationQueueItem(
  row: ResourceProviderReviewItemRow,
  activeSuspensions: Map<string, ResourceProviderModerationReporterSuspension>,
): ResourceProviderModerationQueueItem | null {
  if (!row.provider?.location || row.provider.deletedAt !== null) {
    return null;
  }

  const newestReport = row.reports[0];

  if (!newestReport) {
    return null;
  }

  return {
    createdAt: row.createdAt,
    id: row.id,
    lastReportedAt: row.lastReportedAt,
    newestReport: {
      createdAt: newestReport.createdAt,
      detail: newestReport.detail,
      reporter: toReporter(newestReport, activeSuspensions),
    },
    provider: {
      city: row.provider.location.city,
      department: row.provider.location.department,
      id: row.provider.id,
      locationLabel: row.provider.location.approximateLocationLabel,
      name: row.provider.name,
      verificationStatus: row.provider.verificationStatus,
    },
    reason: row.reason,
    reportCount: row.reports.length,
    resolution: row.resolvedAt
      ? {
          note: row.resolutionNote,
          reason: row.resolutionReason,
          resolvedAt: row.resolvedAt,
          resolvedByAdminId: row.resolvedByAdminId,
        }
      : null,
    status: row.status,
  };
}

function toReporter(
  report: ResourceProviderReviewItemRow["reports"][number],
  activeSuspensions: Map<string, ResourceProviderModerationReporterSuspension>,
): ResourceProviderModerationReporter {
  if (!report.reporter) {
    return {
      displayName: "Miembro no disponible",
      email: null,
      memberId: report.reporterId,
      suspension: report.reporterId
        ? (activeSuspensions.get(report.reporterId) ?? null)
        : null,
    };
  }

  return {
    displayName: report.reporter.name || report.reporter.email,
    email: report.reporter.email,
    memberId: report.reporter.id,
    suspension: activeSuspensions.get(report.reporter.id) ?? null,
  };
}

const resourceProviderModerationAvailableSorts = [
  {
    defaultDirection: "desc",
    label: "Ultimo reporte",
    value: "lastReportedAt",
  },
  {
    defaultDirection: "desc",
    label: "Creado",
    value: "createdAt",
  },
  {
    defaultDirection: "asc",
    label: "Proveedor",
    value: "providerName",
  },
  {
    defaultDirection: "asc",
    label: "Motivo",
    value: "reason",
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
    defaultDirection: "asc",
    label: "Estado",
    value: "status",
  },
  {
    defaultDirection: "asc",
    label: "Verificacion",
    value: "verification",
  },
] satisfies readonly AdminListSortOption<ResourceProviderModerationSortBy>[];

const resourceProviderModerationAvailableFilters = [
  {
    key: "reason",
    label: "Motivo",
    options: [
      { label: "Spam", value: "spam" },
      { label: "Estafa", value: "scam" },
      { label: "Ubicación incorrecta", value: "incorrect_location" },
      { label: "Contenido ofensivo", value: "offensive_content" },
      { label: "Crueldad animal", value: "animal_cruelty" },
      { label: "Mascota robada", value: "stolen_pet_concern" },
      { label: "Suplantacion", value: "impersonation" },
      { label: "Otro", value: "other" },
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
    key: "verification",
    label: "Verificacion",
    options: [
      { label: "No verificado", value: "unverified" },
      { label: "Verificado", value: "verified" },
    ],
    type: "enum",
  },
  {
    key: "status",
    label: "Estado",
    options: [
      { label: "Pendiente", value: "pending" },
      { label: "Reporte falso", value: "dismissed_false_report" },
      { label: "Acción tomada", value: "resolved_action_taken" },
      { label: "Sin acción", value: "resolved_no_action" },
    ],
    type: "enum",
  },
  {
    key: "reporterSuspension",
    label: "Reportante",
    options: [
      { label: "Todos", value: "any" },
      { label: "Reportante suspendido", value: "reporter_suspended" },
      { label: "Sin suspension", value: "none" },
    ],
    type: "enum",
  },
] satisfies ResourceProviderModerationAvailableFilters;

function defaultResourceProviderModerationListFilters(): ResourceProviderModerationListFilters {
  return {
    reporterSuspension: "any",
    status: ["pending"],
  };
}

export interface InMemoryResourceProviderModerationTarget {
  city: string;
  department: string;
  locationLabel: string;
  providerId: string;
  providerName: string;
  verificationStatus?: ResourceProviderVerificationStatus;
}

export function createInMemoryResourceProviderModerationRepository({
  now = () => new Date("2026-06-26T16:00:00.000Z"),
  providers,
  reporters = {},
}: {
  now?: () => Date;
  providers: readonly InMemoryResourceProviderModerationTarget[];
  reporters?: Record<string, { email?: string; name: string }>;
}): ResourceProviderModerationRepository {
  const reviewItems: {
    createdAt: Date;
    id: string;
    lastReportedAt: Date;
    provider: InMemoryResourceProviderModerationTarget;
    reason: ModerationReportReason;
    reports: {
      createdAt: Date;
      detail: string;
      reporterId: string;
    }[];
    resolutionNote: string | null;
    resolutionReason: string | null;
    resolvedAt: Date | null;
    resolvedByAdminId: string | null;
    status: ResourceProviderModerationReviewStatus;
    updatedAt: Date;
  }[] = [];

  const toQueueItem = (
    reviewItem: (typeof reviewItems)[number],
  ): ResourceProviderModerationQueueItem => {
    const newestReport = reviewItem.reports[0];

    if (!newestReport) {
      throw new Error(
        "Resource Provider moderation queue item has no reports.",
      );
    }

    const reporter = reporters[newestReport.reporterId];

    return {
      createdAt: reviewItem.createdAt,
      id: reviewItem.id,
      lastReportedAt: reviewItem.lastReportedAt,
      newestReport: {
        createdAt: newestReport.createdAt,
        detail: newestReport.detail,
        reporter: {
          displayName: reporter?.name ?? newestReport.reporterId,
          email: reporter?.email ?? null,
          memberId: newestReport.reporterId,
          suspension: null,
        },
      },
      provider: {
        city: reviewItem.provider.city,
        department: reviewItem.provider.department,
        id: reviewItem.provider.providerId,
        locationLabel: reviewItem.provider.locationLabel,
        name: reviewItem.provider.providerName,
        verificationStatus:
          reviewItem.provider.verificationStatus ?? "unverified",
      },
      reason: reviewItem.reason,
      reportCount: reviewItem.reports.length,
      resolution: reviewItem.resolvedAt
        ? {
            note: reviewItem.resolutionNote,
            reason: reviewItem.resolutionReason,
            resolvedAt: reviewItem.resolvedAt,
            resolvedByAdminId: reviewItem.resolvedByAdminId,
          }
        : null,
      status: reviewItem.status,
    };
  };

  const listResourceProviderQueue = async (
    input: ResourceProviderModerationListInput = {},
  ) => {
    const normalized = normalizeAdminListInput(input, {
      defaultFilters: defaultResourceProviderModerationListFilters(),
      defaultSortBy: "lastReportedAt",
      defaultSortDirection: "desc",
    });
    const normalizedSearch = normalized.search?.toLowerCase() ?? null;
    const filteredItems = reviewItems
      .map(toQueueItem)
      .filter((item) =>
        normalizedSearch
          ? [
              item.provider.city,
              item.provider.department,
              item.provider.locationLabel,
              item.provider.name,
            ].some((value) => value.toLowerCase().includes(normalizedSearch))
          : true,
      )
      .filter((item) =>
        normalized.filters.status && normalized.filters.status.length > 0
          ? normalized.filters.status.includes(item.status)
          : true,
      )
      .filter((item) =>
        normalized.filters.reason && normalized.filters.reason.length > 0
          ? normalized.filters.reason.includes(item.reason)
          : true,
      )
      .filter((item) =>
        normalized.filters.verification &&
        normalized.filters.verification.length > 0
          ? normalized.filters.verification.includes(
              item.provider.verificationStatus,
            )
          : true,
      )
      .filter((item) =>
        normalized.filters.city
          ? item.provider.city === normalized.filters.city
          : true,
      )
      .filter((item) =>
        normalized.filters.department
          ? item.provider.department === normalized.filters.department
          : true,
      )
      .sort((left, right) =>
        compareAdminListItems(
          left,
          right,
          buildResourceProviderModerationSortSpecs(
            normalized.sortBy,
            normalized.sortDirection,
          ),
        ),
      );

    return Promise.resolve(
      buildAdminListResult({
        availableFilters: resourceProviderModerationAvailableFilters,
        availableSorts: resourceProviderModerationAvailableSorts,
        items: filteredItems.slice(
          normalized.offset,
          normalized.offset + normalized.pageSize,
        ),
        page: normalized.page,
        pageSize: normalized.pageSize,
        total: filteredItems.length,
      }),
    );
  };

  return {
    createResourceProviderReport({ report, reporterId }) {
      const provider = providers.find(
        (candidate) => candidate.providerId === report.providerId,
      );

      if (!provider) {
        return Promise.resolve(null);
      }

      const timestamp = now();
      const existingReviewItem = reviewItems.find(
        (candidate) =>
          candidate.provider.providerId === report.providerId &&
          candidate.reason === report.reason &&
          candidate.status === "pending",
      );
      const reviewItem = existingReviewItem ?? {
        createdAt: timestamp,
        id: `review-${reviewItems.length + 1}`,
        lastReportedAt: timestamp,
        provider,
        reason: report.reason,
        reports: [],
        resolutionNote: null,
        resolutionReason: null,
        resolvedAt: null,
        resolvedByAdminId: null,
        status: "pending" as const,
        updatedAt: timestamp,
      };
      const existingReport = reviewItem.reports.find(
        (candidate) => candidate.reporterId === reporterId,
      );

      if (!existingReviewItem) {
        reviewItems.push(reviewItem);
      }

      if (existingReport) {
        return Promise.resolve({
          reviewItem: toQueueItem(reviewItem),
          status: "already_reported",
        });
      }

      reviewItem.reports.unshift({
        createdAt: timestamp,
        detail: report.detail,
        reporterId,
      });
      reviewItem.lastReportedAt = timestamp;
      reviewItem.updatedAt = timestamp;

      return Promise.resolve({
        reviewItem: toQueueItem(reviewItem),
        status: "created",
      });
    },
    getResourceProviderQueueItem({ reviewItemId }) {
      const reviewItem = reviewItems.find((item) => item.id === reviewItemId);

      return Promise.resolve(reviewItem ? toQueueItem(reviewItem) : null);
    },
    listResourceProviderQueue,
    resolveResourceProviderReviewItem(input) {
      const reviewItem = reviewItems.find(
        (item) => item.id === input.reviewItemId,
      );

      if (!reviewItem) {
        return Promise.resolve(null);
      }

      const timestamp = now();
      reviewItem.resolutionNote = input.resolutionNote ?? null;
      reviewItem.resolutionReason = input.resolutionReason;
      reviewItem.resolvedAt = timestamp;
      reviewItem.resolvedByAdminId = input.adminId;
      reviewItem.status = input.status;
      reviewItem.updatedAt = timestamp;

      return Promise.resolve(toQueueItem(reviewItem));
    },
  };
}

function buildResourceProviderModerationSortSpecs(
  sortBy: ResourceProviderModerationSortBy,
  sortDirection: "asc" | "desc",
): readonly AdminListSortSpec<ResourceProviderModerationQueueItem>[] {
  const secondary = [
    {
      direction: "asc",
      getValue: (item: ResourceProviderModerationQueueItem) => item.id,
    },
  ] satisfies readonly AdminListSortSpec<ResourceProviderModerationQueueItem>[];

  switch (sortBy) {
    case "city":
      return [
        { direction: sortDirection, getValue: (item) => item.provider.city },
        { direction: "desc", getValue: (item) => item.lastReportedAt },
        ...secondary,
      ];
    case "createdAt":
      return [
        { direction: sortDirection, getValue: (item) => item.createdAt },
        ...secondary,
      ];
    case "department":
      return [
        {
          direction: sortDirection,
          getValue: (item) => item.provider.department,
        },
        { direction: "asc", getValue: (item) => item.provider.city },
        { direction: "desc", getValue: (item) => item.lastReportedAt },
        ...secondary,
      ];
    case "lastReportedAt":
      return [
        { direction: sortDirection, getValue: (item) => item.lastReportedAt },
        { direction: "desc", getValue: (item) => item.createdAt },
        ...secondary,
      ];
    case "providerName":
      return [
        { direction: sortDirection, getValue: (item) => item.provider.name },
        { direction: "desc", getValue: (item) => item.lastReportedAt },
        ...secondary,
      ];
    case "reason":
      return [
        { direction: sortDirection, getValue: (item) => item.reason },
        { direction: "desc", getValue: (item) => item.lastReportedAt },
        ...secondary,
      ];
    case "status":
      return [
        { direction: sortDirection, getValue: (item) => item.status },
        { direction: "desc", getValue: (item) => item.lastReportedAt },
        ...secondary,
      ];
    case "verification":
      return [
        {
          direction: sortDirection,
          getValue: (item) => item.provider.verificationStatus,
        },
        { direction: "desc", getValue: (item) => item.lastReportedAt },
        ...secondary,
      ];
  }
}

function escapeLikePattern(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}
