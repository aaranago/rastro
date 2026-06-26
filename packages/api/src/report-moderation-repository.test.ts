import { describe, expect, it } from "vitest";

import { toReportModerationQueueItem } from "./report-moderation-repository";

describe("report moderation repository", () => {
  it("uses structured report location fields instead of parsing display labels", () => {
    const item = toReportModerationQueueItem(
      {
        caretaker: {
          email: "camila@example.com",
          id: "member-camila",
          name: "Camila R.",
        },
        caretakerId: "member-camila",
        color: "marron",
        contactPreference: "in_app_chat",
        createdAt: new Date("2026-06-26T16:00:00.000Z"),
        deletedAt: null,
        description: "Perro mediano caminando solo cerca de la plaza.",
        distinguishingTraits: null,
        eventOccurredAt: new Date("2026-06-26T15:00:00.000Z"),
        hiddenAt: null,
        hiddenByAdminId: null,
        hiddenNote: null,
        hiddenReason: null,
        id: "11111111-1111-4111-8111-111111111111",
        idempotencyKey: "sighting-admin-queue-test",
        location: {
          city: "La Paz",
          createdAt: new Date("2026-06-26T16:00:00.000Z"),
          department: "La Paz",
          exactLatitude: -16.510231,
          exactLongitude: -68.123881,
          exactPoint: { x: -68.123881, y: -16.510231 },
          label: "Texto visible enganoso, Pando",
          locationCell: "bo-lpb-sopocachi",
          publicLatitude: -16.51,
          publicLongitude: -68.12,
          publicPoint: { x: -68.12, y: -16.51 },
          publicPrecision: "approximate",
          reportId: "11111111-1111-4111-8111-111111111111",
          updatedAt: new Date("2026-06-26T16:00:00.000Z"),
        },
        outcome: null,
        petName: null,
        resolvedAt: null,
        size: "mediano",
        species: "dog",
        status: "active",
        title: "Perro visto cerca de Sopocachi",
        type: "sighting",
        updatedAt: new Date("2026-06-26T16:00:00.000Z"),
        whatsappPhone: null,
      } as never,
      undefined,
      null,
    );

    expect(item?.target).toMatchObject({
      city: "La Paz",
      department: "La Paz",
      locationLabel: "Texto visible enganoso, Pando",
    });
  });
});
