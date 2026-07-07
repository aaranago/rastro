import { describe, expect, it } from "vitest";

import type { Database } from "@acme/db/client";
import { MemberProfile, Report, ReportLifecycleEvent } from "@acme/db/schema";

import { createDrizzleAccountDeletionCleanup } from "./account-deletion-cleanup";
import { getAccountDeletionPolicy } from "./account-deletion-policy";

interface UpdateRows {
  contactReports: { id: string }[];
  profiles: { memberId: string }[];
  retiredReports: {
    fromStatus: "active" | "closed" | "pending_review";
    id: string;
  }[];
}

type RecordedCall =
  | {
      kind: "insert";
      table: unknown;
      values: unknown[];
    }
  | {
      kind: "update";
      table: unknown;
      values: Record<string, unknown>;
    };

function createFakeDatabase(rows: UpdateRows) {
  const calls: RecordedCall[] = [];
  let updateIndex = 0;
  const updateResults = [
    rows.profiles,
    rows.contactReports,
    rows.retiredReports,
  ];
  const tx = {
    insert(table: unknown) {
      return {
        values(values: unknown[]) {
          calls.push({
            kind: "insert",
            table,
            values,
          });
          return Promise.resolve();
        },
      };
    },
    update(table: unknown) {
      const updateResult = updateResults[updateIndex] ?? [];
      updateIndex += 1;

      return {
        set(values: Record<string, unknown>) {
          return {
            where() {
              return {
                returning() {
                  calls.push({
                    kind: "update",
                    table,
                    values,
                  });
                  return Promise.resolve(updateResult);
                },
              };
            },
          };
        },
      };
    },
  };
  const db = {
    transaction: async <TResult>(
      callback: (transaction: typeof tx) => Promise<TResult>,
    ) => callback(tx),
  };

  return {
    calls,
    db: db as unknown as Database,
  };
}

function getUnsafePublicContactDataRequirement() {
  const requirement = getAccountDeletionPolicy().requiredCleanups[0];

  if (!requirement) {
    throw new Error("Expected account deletion cleanup requirement.");
  }

  return requirement;
}

describe("createDrizzleAccountDeletionCleanup", () => {
  it("scrubs public contact data and retires member reports before auth deletion", async () => {
    const cleanedAt = new Date("2026-07-06T14:30:00.000Z");
    const { calls, db } = createFakeDatabase({
      contactReports: [{ id: "report-with-whatsapp" }],
      profiles: [{ memberId: "member_123" }],
      retiredReports: [
        { fromStatus: "active", id: "report-with-whatsapp" },
        { fromStatus: "pending_review", id: "pending-adoption" },
      ],
    });
    const cleanup = createDrizzleAccountDeletionCleanup(db, {
      now: () => cleanedAt,
    });

    await expect(
      cleanup.removeUnsafePublicContactData({
        memberId: "member_123",
        requirement: getUnsafePublicContactDataRequirement(),
      }),
    ).resolves.toEqual({
      id: "unsafePublicContactData",
      removedRecords: 3,
      status: "completed",
    });

    expect(calls).toEqual([
      {
        kind: "update",
        table: MemberProfile,
        values: {
          defaultContactPreference: "in_app_chat",
          phone: null,
          updatedAt: cleanedAt,
          whatsapp: null,
        },
      },
      {
        kind: "update",
        table: Report,
        values: {
          contactPreference: "in_app_chat",
          updatedAt: cleanedAt,
          whatsappPhone: null,
        },
      },
      {
        kind: "update",
        table: Report,
        values: {
          deletedAt: cleanedAt,
          outcome: "inactive",
          status: "closed",
          updatedAt: cleanedAt,
        },
      },
      {
        kind: "insert",
        table: ReportLifecycleEvent,
        values: [
          {
            actorId: "member_123",
            fromStatus: "active",
            note: "account_deletion",
            outcome: "inactive",
            reportId: "report-with-whatsapp",
            toStatus: "closed",
            type: "deleted",
          },
          {
            actorId: "member_123",
            fromStatus: "pending_review",
            note: "account_deletion",
            outcome: "inactive",
            reportId: "pending-adoption",
            toStatus: "closed",
            type: "deleted",
          },
        ],
      },
    ]);
  });

  it("does not report completion from a silent no-op", async () => {
    const { calls, db } = createFakeDatabase({
      contactReports: [],
      profiles: [],
      retiredReports: [],
    });
    const cleanup = createDrizzleAccountDeletionCleanup(db, {
      now: () => new Date("2026-07-06T14:30:00.000Z"),
    });

    await expect(
      cleanup.removeUnsafePublicContactData({
        memberId: "member_123",
        requirement: getUnsafePublicContactDataRequirement(),
      }),
    ).resolves.toEqual({
      id: "unsafePublicContactData",
      removedRecords: 0,
      status: "completed",
    });

    expect(calls).toEqual([
      expect.objectContaining({ kind: "update", table: MemberProfile }),
      expect.objectContaining({ kind: "update", table: Report }),
      expect.objectContaining({ kind: "update", table: Report }),
    ]);
  });
});
