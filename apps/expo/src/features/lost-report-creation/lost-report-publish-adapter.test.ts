import { describe, expect, it, vi } from "vitest";

import { createReportInputSchema } from "@acme/validators";

import {
  createApiLostReportPublishHandler,
  toCreateLostPetReportInput,
} from "./lost-report-publish-adapter";

describe("Lost Report publish adapter", () => {
  it("maps a Lost Pet Report publish input to backend CreateReportInput without shared-form fields", () => {
    const createInput = toCreateLostPetReportInput(createPublishInput());

    expect(createInput).toMatchObject({
      contact: {
        preference: "both",
        whatsappPhone: "+59170123456",
      },
      eventOccurredAt: "2026-06-18T10:50:00.000Z",
      idempotencyKey: "lost-draft-stable-key-1",
      location: {
        exactLatitude: -16.5406,
        exactLongitude: -68.0772,
        exposeExactLocation: true,
        label: "Calle 21 de Calacoto",
        locationCell: "Calacoto",
      },
      media: [
        { mediaId: "22222222-2222-4222-8222-222222222222" },
        { mediaId: "11111111-1111-4111-8111-111111111111" },
      ],
      pet: {
        breed: "Siamés",
        color: "Mancha blanca en el pecho.",
        distinguishingTraits: "Mancha blanca en el pecho.",
        name: "Luna",
        species: "cat",
      },
      title: "Luna perdida en Calacoto",
      type: "lost_pet",
    });
    expect(createInput).not.toHaveProperty("foundDescription");
    expect(createInput).not.toHaveProperty("adoptionSummary");
    expect(createReportInputSchema.safeParse(createInput).success).toBe(true);
  });

  it("rejects a missing idempotency key before calling report.create", async () => {
    const client = createClient();
    const publish = createApiLostReportPublishHandler({ client });

    await expect(
      publish({
        ...createPublishInput(),
        idempotencyKey: undefined,
      }),
    ).rejects.toThrow("Lost Pet Report idempotency key is required.");
    expect(client.report.create.mutate).not.toHaveBeenCalled();
  });

  it("confirms create success through report.detail and nearby before returning the real backend id and status", async () => {
    const client = createClient({
      created: {
        id: "report-lost-backend-1",
        status: "active",
        type: "lost_pet",
      },
      detail: {
        id: "report-lost-backend-1",
        status: "closed",
        type: "lost_pet",
      },
      nearby: {
        query: {},
        results: [
          {
            id: "report-lost-backend-1",
            status: "closed",
            type: "lost_pet",
          },
        ],
      },
    });
    const publish = createApiLostReportPublishHandler({ client });

    await expect(publish(createPublishInput())).resolves.toEqual({
      id: "report-lost-backend-1",
      status: "closed",
    });
    expect(client.report.detail.query).toHaveBeenCalledWith({
      id: "report-lost-backend-1",
    });
    expect(client.report.nearby.query).toHaveBeenCalledWith({
      latitude: -16.5406,
      limit: 50,
      longitude: -68.0772,
      radiusMeters: 5000,
      statuses: ["active"],
      types: ["lost_pet", "found_pet", "sighting", "adoption"],
    });
  });
});

interface MockLostReport {
  id: string;
  status: "active" | "closed";
  type: "lost_pet";
}

interface MockLostNearby {
  query: Record<string, unknown>;
  results: MockLostReport[];
}

function createClient(
  options: {
    created?: MockLostReport;
    detail?: MockLostReport;
    nearby?: MockLostNearby;
  } = {},
) {
  const created = options.created ?? {
    id: "report-lost-created",
    status: "active",
    type: "lost_pet",
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
    contactOption: {
      kind: "both",
      phoneNumber: " +59170123456 ",
    },
    exactLocation: {
      addressLabel: "Calle 21 de Calacoto",
      countryCode: "BO",
      latitude: -16.5406,
      locationCellLabel: "Calacoto",
      longitude: -68.0772,
    },
    idempotencyKey: "lost-draft-stable-key-1",
    lastSeenAt: "2026-06-18T10:50:00.000Z",
    lastSeenDescription: "Salió por la puerta principal.",
    petProfile: {
      kind: "inline",
      profile: {
        breed: "Siamés",
        description: "Mancha blanca en el pecho.",
        name: "Luna",
        photos: [],
        type: "Gato",
      },
    },
    photos: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        uri: "file:///second-ready-lost-photo.jpg",
      },
      {
        id: "11111111-1111-4111-8111-111111111111",
        uri: "file:///first-ready-lost-photo.jpg",
      },
    ],
    showExactPublicLocation: true,
  } as const;
}
