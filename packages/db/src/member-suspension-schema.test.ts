import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { MemberSuspension, memberSuspensionStatus } from "./schema";

const postgresQueryConfig = {
  casing: {
    getColumnCasing: (column: { name: string }) => column.name,
  },
  escapeName: (name: string) => `"${name}"`,
  escapeParam: (index: number) => `$${index + 1}`,
  escapeString: (value: string) => `'${value.replaceAll("'", "''")}'`,
};

describe("member suspension schema", () => {
  it("stores persisted suspension and revocation history", () => {
    expect(MemberSuspension.memberId).toBeDefined();
    expect(MemberSuspension.status).toBeDefined();
    expect(MemberSuspension.reason).toBeDefined();
    expect(MemberSuspension.suspendedByAdminId).toBeDefined();
    expect(MemberSuspension.suspendedAt).toBeDefined();
    expect(MemberSuspension.revokedAt).toBeDefined();
    expect(MemberSuspension.revokedByAdminId).toBeDefined();
    expect(MemberSuspension.revokedReason).toBeDefined();
  });

  it("supports active and revoked suspension states", () => {
    expect(memberSuspensionStatus.enumValues).toEqual(["active", "revoked"]);
  });

  it("keeps the current active state queryable with one active row per member", () => {
    const suspensionIndexes = getTableConfig(MemberSuspension).indexes.map(
      (index) => index.config,
    );
    const activeIndex = suspensionIndexes.find(
      (index) => index.name === "member_suspension_active_member_idx",
    );

    expect(activeIndex?.unique).toBe(true);
    expect(
      activeIndex?.columns.map((column) => "name" in column && column.name),
    ).toEqual(["memberId"]);
    expect(activeIndex?.where?.toQuery(postgresQueryConfig as never).sql).toBe(
      `"member_suspension"."status" = 'active' AND "member_suspension"."revokedAt" IS NULL`,
    );
  });

  it("uses Date values for timestamp update hooks", () => {
    expect(MemberSuspension.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
  });
});
