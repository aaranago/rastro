import { describe, expect, it } from "vitest";

import type {
  CreateResourceProviderInput,
  PublicResourceProviderProfile,
  UpdateResourceProviderInput,
} from "@acme/validators";

import type { RecordAdminAuditEventInput } from "../admin-audit-repository";
import type { PersistedAdminMediaAsset } from "../admin-media-repository";
import { AdminMediaAssetReferenceError } from "../admin-media-repository";
import { SponsorPlacementOverlapError } from "../resource-provider-repository";
import { appRouter } from "../root";

function createCaller(context: unknown) {
  return appRouter.createCaller(context as never);
}

type CapturedAuditEvent = RecordAdminAuditEventInput;

function createAuditRecorder(events: CapturedAuditEvent[] = []) {
  return {
    record: (input: CapturedAuditEvent) => {
      events.push(input);

      return Promise.resolve(input);
    },
  };
}

function getErrorCause(error: unknown) {
  return typeof error === "object" && error !== null && "cause" in error
    ? error.cause
    : undefined;
}

function adminListResult<T>(items: T[]) {
  return {
    availableFilters: [],
    availableSorts: [],
    hasNextPage: false,
    hasPreviousPage: false,
    items,
    page: 1,
    pageCount: items.length > 0 ? 1 : 0,
    pageSize: 10,
    total: items.length,
  };
}

function providerProfile(
  overrides: Partial<PublicResourceProviderProfile> = {},
): PublicResourceProviderProfile {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Clinica Veterinaria San Roque",
    categoryId: "veterinary",
    description: "Veterinaria local con atencion general y urgencias.",
    approximateLocationLabel: "Sopocachi, La Paz",
    approximateLocation: {
      latitude: -16.51051,
      longitude: -68.124602,
      precision: "approximate",
      label: "Sopocachi, La Paz",
      locationCell: "bo-lpb-sopocachi",
    },
    serviceAreaLabel: "Atiende La Paz y El Alto",
    hoursLabel: "Lun - Dom: 24 horas",
    shortDescription:
      "Atencion veterinaria general y orientacion para familias cuidadoras.",
    isVerified: true,
    emergencyAvailable: true,
    isOpenNow: true,
    contactOptions: [
      {
        kind: "phone",
        label: "Llamar",
        value: "+591 2 222 1111",
      },
    ],
    ...overrides,
  };
}

function adminMediaAsset(
  overrides: Partial<PersistedAdminMediaAsset> = {},
): PersistedAdminMediaAsset {
  return {
    createdAt: new Date("2026-07-15T12:00:00.000Z"),
    createdByAdminId: "member-admin-la-paz",
    deliveryUrl:
      "https://cdn.rastro.bo/media/admin-media/member-admin-la-paz/provider_logo/11111111-1111-4111-8111-111111111111/original.webp",
    expectedChecksumSha256: null,
    expectedHeight: 900,
    expectedMimeType: "image/webp",
    expectedSizeBytes: 300_000,
    expectedWidth: 1200,
    expiresAt: new Date("2026-07-15T12:10:00.000Z"),
    id: "11111111-1111-4111-8111-111111111111",
    objectKey:
      "admin-media/member-admin-la-paz/provider_logo/11111111-1111-4111-8111-111111111111/original.webp",
    purpose: "provider_logo",
    status: "pending",
    updatedAt: new Date("2026-07-15T12:00:00.000Z"),
    ...overrides,
  };
}

const createProviderInput = {
  name: "Clinica Veterinaria San Roque",
  category: "veterinary",
  description: "Veterinaria local con atencion general y urgencias.",
  shortDescription:
    "Atencion veterinaria general y orientacion para familias cuidadoras.",
  location: {
    exactLatitude: -16.510231,
    exactLongitude: -68.123881,
    city: "La Paz",
    department: "La Paz",
    approximateLocationLabel: "Sopocachi, La Paz",
    locationCell: "bo-lpb-sopocachi",
  },
  serviceAreaLabel: "Atiende La Paz y El Alto",
  hoursLabel: "Lun - Dom: 24 horas",
  contactOptions: [
    {
      kind: "phone",
      label: "Llamar",
      value: "+591 2 222 1111",
    },
  ],
  emergencyAvailable: true,
  isOpenNow: true,
} satisfies CreateResourceProviderInput;

