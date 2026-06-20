import { describe, expect, it } from "vitest";

import type { CreateReportInput } from "@acme/validators";

import type { PersistedReport } from "../report-repository";
import { appRouter } from "../root";

const validReportCreateInput = {
  idempotencyKey: "sighting-2026-06-19-device-1",
  type: "sighting",
  title: "Perro visto cerca de Sopocachi",
  description:
    "Perro mediano caminando solo cerca de la plaza. No pude asegurarlo.",
  pet: {
    species: "dog",
    color: "marron",
    size: "mediano",
  },
  eventOccurredAt: "2026-06-19T18:45:00.000Z",
  location: {
    exactLatitude: -16.510231,
    exactLongitude: -68.123881,
    label: "Sopocachi, La Paz",
    locationCell: "bo-lpb-sopocachi",
    exposeExactLocation: false,
  },
  contact: {
    preference: "in_app_chat",
  },
  media: [],
} satisfies CreateReportInput;

function createCaller(context: unknown) {
  return appRouter.createCaller(context as never);
}

function persistedSightingReport(
  overrides: Partial<PersistedReport> = {},
): PersistedReport {
  return {
    id: "report-sighting-sopocachi",
    caretakerId: "member-camila",
    idempotencyKey: validReportCreateInput.idempotencyKey,
    type: validReportCreateInput.type,
    status: "active",
    outcome: null,
    title: validReportCreateInput.title,
    description: validReportCreateInput.description,
    petName: null,
    species: validReportCreateInput.pet.species,
    breed: null,
    color: validReportCreateInput.pet.color,
    size: validReportCreateInput.pet.size,
    distinguishingTraits: null,
    eventOccurredAt: new Date(validReportCreateInput.eventOccurredAt),
    contactPreference: validReportCreateInput.contact.preference,
    whatsappPhone: null,
    createdAt: new Date("2026-06-19T19:00:00.000Z"),
    updatedAt: new Date("2026-06-19T19:00:00.000Z"),
    resolvedAt: null,
    deletedAt: null,
    location: {
      exactLatitude: validReportCreateInput.location.exactLatitude,
      exactLongitude: validReportCreateInput.location.exactLongitude,
      publicLatitude: -16.51,
      publicLongitude: -68.12,
      precision: "approximate",
      label: validReportCreateInput.location.label,
      locationCell: validReportCreateInput.location.locationCell,
      ...overrides.location,
    },
    media: [],
    ...overrides,
  };
}

