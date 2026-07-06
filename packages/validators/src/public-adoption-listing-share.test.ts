import { describe, expect, it } from "vitest";

import {
  buildPublicAdoptionListingShareTarget,
  publicAdoptionListingPathForId,
} from "./index";

const commerceTerms = [
  "precio",
  "fee",
  "payment",
  "deposit",
  "bidding",
  "checkout",
  "compra",
  "comprar",
  "venta",
  "vender",
  "marketplace",
];

describe("public Adoption Listing share target", () => {
  const listingId = "22222222-2222-4222-8222-222222220001";

  it("builds one stable web URL, app deep link, and Spanish non-monetary share copy for a public listing", () => {
    const target = buildPublicAdoptionListingShareTarget({
      listingId,
      publicWebBaseUrl: "https://rastro.bo/",
      title: "Nala",
    });

    expect(publicAdoptionListingPathForId(listingId)).toBe(
      `/adopciones/${listingId}`,
    );
    expect(target).toEqual({
      appDeepLink: `rastro://adopciones/${listingId}`,
      message: `Conoce a Nala en adopción en Rastro: https://rastro.bo/adopciones/${listingId}`,
      path: `/adopciones/${listingId}`,
      title: "Mascota en adopción: Nala",
      webUrl: `https://rastro.bo/adopciones/${listingId}`,
    });
    expect(JSON.stringify(target).toLowerCase()).not.toMatch(
      new RegExp(commerceTerms.join("|")),
    );
  });

  it("rejects malformed ids that cannot exist in the public database route", () => {
    expect(() =>
      publicAdoptionListingPathForId("adopt-nala-sopocachi"),
    ).toThrow("Public report detail IDs must be UUIDs.");
  });
});
