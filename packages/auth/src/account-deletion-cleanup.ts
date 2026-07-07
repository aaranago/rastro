import type { Database } from "@acme/db/client";
import { and, eq, inArray, isNotNull, isNull, ne, or } from "@acme/db";
import { MemberProfile, Report, ReportLifecycleEvent } from "@acme/db/schema";

import type { AccountDeletionCleanupBoundary } from "./account-deletion-policy";

export interface DrizzleAccountDeletionCleanupOptions {
  now?: (() => Date) | undefined;
}

export function createDrizzleAccountDeletionCleanup(
  db: Database,
  options: DrizzleAccountDeletionCleanupOptions = {},
): AccountDeletionCleanupBoundary {
  const now = options.now ?? (() => new Date());

  return {
    async removeUnsafePublicContactData({ memberId }) {
      const cleanedAt = now();
      const removedRecords = await db.transaction(async (tx) => {
        const scrubbedProfiles = await tx
          .update(MemberProfile)
          .set({
            defaultContactPreference: "in_app_chat",
            phone: null,
            updatedAt: cleanedAt,
            whatsapp: null,
          })
          .where(
            and(
              eq(MemberProfile.memberId, memberId),
              or(
                isNotNull(MemberProfile.phone),
                isNotNull(MemberProfile.whatsapp),
                ne(MemberProfile.defaultContactPreference, "in_app_chat"),
              ),
            ),
          )
          .returning({ memberId: MemberProfile.memberId });

        const scrubbedReports = await tx
          .update(Report)
          .set({
            contactPreference: "in_app_chat",
            updatedAt: cleanedAt,
            whatsappPhone: null,
          })
          .where(
            and(
              eq(Report.caretakerId, memberId),
              or(
                isNotNull(Report.whatsappPhone),
                inArray(Report.contactPreference, ["whatsapp", "both"]),
              ),
            ),
          )
          .returning({ id: Report.id });

        const retiredReports = await tx
          .update(Report)
          .set({
            deletedAt: cleanedAt,
            outcome: "inactive",
            status: "closed",
            updatedAt: cleanedAt,
          })
          .where(
            and(eq(Report.caretakerId, memberId), isNull(Report.deletedAt)),
          )
          .returning({
            fromStatus: Report.status,
            id: Report.id,
          });

        if (retiredReports.length > 0) {
          await tx.insert(ReportLifecycleEvent).values(
            retiredReports.map((report) => ({
              actorId: memberId,
              fromStatus: report.fromStatus,
              note: "account_deletion",
              outcome: "inactive" as const,
              reportId: report.id,
              toStatus: "closed" as const,
              type: "deleted" as const,
            })),
          );
        }

        const changedReportIds = new Set([
          ...scrubbedReports.map((report) => report.id),
          ...retiredReports.map((report) => report.id),
        ]);

        return scrubbedProfiles.length + changedReportIds.size;
      });

      return {
        id: "unsafePublicContactData",
        removedRecords,
        status: "completed",
      };
    },
  };
}
