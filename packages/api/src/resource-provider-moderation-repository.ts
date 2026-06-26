import type { Database } from "@acme/db/client";
import type {
  CreateResourceProviderReportInput,
  ModerationReportReason,
  ResourceProviderVerificationStatus,
} from "@acme/validators";
import { and, desc, eq, isNull, sql } from "@acme/db";
import {
  ResourceProvider,
  ResourceProviderModerationReport,
  ResourceProviderModerationReviewItem,
} from "@acme/db/schema";

import type { ActiveMemberSuspensionSummary } from "./member-suspension-repository";
import { listActiveMemberSuspensionSummaries } from "./member-suspension-repository";

export interface ResourceProviderModerationReporter {
  displayName: string;
  email: string | null;
  memberId: string | null;
  suspension: ResourceProviderModerationReporterSuspension | null;
}

export type ResourceProviderModerationReporterSuspension =
  ActiveMemberSuspensionSummary;

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
  status: "pending";
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
  listResourceProviderQueue(): Promise<ResourceProviderModerationQueueItem[]>;
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

      const reviewItem = (
        await listResourceProviderQueueItems(db, {
          reviewItemId: creationResult.reviewItemId,
        })
      )[0];

      if (!reviewItem) {
        throw new Error("Resource Provider moderation item could not reload.");
      }

      return {
        reviewItem,
        status: creationResult.status,
      };
    },
    listResourceProviderQueue: () => listResourceProviderQueueItems(db),
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

async function listResourceProviderQueueItems(
  db: Database,
  options: { reviewItemId?: string } = {},
): Promise<ResourceProviderModerationQueueItem[]> {
  const rows = await db.query.ResourceProviderModerationReviewItem.findMany({
    orderBy: [desc(ResourceProviderModerationReviewItem.lastReportedAt)],
    where: options.reviewItemId
      ? eq(ResourceProviderModerationReviewItem.id, options.reviewItemId)
      : eq(ResourceProviderModerationReviewItem.status, "pending"),
    with: {
      provider: {
        with: {
          location: true,
        },
      },
      reports: {
        orderBy: [desc(ResourceProviderModerationReport.createdAt)],
        with: {
          reporter: true,
        },
      },
    },
  });
  const activeSuspensions = await listActiveMemberSuspensionSummaries(
    db,
    rows
      .map((row) => row.reports[0]?.reporterId)
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
  const reviewItems = new Map<
    string,
    {
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
    }
  >();

  return {
    createResourceProviderReport({ report, reporterId }) {
      const provider = providers.find(
        (candidate) => candidate.providerId === report.providerId,
      );

      if (!provider) {
        return Promise.resolve(null);
      }

      const key = `${report.providerId}:${report.reason}`;
      const timestamp = now();
      const existingReviewItem = reviewItems.get(key);
      const reviewItem = existingReviewItem ?? {
        createdAt: timestamp,
        id: `review-${reviewItems.size + 1}`,
        lastReportedAt: timestamp,
        provider,
        reason: report.reason,
        reports: [],
      };
      const existingReport = reviewItem.reports.find(
        (candidate) => candidate.reporterId === reporterId,
      );

      if (!existingReviewItem) {
        reviewItems.set(key, reviewItem);
      }

      if (existingReport) {
        return Promise.resolve({
          reviewItem: toInMemoryQueueItem(reviewItem, reporters),
          status: "already_reported",
        });
      }

      reviewItem.reports.unshift({
        createdAt: timestamp,
        detail: report.detail,
        reporterId,
      });
      reviewItem.lastReportedAt = timestamp;

      return Promise.resolve({
        reviewItem: toInMemoryQueueItem(reviewItem, reporters),
        status: "created",
      });
    },
    listResourceProviderQueue() {
      return Promise.resolve(
        Array.from(reviewItems.values())
          .map((reviewItem) => toInMemoryQueueItem(reviewItem, reporters))
          .sort(
            (left, right) =>
              right.lastReportedAt.getTime() - left.lastReportedAt.getTime(),
          ),
      );
    },
  };
}

function toInMemoryQueueItem(
  reviewItem: {
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
  },
  reporters: Record<string, { email?: string; name: string }>,
): ResourceProviderModerationQueueItem {
  const newestReport = reviewItem.reports[0];

  if (!newestReport) {
    throw new Error("Resource Provider moderation queue item has no reports.");
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
    status: "pending",
  };
}
