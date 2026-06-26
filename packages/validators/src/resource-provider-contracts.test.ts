import { describe, expect, it } from "vitest";

import type { CreateResourceProviderInput } from "./index";
import {
  attachLocalSponsorPlacementInputSchema,
  buildApproximatePublicResourceProviderLocation,
  createResourceProviderInputSchema,
  localSponsorPlacementPolicySchema,
  localSponsorPlacementSurfaceSchema,
  nearbyResourceProvidersInputSchema,
  publicResourceProviderProfileSchema,
  resourceProviderApproximatePublicLocationRadiusMeters,
  resourceProviderCategorySchema,
  resourceProviderContactKindSchema,
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
  });

  it("accepts a full provider profile input while keeping exact coordinates in the write contract", () => {
    const result =
      createResourceProviderInputSchema.safeParse(createProviderInput);

    expect(result.success).toBe(true);
    expect(result.data?.location).toMatchObject({
      exactLatitude: -16.510231,
      exactLongitude: -68.123881,
      approximateLocationLabel: "Sopocachi, La Paz",
    });
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
    });
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
