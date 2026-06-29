import { describe, expect, it } from "vitest";

import {
  buildNearbyReportsCondition,
  buildPublicReportVisibilityCondition,
  deriveStructuredReportLocationFromCell,
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

  it("builds public visibility filters that exclude deleted, hidden, and false-marked reports", () => {
    const condition = buildPublicReportVisibilityCondition();

    if (!condition) {
      throw new Error("Expected public visibility condition.");
    }

    const query = condition.toQuery(postgresQueryConfig as never);

    expect(query.sql).toContain('"report"."deletedAt" is null');
    expect(query.sql).toContain('"report"."hiddenAt" is null');
    expect(query.sql).toContain('"report"."falseReportedAt" is null');
  });

  it("derives structured report metrics fields from location cells instead of display labels", () => {
    expect(
      deriveStructuredReportLocationFromCell({
        exactLatitude: -16.510231,
        exactLongitude: -68.123881,
        exposeExactLocation: false,
        label: "Display label that should not be parsed, Pando",
        locationCell: "bo-lpb-sopocachi",
      }),
    ).toEqual({
      city: "La Paz",
      department: "La Paz",
    });

    expect(
      deriveStructuredReportLocationFromCell({
        exactLatitude: -17.783333,
        exactLongitude: -63.182222,
        exposeExactLocation: false,
        label: "Zona sin estructura visible, Texto Libre",
        locationCell: "bo-scz-unknown-neighborhood",
      }),
    ).toEqual({
      city: "No especificado",
      department: "Santa Cruz",
    });
  });
});
