import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  Post,
  Report,
  ReportLifecycleEvent,
  ReportLocation,
  ReportMedia,
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

    expect(ReportLocation.reportId).toBeDefined();
    expect(ReportLocation.exactPoint.getSQLType()).toBe("geometry(point,4326)");
    expect(ReportLocation.publicPoint.getSQLType()).toBe(
      "geometry(point,4326)",
    );
    expect(ReportLocation.publicPrecision).toBeDefined();

    expect(ReportMedia.objectKey).toBeDefined();
    expect(ReportMedia.position).toBeDefined();
    expect(ReportLifecycleEvent.type).toBeDefined();
    expect(ReportLifecycleEvent.actorId).toBeDefined();
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
    ).toBe(`"report_media"."status" = 'ready'`);
  });

  it("uses Date values for timestamp update hooks", () => {
    expect(Post.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(Report.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(ReportLocation.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
  });
});
