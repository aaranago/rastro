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

  it("validates alert delivery and chat conversation inbox items", () => {
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
        ],
      }).success,
    ).toBe(true);
  });
});
