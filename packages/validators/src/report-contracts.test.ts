import { describe, expect, it } from "vitest";

import type { CreateReportInput } from "./index";
import {
  blockChatMemberInputSchema,
  buildApproximatePublicReportLocation,
  chatConversationIdInputSchema,
  createReportAbuseReportInputSchema,
  createReportInputSchema,
  nearbyReportsInputSchema,
  openReportChatConversationInputSchema,
  ownedReportsInputSchema,
  reportApproximatePublicLocationRadiusMeters,
  reportChatConversationInputSchema,
  sendChatMessageInputSchema,
} from "./index";

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

  it("rejects client-supplied object storage media metadata during report creation", () => {
    const result = createReportInputSchema.safeParse({
      ...baseSightingInput,
      media: [
        {
          canonicalUrl: "https://cdn.example.invalid/reports/forged.webp",
          height: 900,
          mimeType: "image/webp",
          objectKey: "reports/someone-else/forged.webp",
          sizeBytes: 300_000,
          width: 1200,
        },
      ],
    });

    expect(result.success).toBe(false);
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

  it("snaps approximate public report locations to a 300 m privacy grid", () => {
    const approximate = buildApproximatePublicReportLocation({
      exactLatitude: -16.510231,
      exactLongitude: -68.123881,
    });

    expect(reportApproximatePublicLocationRadiusMeters).toBe(300);
    expect(approximate).toEqual({
      approximateLatitude: -16.51051,
      approximateLongitude: -68.124602,
    });
    expect(approximate.approximateLatitude).not.toBe(-16.510231);
    expect(approximate.approximateLongitude).not.toBe(-68.123881);
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

  it("keeps owned report listing input server-derived", () => {
    expect(ownedReportsInputSchema.safeParse({}).success).toBe(true);
    expect(
      ownedReportsInputSchema.safeParse({
        caretakerId: "member-camila",
      }).success,
    ).toBe(false);
  });

  it("validates report-linked chat input without client-supplied actor fields", () => {
    expect(
      openReportChatConversationInputSchema.safeParse({
        reportId: "report-sighting-sopocachi",
      }).success,
    ).toBe(true);
    expect(
      chatConversationIdInputSchema.safeParse({
        conversationId: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(true);
    expect(
      sendChatMessageInputSchema.parse({
        conversationId: "11111111-1111-4111-8111-111111111111",
        text: "  Vi a Toby cerca de la plaza.  ",
      }),
    ).toEqual({
      conversationId: "11111111-1111-4111-8111-111111111111",
      text: "Vi a Toby cerca de la plaza.",
    });
    expect(
      blockChatMemberInputSchema.safeParse({
        blockedMemberId: "member-camila",
        conversationId: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(true);
    expect(
      reportChatConversationInputSchema.safeParse({
        conversationId: "11111111-1111-4111-8111-111111111111",
        note: "Este chat parece sospechoso.",
        reason: "scam",
      }).success,
    ).toBe(true);

    for (const input of [
      {
        conversationId: "11111111-1111-4111-8111-111111111111",
        senderMemberId: "member-attacker",
        text: "spoof",
      },
      {
        blockedMemberId: "member-camila",
        blockerMemberId: "member-attacker",
        conversationId: "11111111-1111-4111-8111-111111111111",
      },
      {
        conversationId: "11111111-1111-4111-8111-111111111111",
        note: "Este chat parece sospechoso.",
        reporterMemberId: "member-attacker",
      },
    ]) {
      expect(sendChatMessageInputSchema.safeParse(input).success).toBe(false);
      expect(blockChatMemberInputSchema.safeParse(input).success).toBe(false);
      expect(reportChatConversationInputSchema.safeParse(input).success).toBe(
        false,
      );
    }
  });

  it("validates report abuse input without client-supplied actor or target type fields", () => {
    expect(
      createReportAbuseReportInputSchema.parse({
        detail: "El reporte usa fotos que no corresponden.",
        reason: "scam",
        reportId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toEqual({
      detail: "El reporte usa fotos que no corresponden.",
      reason: "scam",
      reportId: "11111111-1111-4111-8111-111111111111",
    });

    for (const input of [
      {
        detail: "El reporte usa fotos que no corresponden.",
        reason: "scam",
        reportId: "11111111-1111-4111-8111-111111111111",
        reporterMemberId: "member-attacker",
      },
      {
        detail: "El reporte usa fotos que no corresponden.",
        reason: "scam",
        reportId: "11111111-1111-4111-8111-111111111111",
        targetType: "lost_pet_report",
      },
    ]) {
      expect(createReportAbuseReportInputSchema.safeParse(input).success).toBe(
        false,
      );
    }
  });
});
