import { describe, expect, it, vi } from "vitest";

import { createReportInputSchema } from "@acme/validators";

import {
  createApiSightingReportPublishHandler,
  toCreateSightingReportInput,
} from "./sighting-report-publish-adapter";

describe("Sighting Report publish adapter", () => {
  it("maps a no-photo Sighting Report publish input to backend CreateReportInput within Bolivia bounds", () => {
    const createInput = toCreateSightingReportInput({
      ...createPublishInput(),
      photos: [],
    });

    expect(createInput).toMatchObject({
      idempotencyKey: "sighting-draft-stable-key-1",
      location: {
        exactLatitude: -16.5103,
        exactLongitude: -68.1299,
        exposeExactLocation: false,
        label: "Plaza Abaroa, La Paz",
        locationCell: "Sopocachi",
      },
      media: [],
      pet: {
        breed: "Mestizo",
        color: "Patas blancas, collar verde y orejas caidas.",
        distinguishingTraits: "Patas blancas, collar verde y orejas caidas.",
        species: "dog",
      },
      title: "Perro visto en Sopocachi",
      type: "sighting",
    });
    expect(createReportInputSchema.safeParse(createInput).success).toBe(true);
  });

  it("publishes optional sighting media as ready backend media IDs in draft order", () => {
    const createInput = toCreateSightingReportInput({
      ...createPublishInput(),
      photos: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          uri: "file:///second-ready-sighting-photo.jpg",
        },
        {
          id: "11111111-1111-4111-8111-111111111111",
          uri: "file:///first-ready-sighting-photo.jpg",
        },
      ],
    });

    expect(createInput.media).toEqual([
      { mediaId: "22222222-2222-4222-8222-222222222222" },
      { mediaId: "11111111-1111-4111-8111-111111111111" },
    ]);
    expect(createReportInputSchema.safeParse(createInput).success).toBe(true);
  });

  it("rejects backend publish locations outside Bolivia before calling report.create", () => {
    expect(() =>
      toCreateSightingReportInput({
        ...createPublishInput(),
        exactLocation: {
          ...createPublishInput().exactLocation,
          latitude: -8.5,
        },
      }),
    ).toThrow("Selecciona una ubicacion dentro de Bolivia.");
  });

  it("uses the location cell as the backend label when no address label is present", () => {
    const createInput = toCreateSightingReportInput({
      ...createPublishInput(),
      exactLocation: {
        ...createPublishInput().exactLocation,
        addressLabel: "  ",
        locationCellLabel: "  Sopocachi  ",
      },
      showExactPublicLocation: true,
    });

    expect(createInput.location).toEqual({
      exactLatitude: -16.5103,
      exactLongitude: -68.1299,
      exposeExactLocation: true,
      label: "Sopocachi",
      locationCell: "Sopocachi",
    });
  });

  it("confirms create success through report.detail and the production nearby query", async () => {
    const client = {
      report: {
        create: {
          mutate: vi.fn().mockResolvedValue({
            id: "report-sighting-backend-1",
            status: "active",
            type: "sighting",
          }),
        },
        detail: {
          query: vi.fn().mockResolvedValue({
            id: "report-sighting-backend-1",
            status: "active",
            type: "sighting",
          }),
        },
        nearby: {
          query: vi.fn().mockResolvedValue({
            query: {},
            results: [
              {
                id: "report-sighting-backend-1",
                status: "active",
                type: "sighting",
              },
            ],
          }),
        },
      },
    };
    const publish = createApiSightingReportPublishHandler({ client });

    await expect(publish(createPublishInput())).resolves.toEqual({
      id: "report-sighting-backend-1",
      status: "active",
    });
    expect(client.report.detail.query).toHaveBeenCalledWith({
      id: "report-sighting-backend-1",
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
});

function createPublishInput() {
  return {
    contactOption: {
      kind: "in-app-chat",
    },
    direction: "Iba hacia la avenida 20 de Octubre.",
    exactLocation: {
      addressLabel: "Plaza Abaroa, La Paz",
      countryCode: "BO",
      latitude: -16.5103,
      locationCellLabel: "Sopocachi",
      longitude: -68.1299,
    },
    idempotencyKey: "sighting-draft-stable-key-1",
    observedAt: "2026-06-18T10:15:00.000Z",
    observedCondition: "Asustado, caminando rapido, sin heridas visibles.",
    pet: {
      breed: "Mestizo",
      description: "Patas blancas, collar verde y orejas caidas.",
      type: "Perro",
    },
    photos: [],
    showExactPublicLocation: false,
    sightingDescription:
      "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
  } as const;
}
