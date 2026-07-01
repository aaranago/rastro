import { describe, expect, it } from "vitest";

import {
  buildActiveAlertSubscriptionCondition,
  buildAlertReportCreatedCutoff,
} from "./alert-repository";

const postgresQueryConfig = {
  casing: {
    getColumnCasing: (column: { name: string }) => column.name,
  },
  escapeName: (name: string) => `"${name}"`,
  escapeParam: (index: number) => `$${index + 1}`,
  escapeString: (value: string) => `'${value.replaceAll("'", "''")}'`,
};

describe("alert repository", () => {
  it("uses a 24-hour report-created cutoff for lost-pet alert matching", () => {
    expect(
      buildAlertReportCreatedCutoff(
        new Date("2026-07-01T12:00:00.000Z"),
      ).toISOString(),
    ).toBe("2026-06-30T12:00:00.000Z");
  });

  it("filters only subscribed and unpaused alert subscriptions", () => {
    const query = buildActiveAlertSubscriptionCondition(
      new Date("2026-07-01T12:00:00.000Z"),
    )?.toQuery(postgresQueryConfig as never);

    expect(query?.sql).toContain(
      '"alert_subscription"."unsubscribedAt" is null',
    );
    expect(query?.sql).toContain('"alert_subscription"."pausedUntil" is null');
    expect(query?.sql).toContain('"alert_subscription"."pausedUntil" <= $1');
    expect(query?.params).toEqual(["2026-07-01T12:00:00.000Z"]);
  });
});
