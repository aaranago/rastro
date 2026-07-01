import { describe, expect, it } from "vitest";

import type { CreateResourceProviderInput } from "./index";
import {
  adminMediaAssetPurposeSchema,
  adminMediaAssetStatusSchema,
  adminResourceProviderListInputSchema,
  adminSponsorPlacementListInputSchema,
  attachLocalSponsorPlacementInputSchema,
  buildApproximatePublicResourceProviderLocation,
  createAdminMediaUploadSessionInputSchema,
  createResourceProviderInputSchema,
  createResourceProviderReportInputSchema,
  deleteResourceProviderInputSchema,
  localSponsorPlacementPolicySchema,
  localSponsorPlacementSurfaceSchema,
  moderationReportReasonSchema,
  nearbyResourceProvidersInputSchema,
  publicResourceProviderProfileSchema,
  recordLocalSponsorPlacementDeliveryInputSchema,
  resourceProviderApproximatePublicLocationRadiusMeters,
  resourceProviderCategorySchema,
  resourceProviderContactKindSchema,
  updateLocalSponsorPlacementInputSchema,
  updateResourceProviderInputSchema,
} from "./index";

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
    addressLabel: "Plaza Abaroa, La Paz",
  },
  serviceAreaLabel: "Atiende La Paz y El Alto",
  hoursLabel: "Lun - Dom: 24 horas",
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
  ],
  websiteUrl: "https://sanroque.example.com",
  socialLinks: [
    {
      label: "Instagram",
      url: "https://instagram.example.com/sanroque",
    },
  ],
  emergencyAvailable: true,
  isOpenNow: false,
} satisfies CreateResourceProviderInput;

