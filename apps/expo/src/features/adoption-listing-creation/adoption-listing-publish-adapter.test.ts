import { describe, expect, it, vi } from "vitest";

import { createReportInputSchema } from "@acme/validators";

import {
  createApiAdoptionListingPublishHandler,
  toCreateAdoptionListingReportInput,
} from "./adoption-listing-publish-adapter";

describe("Adoption Listing publish adapter", () => {
  it("maps an Adoption Listing publish input to backend CreateReportInput without monetary or shared-form fields", () => {
    const createInput = toCreateAdoptionListingReportInput(
      createPublishInput(),
      {
        now: () => "2026-06-18T11:00:00.000Z",
      },
    );

    expect(createInput).toMatchObject({
      contact: {
        preference: "whatsapp",
        whatsappPhone: "+59170123456",
      },
      eventOccurredAt: "2026-06-18T11:00:00.000Z",
      idempotencyKey: "adoption-draft-stable-key-1",
      location: {
        exactLatitude: -16.5103,
        exactLongitude: -68.1299,
        exposeExactLocation: false,
        label: "Refugio Huellitas, Sopocachi",
        locationCell: "Sopocachi",
      },
      media: [
        { mediaId: "55555555-5555-4555-8555-555555555555" },
        { mediaId: "66666666-6666-4666-8666-666666666666" },
      ],
      pet: {
        breed: "Mestizo",
        color: "Gatita tranquila, sociable y acostumbrada a interiores.",
        distinguishingTraits:
          "Gatita tranquila, sociable y acostumbrada a interiores.",
        name: "Nala",
        species: "cat",
      },
      title: "Nala en adopción en Sopocachi",
      type: "adoption",
    });
    expect(createInput.description).toContain(
      "Nala busca un hogar tranquilo donde reciba tiempo y cuidado.",
    );
    expect(createInput.description).toContain("Vacunas al dia.");
    expect(createInput.description).toContain("Familia paciente.");
    expect(createInput.description).not.toMatch(
      /\b(?:precio|fee|payment|deposit|bidding|checkout|compra|comprar|venta|vender|marketplace)\b/i,
    );
    expect(createInput).not.toHaveProperty("lastSeenDescription");
    expect(createInput).not.toHaveProperty("foundDescription");
    expect(createReportInputSchema.safeParse(createInput).success).toBe(true);
  });

  it("rejects a missing idempotency key before calling report.create", async () => {
    const client = createClient();
    const publish = createApiAdoptionListingPublishHandler({
      client,
      now: () => "2026-06-18T11:00:00.000Z",
    });

    await expect(
      publish({
        ...createPublishInput(),
        idempotencyKey: undefined,
      }),
    ).rejects.toThrow("Adoption Listing idempotency key is required.");
    expect(client.report.create.mutate).not.toHaveBeenCalled();
  });

  it("confirms create success through report.detail and nearby before returning the real backend id and status", async () => {
    const client = createClient({
      created: {
        id: "report-adoption-backend-1",
        status: "active",
        type: "adoption",
      },
      detail: {
        id: "report-adoption-backend-1",
        status: "closed",
        type: "adoption",
      },
      nearby: {
        query: {},
        results: [
          {
            id: "report-adoption-backend-1",
            status: "closed",
            type: "adoption",
          },
        ],
      },
    });
    const publish = createApiAdoptionListingPublishHandler({
      client,
      now: () => "2026-06-18T11:00:00.000Z",
    });

    await expect(publish(createPublishInput())).resolves.toEqual({
      id: "report-adoption-backend-1",
      status: "closed",
    });
    expect(client.report.nearby.query).toHaveBeenCalledWith({
      latitude: -16.5103,
      limit: 50,
      longitude: -68.1299,
      radiusMeters: 5000,
      statuses: ["active"],
      types: ["lost_pet", "found_pet", "sighting", "adoption"],
    });
  });

  it("accepts modo de revisión pending review without requiring public nearby visibility", async () => {
    const client = createClient({
      created: {
        id: "report-adoption-backend-1",
        status: "pending_review",
        type: "adoption",
      },
      detail: {
        id: "report-adoption-backend-1",
        status: "pending_review",
        type: "adoption",
      },
      nearby: {
        query: {},
        results: [],
      },
    });
    const publish = createApiAdoptionListingPublishHandler({
      client,
      now: () => "2026-06-18T11:00:00.000Z",
    });

    await expect(publish(createPublishInput())).resolves.toEqual({
      id: "report-adoption-backend-1",
      status: "pending_review",
    });
    expect(client.report.nearby.query).not.toHaveBeenCalled();
  });
});

interface MockAdoptionReport {
  id: string;
  status: "active" | "closed" | "pending_review";
  type: "adoption";
}

interface MockAdoptionNearby {
  query: Record<string, unknown>;
  results: MockAdoptionReport[];
}

function createClient(
  options: {
    created?: MockAdoptionReport;
    detail?: MockAdoptionReport;
    nearby?: MockAdoptionNearby;
  } = {},
) {
  const created = options.created ?? {
    id: "report-adoption-created",
    status: "active",
    type: "adoption",
  };
  const detail = options.detail ?? created;
  const nearby = options.nearby ?? {
    query: {},
    results: [detail],
  };

  return {
    report: {
      create: {
        mutate: vi.fn().mockResolvedValue(created),
      },
      detail: {
        query: vi.fn().mockResolvedValue(detail),
      },
      nearby: {
        query: vi.fn().mockResolvedValue(nearby),
      },
    },
  };
}

function createPublishInput() {
  return {
    adoptionSummary:
      "Nala busca un hogar tranquilo donde reciba tiempo y cuidado.",
    contactOption: {
      kind: "whatsapp",
      phoneNumber: " +59170123456 ",
    },
    exactLocation: {
      addressLabel: "Refugio Huellitas, Sopocachi",
      countryCode: "BO",
      latitude: -16.5103,
      locationCellLabel: "Sopocachi",
      longitude: -68.1299,
    },
    healthNotes: "Vacunas al dia.",
    idempotencyKey: "adoption-draft-stable-key-1",
    idealHome: "Familia paciente.",
    petProfile: {
      kind: "inline",
      profile: {
        breed: "Mestizo",
        description: "Gatita tranquila, sociable y acostumbrada a interiores.",
        name: "Nala",
        photos: [],
        type: "Gato",
      },
    },
    photos: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        uri: "file:///first-adoption-photo.jpg",
      },
      {
        id: "66666666-6666-4666-8666-666666666666",
        uri: "file:///second-adoption-photo.jpg",
      },
    ],
    showExactPublicLocation: false,
  } as const;
}
