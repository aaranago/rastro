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
  it("builds one stable web URL, app deep link, and Spanish non-monetary share copy for a public listing", () => {
    const target = buildPublicAdoptionListingShareTarget({
      listingId: "adopt-nala-sopocachi",
      publicWebBaseUrl: "https://rastro.bo/",
      title: "Nala",
    });

    expect(publicAdoptionListingPathForId("adopt-nala-sopocachi")).toBe(
      "/adopciones/adopt-nala-sopocachi",
    );
    expect(target).toEqual({
      appDeepLink: "rastro://adopciones/adopt-nala-sopocachi",
      message:
        "Conoce a Nala en adopcion en Rastro: https://rastro.bo/adopciones/adopt-nala-sopocachi",
      path: "/adopciones/adopt-nala-sopocachi",
      title: "Mascota en adopcion: Nala",
      webUrl: "https://rastro.bo/adopciones/adopt-nala-sopocachi",
    });
    expect(JSON.stringify(target).toLowerCase()).not.toMatch(
      new RegExp(commerceTerms.join("|")),
    );
  });
});