describe("resource provider validation contracts", () => {
  it("uses the canonical Recursos category, contact, and sponsor surface ids", () => {
    expect(resourceProviderCategorySchema.options).toEqual([
      "veterinary",
      "shelter",
      "groomer",
      "pet_food",
      "trainer",
      "pet_store",
      "transport",
      "other",
    ]);
    expect(resourceProviderContactKindSchema.options).toEqual([
      "phone",
      "whatsapp",
      "website",
      "email",
      "directions",
      "social",
    ]);
    expect(localSponsorPlacementSurfaceSchema.options).toEqual([
      "resources_directory",
      "provider_details",
      "launch_home_banner",
      "report_success",
      "contextual_care_resources",
    ]);
    expect(adminMediaAssetPurposeSchema.options).toEqual([
      "provider_logo",
      "provider_photo",
      "sponsor_logo",
      "sponsor_image",
    ]);
    expect(adminMediaAssetStatusSchema.options).toEqual([
      "pending",
      "ready",
      "failed",
      "removed",
    ]);
    expect(moderationReportReasonSchema.options).toEqual([
      "spam",
      "scam",
      "incorrect_location",
      "offensive_content",
      "animal_cruelty",
      "stolen_pet_concern",
      "impersonation",
      "other",
    ]);
  });

  it("accepts a full provider profile input while keeping exact coordinates in the write contract", () => {
    const result =
      createResourceProviderInputSchema.safeParse(createProviderInput);

    expect(result.success).toBe(true);
    expect(result.data?.location).toMatchObject({
      exactLatitude: -16.510231,
      exactLongitude: -68.123881,
      city: "La Paz",
      department: "La Paz",
      approximateLocationLabel: "Sopocachi, La Paz",
    });
  });

  it("normalizes provider contact values and managed external URLs by contact kind", () => {
    const result = createResourceProviderInputSchema.parse({
      ...createProviderInput,
      contactOptions: [
        {
          kind: "phone",
          label: "  Llamar  ",
          value: "2 222-1111",
        },
        {
          kind: "whatsapp",
          label: "WhatsApp",
          value: "7000 0001",
        },
        {
          kind: "website",
          label: "Web",
          value: "sanroque.example.com/contacto",
        },
        {
          kind: "email",
          label: "Correo",
          value: "mailto:CONTACTO@SANROQUE.EXAMPLE?subject=Rastro",
        },
        {
          kind: "directions",
          label: "Como llegar",
          value: "maps.example.com/sanroque",
        },
        {
          kind: "social",
          label: "Instagram",
          value: "instagram.example.com/sanroque",
        },
      ],
      websiteUrl: "sanroque.example.com",
      socialLinks: [
        {
          label: " Instagram ",
          url: "instagram.example.com/sanroque",
        },
      ],
      externalLinks: [
        {
          label: "Ficha municipal",
          url: "HTTP://municipio.example.com/sanroque",
        },
      ],
    });

    expect(result.contactOptions).toEqual([
      {
        kind: "phone",
        label: "Llamar",
        value: "+59122221111",
      },
      {
        kind: "whatsapp",
        label: "WhatsApp",
        value: "+59170000001",
      },
      {
        kind: "website",
        label: "Web",
        value: "https://sanroque.example.com/contacto",
      },
      {
        kind: "email",
        label: "Correo",
        value: "contacto@sanroque.example",
      },
      {
        kind: "directions",
        label: "Como llegar",
        value: "https://maps.example.com/sanroque",
      },
      {
        kind: "social",
        label: "Instagram",
        value: "https://instagram.example.com/sanroque",
      },
    ]);
    expect(result.websiteUrl).toBe("https://sanroque.example.com");
    expect(result.socialLinks).toEqual([
      {
        label: "Instagram",
        url: "https://instagram.example.com/sanroque",
      },
    ]);
    expect(result.externalLinks).toEqual([
      {
        label: "Ficha municipal",
        url: "http://municipio.example.com/sanroque",
      },
    ]);
  });

  it("rejects provider contact values that do not match their selected contact kind", () => {
    const result = createResourceProviderInputSchema.safeParse({
      ...createProviderInput,
      contactOptions: [
        {
          kind: "phone",
          label: "Llamar",
          value: "telefono",
        },
        {
          kind: "email",
          label: "Correo",
          value: "sanroque.example.com",
        },
        {
          kind: "directions",
          label: "Como llegar",
          value: "maps example",
        },
      ],
      websiteUrl: "ftp://sanroque.example.com",
      socialLinks: [
        {
          label: "Instagram",
          url: "instagram example",
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("contactOptions");
    expect(JSON.stringify(result.error?.issues)).toContain("websiteUrl");
    expect(JSON.stringify(result.error?.issues)).toContain("socialLinks");
  });

  it("accepts admin provider media asset IDs without exposing them publicly", () => {
    const result = createResourceProviderInputSchema.safeParse({
      ...createProviderInput,
      logoAssetId: "11111111-1111-4111-8111-111111111111",
      photoAssetId: "22222222-2222-4222-8222-222222222222",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      logoAssetId: "11111111-1111-4111-8111-111111111111",
      photoAssetId: "22222222-2222-4222-8222-222222222222",
    });
    const publicResult = publicResourceProviderProfileSchema.parse({
      ...createProviderInput,
      id: "11111111-1111-4111-8111-111111111111",
      categoryId: createProviderInput.category,
      approximateLocationLabel: "Sopocachi, La Paz",
      contactOptions: createProviderInput.contactOptions,
      logoAssetId: "11111111-1111-4111-8111-111111111111",
    });

    expect(JSON.stringify(publicResult)).not.toContain("logoAssetId");
  });

  it("rejects caller-supplied public coordinates for provider locations", () => {
    const result = createResourceProviderInputSchema.safeParse({
      ...createProviderInput,
      location: {
        ...createProviderInput.location,
        approximateLatitude: -16.510231,
        approximateLongitude: -68.123881,
      },
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("Unrecognized keys");
  });

  it("accepts admin provider updates while requiring at least one changed field", () => {
    const result = updateResourceProviderInputSchema.safeParse({
      providerId: "11111111-1111-4111-8111-111111111111",
      name: "Clinica Veterinaria San Roque Norte",
      logoAssetId: "22222222-2222-4222-8222-222222222222",
      logoUrl: null,
      location: {
        city: "El Alto",
        department: "La Paz",
      },
      contactOptions: [
        {
          kind: "whatsapp",
          label: "WhatsApp",
          value: "+591 70000001",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(
      updateResourceProviderInputSchema.safeParse({
        providerId: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(false);
  });

  it("accepts structured city and department location updates without requiring exact coordinates", () => {
    const result = updateResourceProviderInputSchema.safeParse({
      providerId: "11111111-1111-4111-8111-111111111111",
      location: {
        city: "El Alto",
        department: "La Paz",
        approximateLocationLabel: "Ciudad Satelite, El Alto",
        locationCell: "bo-lpb-el-alto-ciudad-satelite",
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.location).toMatchObject({
      city: "El Alto",
      department: "La Paz",
    });
  });

  it("requires both exact coordinates when an admin changes provider coordinates", () => {
    const result = updateResourceProviderInputSchema.safeParse({
      providerId: "11111111-1111-4111-8111-111111111111",
      location: {
        exactLatitude: -16.510231,
      },
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("exactLongitude");
  });

  it("rejects caller-supplied public coordinates for provider location updates", () => {
    const result = updateResourceProviderInputSchema.safeParse({
      providerId: "11111111-1111-4111-8111-111111111111",
      location: {
        ...createProviderInput.location,
        approximateLatitude: -16.510231,
        approximateLongitude: -68.123881,
      },
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("Unrecognized keys");
  });

  it("validates soft-delete provider inputs as DB-backed UUIDs", () => {
    expect(
      deleteResourceProviderInputSchema.safeParse({
        providerId: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(true);
    expect(
      deleteResourceProviderInputSchema.safeParse({
        providerId: "clinic-san-roque",
      }).success,
    ).toBe(false);
  });

  it("validates member Resource Provider reports with reporter-safe target, reason, and detail", () => {
    const result = createResourceProviderReportInputSchema.safeParse({
      providerId: "11111111-1111-4111-8111-111111111111",
      reason: "incorrect_location",
      detail: "La direccion visible no coincide con el proveedor.",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      detail: "La direccion visible no coincide con el proveedor.",
      providerId: "11111111-1111-4111-8111-111111111111",
      reason: "incorrect_location",
    });
  });

  it("rejects malformed provider reports before they reach the moderation repository", () => {
    const result = createResourceProviderReportInputSchema.safeParse({
      providerId: "clinic-san-roque",
      reason: "unsupported_reason",
      detail: "corto",
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("providerId");
    expect(JSON.stringify(result.error?.issues)).toContain("reason");
    expect(JSON.stringify(result.error?.issues)).toContain("detail");
  });

  it("snaps provider public coordinates to the same privacy grid as reports", () => {
    const approximate = buildApproximatePublicResourceProviderLocation({
      exactLatitude: -16.510231,
      exactLongitude: -68.123881,
    });

    expect(resourceProviderApproximatePublicLocationRadiusMeters).toBe(300);
    expect(approximate).toEqual({
      approximateLatitude: -16.51051,
      approximateLongitude: -68.124602,
    });
    expect(approximate.approximateLatitude).not.toBe(-16.510231);
    expect(approximate.approximateLongitude).not.toBe(-68.123881);
  });

  it("accepts bounded PostGIS nearby provider queries for Bolivia", () => {
    expect(
      nearbyResourceProvidersInputSchema.safeParse({
        latitude: -16.5,
        longitude: -68.12,
        radiusMeters: 5000,
        categoryIds: ["veterinary", "shelter"],
      }).success,
    ).toBe(true);
  });

  it("requires DB-backed provider and sponsor identifiers to be UUIDs", () => {
    expect(
      publicResourceProviderProfileSchema.safeParse({
        id: "clinic-san-roque",
        name: "Clinica Veterinaria San Roque",
        categoryId: "veterinary",
        description: "Veterinaria local con atencion general y urgencias.",
        approximateLocationLabel: "Sopocachi, La Paz",
        serviceAreaLabel: "Atiende La Paz y El Alto",
        hoursLabel: "Lun - Dom: 24 horas",
        shortDescription:
          "Atencion veterinaria general y orientacion para familias cuidadoras.",
        contactOptions: [
          {
            kind: "phone",
            label: "Llamar",
            value: "+591 2 222 1111",
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      attachLocalSponsorPlacementInputSchema.safeParse({
        providerId: "clinic-san-roque",
        surface: "resources_directory",
        startsOn: "2026-07-01",
        endsOn: "2026-07-31",
      }).success,
    ).toBe(false);
  });

  it("keeps sponsor placement policy explicit and unable to affect recovery priority or push notifications", () => {
    expect(
      localSponsorPlacementPolicySchema.parse({
        kind: "Local Sponsor Placement",
        label: "Patrocinado",
        disclosure:
          "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
        logoUrl: "https://example.com/sponsor-logo.png",
        imageUrl: "https://example.com/sponsor-banner.png",
        eligibleSurfaces: ["resources_directory", "provider_details"],
        safetyPolicy: {
          recoveryPriority: {
            label: "Recovery Priority",
            canAffect: false,
          },
          pushNotifications: {
            eligible: false,
          },
        },
      }),
    ).toMatchObject({
      safetyPolicy: {
        recoveryPriority: {
          canAffect: false,
        },
        pushNotifications: {
          eligible: false,
        },
      },
      logoUrl: "https://example.com/sponsor-logo.png",
      imageUrl: "https://example.com/sponsor-banner.png",
    });
  });

  it("accepts sponsor placement media URLs without requiring managed uploads yet", () => {
    const result = attachLocalSponsorPlacementInputSchema.safeParse({
      providerId: "11111111-1111-4111-8111-111111111111",
      surface: "resources_directory",
      label: "Patrocinado",
      disclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      logoUrl: "https://example.com/sponsor-logo.png",
      imageUrl: "https://example.com/sponsor-banner.png",
      startsOn: "2026-07-01",
      endsOn: "2026-07-31",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      logoUrl: "https://example.com/sponsor-logo.png",
      imageUrl: "https://example.com/sponsor-banner.png",
    });
    expect(
      updateLocalSponsorPlacementInputSchema.safeParse({
        providerId: "11111111-1111-4111-8111-111111111111",
        placementId: "22222222-2222-4222-8222-222222222222",
        surface: "resources_directory",
        label: "Patrocinado",
        disclosure:
          "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
        logoUrl: null,
        imageUrl: "not-a-url",
        startsOn: "2026-07-01",
        endsOn: "2026-07-31",
      }).success,
    ).toBe(false);
  });

  it("accepts active sponsor placement lists so consumers can select by eligible surface", () => {
    const profile = publicResourceProviderProfileSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Clinica Veterinaria San Roque",
      categoryId: "veterinary",
      description: "Veterinaria local con atencion general y urgencias.",
      approximateLocationLabel: "Sopocachi, La Paz",
      serviceAreaLabel: "Atiende La Paz y El Alto",
      hoursLabel: "Lun - Dom: 24 horas",
      shortDescription:
        "Atencion veterinaria general y orientacion para familias cuidadoras.",
      contactOptions: [
        {
          kind: "phone",
          label: "Llamar",
          value: "+59122221111",
        },
      ],
      activeSponsorPlacements: [
        {
          kind: "Local Sponsor Placement",
          label: "Patrocinado",
          disclosure:
            "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
          eligibleSurfaces: ["resources_directory"],
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
        {
          kind: "Local Sponsor Placement",
          label: "Aliado local",
          disclosure:
            "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
          imageUrl: "https://example.com/provider-details-sponsor.png",
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
      ],
    });

    expect(
      profile.activeSponsorPlacements?.map((placement) => placement.label),
    ).toEqual(["Patrocinado", "Aliado local"]);
    expect(
      profile.activeSponsorPlacements?.find((placement) =>
        placement.eligibleSurfaces.includes("provider_details"),
      )?.imageUrl,
    ).toBe("https://example.com/provider-details-sponsor.png");
  });

  it("accepts admin sponsor media asset IDs while keeping manual URL fallback explicit", () => {
    const result = attachLocalSponsorPlacementInputSchema.safeParse({
      providerId: "11111111-1111-4111-8111-111111111111",
      surface: "resources_directory",
      label: "Patrocinado",
      disclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      logoAssetId: "11111111-1111-4111-8111-111111111111",
      imageAssetId: "22222222-2222-4222-8222-222222222222",
      startsOn: "2026-07-01",
      endsOn: "2026-07-31",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      logoAssetId: "11111111-1111-4111-8111-111111111111",
      imageAssetId: "22222222-2222-4222-8222-222222222222",
    });
    expect(
      updateLocalSponsorPlacementInputSchema.safeParse({
        providerId: "11111111-1111-4111-8111-111111111111",
        placementId: "22222222-2222-4222-8222-222222222222",
        surface: "resources_directory",
        label: "Patrocinado",
        disclosure:
          "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
        logoAssetId: null,
        imageAssetId: "33333333-3333-4333-8333-333333333333",
        startsOn: "2026-07-01",
        endsOn: "2026-07-31",
      }).success,
    ).toBe(true);
  });

  it("validates admin media upload metadata before presigning object storage", () => {
    expect(
      createAdminMediaUploadSessionInputSchema.parse({
        height: 900,
        mimeType: "image/webp",
        purpose: "provider_logo",
        sizeBytes: 300_000,
        width: 1200,
      }),
    ).toMatchObject({
      purpose: "provider_logo",
      mimeType: "image/webp",
    });
    expect(
      createAdminMediaUploadSessionInputSchema.safeParse({
        height: 900,
        mimeType: "application/pdf",
        purpose: "provider_logo",
        sizeBytes: 300_000,
        width: 1200,
      }).success,
    ).toBe(false);
  });

  it("rejects sponsor placements whose end date is before their start date", () => {
    const result = attachLocalSponsorPlacementInputSchema.safeParse({
      providerId: "11111111-1111-4111-8111-111111111111",
      surface: "resources_directory",
      startsOn: "2026-08-01",
      endsOn: "2026-07-31",
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("endsOn");
  });

  it("requires a placement ID and valid date window for sponsor placement updates", () => {
    const result = updateLocalSponsorPlacementInputSchema.safeParse({
      providerId: "11111111-1111-4111-8111-111111111111",
      placementId: "22222222-2222-4222-8222-222222222222",
      surface: "provider_details",
      label: "Patrocinado",
      disclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      startsOn: "2026-07-01",
      endsOn: "2026-07-31",
    });

    expect(result.success).toBe(true);
    expect(
      updateLocalSponsorPlacementInputSchema.safeParse({
        providerId: "11111111-1111-4111-8111-111111111111",
        surface: "provider_details",
        startsOn: "2026-08-01",
        endsOn: "2026-07-31",
      }).success,
    ).toBe(false);
  });

  it("validates typed admin provider and sponsor placement list inputs", () => {
    expect(
      adminResourceProviderListInputSchema.parse({
        page: 2,
        pageSize: 10,
        search: "La Paz",
        sortBy: "sponsorState",
        sortDirection: "desc",
        filters: {
          activeOn: "2026-07-15",
          category: ["veterinary"],
          city: "La Paz",
          department: "La Paz",
          mediaState: "has_media",
          sponsorState: "active",
          sponsorSurface: ["resources_directory"],
          verification: ["verified"],
        },
      }),
    ).toMatchObject({
      filters: {
        sponsorState: "active",
      },
      sortBy: "sponsorState",
    });
    expect(
      adminSponsorPlacementListInputSchema.parse({
        page: 1,
        pageSize: 10,
        sortBy: "state",
        sortDirection: "asc",
        filters: {
          activeOn: "2026-07-15",
          category: ["shelter"],
          endsTo: "2026-08-31",
          mediaState: "missing_media",
          startsFrom: "2026-07-01",
          state: "scheduled",
          surface: ["provider_details"],
          verification: ["unverified"],
        },
      }),
    ).toMatchObject({
      filters: {
        state: "scheduled",
      },
      sortBy: "state",
    });
    expect(
      adminResourceProviderListInputSchema.safeParse({
        sortBy: "unsupported",
      }).success,
    ).toBe(false);
    expect(
      adminSponsorPlacementListInputSchema.safeParse({
        filters: {
          activeOn: "07/15/2026",
        },
      }).success,
    ).toBe(false);
  });

  it("parses public provider profiles without accepting private exact location fields", () => {
    const profile = publicResourceProviderProfileSchema.parse({
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
      contactOptions: [
        {
          kind: "phone",
          label: "Llamar",
          value: "+591 2 222 1111",
        },
      ],
    });

    expect(JSON.stringify(profile)).not.toContain("exactLatitude");
    expect(JSON.stringify(profile)).not.toContain("-16.510231");
  });
});

it("validates public sponsor delivery events without exposing placement IDs", () => {
  expect(
    recordLocalSponsorPlacementDeliveryInputSchema.parse({
      eventType: "impression",
      idempotencyKey:
        "resources_directory:11111111-1111-4111-8111-111111111111:2026-07-01",
      providerId: "11111111-1111-4111-8111-111111111111",
      source: "resources-map-card",
      surface: "resources_directory",
    }),
  ).toMatchObject({
    eventType: "impression",
    providerId: "11111111-1111-4111-8111-111111111111",
    surface: "resources_directory",
  });

  expect(
    recordLocalSponsorPlacementDeliveryInputSchema.safeParse({
      eventType: "purchase",
      placementId: "22222222-2222-4222-8222-222222222222",
      providerId: "11111111-1111-4111-8111-111111111111",
      surface: "resources_directory",
    }).success,
  ).toBe(false);
});
