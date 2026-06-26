import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  Post,
  Report,
  ReportLifecycleEvent,
  ReportLocation,
  ReportMedia,
  ReportModerationAction,
  reportModerationActionType,
  reportStatus,
} from "./schema";

const postgresQueryConfig = {
  casing: {
    getColumnCasing: (column: { name: string }) => column.name,
  },
  escapeName: (name: string) => `"${name}"`,
  escapeParam: (index: number) => `$${index + 1}`,
  escapeString: (value: string) => `'${value.replaceAll("'", "''")}'`,
};

describe("report schema", () => {
  it("defines ownership, idempotency, media, lifecycle, and PostGIS location columns", () => {
    expect(Report.caretakerId).toBeDefined();
    expect(Report.idempotencyKey).toBeDefined();
    expect(Report.status).toBeDefined();
    expect(Report.outcome).toBeDefined();
    expect(Report.hiddenAt).toBeDefined();
    expect(Report.hiddenByAdminId).toBeDefined();
    expect(Report.hiddenReason).toBeDefined();
    expect(Report.hiddenNote).toBeDefined();

    expect(ReportLocation.reportId).toBeDefined();
    expect(ReportLocation.exactPoint.getSQLType()).toBe("geometry(point,4326)");
    expect(ReportLocation.publicPoint.getSQLType()).toBe(
      "geometry(point,4326)",
    );
    expect(ReportLocation.publicPrecision).toBeDefined();
    expect(ReportLocation.city).toBeDefined();
    expect(ReportLocation.department).toBeDefined();

    expect(ReportMedia.objectKey).toBeDefined();
    expect(ReportMedia.ownerId).toBeDefined();
    expect(ReportMedia.uploadDraftId).toBeDefined();
    expect(ReportMedia.uploadReportType).toBeDefined();
    expect(ReportMedia.expectedChecksumSha256).toBeDefined();
    expect(ReportMedia.expiresAt).toBeDefined();
    expect(ReportMedia.verifiedAt).toBeDefined();
    expect(ReportMedia.failedAt).toBeDefined();
    expect(ReportMedia.removedAt).toBeDefined();
    expect(ReportMedia.position).toBeDefined();
    expect(ReportLifecycleEvent.type).toBeDefined();
    expect(ReportLifecycleEvent.actorId).toBeDefined();
    expect(ReportModerationAction.reportId).toBeDefined();
    expect(ReportModerationAction.targetType).toBeDefined();
    expect(ReportModerationAction.adminId).toBeDefined();
    expect(ReportModerationAction.reason).toBeDefined();
    expect(ReportModerationAction.note).toBeDefined();
  });

  it("supports pending, ready, failed, and removed media states", () => {
    expect(ReportMedia.status.enumValues).toEqual([
      "pending",
      "ready",
      "failed",
      "removed",
    ]);
  });

  it("supports pending review reports for Review Mode adoption publishing", () => {
    expect(reportStatus.enumValues).toEqual([
      "active",
      "pending_review",
      "closed",
    ]);
  });

  it("records hide and restore moderation actions separately from report status", () => {
    expect(reportModerationActionType.enumValues).toEqual(["hide", "restore"]);

    const reportIndexes = getTableConfig(Report).indexes.map(
      (index) => index.config.name,
    );
    const actionIndexes = getTableConfig(ReportModerationAction).indexes.map(
      (index) => index.config.name,
    );

    expect(reportIndexes).toContain("report_hidden_at_idx");
    expect(actionIndexes).toEqual(
      expect.arrayContaining([
        "report_moderation_action_admin_idx",
        "report_moderation_action_report_idx",
      ]),
    );
  });

  it("indexes structured report location fields for admin metrics", () => {
    const locationIndexes = getTableConfig(ReportLocation).indexes.map(
      (index) => index.config.name,
    );

    expect(locationIndexes).toEqual(
      expect.arrayContaining([
        "report_location_city_idx",
        "report_location_department_idx",
      ]),
    );
  });

  it("allows media replacement history without blocking reused display positions", () => {
    const reportMediaIndexes = getTableConfig(ReportMedia).indexes.map(
      (index) => index.config,
    );
    const positionIndex = reportMediaIndexes.find(
      (index) => index.name === "report_media_report_ready_position_idx",
    );

    expect(
      positionIndex?.columns.map((column) => "name" in column && column.name),
    ).toEqual(["reportId", "position"]);
    expect(positionIndex?.unique).toBe(true);
    expect(
      positionIndex?.where?.toQuery(postgresQueryConfig as never).sql,
    ).toBe(
      `"report_media"."status" = 'ready' AND "report_media"."reportId" IS NOT NULL`,
    );
  });

  it("uses Date values for timestamp update hooks", () => {
    expect(Post.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(Report.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(ReportLocation.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
  });
});
