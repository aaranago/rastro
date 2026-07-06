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

const validAdoptionCreateInput = {
  ...validReportCreateInput,
  idempotencyKey: "adoption-2026-06-19-device-1",
  type: "adoption",
  title: "Nala en adopcion en Sopocachi",
  description: "Nala busca un hogar tranquilo y responsable.",
  pet: {
    species: "cat",
    color: "gris",
    name: "Nala",
  },
  media: [
    {
      mediaId: "55555555-5555-4555-8555-555555555555",
    },
  ],
} satisfies CreateReportInput;

const validLostPetCreateInput = {
  ...validReportCreateInput,
  idempotencyKey: "lost-2026-06-19-device-1",
  type: "lost_pet",
  title: "Luna perdida cerca de Sopocachi",
  description: "Luna salio con arnes rojo y no volvio a casa.",
  pet: {
    species: "dog",
    color: "marron",
    name: "Luna",
    size: "mediano",
  },
  media: [
    {
      mediaId: "66666666-6666-4666-8666-666666666666",
    },
  ],
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
      city: "La Paz",
      department: "La Paz",
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

  it("creates nearby alert deliveries for fresh active lost-pet reports", async () => {
    let deliveryReportId: string | undefined;
    const caller = createCaller({
      alertRepository: {
        createLostPetReportCreatedDeliveries: (input: { reportId: string }) => {
          deliveryReportId = input.reportId;
          return Promise.resolve([]);
        },
      },
      authApi: {},
      db: {},
      mediaRepository: {
        assertReadyMediaForReport: () => Promise.resolve(),
      },
      session: {
        user: {
          id: "member-camila",
        },
      },
      reportRepository: {
        findByCaretakerAndIdempotencyKey: () => Promise.resolve(null),
        create: () =>
          Promise.resolve(
            persistedSightingReport({
              id: "report-lost-luna-sopocachi",
              idempotencyKey: validLostPetCreateInput.idempotencyKey,
              petName: "Luna",
              title: validLostPetCreateInput.title,
              type: "lost_pet",
            }),
          ),
      },
    });

    const report = await caller.report.create(validLostPetCreateInput);

    expect(report).toMatchObject({
      id: "report-lost-luna-sopocachi",
      type: "lost_pet",
    });
    expect(deliveryReportId).toBe("report-lost-luna-sopocachi");
  });

  it("rejects report publishing for unverified members when the verified-email gate is enabled", async () => {
    let createWasCalled = false;
    const caller = createCaller({
      adminSettingsRepository: {
        get: () =>
          Promise.resolve({
            adoptionReviewModeEnabled: false,
            updatedAt: null,
            updatedByAdminId: null,
            verifiedEmailRequiredToPublish: true,
          }),
      },
      authApi: {},
      db: {},
      session: {
        user: {
          emailVerified: false,
          id: "member-camila",
        },
      },
      reportRepository: {
        findByCaretakerAndIdempotencyKey: () => Promise.resolve(null),
        create: () => {
          createWasCalled = true;
          return Promise.reject(new Error("Should not create report."));
        },
      },
    });

    await expect(
      caller.report.create(validReportCreateInput),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    expect(createWasCalled).toBe(false);
  });

  it("rejects report and Adoption Listing publishing for suspended members before persistence", async () => {
    let createWasCalled = false;
    let mediaWasChecked = false;
    const caller = createCaller({
      authApi: {},
      db: {},
      mediaRepository: {
        assertReadyMediaForReport: () => {
          mediaWasChecked = true;
          return Promise.resolve();
        },
      },
      memberSuspensionRepository: {
        findActiveByMemberId: (memberId: string) =>
          Promise.resolve({
            id: "member-suspension-1",
            memberId,
            reason: "Estafa confirmada por moderación.",
            revokedAt: null,
            revokedByAdminId: null,
            revokedReason: null,
            status: "active",
            suspendedAt: new Date("2026-06-26T16:00:00.000Z"),
            suspendedByAdminId: "member-admin",
            updatedAt: new Date("2026-06-26T16:00:00.000Z"),
          }),
      },
      session: {
        user: {
          id: "member-camila",
        },
      },
      reportRepository: {
        findByCaretakerAndIdempotencyKey: () => Promise.resolve(null),
        create: () => {
          createWasCalled = true;
          return Promise.reject(
            new Error("Suspended member must not create reports."),
          );
        },
      },
    });

    await expect(
      caller.report.create(validAdoptionCreateInput),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    expect(createWasCalled).toBe(false);
    expect(mediaWasChecked).toBe(false);
  });

  it("lets members report visible public reports for abuse", async () => {
    const reportId = "11111111-1111-4111-8111-111111111111";
    let creationInput:
      | {
          report: {
            detail: string;
            reason: string;
            reportId: string;
          };
          reporterId: string;
        }
      | undefined;
    const caller = createCaller({
      authApi: {},
      memberSuspensionRepository: {
        findActiveByMemberId: () => Promise.resolve(null),
      },
      reportModerationRepository: {
        createReportAbuseReport: (input: NonNullable<typeof creationInput>) => {
          creationInput = input;

          return Promise.resolve({
            reviewItem: {
              id: "22222222-2222-4222-8222-222222222222",
              reason: "scam",
              reportId,
              status: "pending",
            },
            status: "created",
          });
        },
      },
      reportRepository: {
        findById: () =>
          Promise.resolve(
            persistedSightingReport({
              id: reportId,
            }),
          ),
      },
      session: {
        user: {
          id: "member-diego",
        },
      },
    });

    await expect(
      caller.report.reportAbuse({
        detail: "Este reporte parece usar fotos falsas.",
        reason: "scam",
        reportId,
      }),
    ).resolves.toMatchObject({
      reviewItem: {
        reportId,
      },
      status: "created",
    });
    expect(creationInput).toEqual({
      report: {
        detail: "Este reporte parece usar fotos falsas.",
        reason: "scam",
        reportId,
      },
      reporterId: "member-diego",
    });
  });

  it("rejects owner report-abuse submissions before moderation persistence", async () => {
    const reportId = "11111111-1111-4111-8111-111111111111";
    let moderationWasCalled = false;
    const caller = createCaller({
      authApi: {},
      memberSuspensionRepository: {
        findActiveByMemberId: () => Promise.resolve(null),
      },
      reportModerationRepository: {
        createReportAbuseReport: () => {
          moderationWasCalled = true;
          return Promise.resolve(null);
        },
      },
      reportRepository: {
        findById: () =>
          Promise.resolve(
            persistedSightingReport({
              id: reportId,
            }),
          ),
      },
      session: {
        user: {
          id: "member-camila",
        },
      },
    });

    await expect(
      caller.report.reportAbuse({
        detail: "Intento reportar mi propio reporte.",
        reason: "other",
        reportId,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(moderationWasCalled).toBe(false);
  });

  it("rejects suspended members and hidden targets for report-abuse submissions", async () => {
    const reportId = "11111111-1111-4111-8111-111111111111";
    const suspendedCaller = createCaller({
      authApi: {},
      memberSuspensionRepository: {
        findActiveByMemberId: () => Promise.resolve({ id: "suspension-1" }),
      },
      reportModerationRepository: {
        createReportAbuseReport: () => Promise.resolve(null),
      },
      reportRepository: {
        findById: () => Promise.resolve(null),
      },
      session: {
        user: {
          id: "member-diego",
        },
      },
    });
    const hiddenCaller = createCaller({
      authApi: {},
      memberSuspensionRepository: {
        findActiveByMemberId: () => Promise.resolve(null),
      },
      reportModerationRepository: {
        createReportAbuseReport: () => Promise.resolve(null),
      },
      reportRepository: {
        findById: () =>
          Promise.resolve(
            persistedSightingReport({
              hiddenAt: new Date("2026-06-20T12:00:00.000Z"),
              id: reportId,
            }),
          ),
      },
      session: {
        user: {
          id: "member-diego",
        },
      },
    });
    const input = {
      detail: "Este reporte no debería estar visible.",
      reason: "other" as const,
      reportId,
    };

    await expect(suspendedCaller.report.reportAbuse(input)).rejects.toMatchObject(
      {
        code: "PRECONDITION_FAILED",
      },
    );
    await expect(hiddenCaller.report.reportAbuse(input)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("creates adoption reports as pending review while Review Mode is enabled", async () => {
    let createInput:
      | {
          initialStatus?: string;
        }
      | undefined;
    const caller = createCaller({
      adminSettingsRepository: {
        get: () =>
          Promise.resolve({
            adoptionReviewModeEnabled: true,
            updatedAt: null,
            updatedByAdminId: null,
            verifiedEmailRequiredToPublish: false,
          }),
      },
      authApi: {},
      db: {},
      mediaRepository: {
        assertReadyMediaForReport: () => Promise.resolve(),
      },
      session: {
        user: {
          id: "member-camila",
        },
      },
      reportRepository: {
        findByCaretakerAndIdempotencyKey: () => Promise.resolve(null),
        create: (input: { initialStatus?: string }) => {
          createInput = input;

          return Promise.resolve(
            persistedSightingReport({
              id: "report-adoption-review",
              idempotencyKey: validAdoptionCreateInput.idempotencyKey,
              status: "pending_review",
              type: "adoption",
            }),
          );
        },
      },
    });

    const report = await caller.report.create(validAdoptionCreateInput);

    expect(createInput).toMatchObject({
      initialStatus: "pending_review",
    });
    expect(report).toMatchObject({
      id: "report-adoption-review",
      status: "pending_review",
      type: "adoption",
    });
  });

  it("does not expose pending-review adoption reports to other members", async () => {
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
          Promise.resolve(
            persistedSightingReport({
              caretakerId: "member-camila",
              status: "pending_review",
              type: "adoption",
            }),
          ),
      },
    });

    await expect(
      caller.report.detail({ id: "report-adoption-review" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns not found for hidden public report details", async () => {
    const caller = createCaller({
      authApi: {},
      db: {},
      session: null,
      reportRepository: {
        findById: () =>
          Promise.resolve(
            persistedSightingReport({
              hiddenAt: new Date("2026-06-26T17:10:00.000Z"),
              hiddenByAdminId: "member-admin",
              hiddenNote: "Fotos ajenas al reporte.",
              hiddenReason: "spam",
            }),
          ),
      },
    });

    await expect(
      caller.report.detail({ id: "report-sighting-sopocachi" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns not found for false-marked public report details", async () => {
    const caller = createCaller({
      authApi: {},
      db: {},
      session: null,
      reportRepository: {
        findById: () =>
          Promise.resolve(
            persistedSightingReport({
              falseReportedAt: new Date("2026-06-26T17:20:00.000Z"),
              falseReportedByAdminId: "member-admin",
            }),
          ),
      },
    });

    await expect(
      caller.report.detail({ id: "report-sighting-sopocachi" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns not found for deleted public report details", async () => {
    const caller = createCaller({
      authApi: {},
      db: {},
      session: null,
      reportRepository: {
        findById: () =>
          Promise.resolve(
            persistedSightingReport({
              deletedAt: new Date("2026-06-26T17:30:00.000Z"),
            }),
          ),
      },
    });

    await expect(
      caller.report.detail({ id: "report-sighting-sopocachi" }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("returns owner report summaries with moderation availability states", async () => {
    const caller = createCaller({
      authApi: {},
      db: {},
      session: {
        user: {
          id: "member-camila",
        },
      },
      reportRepository: {
        listByCaretaker: (caretakerId: string) => {
          expect(caretakerId).toBe("member-camila");

          return Promise.resolve([
            persistedSightingReport({
              id: "report-active",
              status: "active",
            }),
            persistedSightingReport({
              deletedAt: new Date("2026-06-26T17:30:00.000Z"),
              id: "report-deleted",
              status: "closed",
            }),
            persistedSightingReport({
              hiddenAt: new Date("2026-06-26T17:10:00.000Z"),
              hiddenByAdminId: "member-admin",
              hiddenReason: "spam",
              id: "report-hidden",
            }),
          ]);
        },
      },
    });

    const result = await caller.report.mine({});

    expect(result.map((report) => report.id)).toEqual([
      "report-active",
      "report-deleted",
      "report-hidden",
    ]);
    expect(result.map((report) => report.availability)).toEqual([
      {
        label: "Activo",
        state: "active",
      },
      {
        label: "Retirado",
        state: "deleted",
      },
      {
        label: "Oculto por moderación",
        state: "hidden",
      },
    ]);
    expect(result.every((report) => report.owner.isCurrentMember)).toBe(true);
  });

  it("excludes hidden and false-marked reports from nearby public results", async () => {
    const caller = createCaller({
      authApi: {},
      db: {},
      session: null,
      reportRepository: {
        nearby: () =>
          Promise.resolve([
            persistedSightingReport({
              id: "report-visible-sopocachi",
              hiddenAt: null,
            }),
            persistedSightingReport({
              id: "report-hidden-sopocachi",
              hiddenAt: new Date("2026-06-26T17:10:00.000Z"),
              hiddenByAdminId: "member-admin",
              hiddenReason: "spam",
            }),
            persistedSightingReport({
              id: "report-false-sopocachi",
              falseReportedAt: new Date("2026-06-26T17:20:00.000Z"),
              falseReportedByAdminId: "member-admin",
            }),
          ]),
      },
    });

    const result = await caller.report.nearby({
      latitude: -16.5,
      longitude: -68.12,
      radiusMeters: 5000,
      types: ["lost_pet", "found_pet", "sighting", "adoption"],
    });

    expect(result.results.map((report) => report.id)).toEqual([
      "report-visible-sopocachi",
    ]);
  });

  it("creates a protected upload session with backend-owned object instructions", async () => {
    let createInput:
      | {
          ownerId: string;
          metadata: {
            checksumSha256?: string;
            draftId: string;
            height: number;
            mimeType: string;
            reportType: string;
            sizeBytes: number;
            width: number;
          };
        }
      | undefined;
    const caller = createCaller({
      authApi: {},
      db: {},
      mediaRepository: {
        createUploadSession: (input: NonNullable<typeof createInput>) => {
          createInput = input;
          return Promise.resolve({
            createdAt: new Date("2026-06-21T18:00:00.000Z"),
            expectedChecksumSha256: input.metadata.checksumSha256 ?? null,
            expectedHeight: input.metadata.height,
            expectedMimeType: input.metadata.mimeType,
            expectedSizeBytes: input.metadata.sizeBytes,
            expectedWidth: input.metadata.width,
            expiresAt: new Date("2026-06-21T18:10:00.000Z"),
            draftId: "lost-draft-device-1",
            id: "11111111-1111-4111-8111-111111111111",
            objectKey:
              "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
            ownerId: input.ownerId,
            reportType: "lost_pet",
            reportId: null,
            status: "pending",
            updatedAt: new Date("2026-06-21T18:00:00.000Z"),
          });
        },
      },
      mediaStorageConfig: {
        accessKeyId: "[redacted]",
        allowedMimeTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/heic",
          "image/heif",
        ],
        bucket: "rastro-media",
        deliveryBaseUrl: null,
        forcePathStyle: true,
        internalEndpoint: "http://minio:9000",
        maxImageBytes: 10 * 1024 * 1024,
        presignEndpoint: "https://uploads.example.invalid",
        presignExpiresSeconds: 300,
        region: "us-east-1",
        secretAccessKey: "[redacted]",
        tls: false,
      },
      mediaStorage: {
        createPresignedPut: () =>
          Promise.resolve({
            expiresAt: new Date("2026-06-21T18:05:00.000Z"),
            headers: {
              "content-type": "image/webp",
              "x-amz-checksum-sha256": "sha256-test",
            },
            method: "PUT",
            url: "https://uploads.example.invalid/report-media/member-camila/signed",
          }),
      },
      session: {
        user: {
          id: "member-camila",
        },
      },
    });

    const uploadSession = await caller.report.createUploadSession({
      checksumSha256: "sha256-test",
      draftId: "lost-draft-device-1",
      height: 900,
      mimeType: "image/webp",
      reportType: "lost_pet",
      sizeBytes: 300_000,
      width: 1200,
    });

    expect(createInput).toMatchObject({
      ownerId: "member-camila",
      metadata: {
        checksumSha256: "sha256-test",
        draftId: "lost-draft-device-1",
        height: 900,
        mimeType: "image/webp",
        reportType: "lost_pet",
        sizeBytes: 300_000,
        width: 1200,
      },
    });
    expect(uploadSession).toEqual({
      expiresAt: new Date("2026-06-21T18:05:00.000Z"),
      mediaId: "11111111-1111-4111-8111-111111111111",
      objectKey:
        "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
      upload: {
        headers: {
          "content-type": "image/webp",
          "x-amz-checksum-sha256": "sha256-test",
        },
        method: "PUT",
        url: "https://uploads.example.invalid/report-media/member-camila/signed",
      },
    });
    expect(JSON.stringify(uploadSession)).not.toContain("AWS_SECRET");
    expect(JSON.stringify(uploadSession)).not.toContain("X-Amz-Credential");
  });

  it("rejects upload-session metadata outside configured storage limits", async () => {
    let createWasCalled = false;
    const caller = createCaller({
      authApi: {},
      db: {},
      mediaRepository: {
        createUploadSession: () => {
          createWasCalled = true;
          return Promise.reject(
            new Error("Invalid metadata should not create media."),
          );
        },
      },
      mediaStorageConfig: {
        accessKeyId: "[redacted]",
        allowedMimeTypes: ["image/webp"],
        bucket: "rastro-media",
        deliveryBaseUrl: null,
        forcePathStyle: true,
        internalEndpoint: "http://minio:9000",
        maxImageBytes: 100_000,
        presignEndpoint: "https://uploads.example.invalid",
        presignExpiresSeconds: 300,
        region: "us-east-1",
        secretAccessKey: "[redacted]",
        tls: false,
      },
      mediaStorage: {},
      session: {
        user: {
          id: "member-camila",
        },
      },
    });

    await expect(
      caller.report.createUploadSession({
        draftId: "lost-draft-device-1",
        height: 900,
        mimeType: "image/png",
        reportType: "lost_pet",
        sizeBytes: 300_000,
        width: 1200,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(createWasCalled).toBe(false);
  });

  it("rejects upload-session creation before writing media rows when storage is not configured", async () => {
    let createWasCalled = false;
    const caller = createCaller({
      authApi: {},
      db: {},
      mediaRepository: {
        createUploadSession: () => {
          createWasCalled = true;
          return Promise.reject(
            new Error("Unconfigured storage should not create media."),
          );
        },
      },
      mediaStorageConfig: null,
      session: {
        user: {
          id: "member-camila",
        },
      },
    });

    await expect(
      caller.report.createUploadSession({
        draftId: "lost-draft-device-1",
        height: 900,
        mimeType: "image/webp",
        reportType: "lost_pet",
        sizeBytes: 300_000,
        width: 1200,
      }),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    expect(createWasCalled).toBe(false);
  });

  it("completes an upload session after backend storage verification", async () => {
    let completedInput:
      | {
          mediaId: string;
          verifiedAt: Date;
        }
      | undefined;
    const caller = createCaller({
      authApi: {},
      db: {},
      mediaRepository: {
        findUploadSessionById: () =>
          Promise.resolve({
            createdAt: new Date("2026-06-21T18:00:00.000Z"),
            expectedChecksumSha256: "sha256-test",
            expectedHeight: 900,
            expectedMimeType: "image/webp",
            expectedSizeBytes: 300_000,
            expectedWidth: 1200,
            expiresAt: new Date("2026-06-21T18:10:00.000Z"),
            draftId: "lost-draft-device-1",
            id: "11111111-1111-4111-8111-111111111111",
            objectKey:
              "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
            ownerId: "member-camila",
            reportType: "lost_pet",
            reportId: null,
            status: "pending",
            updatedAt: new Date("2026-06-21T18:00:00.000Z"),
          }),
        markUploadSessionReady: (input: NonNullable<typeof completedInput>) => {
          completedInput = input;
          return Promise.resolve({
            createdAt: new Date("2026-06-21T18:00:00.000Z"),
            expectedChecksumSha256: "sha256-test",
            expectedHeight: 900,
            expectedMimeType: "image/webp",
            expectedSizeBytes: 300_000,
            expectedWidth: 1200,
            expiresAt: new Date("2026-06-21T18:10:00.000Z"),
            draftId: "lost-draft-device-1",
            id: input.mediaId,
            objectKey:
              "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
            ownerId: "member-camila",
            reportType: "lost_pet",
            reportId: null,
            status: "ready",
            updatedAt: input.verifiedAt,
          });
        },
      },
      mediaStorage: {
        headObject: () =>
          Promise.resolve({
            checksumSha256: "sha256-test",
            contentLength: 300_000,
            contentType: "image/webp",
            metadata: {
              height: "900",
              mediaid: "11111111-1111-4111-8111-111111111111",
              sizebytes: "300000",
              width: "1200",
            },
          }),
      },
      session: {
        user: {
          id: "member-camila",
        },
      },
    });

    const completed = await caller.report.completeUploadSession({
      mediaId: "11111111-1111-4111-8111-111111111111",
    });

    expect(completed).toEqual({
      mediaId: "11111111-1111-4111-8111-111111111111",
      objectKey:
        "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
      status: "ready",
    });
    expect(completedInput?.mediaId).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("rejects upload completion when required object metadata does not match the session", async () => {
    let failedMediaId: string | undefined;
    let readyWasCalled = false;
    const caller = createCaller({
      authApi: {},
      db: {},
      mediaRepository: {
        findUploadSessionById: () =>
          Promise.resolve({
            createdAt: new Date("2026-06-21T18:00:00.000Z"),
            expectedChecksumSha256: null,
            expectedHeight: 900,
            expectedMimeType: "image/webp",
            expectedSizeBytes: 300_000,
            expectedWidth: 1200,
            expiresAt: new Date("2026-06-21T18:10:00.000Z"),
            draftId: "lost-draft-device-1",
            id: "11111111-1111-4111-8111-111111111111",
            objectKey:
              "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
            ownerId: "member-camila",
            reportType: "lost_pet",
            reportId: null,
            status: "pending",
            updatedAt: new Date("2026-06-21T18:00:00.000Z"),
          }),
        markUploadSessionFailed: (input: { mediaId: string }) => {
          failedMediaId = input.mediaId;
          return Promise.resolve({
            createdAt: new Date("2026-06-21T18:00:00.000Z"),
            expectedChecksumSha256: null,
            expectedHeight: 900,
            expectedMimeType: "image/webp",
            expectedSizeBytes: 300_000,
            expectedWidth: 1200,
            expiresAt: new Date("2026-06-21T18:10:00.000Z"),
            draftId: "lost-draft-device-1",
            id: input.mediaId,
            objectKey:
              "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
            ownerId: "member-camila",
            reportType: "lost_pet",
            reportId: null,
            status: "failed",
            updatedAt: new Date("2026-06-21T18:00:00.000Z"),
          });
        },
        markUploadSessionReady: () => {
          readyWasCalled = true;
          return Promise.reject(
            new Error("Mismatched upload metadata must not mark media ready."),
          );
        },
      },
      mediaStorage: {
        headObject: () =>
          Promise.resolve({
            checksumSha256: null,
            contentLength: 300_000,
            contentType: "image/webp",
            metadata: {
              height: "900",
              mediaid: "22222222-2222-4222-8222-222222222222",
              sizebytes: "299999",
              width: "1200",
            },
          }),
      },
      session: {
        user: {
          id: "member-camila",
        },
      },
    });

    await expect(
      caller.report.completeUploadSession({
        mediaId: "11111111-1111-4111-8111-111111111111",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(failedMediaId).toBe("11111111-1111-4111-8111-111111111111");
    expect(readyWasCalled).toBe(false);
  });

  it("refreshes expired upload authorization for the same pending media", async () => {
    let refreshedMediaId: string | undefined;
    const caller = createCaller({
      authApi: {},
      db: {},
      mediaRepository: {
        findUploadSessionById: () =>
          Promise.resolve({
            createdAt: new Date("2026-06-21T18:00:00.000Z"),
            expectedChecksumSha256: "sha256-test",
            expectedHeight: 900,
            expectedMimeType: "image/webp",
            expectedSizeBytes: 300_000,
            expectedWidth: 1200,
            expiresAt: new Date("2026-06-21T18:10:00.000Z"),
            draftId: "lost-draft-device-1",
            id: "11111111-1111-4111-8111-111111111111",
            objectKey:
              "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
            ownerId: "member-camila",
            reportType: "lost_pet",
            reportId: null,
            status: "pending",
            updatedAt: new Date("2026-06-21T18:00:00.000Z"),
          }),
        refreshUploadSession: (input: { mediaId: string }) => {
          refreshedMediaId = input.mediaId;
          return Promise.resolve({
            createdAt: new Date("2026-06-21T18:00:00.000Z"),
            expectedChecksumSha256: "sha256-test",
            expectedHeight: 900,
            expectedMimeType: "image/webp",
            expectedSizeBytes: 300_000,
            expectedWidth: 1200,
            expiresAt: new Date("2026-06-21T18:25:00.000Z"),
            draftId: "lost-draft-device-1",
            id: input.mediaId,
            objectKey:
              "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
            ownerId: "member-camila",
            reportType: "lost_pet",
            reportId: null,
            status: "pending",
            updatedAt: new Date("2026-06-21T18:15:00.000Z"),
          });
        },
      },
      mediaStorage: {
        createPresignedPut: () =>
          Promise.resolve({
            expiresAt: new Date("2026-06-21T18:20:00.000Z"),
            headers: {
              "content-type": "image/webp",
              "x-amz-checksum-sha256": "sha256-test",
            },
            method: "PUT",
            url: "https://uploads.example.invalid/report-media/member-camila/refreshed",
          }),
      },
      session: {
        user: {
          id: "member-camila",
        },
      },
    });

    const refreshed = await caller.report.refreshUploadSession({
      mediaId: "11111111-1111-4111-8111-111111111111",
    });

    expect(refreshedMediaId).toBe("11111111-1111-4111-8111-111111111111");
    expect(refreshed).toEqual({
      expiresAt: new Date("2026-06-21T18:20:00.000Z"),
      mediaId: "11111111-1111-4111-8111-111111111111",
      objectKey:
        "report-media/member-camila/11111111-1111-4111-8111-111111111111/original.webp",
      upload: {
        headers: {
          "content-type": "image/webp",
          "x-amz-checksum-sha256": "sha256-test",
        },
        method: "PUT",
        url: "https://uploads.example.invalid/report-media/member-camila/refreshed",
      },
    });
  });

  it("returns the existing report for duplicate idempotency keys", async () => {
    let createWasCalled = false;
    let alertWasCalled = false;
    const caller = createCaller({
      alertRepository: {
        createLostPetReportCreatedDeliveries: () => {
          alertWasCalled = true;
          return Promise.resolve([]);
        },
      },
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
    expect(alertWasCalled).toBe(false);
  });

  it("checks ready media against the report draft and report type before creation", async () => {
    let readyCheck:
      | {
          draftId: string;
          media: { mediaId: string }[];
          ownerId: string;
          reportType: string;
        }
      | undefined;
    const caller = createCaller({
      authApi: {},
      db: {},
      mediaRepository: {
        assertReadyMediaForReport: (input: NonNullable<typeof readyCheck>) => {
          readyCheck = input;
          return Promise.resolve();
        },
      },
      session: {
        user: {
          id: "member-camila",
        },
      },
      reportRepository: {
        findByCaretakerAndIdempotencyKey: () => Promise.resolve(null),
        create: () =>
          Promise.resolve(
            persistedSightingReport({
              media: [
                {
                  altText: null,
                  canonicalUrl: null,
                  height: 900,
                  id: "22222222-2222-4222-8222-222222222222",
                  mimeType: "image/webp",
                  objectKey:
                    "report-media/member-camila/22222222-2222-4222-8222-222222222222/original.webp",
                  position: 0,
                  sizeBytes: 300_000,
                  thumbnailObjectKey: null,
                  width: 1200,
                },
              ],
            }),
          ),
      },
    });

    await caller.report.create({
      ...validReportCreateInput,
      media: [
        {
          mediaId: "22222222-2222-4222-8222-222222222222",
        },
      ],
    });

    expect(readyCheck).toMatchObject({
      draftId: "sighting-2026-06-19-device-1",
      media: [
        {
          mediaId: "22222222-2222-4222-8222-222222222222",
        },
      ],
      ownerId: "member-camila",
      reportType: "sighting",
    });
  });

  it("rejects report creation when media IDs are not ready and owned by the member", async () => {
    let createWasCalled = false;
    const caller = createCaller({
      authApi: {},
      db: {},
      mediaRepository: {
        assertReadyMediaForReport: () =>
          Promise.reject(new Error("Media IDs are not ready for this member.")),
      },
      session: {
        user: {
          id: "member-camila",
        },
      },
      reportRepository: {
        findByCaretakerAndIdempotencyKey: () => Promise.resolve(null),
        create: () => {
          createWasCalled = true;
          return Promise.reject(
            new Error("Invalid media should not reach report persistence."),
          );
        },
      },
    });

    await expect(
      caller.report.create({
        ...validReportCreateInput,
        media: [
          {
            mediaId: "22222222-2222-4222-8222-222222222222",
          },
        ],
        type: "lost_pet",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
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
        actions: [
          {
            href: "rastro://chats/report/report-sighting-sopocachi",
            kind: "in_app_chat",
          },
        ],
        preference: "in_app_chat",
        hasWhatsapp: false,
      },
    });
    expect(JSON.stringify(report)).not.toContain("-16.510231");
    expect(JSON.stringify(report)).not.toContain("-68.123881");
    expect(JSON.stringify(report)).not.toContain("member-camila");
  });

  it("returns WhatsApp and in-app chat actions without exposing the raw phone", async () => {
    const caller = createCaller({
      authApi: {},
      db: {},
      session: null,
      reportRepository: {
        findById: () =>
          Promise.resolve(
            persistedSightingReport({
              contactPreference: "both",
              whatsappPhone: " +591 701-23456 ",
            }),
          ),
      },
    });

    const report = await caller.report.detail({
      id: "report-sighting-sopocachi",
    });

    expect(report.contact).toEqual({
      actions: [
        {
          href: "rastro://chats/report/report-sighting-sopocachi",
          kind: "in_app_chat",
        },
        {
          href: "https://wa.me/59170123456",
          kind: "whatsapp",
        },
      ],
      preference: "both",
      hasWhatsapp: true,
    });
    expect(JSON.stringify(report.contact)).not.toContain("+591 701-23456");
    expect(JSON.stringify(report.contact)).not.toContain("whatsappPhone");
    expect(JSON.stringify(report.contact)).not.toContain("phoneNumber");
  });

  it("does not return a WhatsApp action when the preference is chat-only", async () => {
    const caller = createCaller({
      authApi: {},
      db: {},
      session: null,
      reportRepository: {
        findById: () =>
          Promise.resolve(
            persistedSightingReport({
              contactPreference: "in_app_chat",
              whatsappPhone: "+591 70123456",
            }),
          ),
      },
    });

    const report = await caller.report.detail({
      id: "report-sighting-sopocachi",
    });

    expect(report.contact).toEqual({
      actions: [
        {
          href: "rastro://chats/report/report-sighting-sopocachi",
          kind: "in_app_chat",
        },
      ],
      preference: "in_app_chat",
      hasWhatsapp: true,
    });
    expect(JSON.stringify(report.contact)).not.toContain("wa.me");
    expect(JSON.stringify(report.contact)).not.toContain("+591 70123456");
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
          contact: {
            actions: [
              {
                href: "rastro://chats/report/report-sighting-sopocachi",
                kind: "in_app_chat",
              },
            ],
          },
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
