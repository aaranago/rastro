import { describe, expect, it } from "vitest";

import type {
  CreateResourceProviderInput,
  PublicResourceProviderProfile,
  UpdateResourceProviderInput,
} from "@acme/validators";

import { appRouter } from "../root";

function createCaller(context: unknown) {
  return appRouter.createCaller(context as never);
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

  it("lets allowlisted admins create providers through the repository", async () => {
    let createInput:
      | {
          adminId: string;
          provider: CreateResourceProviderInput;
        }
      | undefined;
    const caller = createCaller({
      adminEmailList: "ops@rastro.bo\nADMIN@rastro.bo",
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

  it("lets allowlisted admins update provider details, contact, and location", async () => {
    let updateInput:
      | {
          adminId: string;
          provider: UpdateResourceProviderInput;
        }
      | undefined;
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
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
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      resourceProviderRepository: {
        deleteProvider: (input: NonNullable<typeof deleteInput>) => {
          deleteInput = input;
          return Promise.resolve({
            deletedAt: new Date("2026-07-15T12:00:00.000Z"),
            providerId: input.provider.providerId,
          });
        },
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
  });

  it("runs verification and sponsor admin mutations behind the same allowlist", async () => {
    const operations: string[] = [];
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
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
  });

  it("lists Local Sponsor Placements across providers for allowlisted admins", async () => {
    let listWasCalled = false;
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      resourceProviderRepository: {
        listSponsorPlacements: () => {
          listWasCalled = true;
          return Promise.resolve([
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
          ]);
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin-la-paz",
        },
      },
    });

    const placements = await caller.resources.admin.listSponsorPlacements();

    expect(listWasCalled).toBe(true);
    expect(placements).toEqual([
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
    expect(placements[0]?.safetyPolicy).toMatchObject({
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
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      resourceProviderRepository: {
        createSponsorPlacement: (input: {
          adminId: string;
          sponsorPlacement: { surface: string };
        }) => {
          operations.push(
            `create:${input.adminId}:${input.sponsorPlacement.surface}`,
          );
          return Promise.resolve(sponsorPlacement());
        },
        updateSponsorPlacement: (input: {
          adminId: string;
          sponsorPlacement: {
            placementId: string;
            surface: SponsorPlacementFixture["surface"];
          };
        }) => {
          operations.push(
            `update:${input.adminId}:${input.sponsorPlacement.placementId}:${input.sponsorPlacement.surface}`,
          );
          return Promise.resolve(
            sponsorPlacement({
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
    });
    expect(updated).toMatchObject({
      label: "Patrocinado",
      surface: "provider_details",
    });
    expect(detached).toEqual({
      detached: true,
      placementId: "22222222-2222-4222-8222-222222222222",
      providerId: "11111111-1111-4111-8111-111111111111",
    });
    expect(operations).toEqual([
      "create:member-admin-la-paz:resources_directory",
      "update:member-admin-la-paz:22222222-2222-4222-8222-222222222222:provider_details",
      "detach:22222222-2222-4222-8222-222222222222",
    ]);
  });

  it("returns not found when an admin mutation cannot find its provider or placement", async () => {
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      resourceProviderRepository: {
        updateVerification: () => Promise.resolve(null),
        updateProvider: () => Promise.resolve(null),
        deleteProvider: () => Promise.resolve(null),
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
  label: string;
  placementId: string;
  providerId: string;
  providerName: string;
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
