import { describe, expect, it, vi } from "vitest";

import { createReportInputSchema } from "@acme/validators";

import {
  createApiFoundReportPublishHandler,
  toCreateFoundPetReportInput,
} from "./found-report-publish-adapter";

describe("Found Report publish adapter", () => {
  it("maps a Found Pet Report publish input to backend CreateReportInput without shared-form fields", () => {
    const createInput = toCreateFoundPetReportInput(createPublishInput());

    expect(createInput).toMatchObject({
      contact: {
        preference: "in_app_chat",
      },
      eventOccurredAt: "2026-06-18T10:30:00.000Z",
      idempotencyKey: "found-draft-stable-key-1",
      location: {
        exactLatitude: -16.5022,
        exactLongitude: -68.1213,
        exposeExactLocation: false,
        label: "Jardin Botanico de La Paz",
        locationCell: "Miraflores",
      },
      media: [
        { mediaId: "33333333-3333-4333-8333-333333333333" },
        { mediaId: "44444444-4444-4444-8444-444444444444" },
      ],
      pet: {
        breed: "Husky mix",
        color: "Pelaje gris y ojos claros.",
        distinguishingTraits: "Pelaje gris y ojos claros.",
        species: "dog",
      },
      title: "Perro encontrado en Miraflores",
      type: "found_pet",
    });
    expect(createInput).not.toHaveProperty("lastSeenDescription");
    expect(createInput).not.toHaveProperty("adoptionSummary");
    expect(createReportInputSchema.safeParse(createInput).success).toBe(true);
  });

  it("rejects a missing idempotency key before calling report.create", async () => {
    const client = createClient();
    const publish = createApiFoundReportPublishHandler({ client });

    await expect(
      publish({
        ...createPublishInput(),
        idempotencyKey: undefined,
      }),
    ).rejects.toThrow("Found Pet Report idempotency key is required.");
    expect(client.report.create.mutate).not.toHaveBeenCalled();
  });

  it("confirms create success through report.detail and nearby before returning the real backend id and status", async () => {
    const client = createClient({
      created: {
        id: "report-found-backend-1",
        status: "active",
        type: "found_pet",
      },
      detail: {
        id: "report-found-backend-1",
        status: "closed",
        type: "found_pet",
      },
      nearby: {
        query: {},
        results: [
          {
            id: "report-found-backend-1",
            status: "closed",
            type: "found_pet",
          },
        ],
      },
    });
    const publish = createApiFoundReportPublishHandler({ client });

    await expect(publish(createPublishInput())).resolves.toEqual({
      id: "report-found-backend-1",
      status: "closed",
    });
    expect(client.report.nearby.query).toHaveBeenCalledWith({
      latitude: -16.5022,
      limit: 50,
      longitude: -68.1213,
      radiusMeters: 5000,
      statuses: ["active"],
      types: ["lost_pet", "found_pet", "sighting", "adoption"],
    });
  });
});

interface MockFoundReport {
  id: string;
  status: "active" | "closed";
  type: "found_pet";
}

interface MockFoundNearby {
  query: Record<string, unknown>;
  results: MockFoundReport[];
}

function createClient(
  options: {
    created?: MockFoundReport;
    detail?: MockFoundReport;
    nearby?: MockFoundNearby;
  } = {},
) {
  const created = options.created ?? {
    id: "report-found-created",
    status: "active",
    type: "found_pet",
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
    condition: "Amigable y sin heridas visibles.",
    contactOption: {
      kind: "in-app-chat",
    },
    exactLocation: {
      addressLabel: "Jardin Botanico de La Paz",
      countryCode: "BO",
      latitude: -16.5022,
      locationCellLabel: "Miraflores",
      longitude: -68.1213,
    },
    foundAt: "2026-06-18T10:30:00.000Z",
    foundDescription:
      "Encontrada cerca de la fuente. No lleva collar ni identificacion visible.",
    idempotencyKey: "found-draft-stable-key-1",
    pet: {
      breed: "Husky mix",
      description: "Pelaje gris y ojos claros.",
      type: "Perro",
    },
    photos: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        uri: "file:///first-found-photo.jpg",
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        uri: "file:///second-found-photo.jpg",
      },
    ],
    showExactPublicLocation: false,
  } as const;
}
