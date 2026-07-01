import { describe, expect, it } from "vitest";

import {
  alertGetInputSchema,
  alertGetOutputSchema,
  alertPauseInputSchema,
  alertRecordLocationInputSchema,
  alertRegisterPushTokenInputSchema,
  alertUnsubscribeInputSchema,
  alertUpsertSettingsInputSchema,
} from "./index";

describe("alert validation contracts", () => {
  it("validates alert settings, location, pause, token registration, and output shape", () => {
    expect(
      alertUpsertSettingsInputSchema.parse({
        radiusMeters: 3500,
      }),
    ).toEqual({
      categories: ["lost_pet"],
      radiusMeters: 3500,
    });
    expect(
      alertRecordLocationInputSchema.parse({
        latitude: -16.510231,
        longitude: -68.123881,
        label: "Sopocachi, La Paz",
        locationCell: "bo-lpb-sopocachi",
      }),
    ).toEqual({
      latitude: -16.510231,
      longitude: -68.123881,
      label: "Sopocachi, La Paz",
      locationCell: "bo-lpb-sopocachi",
    });
    expect(
      alertPauseInputSchema.safeParse({
        pausedUntil: "2026-07-02T12:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      alertRegisterPushTokenInputSchema.parse({
        token: "ExponentPushToken[abc_123-XYZ]",
      }),
    ).toEqual({
      deviceId: undefined,
      platform: "unknown",
      token: "ExponentPushToken[abc_123-XYZ]",
    });

    expect(
      alertGetOutputSchema.safeParse({
        subscription: {
          id: "11111111-1111-4111-8111-111111111111",
          categories: ["lost_pet"],
          radiusMeters: 3500,
          location: {
            latitude: -16.510231,
            longitude: -68.123881,
            label: "Sopocachi, La Paz",
            locationCell: "bo-lpb-sopocachi",
            recordedAt: "2026-07-01T12:00:00.000Z",
          },
          pausedUntil: null,
          unsubscribedAt: null,
          status: "active",
          createdAt: "2026-07-01T12:00:00.000Z",
          updatedAt: "2026-07-01T12:01:00.000Z",
        },
        pushTokens: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            token: "ExponentPushToken[abc_123-XYZ]",
            platform: "ios",
            deviceId: "device-1",
            registeredAt: "2026-07-01T12:00:00.000Z",
            lastSeenAt: "2026-07-01T12:02:00.000Z",
            disabledAt: null,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects client-supplied member ids on every alert input", () => {
    const spoofedInputs: [
      unknown,
      { safeParse: (input: unknown) => unknown },
    ][] = [
      [{ memberId: "member-attacker" }, alertGetInputSchema],
      [
        { memberId: "member-attacker", radiusMeters: 3500 },
        alertUpsertSettingsInputSchema,
      ],
      [
        {
          latitude: -16.510231,
          longitude: -68.123881,
          memberId: "member-attacker",
        },
        alertRecordLocationInputSchema,
      ],
      [
        {
          memberId: "member-attacker",
          pausedUntil: "2026-07-02T12:00:00.000Z",
        },
        alertPauseInputSchema,
      ],
      [{ memberId: "member-attacker" }, alertUnsubscribeInputSchema],
      [
        {
          memberId: "member-attacker",
          token: "ExponentPushToken[abc_123-XYZ]",
        },
        alertRegisterPushTokenInputSchema,
      ],
    ];

    for (const [input, schema] of spoofedInputs) {
      expect(schema.safeParse(input)).toMatchObject({ success: false });
    }
  });
});
