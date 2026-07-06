import { describe, expect, it } from "vitest";

import { activityInboxInputSchema, activityInboxOutputSchema } from "./index";

describe("activity validation contracts", () => {
  it("accepts only an optional limit for inbox input", () => {
    expect(activityInboxInputSchema.parse({})).toEqual({});
    expect(activityInboxInputSchema.parse({ limit: 25 })).toEqual({
      limit: 25,
    });
    expect(
      activityInboxInputSchema.safeParse({
        limit: 25,
        memberId: "member-attacker",
      }).success,
    ).toBe(false);
  });

  it("validates alert delivery, candidate match, chat, report update, and moderation inbox items", () => {
    expect(
      activityInboxOutputSchema.safeParse({
        items: [
          {
            type: "alert_delivery",
            id: "33333333-3333-4333-8333-333333333333",
            occurredAt: "2026-07-01T12:01:00.000Z",
            delivery: {
              id: "33333333-3333-4333-8333-333333333333",
              subscriptionId: "11111111-1111-4111-8111-111111111111",
              reportId: "44444444-4444-4444-8444-444444444444",
              pushTokenId: "22222222-2222-4222-8222-222222222222",
              status: "sent",
              title: "Mascota perdida cerca de ti",
              body: "Toby fue reportada cerca de tu zona.",
              deepLink:
                "rastro://reportes/perdidos/44444444-4444-4444-8444-444444444444",
              matchedAt: "2026-07-01T12:00:00.000Z",
              sentAt: "2026-07-01T12:01:00.000Z",
              failedAt: null,
              failureReason: null,
              createdAt: "2026-07-01T12:00:00.000Z",
            },
          },
          {
            type: "chat_conversation",
            id: "55555555-5555-4555-8555-555555555555",
            occurredAt: "2026-07-01T12:05:00.000Z",
            conversation: {
              href: "rastro://chats/55555555-5555-4555-8555-555555555555",
              id: "55555555-5555-4555-8555-555555555555",
              latestMessage: {
                createdAt: "2026-07-01T12:05:00.000Z",
                id: "66666666-6666-4666-8666-666666666666",
                senderMemberId: "member-diego",
                text: "Lo vi cerca de la plaza.",
              },
              otherParticipant: {
                displayName: "Diego",
                memberId: "member-diego",
              },
              subject: {
                href: "rastro://reportes/perdidos/44444444-4444-4444-8444-444444444444",
                id: "44444444-4444-4444-8444-444444444444",
                kind: "lost-pet-report",
                subtitle: "Sopocachi, La Paz",
                title: "Toby",
              },
              updatedAt: "2026-07-01T12:05:00.000Z",
            },
          },
          {
            type: "candidate_match",
            id: "match:44444444-4444-4444-8444-444444444444:99999999-9999-4999-8999-999999999999",
            occurredAt: "2026-07-01T12:04:00.000Z",
            match: {
              candidate: {
                availability: "available",
                href: "rastro://reportes/encontrados/99999999-9999-4999-8999-999999999999",
                id: "99999999-9999-4999-8999-999999999999",
                kind: "found-pet-report",
                outcome: null,
                status: "active",
                title: "Perro encontrado en Sopocachi",
                type: "found_pet",
              },
              confidence: "possible",
              createdAt: "2026-07-01T12:04:00.000Z",
              id: "match:44444444-4444-4444-8444-444444444444:99999999-9999-4999-8999-999999999999",
              locationLabel: "Sopocachi, La Paz",
              ownedReport: {
                availability: "available",
                href: "rastro://reportes/perdidos/44444444-4444-4444-8444-444444444444",
                id: "44444444-4444-4444-8444-444444444444",
                kind: "lost-pet-report",
                outcome: null,
                status: "active",
                title: "Toby",
                type: "lost_pet",
              },
            },
          },
          {
            type: "report_update",
            id: "77777777-7777-4777-8777-777777777777",
            occurredAt: "2026-07-01T12:06:00.000Z",
            update: {
              actorMemberId: "member-camila",
              eventType: "resolved",
              fromStatus: "active",
              id: "77777777-7777-4777-8777-777777777777",
              note: null,
              outcome: "reunited",
              report: {
                availability: "available",
                href: "rastro://reportes/perdidos/44444444-4444-4444-8444-444444444444",
                id: "44444444-4444-4444-8444-444444444444",
                kind: "lost-pet-report",
                outcome: "reunited",
                status: "closed",
                title: "Toby",
                type: "lost_pet",
              },
              toStatus: "closed",
            },
          },
          {
            type: "moderation_event",
            id: "88888888-8888-4888-8888-888888888888",
            occurredAt: "2026-07-01T12:07:00.000Z",
            event: {
              action: "hide",
              adminId: "member-admin",
              id: "88888888-8888-4888-8888-888888888888",
              note: "Ubicación sensible.",
              reason: "Ubicación exacta expuesta",
              report: {
                availability: "hidden",
                href: "rastro://reportes/perdidos/44444444-4444-4444-8444-444444444444",
                id: "44444444-4444-4444-8444-444444444444",
                kind: "lost-pet-report",
                outcome: null,
                status: "active",
                title: "Toby",
                type: "lost_pet",
              },
            },
          },
        ],
      }).success,
    ).toBe(true);
  });
});
