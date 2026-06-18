import { describe, expect, it } from "vitest";

import type { NearbySearchLocation } from "../nearby/nearby-types";
import type { NearbyLostReportsViewModel } from "../nearby/nearby-view-model";
import type { AdoptionListingsSessionState } from "./adoption-listings";
import { createInMemoryLostPetReportRepository } from "../lost-reports/lost-reports";
import { createNearbyLostReportRepositoryAdapter } from "../nearby/nearby-lost-report-repository-adapter";
import { shareNearbyLostReport } from "../nearby/nearby-share";
import { buildNearbyLostReportsViewModel } from "../nearby/nearby-view-model";
import { createInMemoryAdoptionListingRepository } from "./adoption-listings";

const commerceTerms =
  /\b(?:precio|fee|payment|deposit|bidding|checkout|compra|comprar|venta|vender|marketplace)\b/i;

const verifiedMember = {
  displayName: "Huellitas Felices",
  kind: "member",
  memberId: "org-huellitas",
  verificationBadge: {
    label: "Organizacion verificada",
  },
} satisfies AdoptionListingsSessionState;

const location: NearbySearchLocation = {
  coordinates: { latitude: -16.5103, longitude: -68.1299 },
  countryCode: "BO",
  label: "Sopocachi, La Paz",
  locationCellLabel: "Sopocachi",
  manualLocationKind: "place",
  source: "manual",
};

describe("Adoption Listing public detail", () => {
  it("lets a member publish a non-monetary Adoption Listing with an optional verification badge", async () => {
    const listings = createInMemoryAdoptionListingRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });

    const published = await listings.publishAdoptionListing(verifiedMember, {
      adoptionSummary:
        "Nala busca un hogar tranquilo donde reciba tiempo y cuidado.",
      contactOption: {
        kind: "both",
        phoneNumber: "  +591 71234567 ",
      },
      exactLocation: {
        addressLabel: "Refugio Huellitas, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      healthNotes: "Vacunada y desparasitada.",
      idealHome: "Familia paciente y ambiente seguro.",
      petProfile: {
        kind: "inline",
        profile: {
          breed: "Mestizo",
          description: "Gatita tranquila, sociable y de interior.",
          name: "Nala",
          photos: [{ id: "pet-photo-1", uri: "file:///nala-profile.heic" }],
          type: "Gato",
        },
      },
      photos: [{ id: "adoption-photo-1", uri: "file:///nala.heic" }],
    });

    const detail = await listings.getPublicAdoptionListing(
      { kind: "visitor" },
      published.id,
    );

    expect(detail).toMatchObject({
      adoptionSummary:
        "Nala busca un hogar tranquilo donde reciba tiempo y cuidado.",
      contactOptions: [
        {
          kind: "in-app-chat",
          label: "Enviar mensaje en Rastro",
        },
        {
          kind: "whatsapp",
          label: "Escribir por WhatsApp",
          phoneNumber: "+591 71234567",
        },
      ],
      healthNotes: {
        label: "Salud y cuidados",
        value: "Vacunada y desparasitada.",
      },
      idealHome: {
        label: "Hogar ideal",
        value: "Familia paciente y ambiente seguro.",
      },
      kind: "adoption-listing",
      pet: {
        breed: "Mestizo",
        description: "Gatita tranquila, sociable y de interior.",
        name: "Nala",
        type: "Gato",
      },
      publicLocation: {
        label: "Sopocachi",
        privacyNote: "Zona aproximada compartida por seguridad.",
        type: "approximate",
      },
      shareTarget: {
        appDeepLink: "rastro://adopciones/adoption-listing-1",
        path: "/adopciones/adoption-listing-1",
        title: "Mascota en adopcion: Nala",
        webUrl: "https://rastro.bo/adopciones/adoption-listing-1",
      },
      statusLabel: "Adopcion activa",
      title: "Nala busca un hogar",
      verificationBadge: {
        label: "Organizacion verificada",
        visible: true,
      },
    });
    expect(detail?.publicLocation).not.toHaveProperty("coordinates");
    expect(detail?.photos[0]).toMatchObject({
      exif: {
        locationStripped: true,
        stripped: true,
      },
      status: "ready",
      uri: "file:///nala.heic#rastro-compressed",
    });
    expect(JSON.stringify(detail)).not.toMatch(commerceTerms);
  });

  it("rejects Adoption Listing publish input without at least one photo", async () => {
    const listings = createInMemoryAdoptionListingRepository();

    await expect(
      listings.publishAdoptionListing(verifiedMember, {
        adoptionSummary: "Busca un hogar responsable.",
        contactOption: { kind: "in-app-chat" },
        exactLocation: {
          countryCode: "BO",
          latitude: -16.5103,
          locationCellLabel: "Sopocachi",
          longitude: -68.1299,
        },
        petProfile: {
          kind: "inline",
          profile: {
            breed: "Mestizo",
            description: "Gatita tranquila.",
            name: "Nala",
            photos: [],
            type: "Gato",
          },
        },
        photos: [],
      }),
    ).rejects.toMatchObject({
      code: "adoption_listing_photo_required",
    });
  });
});

