import { describe, expect, it } from "vitest";

import {
  createSponsorDeliveryToken,
  SponsorDeliveryTokenError,
  verifySponsorDeliveryToken,
} from "./local-sponsor-placement-delivery-token";

describe("local sponsor placement delivery tokens", () => {
  it("round-trips placement, provider, surface, and expiry", () => {
    const token = createSponsorDeliveryToken({
      expiresAt: new Date("2026-07-06T12:15:00.000Z"),
      now: new Date("2026-07-06T12:00:00.000Z"),
      placementId: "22222222-2222-4222-8222-222222222222",
      providerId: "11111111-1111-4111-8111-111111111111",
      secret: "test-secret",
      surface: "resources_directory",
    });
    const [, initializationVector, ciphertext, authenticationTag] =
      token.split(".");

    expect(
      verifySponsorDeliveryToken(token, {
        now: new Date("2026-07-06T12:05:00.000Z"),
        secret: "test-secret",
      }),
    ).toEqual({
      expiresAt: "2026-07-06T12:15:00.000Z",
      placementId: "22222222-2222-4222-8222-222222222222",
      providerId: "11111111-1111-4111-8111-111111111111",
      surface: "resources_directory",
      version: 1,
    });
    expect(initializationVector).toEqual(expect.any(String));
    expect(ciphertext).toEqual(expect.any(String));
    expect(authenticationTag).toEqual(expect.any(String));
    expect(token).not.toContain("22222222-2222-4222-8222-222222222222");
    expect(token).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(token).not.toContain("placementId");
  });

  it("rejects tampered token payloads", () => {
    const token = createSponsorDeliveryToken({
      expiresAt: new Date("2026-07-06T12:15:00.000Z"),
      now: new Date("2026-07-06T12:00:00.000Z"),
      placementId: "22222222-2222-4222-8222-222222222222",
      providerId: "11111111-1111-4111-8111-111111111111",
      secret: "test-secret",
      surface: "resources_directory",
    });
    const parts = token.split(".");
    parts[3] = "AAAAAAAAAAAAAAAAAAAAAA";

    expect(() =>
      verifySponsorDeliveryToken(parts.join("."), {
        now: new Date("2026-07-06T12:05:00.000Z"),
        secret: "test-secret",
      }),
    ).toThrow(SponsorDeliveryTokenError);
  });

  it("rejects expired delivery tokens", () => {
    const token = createSponsorDeliveryToken({
      expiresAt: new Date("2026-07-06T12:15:00.000Z"),
      now: new Date("2026-07-06T12:00:00.000Z"),
      placementId: "22222222-2222-4222-8222-222222222222",
      providerId: "11111111-1111-4111-8111-111111111111",
      secret: "test-secret",
      surface: "resources_directory",
    });

    expect(() =>
      verifySponsorDeliveryToken(token, {
        now: new Date("2026-07-06T12:16:00.000Z"),
        secret: "test-secret",
      }),
    ).toThrow(SponsorDeliveryTokenError);
  });
});
