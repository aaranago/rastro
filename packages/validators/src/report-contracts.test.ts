import { describe, expect, it } from "vitest";

import type { CreateReportInput } from "./index";
import { createReportInputSchema, nearbyReportsInputSchema } from "./index";

const baseSightingInput = {
  idempotencyKey: "sighting-contract-test-1",
  type: "sighting",
  title: "Perro visto cerca de Sopocachi",
  description:
    "Perro mediano caminando solo cerca de la plaza. No pude asegurarlo.",
  pet: {
    species: "dog",
    color: "marron",
    size: "mediano",
  },
  eventOccurredAt: "2026-06-19T18:45:00.000Z",
  location: {
    exactLatitude: -16.510231,
    exactLongitude: -68.123881,
    label: "Sopocachi, La Paz",
    locationCell: "bo-lpb-sopocachi",
    exposeExactLocation: false,
  },
  contact: {
    preference: "in_app_chat",
  },
  media: [],
} satisfies CreateReportInput;

describe("report validation contracts", () => {
  it("allows sighting reports without photos", () => {
    expect(createReportInputSchema.safeParse(baseSightingInput).success).toBe(
      true,
    );
  });

  it("requires photos for lost, found, and adoption reports", () => {
    for (const type of ["lost_pet", "found_pet", "adoption"] as const) {
      const result = createReportInputSchema.safeParse({
        ...baseSightingInput,
        type,
      });

      expect(result.success).toBe(false);
      expect(JSON.stringify(result.error?.issues)).toContain("media");
    }
  });

  it("requires a phone number when WhatsApp contact is enabled", () => {
    const result = createReportInputSchema.safeParse({
      ...baseSightingInput,
      contact: {
        preference: "whatsapp",
      },
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("whatsappPhone");
  });

  it("accepts a bounded Bolivia radius query", () => {
    expect(
      nearbyReportsInputSchema.safeParse({
        latitude: -16.5,
        longitude: -68.12,
        radiusMeters: 5000,
        types: ["lost_pet", "sighting"],
      }).success,
    ).toBe(true);
  });
});