describe("Adoption Listing nearby browsing and sharing", () => {
  it("includes published Adoption Listings in visitor nearby browse with badge and non-monetary share copy", async () => {
    const lostReports = createInMemoryLostPetReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });
    const adoptionListings = createInMemoryAdoptionListingRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });
    const adapter = createNearbyLostReportRepositoryAdapter({
      adoptionListings,
      repository: lostReports,
    });
    const shareCalls: unknown[] = [];

    await adoptionListings.publishAdoptionListing(verifiedMember, {
      adoptionSummary:
        "Nala busca un hogar tranquilo donde reciba tiempo y cuidado.",
      contactOption: { kind: "in-app-chat" },
      exactLocation: {
        addressLabel: "Refugio Huellitas, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      healthNotes: "Vacunada y desparasitada.",
      idealHome: "Familia paciente y ambiente seguro.",
      petProfile: {
        kind: "inline",
        profile: {
          breed: "Mestizo",
          description: "Gatita tranquila, sociable y de interior.",
          name: "Nala",
          photos: [{ id: "pet-photo-1", uri: "file:///nala-profile.heic" }],
          type: "Gato",
        },
      },
      photos: [{ id: "adoption-photo-1", uri: "file:///nala.heic" }],
    });

    const result = await adapter.searchLostPetReports({
      location,
      radiusKm: 5,
    });
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location },
      mode: "list",
      radiusKm: 5,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(viewModel.cards).toHaveLength(1);
    expect(viewModel.cards[0]).toMatchObject({
      eventAtLabel: "Hace 1 min",
      priorityLabel: "Adopcion",
      publicLocationLabel: "Sopocachi · zona aproximada",
      reportKind: "adoption-listing",
      shareTarget: {
        path: "/adopciones/adoption-listing-1",
        webUrl: "https://rastro.bo/adopciones/adoption-listing-1",
      },
      subtitle: "Gato • Mestizo",
      summary: "Nala busca un hogar tranquilo donde reciba tiempo y cuidado.",
      title: "Nala",
      verificationBadge: {
        label: "Organizacion verificada",
        visible: true,
      },
    });
    expect(viewModel.mapPins[0]).toMatchObject({
      publicSummaryId: "adoption-listing-1",
      title: "Nala",
    });

    const card = viewModel.cards[0];

    if (!card) {
      throw new Error("Expected a shareable Adoption Listing card.");
    }

    await shareNearbyLostReport(card, {
      share: (...args) => {
        shareCalls.push(args);

        return Promise.resolve({ action: "sharedAction" });
      },
    });

    expect(shareCalls).toEqual([
      [
        {
          message:
            "Conoce a Nala en adopcion en Rastro: https://rastro.bo/adopciones/adoption-listing-1",
          title: "Mascota en adopcion: Nala",
          url: "https://rastro.bo/adopciones/adoption-listing-1",
        },
        {
          dialogTitle: "Compartir adopcion",
          subject: "Mascota en adopcion: Nala",
        },
      ],
    ]);
    expect(JSON.stringify(viewModel)).not.toMatch(commerceTerms);
  });
});

function assertNearbyViewModelKind<
  K extends NearbyLostReportsViewModel["kind"],
>(
  viewModel: NearbyLostReportsViewModel,
  kind: K,
): asserts viewModel is Extract<NearbyLostReportsViewModel, { kind: K }> {
  expect(viewModel.kind).toBe(kind);
}
