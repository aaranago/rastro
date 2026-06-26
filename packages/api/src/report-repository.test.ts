import { describe, expect, it } from "vitest";

import {
  buildNearbyReportsCondition,
  buildPublicReportVisibilityCondition,
} from "./report-repository";

const postgresQueryConfig = {
  casing: {
    getColumnCasing: (column: { name: string }) => column.name,
  },
  escapeName: (name: string) => `"${name}"`,
  escapeParam: (index: number) => `$${index + 1}`,
  escapeString: (value: string) => `'${value.replaceAll("'", "''")}'`,
};

describe("report repository", () => {
  it("builds a parameterized PostGIS radius condition against exact internal coordinates", () => {
    const query = buildNearbyReportsCondition({
      latitude: -16.5,
      longitude: -68.12,
      radiusMeters: 5000,
      types: ["lost_pet", "found_pet", "sighting", "adoption"],
      limit: 50,
    }).toQuery(postgresQueryConfig as never);

    expect(query.sql).toContain("ST_DWithin");
    expect(query.sql).toContain("ST_SetSRID(ST_MakePoint($1, $2), 4326)");
    expect(query.sql).toContain('"report_location"."exact_point"');
    expect(query.params).toEqual([-68.12, -16.5, 5000]);
  });

  it("builds public visibility filters that exclude deleted and hidden reports", () => {
    const condition = buildPublicReportVisibilityCondition();

    if (!condition) {
      throw new Error("Expected public visibility condition.");
    }

    const query = condition.toQuery(postgresQueryConfig as never);

    expect(query.sql).toContain('"report"."deletedAt" is null');
    expect(query.sql).toContain('"report"."hiddenAt" is null');
  });
});
