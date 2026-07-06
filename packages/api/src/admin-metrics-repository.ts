import type { Database } from "@acme/db/client";
import { and, eq, isNull, sql } from "@acme/db";
import {
  AdminAuditEvent,
  LocalSponsorPlacement,
  LocalSponsorPlacementDeliveryEvent,
  MemberSuspension,
  Report,
  ReportLocation,
  ResourceProvider,
  ResourceProviderLocation,
  ResourceProviderModerationReviewItem,
} from "@acme/db/schema";

export interface AdminMetricsSummaryCard {
  id: string;
  label: string;
  value: number;
}

export interface AdminLocationMetricRow {
  adoptionListingCount: number;
  city: string | null;
  contentReportCount: number;
  department: string;
  hiddenReportCount: number;
  pendingProviderReportCount: number;
  pendingReviewReportCount: number;
  resourceProviderCount: number;
  sponsorImpressionCount: number;
  sponsorOpenCount: number;
  sponsorPlacementCount: number;
  verifiedResourceProviderCount: number;
}

export interface AdminMetricsOverview {
  auditEventCount: number;
  cityRows: AdminLocationMetricRow[];
  departmentRows: AdminLocationMetricRow[];
  generatedAt: Date;
  summaryCards: AdminMetricsSummaryCard[];
  suspendedMemberCount: number;
}

export interface AdminMetricsRepository {
  overview(): Promise<AdminMetricsOverview>;
}

export type LocationAggregate = Omit<
  AdminLocationMetricRow,
  "city" | "department"
>;

export interface CityLocationKey {
  city: string;
  department: string;
}

export function createDrizzleAdminMetricsRepository(
  db: Database,
  options: { now?: () => Date } = {},
): AdminMetricsRepository {
  const now = options.now ?? (() => new Date());

  return {
    overview: async () => {
      const generatedAt = now();
      const [
        contentRows,
        resourceRows,
        providerReportRows,
        sponsorRows,
        sponsorDeliveryRows,
        auditEventCount,
        suspendedMemberCount,
      ] = await Promise.all([
        listContentMetricRows(db),
        listResourceProviderMetricRows(db),
        listProviderModerationMetricRows(db),
        listSponsorPlacementMetricRows(db, generatedAt),
        listSponsorDeliveryMetricRows(db),
        countAdminAuditEvents(db),
        countActiveMemberSuspensions(db),
      ]);

      return buildAdminMetricsOverviewFromGroups({
        auditEventCount,
        generatedAt,
        groups: [
          contentRows,
          resourceRows,
          providerReportRows,
          sponsorRows,
          sponsorDeliveryRows,
        ],
        suspendedMemberCount,
      });
    },
  };
}

export function buildAdminMetricsOverviewFromGroups({
  auditEventCount = 0,
  generatedAt,
  groups,
  suspendedMemberCount = 0,
}: {
  auditEventCount?: number;
  generatedAt: Date;
  groups: readonly {
    key: CityLocationKey;
    metrics: LocationAggregate;
  }[][];
  suspendedMemberCount?: number;
}): AdminMetricsOverview {
  const cityRows = mergeCityMetrics(groups);
  const departmentRows = mergeDepartmentMetrics(cityRows);

  return {
    auditEventCount,
    cityRows,
    departmentRows,
    generatedAt,
    summaryCards: buildSummaryCards(cityRows),
    suspendedMemberCount,
  };
}

export function createInMemoryAdminMetricsRepository(
  overview: AdminMetricsOverview,
): AdminMetricsRepository {
  return {
    overview: () =>
      Promise.resolve({
        auditEventCount: overview.auditEventCount,
        cityRows: overview.cityRows.map((row) => ({ ...row })),
        departmentRows: overview.departmentRows.map((row) => ({ ...row })),
        generatedAt: overview.generatedAt,
        summaryCards: overview.summaryCards.map((card) => ({ ...card })),
        suspendedMemberCount: overview.suspendedMemberCount,
      }),
  };
}

