import type { TRPCRouterRecord } from "@trpc/server";

import type { Database } from "@acme/db/client";
import type {
  ActivityInboxCandidateMatchItemOutput,
  ActivityInboxItemOutput,
  ActivityInboxModerationEventItemOutput,
  ActivityInboxOutput,
  ActivityInboxReportUpdateItemOutput,
  ReportOutcome,
  ReportStatus,
  ReportType,
} from "@acme/validators";
import {
  alias,
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  ne,
  sql,
} from "@acme/db";
import {
  Report,
  ReportLifecycleEvent,
  ReportLocation,
  ReportModerationAction,
} from "@acme/db/schema";
import {
  activityInboxInputSchema,
  activityInboxOutputSchema,
} from "@acme/validators";

import type { PersistedAlertNotificationDelivery } from "../alert-repository";
import type { PersistedChatConversation } from "../chat-repository";
import { buildReportSubjectHref } from "../chat-repository";
import { protectedProcedure } from "../trpc";

const defaultInboxLimit = 50;
const candidateMatchRadiusMeters = 5000;

export const activityRouter = {
  inbox: protectedProcedure
    .input(activityInboxInputSchema)
    .output(activityInboxOutputSchema)
    .query(async ({ ctx, input }) => {
      const memberId = ctx.session.user.id;
      const limit = input.limit ?? defaultInboxLimit;
      const [
        alertDeliveries,
        chatConversations,
        reportUpdates,
        moderationEvents,
        candidateMatches,
      ] = await Promise.all([
        ctx.alertRepository.listMemberDeliveryHistory({
          limit,
          memberId,
        }),
        ctx.chatRepository.listConversations({
          viewerMemberId: memberId,
        }),
        listReportUpdateActivityRows(ctx.db, memberId, limit),
        listModerationEventActivityRows(ctx.db, memberId, limit),
        listCandidateMatchActivityRows(ctx.db, memberId, limit),
      ]);
      const items = [
        ...alertDeliveries.map(toAlertDeliveryInboxItem),
        ...chatConversations.map((conversation) =>
          toChatConversationInboxItem(conversation, memberId),
        ),
        ...reportUpdates.map(toReportUpdateInboxItem),
        ...moderationEvents.map(toModerationEventInboxItem),
        ...candidateMatches.map(toCandidateMatchInboxItem),
      ].sort(compareInboxItems);

      return {
        items: items.slice(0, limit),
      } satisfies ActivityInboxOutput;
    }),
} satisfies TRPCRouterRecord;

type ActivityReportAvailability =
  ActivityInboxReportUpdateItemOutput["update"]["report"]["availability"];
type ActivityReportKind =
  ActivityInboxReportUpdateItemOutput["update"]["report"]["kind"];
type ActivityReportSummary =
  ActivityInboxReportUpdateItemOutput["update"]["report"];

interface ActivityReportRow {
  deletedAt: Date | null;
  falseReportedAt: Date | null;
  hiddenAt: Date | null;
  id: string;
  outcome: ReportOutcome | null;
  status: ReportStatus;
  title: string;
  type: ReportType;
}

interface ReportUpdateActivityRow {
  actorMemberId: string | null;
  createdAt: Date;
  eventType: "created" | "deleted" | "resolved" | "updated";
  fromStatus: ReportStatus | null;
  id: string;
  note: string | null;
  outcome: ReportOutcome | null;
  report: ActivityReportRow;
  toStatus: ReportStatus | null;
}

interface ModerationEventActivityRow {
  action: "hide" | "mark_false" | "restore" | "unmark_false";
  adminId: string | null;
  createdAt: Date;
  id: string;
  note: string | null;
  reason: string;
  report: ActivityReportRow;
}

interface CandidateMatchActivityRow {
  candidate: ActivityReportRow;
  createdAt: Date;
  distanceMeters: number;
  locationLabel: string;
  ownedReport: ActivityReportRow;
}

const activityReportKindByType = {
  adoption: "adoption-listing",
  found_pet: "found-pet-report",
  lost_pet: "lost-pet-report",
  sighting: "sighting-report",
} satisfies Record<ReportType, ActivityReportKind>;