describe("report router", () => {
  it("rejects unauthenticated report creation before any persistence work", async () => {
    const caller = createCaller({
      authApi: {},
      db: {},
      session: null,
    });

    await expect(
      caller.report.create(validReportCreateInput),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("creates a member report and returns only the safe public location", async () => {
    const caller = createCaller({
      authApi: {},
      db: {},
      session: {
        user: {
          id: "member-camila",
        },
      },
      reportRepository: {
        findByCaretakerAndIdempotencyKey: () => Promise.resolve(null),
        create: () =>
          Promise.resolve({
            id: "report-sighting-sopocachi",
            caretakerId: "member-camila",
            idempotencyKey: validReportCreateInput.idempotencyKey,
            type: validReportCreateInput.type,
            status: "active",
            outcome: null,
            title: validReportCreateInput.title,
            description: validReportCreateInput.description,
            petName: null,
            species: validReportCreateInput.pet.species,
            breed: null,
            color: validReportCreateInput.pet.color,
            size: validReportCreateInput.pet.size,
            distinguishingTraits: null,
            eventOccurredAt: new Date(validReportCreateInput.eventOccurredAt),
            contactPreference: validReportCreateInput.contact.preference,
            whatsappPhone: null,
            createdAt: new Date("2026-06-19T19:00:00.000Z"),
            updatedAt: new Date("2026-06-19T19:00:00.000Z"),
            resolvedAt: null,
            deletedAt: null,
            location: {
              exactLatitude: validReportCreateInput.location.exactLatitude,
              exactLongitude: validReportCreateInput.location.exactLongitude,
              publicLatitude: -16.51,
              publicLongitude: -68.12,
              precision: "approximate",
              label: validReportCreateInput.location.label,
              locationCell: validReportCreateInput.location.locationCell,
            },
            media: [],
          }),
      },
    });

    const report = await caller.report.create(validReportCreateInput);

    expect(report).toMatchObject({
      id: "report-sighting-sopocachi",
      type: "sighting",
      status: "active",
      title: "Perro visto cerca de Sopocachi",
      owner: {
        isCurrentMember: true,
      },
      location: {
        latitude: -16.51,
        longitude: -68.12,
        precision: "approximate",
        label: "Sopocachi, La Paz",
        locationCell: "bo-lpb-sopocachi",
      },
      media: [],
    });
    expect(JSON.stringify(report)).not.toContain("-16.510231");
    expect(JSON.stringify(report)).not.toContain("-68.123881");
  });

  it("returns the existing report for duplicate idempotency keys", async () => {
    let createWasCalled = false;
    const caller = createCaller({
      authApi: {},
      db: {},
      session: {
        user: {
          id: "member-camila",
        },
      },
      reportRepository: {
        findByCaretakerAndIdempotencyKey: () =>
          Promise.resolve(persistedSightingReport()),
        create: () => {
          createWasCalled = true;
          return Promise.reject(
            new Error("Duplicate create should not insert a new report."),
          );
        },
      },
    });

    const report = await caller.report.create(validReportCreateInput);

    expect(report.id).toBe("report-sighting-sopocachi");
    expect(createWasCalled).toBe(false);
  });

  it("returns public report details to visitors without exact private coordinates", async () => {
    const caller = createCaller({
      authApi: {},
      db: {},
      session: null,
      reportRepository: {
        findById: () =>
          Promise.resolve({
            id: "report-sighting-sopocachi",
            caretakerId: "member-camila",
            idempotencyKey: validReportCreateInput.idempotencyKey,
            type: validReportCreateInput.type,
            status: "active",
            outcome: null,
            title: validReportCreateInput.title,
            description: validReportCreateInput.description,
            petName: null,
            species: validReportCreateInput.pet.species,
            breed: null,
            color: validReportCreateInput.pet.color,
            size: validReportCreateInput.pet.size,
            distinguishingTraits: null,
            eventOccurredAt: new Date(validReportCreateInput.eventOccurredAt),
            contactPreference: validReportCreateInput.contact.preference,
            whatsappPhone: null,
            createdAt: new Date("2026-06-19T19:00:00.000Z"),
            updatedAt: new Date("2026-06-19T19:00:00.000Z"),
            resolvedAt: null,
            deletedAt: null,
            location: {
              exactLatitude: validReportCreateInput.location.exactLatitude,
              exactLongitude: validReportCreateInput.location.exactLongitude,
              publicLatitude: -16.51,
              publicLongitude: -68.12,
              precision: "approximate",
              label: validReportCreateInput.location.label,
              locationCell: validReportCreateInput.location.locationCell,
            },
            media: [],
          }),
      },
    });

    const report = await caller.report.detail({
      id: "report-sighting-sopocachi",
    });

    expect(report).toMatchObject({
      id: "report-sighting-sopocachi",
      owner: {
        isCurrentMember: false,
      },
      location: {
        latitude: -16.51,
        longitude: -68.12,
        precision: "approximate",
      },
      contact: {
        preference: "in_app_chat",
        hasWhatsapp: false,
      },
    });
    expect(JSON.stringify(report)).not.toContain("-16.510231");
    expect(JSON.stringify(report)).not.toContain("-68.123881");
    expect(JSON.stringify(report)).not.toContain("member-camila");
  });

  it("returns nearby public report summaries using the requested radius", async () => {
    const caller = createCaller({
      authApi: {},
      db: {},
      session: null,
      reportRepository: {
        nearby: () =>
          Promise.resolve([
            {
              id: "report-sighting-sopocachi",
              caretakerId: "member-camila",
              idempotencyKey: validReportCreateInput.idempotencyKey,
              type: validReportCreateInput.type,
              status: "active",
              outcome: null,
              title: validReportCreateInput.title,
              description: validReportCreateInput.description,
              petName: null,
              species: validReportCreateInput.pet.species,
              breed: null,
              color: validReportCreateInput.pet.color,
              size: validReportCreateInput.pet.size,
              distinguishingTraits: null,
              eventOccurredAt: new Date(validReportCreateInput.eventOccurredAt),
              contactPreference: validReportCreateInput.contact.preference,
              whatsappPhone: null,
              createdAt: new Date("2026-06-19T19:00:00.000Z"),
              updatedAt: new Date("2026-06-19T19:00:00.000Z"),
              resolvedAt: null,
              deletedAt: null,
              location: {
                exactLatitude: validReportCreateInput.location.exactLatitude,
                exactLongitude: validReportCreateInput.location.exactLongitude,
                publicLatitude: -16.51,
                publicLongitude: -68.12,
                precision: "approximate",
                label: validReportCreateInput.location.label,
                locationCell: validReportCreateInput.location.locationCell,
              },
              media: [],
            },
          ]),
      },
    });

    const result = await caller.report.nearby({
      latitude: -16.5,
      longitude: -68.12,
      radiusMeters: 5000,
      types: ["lost_pet", "found_pet", "sighting", "adoption"],
    });

    expect(result).toMatchObject({
      query: {
        latitude: -16.5,
        longitude: -68.12,
        radiusMeters: 5000,
      },
      results: [
        {
          id: "report-sighting-sopocachi",
          location: {
            latitude: -16.51,
            longitude: -68.12,
            precision: "approximate",
          },
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("-16.510231");
    expect(JSON.stringify(result)).not.toContain("-68.123881");
  });

  it("rejects updates from members who are not the caretaker", async () => {
    const caller = createCaller({
      authApi: {},
      db: {},
      session: {
        user: {
          id: "member-diego",
        },
      },
      reportRepository: {
        findById: () =>
          Promise.resolve({
            id: "report-sighting-sopocachi",
            caretakerId: "member-camila",
            idempotencyKey: validReportCreateInput.idempotencyKey,
            type: validReportCreateInput.type,
            status: "active",
            outcome: null,
            title: validReportCreateInput.title,
            description: validReportCreateInput.description,
            petName: null,
            species: validReportCreateInput.pet.species,
            breed: null,
            color: validReportCreateInput.pet.color,
            size: validReportCreateInput.pet.size,
            distinguishingTraits: null,
            eventOccurredAt: new Date(validReportCreateInput.eventOccurredAt),
            contactPreference: validReportCreateInput.contact.preference,
            whatsappPhone: null,
            createdAt: new Date("2026-06-19T19:00:00.000Z"),
            updatedAt: new Date("2026-06-19T19:00:00.000Z"),
            resolvedAt: null,
            deletedAt: null,
            location: {
              exactLatitude: validReportCreateInput.location.exactLatitude,
              exactLongitude: validReportCreateInput.location.exactLongitude,
              publicLatitude: -16.51,
              publicLongitude: -68.12,
              precision: "approximate",
              label: validReportCreateInput.location.label,
              locationCell: validReportCreateInput.location.locationCell,
            },
            media: [],
          }),
        update: () => {
          return Promise.reject(
            new Error("Unauthorized update should not reach persistence."),
          );
        },
      },
    });

    await expect(
      caller.report.update({
        id: "report-sighting-sopocachi",
        title: "Intento no autorizado",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows the caretaker to update a report with actor attribution", async () => {
    let updateInput:
      | {
          actorId: string;
          patch: { id: string; title?: string };
          reportId: string;
        }
      | undefined;
    const caller = createCaller({
      authApi: {},
      db: {},
      session: {
        user: {
          id: "member-camila",
        },
      },
      reportRepository: {
        findById: () => Promise.resolve(persistedSightingReport()),
        update: (input: {
          actorId: string;
          patch: { id: string; title?: string };
          reportId: string;
        }) => {
          updateInput = input;
          return Promise.resolve(
            persistedSightingReport({
              title: input.patch.title ?? validReportCreateInput.title,
            }),
          );
        },
      },
    });

    const report = await caller.report.update({
      id: "report-sighting-sopocachi",
      title: "Perro visto cerca de la plaza",
    });

    expect(updateInput).toMatchObject({
      actorId: "member-camila",
      reportId: "report-sighting-sopocachi",
      patch: {
        id: "report-sighting-sopocachi",
        title: "Perro visto cerca de la plaza",
      },
    });
    expect(report.title).toBe("Perro visto cerca de la plaza");
  });

  it("rejects resolve requests from members who are not the caretaker", async () => {
    let resolveWasCalled = false;
    const caller = createCaller({
      authApi: {},
      db: {},
      session: {
        user: {
          id: "member-diego",
        },
      },
      reportRepository: {
        findById: () => Promise.resolve(persistedSightingReport()),
        resolve: () => {
          resolveWasCalled = true;
          return Promise.reject(
            new Error("Unauthorized resolve should not reach persistence."),
          );
        },
      },
    });

    await expect(
      caller.report.resolve({
        id: "report-sighting-sopocachi",
        outcome: "reunited",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(resolveWasCalled).toBe(false);
  });

  it("allows the caretaker to resolve an active report", async () => {
    const caller = createCaller({
      authApi: {},
      db: {},
      session: {
        user: {
          id: "member-camila",
        },
      },
      reportRepository: {
        findById: () =>
          Promise.resolve({
            id: "report-sighting-sopocachi",
            caretakerId: "member-camila",
            idempotencyKey: validReportCreateInput.idempotencyKey,
            type: validReportCreateInput.type,
            status: "active",
            outcome: null,
            title: validReportCreateInput.title,
            description: validReportCreateInput.description,
            petName: null,
            species: validReportCreateInput.pet.species,
            breed: null,
            color: validReportCreateInput.pet.color,
            size: validReportCreateInput.pet.size,
            distinguishingTraits: null,
            eventOccurredAt: new Date(validReportCreateInput.eventOccurredAt),
            contactPreference: validReportCreateInput.contact.preference,
            whatsappPhone: null,
            createdAt: new Date("2026-06-19T19:00:00.000Z"),
            updatedAt: new Date("2026-06-19T19:00:00.000Z"),
            resolvedAt: null,
            deletedAt: null,
            location: {
              exactLatitude: validReportCreateInput.location.exactLatitude,
              exactLongitude: validReportCreateInput.location.exactLongitude,
              publicLatitude: -16.51,
              publicLongitude: -68.12,
              precision: "approximate",
              label: validReportCreateInput.location.label,
              locationCell: validReportCreateInput.location.locationCell,
            },
            media: [],
          }),
        resolve: () =>
          Promise.resolve({
            id: "report-sighting-sopocachi",
            caretakerId: "member-camila",
            idempotencyKey: validReportCreateInput.idempotencyKey,
            type: validReportCreateInput.type,
            status: "closed",
            outcome: "reunited",
            title: validReportCreateInput.title,
            description: validReportCreateInput.description,
            petName: null,
            species: validReportCreateInput.pet.species,
            breed: null,
            color: validReportCreateInput.pet.color,
            size: validReportCreateInput.pet.size,
            distinguishingTraits: null,
            eventOccurredAt: new Date(validReportCreateInput.eventOccurredAt),
            contactPreference: validReportCreateInput.contact.preference,
            whatsappPhone: null,
            createdAt: new Date("2026-06-19T19:00:00.000Z"),
            updatedAt: new Date("2026-06-19T20:00:00.000Z"),
            resolvedAt: new Date("2026-06-19T20:00:00.000Z"),
            deletedAt: null,
            location: {
              exactLatitude: validReportCreateInput.location.exactLatitude,
              exactLongitude: validReportCreateInput.location.exactLongitude,
              publicLatitude: -16.51,
              publicLongitude: -68.12,
              precision: "approximate",
              label: validReportCreateInput.location.label,
              locationCell: validReportCreateInput.location.locationCell,
            },
            media: [],
          }),
      },
    });

    const report = await caller.report.resolve({
      id: "report-sighting-sopocachi",
      outcome: "reunited",
    });

    expect(report).toMatchObject({
      id: "report-sighting-sopocachi",
      status: "closed",
      outcome: "reunited",
      owner: {
        isCurrentMember: true,
      },
    });
  });

  it("rejects delete requests from members who are not the caretaker", async () => {
    let deleteWasCalled = false;
    const caller = createCaller({
      authApi: {},
      db: {},
      session: {
        user: {
          id: "member-diego",
        },
      },
      reportRepository: {
        findById: () => Promise.resolve(persistedSightingReport()),
        delete: () => {
          deleteWasCalled = true;
          return Promise.reject(
            new Error("Unauthorized delete should not reach persistence."),
          );
        },
      },
    });

    await expect(
      caller.report.delete({
        id: "report-sighting-sopocachi",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(deleteWasCalled).toBe(false);
  });

  it("allows the caretaker to delete a report", async () => {
    const caller = createCaller({
      authApi: {},
      db: {},
      session: {
        user: {
          id: "member-camila",
        },
      },
      reportRepository: {
        findById: () =>
          Promise.resolve({
            id: "report-sighting-sopocachi",
            caretakerId: "member-camila",
            idempotencyKey: validReportCreateInput.idempotencyKey,
            type: validReportCreateInput.type,
            status: "active",
            outcome: null,
            title: validReportCreateInput.title,
            description: validReportCreateInput.description,
            petName: null,
            species: validReportCreateInput.pet.species,
            breed: null,
            color: validReportCreateInput.pet.color,
            size: validReportCreateInput.pet.size,
            distinguishingTraits: null,
            eventOccurredAt: new Date(validReportCreateInput.eventOccurredAt),
            contactPreference: validReportCreateInput.contact.preference,
            whatsappPhone: null,
            createdAt: new Date("2026-06-19T19:00:00.000Z"),
            updatedAt: new Date("2026-06-19T19:00:00.000Z"),
            resolvedAt: null,
            deletedAt: null,
            location: {
              exactLatitude: validReportCreateInput.location.exactLatitude,
              exactLongitude: validReportCreateInput.location.exactLongitude,
              publicLatitude: -16.51,
              publicLongitude: -68.12,
              precision: "approximate",
              label: validReportCreateInput.location.label,
              locationCell: validReportCreateInput.location.locationCell,
            },
            media: [],
          }),
        delete: () =>
          Promise.resolve({
            id: "report-sighting-sopocachi",
            deleted: true,
          }),
      },
    });

    await expect(
      caller.report.delete({
        id: "report-sighting-sopocachi",
      }),
    ).resolves.toEqual({
      id: "report-sighting-sopocachi",
      deleted: true,
    });
  });
});