describe("resources router", () => {
  it("returns nearby provider results with public approximate location only", async () => {
    let nearbyInput: unknown;
    const caller = createCaller({
      resourceProviderRepository: {
        nearby: (input: unknown) => {
          nearbyInput = input;
          return Promise.resolve([
            {
              ...providerProfile(),
              distanceMeters: 800,
            },
          ]);
        },
      },
      session: null,
    });

    const result = await caller.resources.nearby({
      latitude: -16.5,
      longitude: -68.12,
      radiusMeters: 5000,
      categoryIds: ["veterinary"],
    });

    expect(nearbyInput).toMatchObject({
      latitude: -16.5,
      longitude: -68.12,
      strategy: "postgis_radius",
    });
    expect(result).toMatchObject({
      radiusMeters: 5000,
      searchBoundary: {
        engine: "rastro-postgis-radius",
        owner: "rastro",
        publicLocationPrecision: "location-cell",
      },
      searchStrategy: "postgis_radius",
      results: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          approximateLocation: {
            latitude: -16.51051,
            longitude: -68.124602,
          },
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("-16.510231");
    expect(JSON.stringify(result)).not.toContain("-68.123881");
    expect(JSON.stringify(result)).not.toContain("exactLatitude");
  });

  it("returns not found for missing provider profiles", async () => {
    const caller = createCaller({
      resourceProviderRepository: {
        findProfile: () => Promise.resolve(null),
      },
      session: null,
    });

    await expect(
      caller.resources.detail({
        providerId: "11111111-1111-4111-8111-111111111111",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects malformed provider IDs before public repository access", async () => {
    let findProfileWasCalled = false;
    const caller = createCaller({
      resourceProviderRepository: {
        findProfile: () => {
          findProfileWasCalled = true;
          return Promise.resolve(null);
        },
      },
      session: null,
    });

    await expect(
      caller.resources.detail({
        providerId: "clinic-san-roque",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(findProfileWasCalled).toBe(false);
  });

  it("requires a signed-in member before reporting a Resource Provider", async () => {
    const caller = createCaller({
      resourceProviderModerationRepository: {
        createResourceProviderReport: () => {
          throw new Error("Should not report without a member session.");
        },
      },
      session: null,
    });

    await expect(
      caller.resources.reportProvider({
        detail: "La direccion visible no coincide con el local.",
        providerId: "11111111-1111-4111-8111-111111111111",
        reason: "incorrect_location",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("creates member Resource Provider reports through the moderation repository", async () => {
    const calls: unknown[] = [];
    const caller = createCaller({
      resourceProviderModerationRepository: {
        createResourceProviderReport: (input: unknown) => {
          calls.push(input);

          return Promise.resolve({
            status: "created",
            reviewItem: {
              createdAt: new Date("2026-06-26T16:00:00.000Z"),
              id: "22222222-2222-4222-8222-222222222222",
              lastReportedAt: new Date("2026-06-26T16:00:00.000Z"),
              newestReport: {
                createdAt: new Date("2026-06-26T16:00:00.000Z"),
                detail: "La direccion visible no coincide con el local.",
                reporter: {
                  displayName: "Ana S.",
                  email: "ana@example.com",
                  memberId: "member-ana",
                },
              },
              provider: {
                city: "La Paz",
                department: "La Paz",
                id: "11111111-1111-4111-8111-111111111111",
                locationLabel: "Sopocachi, La Paz",
                name: "Clinica Veterinaria San Roque",
                verificationStatus: "verified",
              },
              reason: "incorrect_location",
              reportCount: 1,
              status: "pending",
            },
          });
        },
      },
      session: {
        user: {
          email: "ana@example.com",
          id: "member-ana",
        },
      },
    });

    const created = await caller.resources.reportProvider({
      detail: "La direccion visible no coincide con el local.",
      providerId: "11111111-1111-4111-8111-111111111111",
      reason: "incorrect_location",
    });

    expect(calls).toEqual([
      {
        reporterId: "member-ana",
        report: {
          detail: "La direccion visible no coincide con el local.",
          providerId: "11111111-1111-4111-8111-111111111111",
          reason: "incorrect_location",
        },
      },
    ]);
    expect(created).toMatchObject({
      status: "created",
      reviewItem: {
        provider: {
          name: "Clinica Veterinaria San Roque",
        },
        reason: "incorrect_location",
        reportCount: 1,
      },
    });
  });

  it("rejects Resource Provider reports from suspended members before persistence", async () => {
    let reportWasCreated = false;
    const caller = createCaller({
      memberSuspensionRepository: {
        findActiveByMemberId: (memberId: string) =>
          Promise.resolve({
            id: "member-suspension-1",
            memberId,
            reason: "Reportes falsos repetidos.",
            revokedAt: null,
            revokedByAdminId: null,
            revokedReason: null,
            status: "active",
            suspendedAt: new Date("2026-06-26T16:00:00.000Z"),
            suspendedByAdminId: "member-admin",
            updatedAt: new Date("2026-06-26T16:00:00.000Z"),
          }),
      },
      resourceProviderModerationRepository: {
        createResourceProviderReport: () => {
          reportWasCreated = true;

          return Promise.resolve(null);
        },
      },
      session: {
        user: {
          email: "ana@example.com",
          id: "member-ana",
        },
      },
    });

    await expect(
      caller.resources.reportProvider({
        detail: "La direccion visible no coincide con el local.",
        providerId: "11111111-1111-4111-8111-111111111111",
        reason: "incorrect_location",
      }),
    ).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
    expect(reportWasCreated).toBe(false);
  });

  it("returns not found when reporting a missing Resource Provider", async () => {
    const caller = createCaller({
      resourceProviderModerationRepository: {
        createResourceProviderReport: () => Promise.resolve(null),
      },
      session: {
        user: {
          email: "ana@example.com",
          id: "member-ana",
        },
      },
    });

    await expect(
      caller.resources.reportProvider({
        detail: "No encontramos el proveedor reportado.",
        providerId: "11111111-1111-4111-8111-111111111111",
        reason: "other",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("requires a signed-in session before admin provider access", async () => {
    const caller = createCaller({
      resourceProviderRepository: {
        listProviders: () => Promise.resolve([providerProfile()]),
      },
      session: null,
    });

    await expect(caller.resources.admin.listProviders()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("returns paginated admin provider lists for allowlisted admins", async () => {
    let listInput: unknown;
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      resourceProviderRepository: {
        listProviders: (input: unknown) => {
          listInput = input;

          return Promise.resolve(adminListResult([providerProfile()]));
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    const result = await caller.resources.admin.listProviders({
      filters: {
        category: ["veterinary"],
        city: "La Paz",
        mediaState: "has_media",
        sponsorState: "active",
        sponsorSurface: ["resources_directory"],
        verification: ["verified"],
      },
      page: 2,
      pageSize: 10,
      search: "San Roque",
      sortBy: "sponsorState",
      sortDirection: "desc",
    });

    expect(listInput).toMatchObject({
      filters: {
        sponsorState: "active",
      },
      page: 2,
      pageSize: 10,
      sortBy: "sponsorState",
    });
    expect(result).toMatchObject({
      items: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Clinica Veterinaria San Roque",
        },
      ],
      pageSize: 10,
      total: 1,
    });
  });

  it("requires the signed-in member email to be in RASTRO_ADMIN_EMAILS", async () => {
    let createWasCalled = false;
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      resourceProviderRepository: {
        createProvider: () => {
          createWasCalled = true;
          return Promise.resolve(providerProfile());
        },
      },
      session: {
        user: {
          email: "member@rastro.bo",
          id: "member-camila",
        },
      },
    });

    await expect(
      caller.resources.admin.createProvider(createProviderInput),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(createWasCalled).toBe(false);
  });

  it("creates admin media upload sessions with admin auth, limits, and presigned PUT metadata", async () => {
    let createdInput:
      | {
          adminId: string;
          metadata: {
            height: number;
            mimeType: string;
            purpose: string;
            sizeBytes: number;
            width: number;
          };
        }
      | undefined;
    let presignInput:
      | {
          metadata: Record<string, string>;
          objectKey: string;
        }
      | undefined;
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminMediaRepository: {
        createUploadSession: (input: NonNullable<typeof createdInput>) => {
          createdInput = input;

          return Promise.resolve(
            adminMediaAsset({
              createdByAdminId: input.adminId,
              expectedHeight: input.metadata.height,
              expectedMimeType: input.metadata.mimeType,
              expectedSizeBytes: input.metadata.sizeBytes,
              expectedWidth: input.metadata.width,
              purpose: "provider_logo",
            }),
          );
        },
      },
      mediaStorageConfig: {
        allowedMimeTypes: ["image/webp"],
        maxImageBytes: 500_000,
      },
      mediaStorage: {
        createPresignedPut: (input: NonNullable<typeof presignInput>) => {
          presignInput = input;

          return Promise.resolve({
            expiresAt: new Date("2026-07-15T12:05:00.000Z"),
            headers: {
              "content-type": "image/webp",
            },
            method: "PUT" as const,
            url: "https://uploads.rastro.bo/admin-media/signed",
          });
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    const session = await caller.resources.admin.createMediaUploadSession({
      height: 900,
      mimeType: "image/webp",
      purpose: "provider_logo",
      sizeBytes: 300_000,
      width: 1200,
    });

    expect(createdInput).toMatchObject({
      adminId: "member-admin-la-paz",
      metadata: {
        purpose: "provider_logo",
        sizeBytes: 300_000,
      },
    });
    expect(presignInput).toMatchObject({
      metadata: {
        adminId: "member-admin-la-paz",
        adminMediaAssetId: "11111111-1111-4111-8111-111111111111",
        height: "900",
        purpose: "provider_logo",
        sizeBytes: "300000",
        width: "1200",
      },
    });
    expect(session).toMatchObject({
      asset: {
        assetId: "11111111-1111-4111-8111-111111111111",
        purpose: "provider_logo",
        status: "pending",
      },
      upload: {
        method: "PUT",
        url: "https://uploads.rastro.bo/admin-media/signed",
      },
    });
  });

  it("rejects admin media creation for non-admins and metadata outside storage limits", async () => {
    let createWasCalled = false;
    const baseContext = {
      adminEmailList: "admin@rastro.bo",
      adminMediaRepository: {
        createUploadSession: () => {
          createWasCalled = true;

          return Promise.reject(new Error("Should not create admin media."));
        },
      },
      mediaStorageConfig: {
        allowedMimeTypes: ["image/webp"],
        maxImageBytes: 100_000,
      },
      mediaStorage: {},
    };
    const nonAdminCaller = createCaller({
      ...baseContext,
      session: {
        user: {
          email: "member@rastro.bo",
          id: "member-ana",
        },
      },
    });

    await expect(
      nonAdminCaller.resources.admin.createMediaUploadSession({
        height: 900,
        mimeType: "image/webp",
        purpose: "provider_logo",
        sizeBytes: 90_000,
        width: 1200,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    const adminCaller = createCaller({
      ...baseContext,
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    await expect(
      adminCaller.resources.admin.createMediaUploadSession({
        height: 900,
        mimeType: "image/webp",
        purpose: "provider_logo",
        sizeBytes: 300_000,
        width: 1200,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(createWasCalled).toBe(false);
  });

  it("completes admin media uploads only after HEAD metadata matches the session", async () => {
    let readyAssetId: string | undefined;
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminMediaRepository: {
        findAssetById: () => Promise.resolve(adminMediaAsset()),
        markAssetReady: (input: { assetId: string }) => {
          readyAssetId = input.assetId;

          return Promise.resolve(
            adminMediaAsset({
              status: "ready",
            }),
          );
        },
      },
      mediaStorageConfig: {
        allowedMimeTypes: ["image/webp"],
        maxImageBytes: 500_000,
      },
      mediaStorage: {
        headObject: () =>
          Promise.resolve({
            checksumSha256: null,
            contentLength: 300_000,
            contentType: "image/webp",
            metadata: {
              adminid: "member-admin-la-paz",
              adminmediaassetid: "11111111-1111-4111-8111-111111111111",
              height: "900",
              purpose: "provider_logo",
              sizebytes: "300000",
              width: "1200",
            },
          }),
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    const completed = await caller.resources.admin.completeMediaUploadSession({
      assetId: "11111111-1111-4111-8111-111111111111",
    });

    expect(readyAssetId).toBe("11111111-1111-4111-8111-111111111111");
    expect(completed.asset).toMatchObject({
      assetId: "11111111-1111-4111-8111-111111111111",
      deliveryUrl:
        "https://cdn.rastro.bo/media/admin-media/member-admin-la-paz/provider_logo/11111111-1111-4111-8111-111111111111/original.webp",
      status: "ready",
    });
  });

  it("marks admin media failed when HEAD metadata mismatches", async () => {
    let failedAssetId: string | undefined;
    let readyWasCalled = false;
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminMediaRepository: {
        findAssetById: () => Promise.resolve(adminMediaAsset()),
        markAssetFailed: (input: { assetId: string }) => {
          failedAssetId = input.assetId;

          return Promise.resolve(
            adminMediaAsset({
              status: "failed",
            }),
          );
        },
        markAssetReady: () => {
          readyWasCalled = true;

          return Promise.reject(new Error("Should not mark mismatched asset."));
        },
      },
      mediaStorageConfig: {
        allowedMimeTypes: ["image/webp"],
        maxImageBytes: 500_000,
      },
      mediaStorage: {
        headObject: () =>
          Promise.resolve({
            checksumSha256: null,
            contentLength: 299_999,
            contentType: "image/webp",
            metadata: {
              adminid: "member-admin-la-paz",
              adminmediaassetid: "11111111-1111-4111-8111-111111111111",
              height: "900",
              purpose: "sponsor_logo",
              sizebytes: "299999",
              width: "1200",
            },
          }),
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    await expect(
      caller.resources.admin.completeMediaUploadSession({
        assetId: "11111111-1111-4111-8111-111111111111",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(failedAssetId).toBe("11111111-1111-4111-8111-111111111111");
    expect(readyWasCalled).toBe(false);
  });

  it("refreshes failed admin media uploads and marks assets removed", async () => {
    const operations: string[] = [];
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminMediaRepository: {
        findAssetById: () =>
          Promise.resolve(
            adminMediaAsset({
              status: "failed",
            }),
          ),
        markAssetRemoved: (input: { assetId: string }) => {
          operations.push(`removed:${input.assetId}`);

          return Promise.resolve(
            adminMediaAsset({
              status: "removed",
            }),
          );
        },
        refreshUploadSession: (input: { assetId: string }) => {
          operations.push(`refresh:${input.assetId}`);

          return Promise.resolve(adminMediaAsset());
        },
      },
      mediaStorageConfig: {
        allowedMimeTypes: ["image/webp"],
        maxImageBytes: 500_000,
      },
      mediaStorage: {
        createPresignedPut: () =>
          Promise.resolve({
            expiresAt: new Date("2026-07-15T12:05:00.000Z"),
            headers: {
              "content-type": "image/webp",
            },
            method: "PUT" as const,
            url: "https://uploads.rastro.bo/admin-media/retry",
          }),
        deleteObject: (input: { objectKey: string }) => {
          operations.push(`delete:${input.objectKey}`);

          return Promise.resolve();
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    const refreshed = await caller.resources.admin.refreshMediaUploadSession({
      assetId: "11111111-1111-4111-8111-111111111111",
    });
    const removed = await caller.resources.admin.removeMediaAsset({
      assetId: "11111111-1111-4111-8111-111111111111",
    });

    expect(refreshed).toMatchObject({
      asset: {
        status: "pending",
      },
      upload: {
        url: "https://uploads.rastro.bo/admin-media/retry",
      },
    });
    expect(removed.asset.status).toBe("removed");
    expect(operations).toEqual([
      "refresh:11111111-1111-4111-8111-111111111111",
      "removed:11111111-1111-4111-8111-111111111111",
      "delete:admin-media/member-admin-la-paz/provider_logo/11111111-1111-4111-8111-111111111111/original.webp",
    ]);
  });

  it("lets allowlisted admins create providers through the repository", async () => {
    let createInput:
      | {
          adminId: string;
          provider: CreateResourceProviderInput;
        }
      | undefined;
    const auditEvents: CapturedAuditEvent[] = [];
    const caller = createCaller({
      adminEmailList: "ops@rastro.bo\nADMIN@rastro.bo",
      adminAuditRepository: createAuditRecorder(auditEvents),
      resourceProviderRepository: {
        createProvider: (input: NonNullable<typeof createInput>) => {
          createInput = input;
          return Promise.resolve(
            providerProfile({
              name: input.provider.name,
            }),
          );
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    const created =
      await caller.resources.admin.createProvider(createProviderInput);

    expect(createInput).toMatchObject({
      adminId: "member-admin-la-paz",
      provider: {
        category: "veterinary",
        location: {
          exactLatitude: -16.510231,
          exactLongitude: -68.123881,
          city: "La Paz",
          department: "La Paz",
        },
      },
    });
    expect(created.name).toBe("Clinica Veterinaria San Roque");
    expect(JSON.stringify(created)).not.toContain("-16.510231");
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]).toMatchObject({
      action: "resource_provider.create",
      target: {
        id: "11111111-1111-4111-8111-111111111111",
        label: "Clinica Veterinaria San Roque",
        type: "resource_provider",
      },
    });
    expect(auditEvents[0]?.metadata).toMatchObject({
      city: "La Paz",
      department: "La Paz",
    });
  });

  it("lets allowlisted admins create providers with multiple contacts and manageable link fields", async () => {
    let createInput:
      | {
          adminId: string;
          provider: CreateResourceProviderInput;
        }
      | undefined;
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminAuditRepository: createAuditRecorder(),
      resourceProviderRepository: {
        createProvider: (input: NonNullable<typeof createInput>) => {
          createInput = input;
          return Promise.resolve(
            providerProfile({
              contactOptions: input.provider.contactOptions,
              logoUrl: input.provider.logoUrl,
              photoUrl: input.provider.photoUrl,
              websiteUrl: input.provider.websiteUrl,
              socialLinks: input.provider.socialLinks,
              externalLinks: input.provider.externalLinks,
            }),
          );
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    const created = await caller.resources.admin.createProvider({
      ...createProviderInput,
      logoUrl: "https://example.com/logo.png",
      photoUrl: "https://example.com/photo.png",
      websiteUrl: "https://sanroque.example.com",
      contactOptions: [
        {
          kind: "phone",
          label: "Llamar",
          value: "+591 2 222 1111",
        },
        {
          kind: "whatsapp",
          label: "WhatsApp",
          value: "+591 70000001",
        },
        {
          kind: "email",
          label: "Correo",
          value: "contacto@sanroque.example",
        },
      ],
      socialLinks: [
        {
          label: "Instagram",
          url: "https://instagram.example.com/sanroque",
        },
      ],
      externalLinks: [
        {
          label: "Ficha municipal",
          url: "https://municipio.example.com/sanroque",
        },
      ],
    });

    expect(createInput?.provider.location).toMatchObject({
      city: "La Paz",
      department: "La Paz",
    });
    expect(created).toMatchObject({
      contactOptions: [
        {
          kind: "phone",
          label: "Llamar",
        },
        {
          kind: "whatsapp",
          label: "WhatsApp",
        },
        {
          kind: "email",
          label: "Correo",
        },
      ],
      logoUrl: "https://example.com/logo.png",
      photoUrl: "https://example.com/photo.png",
      websiteUrl: "https://sanroque.example.com",
      socialLinks: [
        {
          label: "Instagram",
          url: "https://instagram.example.com/sanroque",
        },
      ],
      externalLinks: [
        {
          label: "Ficha municipal",
          url: "https://municipio.example.com/sanroque",
        },
      ],
    });
  });

  it("maps ready provider media asset IDs into public provider URL fields", async () => {
    let assertCalls:
      | {
          adminId: string;
          assetId: string;
          purpose: string;
        }[]
      | undefined;
    let createInput:
      | {
          provider: CreateResourceProviderInput;
        }
      | undefined;
    const calls: NonNullable<typeof assertCalls> = [];
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminAuditRepository: createAuditRecorder(),
      adminMediaRepository: {
        assertReadyAssetForPurpose: (
          input: NonNullable<typeof assertCalls>[number],
        ) => {
          calls.push(input);
          assertCalls = calls;

          return Promise.resolve(
            adminMediaAsset({
              deliveryUrl:
                input.purpose === "provider_logo"
                  ? "https://cdn.rastro.bo/provider-logo.webp"
                  : "https://cdn.rastro.bo/provider-photo.webp",
              purpose:
                input.purpose === "provider_logo"
                  ? "provider_logo"
                  : "provider_photo",
              status: "ready",
            }),
          );
        },
      },
      resourceProviderRepository: {
        createProvider: (input: { provider: CreateResourceProviderInput }) => {
          createInput = input;

          return Promise.resolve(
            providerProfile({
              logoUrl: input.provider.logoUrl,
              photoUrl: input.provider.photoUrl,
            }),
          );
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    const created = await caller.resources.admin.createProvider({
      ...createProviderInput,
      logoAssetId: "11111111-1111-4111-8111-111111111111",
      photoAssetId: "22222222-2222-4222-8222-222222222222",
    });

    expect(assertCalls).toEqual([
      {
        adminId: "member-admin-la-paz",
        assetId: "11111111-1111-4111-8111-111111111111",
        purpose: "provider_logo",
      },
      {
        adminId: "member-admin-la-paz",
        assetId: "22222222-2222-4222-8222-222222222222",
        purpose: "provider_photo",
      },
    ]);
    expect(createInput?.provider).toMatchObject({
      logoUrl: "https://cdn.rastro.bo/provider-logo.webp",
      photoUrl: "https://cdn.rastro.bo/provider-photo.webp",
    });
    expect(JSON.stringify(createInput?.provider)).not.toContain("logoAssetId");
    expect(created).toMatchObject({
      logoUrl: "https://cdn.rastro.bo/provider-logo.webp",
      photoUrl: "https://cdn.rastro.bo/provider-photo.webp",
    });
  });

  it("rejects pending, missing, foreign, or wrong-purpose provider media assets before persistence", async () => {
    let createWasCalled = false;
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminMediaRepository: {
        assertReadyAssetForPurpose: () =>
          Promise.reject(
            new AdminMediaAssetReferenceError(
              "Admin media asset must be ready, owned by this admin, and match the requested purpose.",
            ),
          ),
      },
      resourceProviderRepository: {
        createProvider: () => {
          createWasCalled = true;

          return Promise.reject(
            new Error("Invalid admin media must not create provider."),
          );
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    await expect(
      caller.resources.admin.createProvider({
        ...createProviderInput,
        logoAssetId: "11111111-1111-4111-8111-111111111111",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message:
        "Admin media asset must be ready, owned by this admin, and match the requested purpose.",
    });
    expect(createWasCalled).toBe(false);
  });

  it("lets allowlisted admins update provider details, contact, and location", async () => {
    let updateInput:
      | {
          adminId: string;
          provider: UpdateResourceProviderInput;
        }
      | undefined;
    const auditEvents: CapturedAuditEvent[] = [];
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminAuditRepository: createAuditRecorder(auditEvents),
      resourceProviderRepository: {
        updateProvider: (input: NonNullable<typeof updateInput>) => {
          updateInput = input;
          return Promise.resolve(
            providerProfile({
              name: input.provider.name,
              contactOptions: input.provider.contactOptions,
            }),
          );
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    const updated = await caller.resources.admin.updateProvider({
      providerId: "11111111-1111-4111-8111-111111111111",
      name: "Clinica Veterinaria San Roque Norte",
      logoUrl: null,
      location: {
        exactLatitude: -16.510231,
        exactLongitude: -68.123881,
        approximateLocationLabel: "Sopocachi, La Paz",
        locationCell: "bo-lpb-sopocachi",
      },
      contactOptions: [
        {
          kind: "whatsapp",
          label: "WhatsApp",
          value: "+591 70000001",
        },
      ],
    });

    expect(updateInput).toMatchObject({
      adminId: "member-admin-la-paz",
      provider: {
        name: "Clinica Veterinaria San Roque Norte",
        logoUrl: null,
        location: {
          exactLatitude: -16.510231,
          exactLongitude: -68.123881,
        },
      },
    });
    expect(updated).toMatchObject({
      name: "Clinica Veterinaria San Roque Norte",
      contactOptions: [
        {
          kind: "whatsapp",
          label: "WhatsApp",
          value: "+591 70000001",
        },
      ],
    });
    expect(JSON.stringify(updated)).not.toContain("-16.510231");
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "resource_provider.update",
        metadata: {
          changedFields: ["name", "logoUrl", "location", "contactOptions"],
        },
        target: {
          id: "11111111-1111-4111-8111-111111111111",
          label: "Clinica Veterinaria San Roque Norte",
          type: "resource_provider",
        },
      }),
    ]);
  });

  it("preserves provider media fields when admin updates omit media changes", async () => {
    let updateInput:
      | {
          adminId: string;
          provider: UpdateResourceProviderInput;
        }
      | undefined;
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminAuditRepository: createAuditRecorder(),
      resourceProviderRepository: {
        updateProvider: (input: NonNullable<typeof updateInput>) => {
          updateInput = input;
          return Promise.resolve(
            providerProfile({
              name: input.provider.name,
              logoUrl: "https://cdn.rastro.bo/existing-logo.webp",
              photoUrl: "https://cdn.rastro.bo/existing-photo.webp",
            }),
          );
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    const updated = await caller.resources.admin.updateProvider({
      providerId: "11111111-1111-4111-8111-111111111111",
      name: "Clinica Veterinaria San Roque Norte",
    });

    expect(updateInput?.provider.logoUrl).toBeUndefined();
    expect(updateInput?.provider.photoUrl).toBeUndefined();
    expect(updated).toMatchObject({
      logoUrl: "https://cdn.rastro.bo/existing-logo.webp",
      photoUrl: "https://cdn.rastro.bo/existing-photo.webp",
    });
  });

  it("lets allowlisted admins update multiple contacts without dropping link fields", async () => {
    let updateInput:
      | {
          adminId: string;
          provider: UpdateResourceProviderInput;
        }
      | undefined;
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminAuditRepository: createAuditRecorder(),
      resourceProviderRepository: {
        updateProvider: (input: NonNullable<typeof updateInput>) => {
          updateInput = input;
          return Promise.resolve(
            providerProfile({
              contactOptions: input.provider.contactOptions,
              logoUrl: input.provider.logoUrl ?? undefined,
              photoUrl: input.provider.photoUrl ?? undefined,
              websiteUrl: input.provider.websiteUrl ?? undefined,
              socialLinks: input.provider.socialLinks ?? undefined,
              externalLinks: input.provider.externalLinks ?? undefined,
            }),
          );
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    const updated = await caller.resources.admin.updateProvider({
      providerId: "11111111-1111-4111-8111-111111111111",
      description: "Veterinaria local con atencion general y urgencias.",
      logoUrl: "https://example.com/logo.png",
      photoUrl: "https://example.com/photo.png",
      websiteUrl: "https://sanroque.example.com",
      contactOptions: [
        {
          kind: "phone",
          label: "Llamar",
          value: "+591 2 222 1111",
        },
        {
          kind: "whatsapp",
          label: "WhatsApp",
          value: "+591 70000001",
        },
        {
          kind: "email",
          label: "Correo",
          value: "contacto@sanroque.example",
        },
      ],
      socialLinks: [
        {
          label: "Instagram",
          url: "https://instagram.example.com/sanroque",
        },
      ],
      externalLinks: [
        {
          label: "Ficha municipal",
          url: "https://municipio.example.com/sanroque",
        },
      ],
    });

    expect(updateInput).toMatchObject({
      adminId: "member-admin-la-paz",
      provider: {
        contactOptions: [
          {
            kind: "phone",
            label: "Llamar",
          },
          {
            kind: "whatsapp",
            label: "WhatsApp",
          },
          {
            kind: "email",
            label: "Correo",
          },
        ],
      },
    });
    expect(updated).toMatchObject({
      contactOptions: [
        {
          kind: "phone",
          label: "Llamar",
        },
        {
          kind: "whatsapp",
          label: "WhatsApp",
        },
        {
          kind: "email",
          label: "Correo",
        },
      ],
      logoUrl: "https://example.com/logo.png",
      photoUrl: "https://example.com/photo.png",
      websiteUrl: "https://sanroque.example.com",
    });
  });

  it("lets allowlisted admins soft-delete providers through the repository", async () => {
    let deleteInput:
      | {
          adminId: string;
          provider: { providerId: string };
        }
      | undefined;
    const auditEvents: CapturedAuditEvent[] = [];
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminAuditRepository: createAuditRecorder(auditEvents),
      resourceProviderRepository: {
        deleteProvider: (input: NonNullable<typeof deleteInput>) => {
          deleteInput = input;
          return Promise.resolve({
            deletedAt: new Date("2026-07-15T12:00:00.000Z"),
            providerId: input.provider.providerId,
          });
        },
        findProfile: () => Promise.resolve(providerProfile()),
      },
      session: {
        user: {
          email: "ADMIN@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    const deleted = await caller.resources.admin.deleteProvider({
      providerId: "11111111-1111-4111-8111-111111111111",
    });

    expect(deleteInput).toEqual({
      adminId: "member-admin-la-paz",
      provider: {
        providerId: "11111111-1111-4111-8111-111111111111",
      },
    });
    expect(deleted).toEqual({
      deleted: true,
      deletedAt: "2026-07-15T12:00:00.000Z",
      providerId: "11111111-1111-4111-8111-111111111111",
    });
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "resource_provider.archive",
        target: {
          id: "11111111-1111-4111-8111-111111111111",
          label: "Clinica Veterinaria San Roque",
          type: "resource_provider",
        },
      }),
    ]);
  });

  it("runs verification and sponsor admin mutations behind the same allowlist", async () => {
    const operations: string[] = [];
    const auditEvents: CapturedAuditEvent[] = [];
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminAuditRepository: createAuditRecorder(auditEvents),
      resourceProviderRepository: {
        updateVerification: (input: {
          adminId: string;
          verification: { status: string };
        }) => {
          operations.push(
            `verify:${input.adminId}:${input.verification.status}`,
          );
          return Promise.resolve(
            providerProfile({
              isVerified: true,
            }),
          );
        },
        attachSponsor: (input: {
          adminId: string;
          sponsorPlacement: { surface: string };
        }) => {
          operations.push(
            `attach:${input.adminId}:${input.sponsorPlacement.surface}`,
          );
          return Promise.resolve(
            providerProfile({
              sponsorPlacement: {
                kind: "Local Sponsor Placement",
                label: "Patrocinado",
                disclosure:
                  "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
                eligibleSurfaces: ["provider_details"],
                safetyPolicy: {
                  recoveryPriority: {
                    label: "Recovery Priority",
                    canAffect: false,
                  },
                  pushNotifications: {
                    eligible: false,
                  },
                },
              },
            }),
          );
        },
        detachSponsor: (input: { placementId: string }) => {
          operations.push(`detach:${input.placementId}`);
          return Promise.resolve(providerProfile());
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    await caller.resources.admin.updateVerification({
      providerId: "11111111-1111-4111-8111-111111111111",
      status: "verified",
      note: "Identidad revisada por Rastro.",
    });
    const sponsored = await caller.resources.admin.attachSponsor({
      providerId: "11111111-1111-4111-8111-111111111111",
      placementId: "22222222-2222-4222-8222-222222222222",
      surface: "provider_details",
      startsOn: "2026-07-01",
      endsOn: "2026-07-31",
    });
    await caller.resources.admin.detachSponsor({
      providerId: "11111111-1111-4111-8111-111111111111",
      placementId: "22222222-2222-4222-8222-222222222222",
    });

    expect(sponsored.sponsorPlacement?.safetyPolicy).toEqual({
      recoveryPriority: {
        label: "Recovery Priority",
        canAffect: false,
      },
      pushNotifications: {
        eligible: false,
      },
    });
    expect(operations).toEqual([
      "verify:member-admin-la-paz:verified",
      "attach:member-admin-la-paz:provider_details",
      "detach:22222222-2222-4222-8222-222222222222",
    ]);
    expect(auditEvents).toHaveLength(3);
    expect(auditEvents[0]).toMatchObject({
      action: "resource_provider.verification_update",
      target: {
        type: "resource_provider",
      },
    });
    expect(auditEvents[0]?.metadata).toMatchObject({
      status: "verified",
    });
    expect(auditEvents[1]).toMatchObject({
      action: "local_sponsor_placement.create",
      target: {
        type: "local_sponsor_placement",
      },
    });
    expect(auditEvents[1]?.metadata).toMatchObject({
      surface: "provider_details",
    });
    expect(auditEvents[2]).toMatchObject({
      action: "local_sponsor_placement.detach",
      target: {
        id: "22222222-2222-4222-8222-222222222222",
        label:
          "Clinica Veterinaria San Roque - 22222222-2222-4222-8222-222222222222",
        type: "local_sponsor_placement",
      },
    });
  });

  it("lists Local Sponsor Placements across providers for allowlisted admins", async () => {
    let listInput: unknown;
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      resourceProviderRepository: {
        listSponsorPlacements: (input: unknown) => {
          listInput = input;
          return Promise.resolve(
            adminListResult([
              sponsorPlacement({
                providerId: "11111111-1111-4111-8111-111111111111",
                providerName: "Clinica Veterinaria San Roque",
              }),
              sponsorPlacement({
                placementId: "33333333-3333-4333-8333-333333333333",
                providerId: "22222222-2222-4222-8222-222222222222",
                providerName: "Patitas La Paz",
                surface: "provider_details",
              }),
            ]),
          );
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    const placements = await caller.resources.admin.listSponsorPlacements({
      filters: {
        activeOn: "2026-07-15",
        category: ["veterinary"],
        mediaState: "has_media",
        state: "active",
        surface: ["resources_directory"],
        verification: ["verified"],
      },
      page: 1,
      pageSize: 10,
      sortBy: "startsOn",
      sortDirection: "asc",
    });

    expect(listInput).toMatchObject({
      filters: {
        state: "active",
        surface: ["resources_directory"],
      },
      pageSize: 10,
      sortBy: "startsOn",
    });
    expect(placements.items).toEqual([
      expect.objectContaining({
        placementId: "22222222-2222-4222-8222-222222222222",
        providerName: "Clinica Veterinaria San Roque",
      }),
      expect.objectContaining({
        placementId: "33333333-3333-4333-8333-333333333333",
        providerName: "Patitas La Paz",
        surface: "provider_details",
      }),
    ]);
    expect(placements).toMatchObject({
      pageSize: 10,
      total: 2,
    });
    expect(placements.items[0]?.safetyPolicy).toMatchObject({
      recoveryPriority: {
        canAffect: false,
      },
      pushNotifications: {
        eligible: false,
      },
    });
  });

  it("creates, updates, and detaches standalone sponsor placements behind the admin allowlist", async () => {
    const operations: string[] = [];
    const auditEvents: CapturedAuditEvent[] = [];
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminAuditRepository: createAuditRecorder(auditEvents),
      resourceProviderRepository: {
        createSponsorPlacement: (input: {
          adminId: string;
          sponsorPlacement: {
            imageUrl?: string | null;
            logoUrl?: string | null;
            surface: string;
          };
        }) => {
          operations.push(
            `create:${input.adminId}:${input.sponsorPlacement.surface}:${input.sponsorPlacement.logoUrl ?? ""}`,
          );
          return Promise.resolve(
            sponsorPlacement({
              imageUrl: input.sponsorPlacement.imageUrl ?? undefined,
              logoUrl: input.sponsorPlacement.logoUrl ?? undefined,
            }),
          );
        },
        updateSponsorPlacement: (input: {
          adminId: string;
          sponsorPlacement: {
            imageUrl?: string | null;
            logoUrl?: string | null;
            placementId: string;
            surface: SponsorPlacementFixture["surface"];
          };
        }) => {
          operations.push(
            `update:${input.adminId}:${input.sponsorPlacement.placementId}:${input.sponsorPlacement.surface}`,
          );
          return Promise.resolve(
            sponsorPlacement({
              imageUrl: input.sponsorPlacement.imageUrl ?? undefined,
              logoUrl: input.sponsorPlacement.logoUrl ?? undefined,
              surface: input.sponsorPlacement.surface,
            }),
          );
        },
        detachSponsor: (input: { placementId: string }) => {
          operations.push(`detach:${input.placementId}`);
          return Promise.resolve(providerProfile());
        },
      },
      session: {
        user: {
          email: "ADMIN@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    const created = await caller.resources.admin.createSponsor({
      providerId: "11111111-1111-4111-8111-111111111111",
      surface: "resources_directory",
      logoUrl: "https://example.com/sponsor-logo.png",
      imageUrl: "https://example.com/sponsor-banner.png",
      startsOn: "2026-07-01",
      endsOn: "2026-07-31",
    });
    const updated = await caller.resources.admin.updateSponsor({
      providerId: "11111111-1111-4111-8111-111111111111",
      placementId: "22222222-2222-4222-8222-222222222222",
      surface: "provider_details",
      label: "Aliado local",
      disclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      logoUrl: null,
      imageUrl: "https://example.com/provider-details-sponsor.png",
      startsOn: "2026-07-01",
      endsOn: "2026-08-31",
    });
    const detached = await caller.resources.admin.detachSponsorPlacement({
      providerId: "11111111-1111-4111-8111-111111111111",
      placementId: "22222222-2222-4222-8222-222222222222",
    });

    expect(created).toMatchObject({
      providerName: "Clinica Veterinaria San Roque",
      surface: "resources_directory",
      logoUrl: "https://example.com/sponsor-logo.png",
      imageUrl: "https://example.com/sponsor-banner.png",
    });
    expect(updated).toMatchObject({
      imageUrl: "https://example.com/provider-details-sponsor.png",
      logoUrl: undefined,
      label: "Patrocinado",
      surface: "provider_details",
    });
    expect(detached).toEqual({
      detached: true,
      placementId: "22222222-2222-4222-8222-222222222222",
      providerId: "11111111-1111-4111-8111-111111111111",
    });
    expect(operations).toEqual([
      "create:member-admin-la-paz:resources_directory:https://example.com/sponsor-logo.png",
      "update:member-admin-la-paz:22222222-2222-4222-8222-222222222222:provider_details",
      "detach:22222222-2222-4222-8222-222222222222",
    ]);
    expect(auditEvents).toHaveLength(3);
    expect(auditEvents[0]).toMatchObject({
      action: "local_sponsor_placement.create",
      target: {
        id: "22222222-2222-4222-8222-222222222222",
        type: "local_sponsor_placement",
      },
    });
    expect(auditEvents[1]).toMatchObject({
      action: "local_sponsor_placement.update",
      target: {
        id: "22222222-2222-4222-8222-222222222222",
        type: "local_sponsor_placement",
      },
    });
    expect(auditEvents[1]?.metadata).toMatchObject({
      surface: "provider_details",
    });
    expect(auditEvents[2]).toMatchObject({
      action: "local_sponsor_placement.detach",
      target: {
        id: "22222222-2222-4222-8222-222222222222",
        type: "local_sponsor_placement",
      },
    });
  });

  it("maps ready sponsor media asset IDs into sponsor URL fields", async () => {
    let createInput:
      | {
          sponsorPlacement: {
            imageUrl?: string | null;
            logoUrl?: string | null;
          };
        }
      | undefined;
    const calls: {
      adminId: string;
      assetId: string;
      purpose: string;
    }[] = [];
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminAuditRepository: createAuditRecorder(),
      adminMediaRepository: {
        assertReadyAssetForPurpose: (input: (typeof calls)[number]) => {
          calls.push(input);

          return Promise.resolve(
            adminMediaAsset({
              deliveryUrl:
                input.purpose === "sponsor_logo"
                  ? "https://cdn.rastro.bo/sponsor-logo.webp"
                  : "https://cdn.rastro.bo/sponsor-image.webp",
              purpose:
                input.purpose === "sponsor_logo"
                  ? "sponsor_logo"
                  : "sponsor_image",
              status: "ready",
            }),
          );
        },
      },
      resourceProviderRepository: {
        createSponsorPlacement: (input: NonNullable<typeof createInput>) => {
          createInput = input;

          return Promise.resolve(
            sponsorPlacement({
              imageUrl: input.sponsorPlacement.imageUrl ?? undefined,
              logoUrl: input.sponsorPlacement.logoUrl ?? undefined,
            }),
          );
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    const created = await caller.resources.admin.createSponsor({
      providerId: "11111111-1111-4111-8111-111111111111",
      surface: "resources_directory",
      logoAssetId: "11111111-1111-4111-8111-111111111111",
      imageAssetId: "22222222-2222-4222-8222-222222222222",
      startsOn: "2026-07-01",
      endsOn: "2026-07-31",
    });

    expect(calls).toEqual([
      {
        adminId: "member-admin-la-paz",
        assetId: "11111111-1111-4111-8111-111111111111",
        purpose: "sponsor_logo",
      },
      {
        adminId: "member-admin-la-paz",
        assetId: "22222222-2222-4222-8222-222222222222",
        purpose: "sponsor_image",
      },
    ]);
    expect(createInput?.sponsorPlacement).toMatchObject({
      logoUrl: "https://cdn.rastro.bo/sponsor-logo.webp",
      imageUrl: "https://cdn.rastro.bo/sponsor-image.webp",
    });
    expect(created).toMatchObject({
      logoUrl: "https://cdn.rastro.bo/sponsor-logo.webp",
      imageUrl: "https://cdn.rastro.bo/sponsor-image.webp",
    });
  });

  it("rejects pending, missing, foreign, or wrong-purpose sponsor media assets before persistence", async () => {
    let createWasCalled = false;
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminMediaRepository: {
        assertReadyAssetForPurpose: () =>
          Promise.reject(
            new AdminMediaAssetReferenceError(
              "Admin media asset must be ready, owned by this admin, and match the requested purpose.",
            ),
          ),
      },
      resourceProviderRepository: {
        createSponsorPlacement: () => {
          createWasCalled = true;

          return Promise.reject(
            new Error("Invalid admin media must not create sponsor."),
          );
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    await expect(
      caller.resources.admin.createSponsor({
        providerId: "11111111-1111-4111-8111-111111111111",
        surface: "resources_directory",
        logoAssetId: "11111111-1111-4111-8111-111111111111",
        startsOn: "2026-07-01",
        endsOn: "2026-07-31",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(createWasCalled).toBe(false);
  });

  it("rejects overlapping sponsor placements without recording audit events", async () => {
    const auditEvents: CapturedAuditEvent[] = [];
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminAuditRepository: createAuditRecorder(auditEvents),
      resourceProviderRepository: {
        createSponsorPlacement: () => {
          throw new SponsorPlacementOverlapError();
        },
        updateSponsorPlacement: () => {
          throw new SponsorPlacementOverlapError();
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    let createError: unknown;
    try {
      await caller.resources.admin.createSponsor({
        providerId: "11111111-1111-4111-8111-111111111111",
        surface: "resources_directory",
        startsOn: "2026-07-01",
        endsOn: "2026-07-31",
      });
    } catch (error: unknown) {
      createError = error;
    }

    expect(createError).toMatchObject({
      code: "BAD_REQUEST",
    });
    const createCause = getErrorCause(createError);
    expect(createCause).toBeInstanceOf(SponsorPlacementOverlapError);
    if (!(createCause instanceof SponsorPlacementOverlapError)) {
      throw new Error("Expected sponsor placement overlap cause.");
    }
    expect(createCause.fieldErrors.startsOn).toContain(
      "La ventana se cruza con otro patrocinio local activo.",
    );
    expect(createCause.fieldErrors.surface).toContain(
      "La superficie ya tiene un patrocinio local en esa ventana.",
    );
    await expect(
      caller.resources.admin.updateSponsor({
        providerId: "11111111-1111-4111-8111-111111111111",
        placementId: "22222222-2222-4222-8222-222222222222",
        surface: "resources_directory",
        label: "Patrocinado",
        disclosure:
          "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
        startsOn: "2026-07-15",
        endsOn: "2026-08-15",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message:
        "Ya existe un Local Sponsor Placement activo para este proveedor y superficie en esa ventana.",
    });
    expect(auditEvents).toHaveLength(0);
  });

  it("returns not found when an admin mutation cannot find its provider or placement", async () => {
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      resourceProviderRepository: {
        updateVerification: () => Promise.resolve(null),
        updateProvider: () => Promise.resolve(null),
        deleteProvider: () => Promise.resolve(null),
        findProfile: () => Promise.resolve(null),
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    await expect(
      caller.resources.admin.updateVerification({
        providerId: "11111111-1111-4111-8111-111111111111",
        status: "verified",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      caller.resources.admin.updateProvider({
        providerId: "11111111-1111-4111-8111-111111111111",
        name: "Clinica Veterinaria San Roque Norte",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      caller.resources.admin.deleteProvider({
        providerId: "11111111-1111-4111-8111-111111111111",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

interface SponsorPlacementFixture {
  category: "veterinary" | "shelter";
  city: string;
  department: string;
  disclosure: string;
  endsOn: string;
  isActive: boolean;
  imageUrl?: string;
  label: string;
  logoUrl?: string;
  placementId: string;
  providerId: string;
  providerName: string;
  providerVerificationStatus: "unverified" | "verified";
  safetyPolicy: {
    eligibleSurfaces: ("provider_details" | "resources_directory")[];
    recoveryPriority: {
      label: "Recovery Priority";
      canAffect: false;
    };
    pushNotifications: {
      eligible: false;
    };
  };
  startsOn: string;
  surface: "provider_details" | "resources_directory";
}

function sponsorPlacement(
  overrides: Partial<SponsorPlacementFixture> = {},
): SponsorPlacementFixture {
  return {
    ...buildSponsorPlacement(),
    ...overrides,
  };
}

function buildSponsorPlacement(): SponsorPlacementFixture {
  return {
    category: "veterinary",
    city: "La Paz",
    department: "La Paz",
    disclosure: "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
    endsOn: "2026-07-31",
    isActive: true,
    label: "Patrocinado",
    placementId: "22222222-2222-4222-8222-222222222222",
    providerId: "11111111-1111-4111-8111-111111111111",
    providerName: "Clinica Veterinaria San Roque",
    providerVerificationStatus: "verified",
    safetyPolicy: {
      eligibleSurfaces: ["resources_directory"],
      recoveryPriority: {
        label: "Recovery Priority",
        canAffect: false,
      },
      pushNotifications: {
        eligible: false,
      },
    },
    startsOn: "2026-07-01",
    surface: "resources_directory",
  };
}