function listReportUpdateActivityRows(
  db: Database,
  memberId: string,
  limit: number,
) {
  return db
    .select({
      actorMemberId: ReportLifecycleEvent.actorId,
      createdAt: ReportLifecycleEvent.createdAt,
      eventType: ReportLifecycleEvent.type,
      fromStatus: ReportLifecycleEvent.fromStatus,
      id: ReportLifecycleEvent.id,
      note: ReportLifecycleEvent.note,
      outcome: ReportLifecycleEvent.outcome,
      report: {
        deletedAt: Report.deletedAt,
        falseReportedAt: Report.falseReportedAt,
        hiddenAt: Report.hiddenAt,
        id: Report.id,
        outcome: Report.outcome,
        status: Report.status,
        title: Report.title,
        type: Report.type,
      },
      toStatus: ReportLifecycleEvent.toStatus,
    })
    .from(ReportLifecycleEvent)
    .innerJoin(Report, eq(ReportLifecycleEvent.reportId, Report.id))
    .where(eq(Report.caretakerId, memberId))
    .orderBy(
      desc(ReportLifecycleEvent.createdAt),
      desc(ReportLifecycleEvent.id),
    )
    .limit(limit);
}

function listModerationEventActivityRows(
  db: Database,
  memberId: string,
  limit: number,
) {
  return db
    .select({
      action: ReportModerationAction.action,
      adminId: ReportModerationAction.adminId,
      createdAt: ReportModerationAction.createdAt,
      id: ReportModerationAction.id,
      note: ReportModerationAction.note,
      reason: ReportModerationAction.reason,
      report: {
        deletedAt: Report.deletedAt,
        falseReportedAt: Report.falseReportedAt,
        hiddenAt: Report.hiddenAt,
        id: Report.id,
        outcome: Report.outcome,
        status: Report.status,
        title: Report.title,
        type: Report.type,
      },
    })
    .from(ReportModerationAction)
    .innerJoin(Report, eq(ReportModerationAction.reportId, Report.id))
    .where(eq(Report.caretakerId, memberId))
    .orderBy(
      desc(ReportModerationAction.createdAt),
      desc(ReportModerationAction.id),
    )
    .limit(limit);
}

function listCandidateMatchActivityRows(
  db: Database,
  memberId: string,
  limit: number,
) {
  const ownedReport = alias(Report, "owned_report");
  const ownedReportLocation = alias(ReportLocation, "owned_report_location");
  const candidateReport = alias(Report, "candidate_report");
  const candidateReportLocation = alias(
    ReportLocation,
    "candidate_report_location",
  );
  const distanceMeters = sql<number>`ST_Distance(${ownedReportLocation.exactPoint}::geography, ${candidateReportLocation.exactPoint}::geography)`;

  return db
    .select({
      candidate: {
        deletedAt: candidateReport.deletedAt,
        falseReportedAt: candidateReport.falseReportedAt,
        hiddenAt: candidateReport.hiddenAt,
        id: candidateReport.id,
        outcome: candidateReport.outcome,
        status: candidateReport.status,
        title: candidateReport.title,
        type: candidateReport.type,
      },
      createdAt: candidateReport.createdAt,
      distanceMeters,
      locationLabel: candidateReportLocation.label,
      ownedReport: {
        deletedAt: ownedReport.deletedAt,
        falseReportedAt: ownedReport.falseReportedAt,
        hiddenAt: ownedReport.hiddenAt,
        id: ownedReport.id,
        outcome: ownedReport.outcome,
        status: ownedReport.status,
        title: ownedReport.title,
        type: ownedReport.type,
      },
    })
    .from(ownedReport)
    .innerJoin(
      ownedReportLocation,
      eq(ownedReportLocation.reportId, ownedReport.id),
    )
    .innerJoin(
      candidateReport,
      and(
        ne(candidateReport.caretakerId, memberId),
        inArray(candidateReport.type, ["found_pet", "sighting"]),
        eq(candidateReport.status, "active"),
        eq(candidateReport.species, ownedReport.species),
        gte(candidateReport.eventOccurredAt, ownedReport.eventOccurredAt),
        isNull(candidateReport.deletedAt),
        isNull(candidateReport.hiddenAt),
        isNull(candidateReport.falseReportedAt),
      ),
    )
    .innerJoin(
      candidateReportLocation,
      and(
        eq(candidateReportLocation.reportId, candidateReport.id),
        sql`ST_DWithin(${ownedReportLocation.exactPoint}::geography, ${candidateReportLocation.exactPoint}::geography, ${candidateMatchRadiusMeters})`,
      ),
    )
    .where(
      and(
        eq(ownedReport.caretakerId, memberId),
        eq(ownedReport.type, "lost_pet"),
        eq(ownedReport.status, "active"),
        isNull(ownedReport.deletedAt),
        isNull(ownedReport.hiddenAt),
        isNull(ownedReport.falseReportedAt),
      ),
    )
    .orderBy(
      desc(candidateReport.createdAt),
      asc(distanceMeters),
      desc(candidateReport.id),
    )
    .limit(limit) as Promise<CandidateMatchActivityRow[]>;
}

