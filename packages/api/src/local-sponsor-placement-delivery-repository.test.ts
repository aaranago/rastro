import { describe, expect, it } from "vitest";

import type { Database } from "@acme/db/client";
import type {
  LocalSponsorPlacementDeliveryEventType,
  LocalSponsorPlacementSurface,
} from "@acme/validators";

import type { PersistedLocalSponsorPlacementDeliveryEvent } from "./local-sponsor-placement-delivery-repository";
import { createDrizzleLocalSponsorPlacementDeliveryRepository } from "./local-sponsor-placement-delivery-repository";

describe("local sponsor placement delivery repository", () => {
  it("returns the original event for duplicate idempotency keys before insert", async () => {
    const existingEvent = deliveryEventRow();
    const fakeDb = createSponsorDeliveryFakeDb({
      eventSelects: [[existingEvent]],
    });
    const repository = createDrizzleLocalSponsorPlacementDeliveryRepository(
      fakeDb.db,
      { now: () => new Date("2026-07-01T12:00:00.000Z") },
    );

    await expect(repository.record(recordInput())).resolves.toEqual({
      event: toExpectedEvent(existingEvent),
      status: "duplicate",
    });
    expect(fakeDb.insertCount).toBe(0);
  });

  it("returns duplicate with the original event after an insert conflict", async () => {
    const existingEvent = deliveryEventRow({
      id: "44444444-4444-4444-8444-444444444444",
    });
    const fakeDb = createSponsorDeliveryFakeDb({
      activePlacements: [
        [
          {
            placementId: "22222222-2222-4222-8222-222222222222",
            providerId: "11111111-1111-4111-8111-111111111111",
          },
        ],
      ],
      eventSelects: [[], [existingEvent]],
      insertResults: [[]],
    });
    const repository = createDrizzleLocalSponsorPlacementDeliveryRepository(
      fakeDb.db,
      { now: () => new Date("2026-07-01T12:00:00.000Z") },
    );

    await expect(repository.record(recordInput())).resolves.toEqual({
      event: toExpectedEvent(existingEvent),
      status: "duplicate",
    });
    expect(fakeDb.insertCount).toBe(1);
  });
});

function recordInput() {
  return {
    eventType: "impression" as const,
    idempotencyKey: "resources-directory-duplicate-test",
    memberId: "member-ana",
    placementId: "22222222-2222-4222-8222-222222222222",
    providerId: "11111111-1111-4111-8111-111111111111",
    source: "resources-list",
    surface: "resources_directory" as const,
  };
}

interface DeliveryEventRow {
  eventType: LocalSponsorPlacementDeliveryEventType;
  id: string;
  occurredAt: Date;
  placementId: string;
  providerId: string;
  source: string | null;
  surface: LocalSponsorPlacementSurface;
}

interface ActivePlacementRow {
  placementId: string;
  providerId: string;
}

function deliveryEventRow(
  overrides: Partial<DeliveryEventRow> = {},
): DeliveryEventRow {
  return {
    eventType: "impression",
    id: "33333333-3333-4333-8333-333333333333",
    occurredAt: new Date("2026-07-01T12:00:00.000Z"),
    placementId: "22222222-2222-4222-8222-222222222222",
    providerId: "11111111-1111-4111-8111-111111111111",
    source: "resources-list",
    surface: "resources_directory",
    ...overrides,
  };
}

function toExpectedEvent(
  row: DeliveryEventRow,
): PersistedLocalSponsorPlacementDeliveryEvent {
  return {
    eventType: row.eventType,
    id: row.id,
    occurredAt: row.occurredAt,
    placementId: row.placementId,
    providerId: row.providerId,
    ...(row.source ? { source: row.source } : {}),
    surface: row.surface,
  };
}

function createSponsorDeliveryFakeDb({
  activePlacements = [],
  eventSelects = [],
  insertResults = [],
}: {
  activePlacements?: ActivePlacementRow[][];
  eventSelects?: DeliveryEventRow[][];
  insertResults?: DeliveryEventRow[][];
}) {
  let insertCount = 0;
  let activePlacementSelectIndex = 0;
  let eventSelectIndex = 0;
  let insertResultIndex = 0;

  const db = {
    select(fields: Record<string, unknown>) {
      const isDeliveryEventSelect = "eventType" in fields;

      return createSelectChain(() => {
        if (isDeliveryEventSelect) {
          const rows = eventSelects[eventSelectIndex] ?? [];
          eventSelectIndex += 1;
          return rows;
        }

        const rows = activePlacements[activePlacementSelectIndex] ?? [];
        activePlacementSelectIndex += 1;
        return rows;
      });
    },
    insert() {
      insertCount += 1;

      return {
        values() {
          return {
            onConflictDoNothing() {
              return {
                returning() {
                  const rows = insertResults[insertResultIndex] ?? [];
                  insertResultIndex += 1;
                  return rows;
                },
              };
            },
          };
        },
      };
    },
  };

  return {
    db: db as unknown as Database,
    get insertCount() {
      return insertCount;
    },
  };
}

function createSelectChain<T>(getRows: () => T[]) {
  const chain = {
    from() {
      return chain;
    },
    innerJoin() {
      return chain;
    },
    where() {
      return chain;
    },
    orderBy() {
      return chain;
    },
    limit() {
      return getRows();
    },
  };

  return chain;
}