async function countAdminAuditEvents(db: Database) {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(AdminAuditEvent);

  return Number(row?.count ?? 0);
}

async function countActiveMemberSuspensions(db: Database) {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(MemberSuspension)
    .where(
      and(
        eq(MemberSuspension.status, "active"),
        isNull(MemberSuspension.revokedAt),
      ),
    );

  return Number(row?.count ?? 0);
}

async function listContentMetricRows(db: Database) {
  const rows = await db
    .select({
      adoptionListingCount: sql<number>`count(*) filter (where ${Report.type} = 'adoption')::int`,
      city: ReportLocation.city,
      contentReportCount: sql<number>`count(*)::int`,
      department: ReportLocation.department,
      hiddenReportCount: sql<number>`count(*) filter (where ${Report.hiddenAt} is not null)::int`,
      pendingReviewReportCount: sql<number>`count(*) filter (where ${Report.status} = 'pending_review')::int`,
    })
    .from(Report)
    .innerJoin(ReportLocation, eq(ReportLocation.reportId, Report.id))
    .where(isNull(Report.deletedAt))
    .groupBy(ReportLocation.city, ReportLocation.department);

  return rows.map((row) => ({
    key: {
      city: row.city,
      department: row.department,
    },
    metrics: {
      adoptionListingCount: Number(row.adoptionListingCount),
      contentReportCount: Number(row.contentReportCount),
      hiddenReportCount: Number(row.hiddenReportCount),
      pendingProviderReportCount: 0,
      pendingReviewReportCount: Number(row.pendingReviewReportCount),
      resourceProviderCount: 0,
      sponsorImpressionCount: 0,
      sponsorOpenCount: 0,
      sponsorPlacementCount: 0,
      verifiedResourceProviderCount: 0,
    },
  }));
}

async function listResourceProviderMetricRows(db: Database) {
  const rows = await db
    .select({
      city: ResourceProviderLocation.city,
      department: ResourceProviderLocation.department,
      resourceProviderCount: sql<number>`count(*)::int`,
      verifiedResourceProviderCount: sql<number>`count(*) filter (where ${ResourceProvider.verificationStatus} = 'verified')::int`,
    })
    .from(ResourceProvider)
    .innerJoin(
      ResourceProviderLocation,
      eq(ResourceProviderLocation.providerId, ResourceProvider.id),
    )
    .where(isNull(ResourceProvider.deletedAt))
    .groupBy(
      ResourceProviderLocation.city,
      ResourceProviderLocation.department,
    );

  return rows.map((row) => ({
    key: {
      city: row.city,
      department: row.department,
    },
    metrics: {
      adoptionListingCount: 0,
      contentReportCount: 0,
      hiddenReportCount: 0,
      pendingProviderReportCount: 0,
      pendingReviewReportCount: 0,
      resourceProviderCount: Number(row.resourceProviderCount),
      sponsorImpressionCount: 0,
      sponsorOpenCount: 0,
      sponsorPlacementCount: 0,
      verifiedResourceProviderCount: Number(row.verifiedResourceProviderCount),
    },
  }));
}