function toAlertDeliveryInboxItem(
  delivery: PersistedAlertNotificationDelivery,
): ActivityInboxItemOutput {
  return {
    delivery,
    id: delivery.id,
    occurredAt: delivery.sentAt ?? delivery.failedAt ?? delivery.matchedAt,
    type: "alert_delivery",
  };
}

function toReportUpdateInboxItem(
  row: ReportUpdateActivityRow,
): ActivityInboxItemOutput {
  return {
    id: row.id,
    occurredAt: toIsoDateTime(row.createdAt),
    type: "report_update",
    update: {
      actorMemberId: row.actorMemberId,
      eventType: row.eventType,
      fromStatus: row.fromStatus,
      id: row.id,
      note: row.note,
      outcome: row.outcome,
      report: toActivityReportSummary(row.report),
      toStatus: row.toStatus,
    },
  };
}

function toModerationEventInboxItem(
  row: ModerationEventActivityRow,
): ActivityInboxItemOutput {
  return {
    event: {
      action: row.action,
      adminId: row.adminId,
      id: row.id,
      note: row.note,
      reason: row.reason,
      report: toActivityReportSummary(row.report),
    },
    id: row.id,
    occurredAt: toIsoDateTime(row.createdAt),
    type: "moderation_event",
  } satisfies ActivityInboxModerationEventItemOutput;
}

function toCandidateMatchInboxItem(
  row: CandidateMatchActivityRow,
): ActivityInboxItemOutput {
  const id = buildCandidateMatchId(row);
  const createdAt = toIsoDateTime(row.createdAt);

  return {
    id,
    match: {
      candidate: toActivityReportSummary(row.candidate),
      confidence: "possible",
      createdAt,
      id,
      locationLabel: row.locationLabel,
      ownedReport: toActivityReportSummary(row.ownedReport),
    },
    occurredAt: createdAt,
    type: "candidate_match",
  } satisfies ActivityInboxCandidateMatchItemOutput;
}

function buildCandidateMatchId(row: CandidateMatchActivityRow) {
  return `match:${row.ownedReport.id}:${row.candidate.id}`;
}

function toActivityReportSummary(
  report: ActivityReportRow,
): ActivityReportSummary {
  return {
    availability: getActivityReportAvailability(report),
    href: buildReportSubjectHref(report),
    id: report.id,
    kind: activityReportKindByType[report.type],
    outcome: report.outcome,
    status: report.status,
    title: report.title,
    type: report.type,
  };
}

function getActivityReportAvailability(
  report: Pick<ActivityReportRow, "deletedAt" | "falseReportedAt" | "hiddenAt">,
): ActivityReportAvailability {
  if (report.deletedAt) {
    return "deleted";
  }

  if (report.falseReportedAt) {
    return "false_report";
  }

  if (report.hiddenAt) {
    return "hidden";
  }

  return "available";
}

function toChatConversationInboxItem(
  conversation: PersistedChatConversation,
  viewerMemberId: string,
): ActivityInboxItemOutput {
  const latestMessage = conversation.messages[conversation.messages.length - 1];
  const otherParticipant =
    conversation.participants.find(
      (participant) => participant.memberId !== viewerMemberId,
    ) ?? conversation.participants[0];

  return {
    conversation: {
      href: `rastro://chats/${conversation.id}`,
      id: conversation.id,
      latestMessage: latestMessage
        ? {
            createdAt: latestMessage.createdAt,
            id: latestMessage.id,
            senderMemberId: latestMessage.senderMemberId,
            text: latestMessage.text,
          }
        : null,
      otherParticipant,
      subject: conversation.subject,
      updatedAt: conversation.updatedAt,
    },
    id: conversation.id,
    occurredAt: conversation.updatedAt,
    type: "chat_conversation",
  };
}

function toIsoDateTime(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function compareInboxItems(
  left: ActivityInboxItemOutput,
  right: ActivityInboxItemOutput,
) {
  const timestampComparison =
    Date.parse(right.occurredAt) - Date.parse(left.occurredAt);

  if (timestampComparison !== 0) {
    return timestampComparison;
  }

  return right.id.localeCompare(left.id);
}
