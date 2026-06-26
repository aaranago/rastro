import type { Database } from "@acme/db/client";
import type { ReportLocation } from "@acme/db/schema";
import type { ReportType } from "@acme/validators";
import { and, desc, eq, inArray, isNull } from "@acme/db";
import { Report, ReportModerationAction } from "@acme/db/schema";

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

export interface ReportModerationQueueItem {
  createdAt: Date;
  id: string;
  newestAction: {
    action: "hide" | "restore";
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
  };
  updatedAt: Date;
}

export type ReportModerationMemberSuspension = ActiveMemberSuspensionSummary;

export interface ReportModerationRepository {
  hideReportTarget(
    input: ReportModerationTransitionInput,
  ): Promise<ReportModerationQueueItem | null>;
  listReportQueue(): Promise<ReportModerationQueueItem[]>;
  restoreReportTarget(
    input: ReportModerationTransitionInput,
  ): Promise<ReportModerationQueueItem | null>;
}

export interface ReportModerationTransitionInput {
  adminId: string;
  note?: string | null;
  reason: string;
  reportId: string;
}

type ReportQueueRow = typeof Report.$inferSelect & {
  caretaker: {
    email: string;
    id: string;
    name: string;
  };
  location: typeof ReportLocation.$inferSelect | null;
};

export function createDrizzleReportModerationRepository(
  db: Database,
): ReportModerationRepository {
  const findLatestAction = async (reportId: string) => {
    return db.query.ReportModerationAction.findFirst({
      orderBy: [desc(ReportModerationAction.createdAt)],
      where: eq(ReportModerationAction.reportId, reportId),
    });
  };

  const listReportQueue = async (
    reportId?: string,
  ): Promise<ReportModerationQueueItem[]> => {
    const filters = [
      isNull(Report.deletedAt),
      inArray(Report.type, reportModerationTypes),
      reportId ? eq(Report.id, reportId) : undefined,
    ].filter((filter) => filter !== undefined);
    const rows = await db.query.Report.findMany({
      orderBy: [desc(Report.updatedAt), desc(Report.createdAt)],
      where: and(...filters),
      with: {
        caretaker: true,
        location: true,
      },
    });
    const activeSuspensions = await listActiveMemberSuspensionSummaries(
      db,
      rows.map((row) => row.caretaker.id),
    );

    const items = await Promise.all(
      rows.map(async (row) =>
        toReportModerationQueueItem(
          row,
          await findLatestAction(row.id),
          activeSuspensions.get(row.caretaker.id) ?? null,
        ),
      ),
    );

    return items.filter((item) => item !== null);
  };

  const transition = async (
    action: "hide" | "restore",
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

      if (action === "hide") {
        await tx
          .update(Report)
          .set({
            hiddenAt: new Date(),
            hiddenByAdminId: input.adminId,
            hiddenNote: input.note ?? null,
            hiddenReason: input.reason,
          })
          .where(eq(Report.id, input.reportId));
      } else {
        await tx
          .update(Report)
          .set({
            hiddenAt: null,
            hiddenByAdminId: null,
            hiddenNote: null,
            hiddenReason: null,
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

    return (await listReportQueue(changedReportId))[0] ?? null;
  };

  return {
    hideReportTarget: (input) => transition("hide", input),
    listReportQueue: () => listReportQueue(),
    restoreReportTarget: (input) => transition("restore", input),
  };
}

function toReportModerationQueueItem(
  report: ReportQueueRow,
  latestAction: typeof ReportModerationAction.$inferSelect | undefined,
  activeSuspension: ReportModerationMemberSuspension | null,
): ReportModerationQueueItem | null {
  if (!report.location) {
    return null;
  }

  const targetLocation = parseLocationLabel(report.location.label);

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
      city: targetLocation.city,
      department: targetLocation.department,
      hiddenAt: report.hiddenAt,
      hiddenByAdminId: report.hiddenByAdminId,
      hiddenNote: report.hiddenNote,
      hiddenReason: report.hiddenReason,
      id: report.id,
      locationLabel: report.location.label,
      reportType: report.type,
      status: report.hiddenAt ? "hidden" : "visible",
      title: report.title,
      type: toReportModerationTargetType(report.type),
    },
    updatedAt: report.updatedAt,
  };
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

function parseLocationLabel(label: string) {
  const [city, department] = label
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return {
    city: city ?? label,
    department: department ?? city ?? "Bolivia",
  };
}