async function listProviderModerationMetricRows(db: Database) {
  const rows = await db
    .select({
      city: ResourceProviderLocation.city,
      department: ResourceProviderLocation.department,
      pendingProviderReportCount: sql<number>`count(*)::int`,
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
    .where(
      and(
        isNull(ResourceProvider.deletedAt),
        eq(ResourceProviderModerationReviewItem.status, "pending"),
      ),
    )
    .groupBy(
      ResourceProviderLocation.city,
      ResourceProviderLocation.department,
    );

  return rows.map((row) => ({
    key: {
      city: row.city,
      department: row.department,
    },
    metrics: {
      adoptionListingCount: 0,
      contentReportCount: 0,
      hiddenReportCount: 0,
      pendingProviderReportCount: Number(row.pendingProviderReportCount),
      pendingReviewReportCount: 0,
      resourceProviderCount: 0,
      sponsorImpressionCount: 0,
      sponsorOpenCount: 0,
      sponsorPlacementCount: 0,
      verifiedResourceProviderCount: 0,
    },
  }));
}

async function listSponsorPlacementMetricRows(db: Database, generatedAt: Date) {
  const rows = await db
    .select({
      city: ResourceProviderLocation.city,
      department: ResourceProviderLocation.department,
      sponsorPlacementCount: sql<number>`count(*)::int`,
    })
    .from(LocalSponsorPlacement)
    .innerJoin(
      ResourceProvider,
      eq(ResourceProvider.id, LocalSponsorPlacement.providerId),
    )
    .innerJoin(
      ResourceProviderLocation,
      eq(ResourceProviderLocation.providerId, ResourceProvider.id),
    )
    .where(buildCurrentSponsorPlacementMetricCondition(generatedAt))
    .groupBy(
      ResourceProviderLocation.city,
      ResourceProviderLocation.department,
    );

  return rows.map((row) => ({
    key: {
      city: row.city,
      department: row.department,
    },
    metrics: {
      adoptionListingCount: 0,
      contentReportCount: 0,
      hiddenReportCount: 0,
      pendingProviderReportCount: 0,
      pendingReviewReportCount: 0,
      resourceProviderCount: 0,
      sponsorImpressionCount: 0,
      sponsorOpenCount: 0,
      sponsorPlacementCount: Number(row.sponsorPlacementCount),
      verifiedResourceProviderCount: 0,
    },
  }));
}

export function buildCurrentSponsorPlacementMetricCondition(generatedAt: Date) {
  return and(
    isNull(ResourceProvider.deletedAt),
    isNull(LocalSponsorPlacement.detachedAt),
    sql`${LocalSponsorPlacement.startsAt} <= ${generatedAt}`,
    sql`${LocalSponsorPlacement.endsAt} >= ${generatedAt}`,
  );
}

async function listSponsorDeliveryMetricRows(db: Database) {
  const rows = await db
    .select({
      city: ResourceProviderLocation.city,
      department: ResourceProviderLocation.department,
      sponsorImpressionCount: sql<number>`count(*) filter (where ${LocalSponsorPlacementDeliveryEvent.eventType} = 'impression')::int`,
      sponsorOpenCount: sql<number>`count(*) filter (where ${LocalSponsorPlacementDeliveryEvent.eventType} = 'open')::int`,
    })
    .from(LocalSponsorPlacementDeliveryEvent)
    .innerJoin(
      ResourceProvider,
      eq(ResourceProvider.id, LocalSponsorPlacementDeliveryEvent.providerId),
    )
    .innerJoin(
      ResourceProviderLocation,
      eq(ResourceProviderLocation.providerId, ResourceProvider.id),
    )
    .where(isNull(ResourceProvider.deletedAt))
    .groupBy(
      ResourceProviderLocation.city,
      ResourceProviderLocation.department,
    );

  return rows.map((row) => ({
    key: {
      city: row.city,
      department: row.department,
    },
    metrics: {
      adoptionListingCount: 0,
      contentReportCount: 0,
      hiddenReportCount: 0,
      pendingProviderReportCount: 0,
      pendingReviewReportCount: 0,
      resourceProviderCount: 0,
      sponsorImpressionCount: Number(row.sponsorImpressionCount),
      sponsorOpenCount: Number(row.sponsorOpenCount),
      sponsorPlacementCount: 0,
      verifiedResourceProviderCount: 0,
    },
  }));
}

function mergeCityMetrics(
  groups: readonly {
    key: CityLocationKey;
    metrics: LocationAggregate;
  }[][],
): AdminLocationMetricRow[] {
  const rows = new Map<string, AdminLocationMetricRow>();

  for (const group of groups) {
    for (const row of group) {
      const key = `${row.key.department}::${row.key.city}`;
      const existing =
        rows.get(key) ??
        ({
          city: row.key.city,
          department: row.key.department,
          ...emptyLocationAggregate(),
        } satisfies AdminLocationMetricRow);

      rows.set(key, addMetrics(existing, row.metrics));
    }
  }

  return [...rows.values()].sort(sortLocationRows);
}

function mergeDepartmentMetrics(
  cityRows: readonly AdminLocationMetricRow[],
): AdminLocationMetricRow[] {
  const rows = new Map<string, AdminLocationMetricRow>();

  for (const cityRow of cityRows) {
    const existing =
      rows.get(cityRow.department) ??
      ({
        city: null,
        department: cityRow.department,
        ...emptyLocationAggregate(),
      } satisfies AdminLocationMetricRow);

    rows.set(cityRow.department, addMetrics(existing, cityRow));
  }

  return [...rows.values()].sort(sortLocationRows);
}

function buildSummaryCards(
  rows: readonly AdminLocationMetricRow[],
): AdminMetricsSummaryCard[] {
  const totals = rows.reduce(
    (accumulator, row) => addMetrics(accumulator, row),
    emptyLocationAggregate(),
  );

  return [
    {
      id: "content-reports",
      label: "Reportes",
      value: totals.contentReportCount,
    },
    {
      id: "hidden-reports",
      label: "Ocultos",
      value: totals.hiddenReportCount,
    },
    {
      id: "resource-providers",
      label: "Resource Providers",
      value: totals.resourceProviderCount,
    },
    {
      id: "pending-provider-reports",
      label: "Reportes de proveedores",
      value: totals.pendingProviderReportCount,
    },
    {
      id: "sponsor-placements",
      label: "Patrocinios activos",
      value: totals.sponsorPlacementCount,
    },
    {
      id: "sponsor-impressions",
      label: "Impresiones de patrocinio",
      value: totals.sponsorImpressionCount,
    },
    {
      id: "sponsor-opens",
      label: "Aperturas de patrocinio",
      value: totals.sponsorOpenCount,
    },
  ];
}

function addMetrics<T extends LocationAggregate>(
  left: T,
  right: LocationAggregate,
): T {
  return {
    ...left,
    adoptionListingCount:
      left.adoptionListingCount + right.adoptionListingCount,
    contentReportCount: left.contentReportCount + right.contentReportCount,
    hiddenReportCount: left.hiddenReportCount + right.hiddenReportCount,
    pendingProviderReportCount:
      left.pendingProviderReportCount + right.pendingProviderReportCount,
    pendingReviewReportCount:
      left.pendingReviewReportCount + right.pendingReviewReportCount,
    resourceProviderCount:
      left.resourceProviderCount + right.resourceProviderCount,
    sponsorImpressionCount:
      left.sponsorImpressionCount + right.sponsorImpressionCount,
    sponsorOpenCount: left.sponsorOpenCount + right.sponsorOpenCount,
    sponsorPlacementCount:
      left.sponsorPlacementCount + right.sponsorPlacementCount,
    verifiedResourceProviderCount:
      left.verifiedResourceProviderCount + right.verifiedResourceProviderCount,
  };
}

function emptyLocationAggregate(): LocationAggregate {
  return {
    adoptionListingCount: 0,
    contentReportCount: 0,
    hiddenReportCount: 0,
    pendingProviderReportCount: 0,
    pendingReviewReportCount: 0,
    resourceProviderCount: 0,
    sponsorImpressionCount: 0,
    sponsorOpenCount: 0,
    sponsorPlacementCount: 0,
    verifiedResourceProviderCount: 0,
  };
}

function sortLocationRows(
  left: AdminLocationMetricRow,
  right: AdminLocationMetricRow,
) {
  const departmentComparison = left.department.localeCompare(right.department);

  return departmentComparison === 0
    ? (left.city ?? "").localeCompare(right.city ?? "")
    : departmentComparison;
}
