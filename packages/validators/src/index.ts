import { z } from "zod/v4";

export const unused = z.string().describe(
  `This lib is currently not used as we use drizzle-zod for simple schemas
   But as your application grows and you need other validators to share
   with back and frontend, you can put them in here
  `,
);

export const reportTypeSchema = z.enum([
  "lost_pet",
  "found_pet",
  "sighting",
  "adoption",
]);

export const reportStatusSchema = z.enum([
  "active",
  "pending_review",
  "closed",
]);

export const reportOutcomeSchema = z.enum([
  "still_missing",
  "reunited",
  "transferred_to_shelter",
  "unable_to_locate",
  "inactive",
  "adopted",
]);

export const petSpeciesSchema = z.enum([
  "dog",
  "cat",
  "bird",
  "rabbit",
  "other",
]);

export const contactPreferenceSchema = z.enum([
  "in_app_chat",
  "whatsapp",
  "both",
]);

export const reportMediaInputSchema = z.object({
  mediaId: z.uuid(),
  altText: z.string().max(240).optional(),
});

const imageMimeTypeSchema = z
  .string()
  .regex(/^image\/(jpeg|png|webp|heic|heif)$/);

export const createUploadSessionInputSchema = z.object({
  checksumSha256: z.string().min(8).max(128).optional(),
  draftId: z.string().min(1).max(128),
  height: z.number().int().positive(),
  mimeType: imageMimeTypeSchema,
  reportType: reportTypeSchema,
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive(),
});

export const uploadSessionIdInputSchema = z.object({
  mediaId: z.uuid(),
});

const boliviaLatitudeSchema = z.number().min(-23).max(-9);
const boliviaLongitudeSchema = z.number().min(-70.5).max(-57);

export const reportLocationInputSchema = z.object({
  exactLatitude: boliviaLatitudeSchema,
  exactLongitude: boliviaLongitudeSchema,
  approximateLatitude: boliviaLatitudeSchema.optional(),
  approximateLongitude: boliviaLongitudeSchema.optional(),
  label: z.string().min(2).max(160),
  locationCell: z.string().min(3).max(96),
  exposeExactLocation: z.boolean().default(false),
});

export const reportApproximatePublicLocationRadiusMeters = 300;

export function buildApproximatePublicReportLocation({
  exactLatitude,
  exactLongitude,
}: {
  exactLatitude: number;
  exactLongitude: number;
}) {
  const latitudeStepDegrees =
    reportApproximatePublicLocationRadiusMeters / metersPerLatitudeDegree;
  const longitudeStepDegrees =
    reportApproximatePublicLocationRadiusMeters /
    getMetersPerLongitudeDegree(exactLatitude);

  return {
    approximateLatitude: roundCoordinateToPrecisionGridCenter(
      exactLatitude,
      latitudeStepDegrees,
    ),
    approximateLongitude: roundCoordinateToPrecisionGridCenter(
      exactLongitude,
      longitudeStepDegrees,
    ),
  };
}

const metersPerLatitudeDegree = 111_320;

function getMetersPerLongitudeDegree(latitude: number) {
  const latitudeRadians = (latitude * Math.PI) / 180;

  return Math.max(
    1,
    Math.abs(Math.cos(latitudeRadians)) * metersPerLatitudeDegree,
  );
}

function roundCoordinateToPrecisionGridCenter(value: number, step: number) {
  return Number(((Math.floor(value / step) + 0.5) * step).toFixed(6));
}

export const createReportInputSchema = z
  .object({
    idempotencyKey: z.string().min(12).max(128),
    type: reportTypeSchema,
    title: z.string().min(2).max(120),
    description: z.string().min(10).max(2000),
    pet: z.object({
      name: z.string().min(1).max(80).optional(),
      species: petSpeciesSchema,
      breed: z.string().min(1).max(120).optional(),
      color: z.string().min(2).max(120),
      size: z.string().min(2).max(80).optional(),
      distinguishingTraits: z.string().max(500).optional(),
    }),
    eventOccurredAt: z.iso.datetime(),
    location: reportLocationInputSchema,
    contact: z.object({
      preference: contactPreferenceSchema,
      whatsappPhone: z.string().min(6).max(32).optional(),
    }),
    media: z.array(reportMediaInputSchema).max(5),
  })
  .superRefine((input, ctx) => {
    if (
      input.contact.preference !== "in_app_chat" &&
      !input.contact.whatsappPhone
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["contact", "whatsappPhone"],
        message: "WhatsApp contact requires a phone number.",
      });
    }

    if (input.type !== "sighting" && input.media.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["media"],
        message:
          "Lost, found, and adoption reports require at least one photo.",
      });
    }
  });

export const reportDetailInputSchema = z.object({
  id: z.string().min(1).max(128),
});

export const resourceProviderCategorySchema = z.enum([
  "veterinary",
  "shelter",
  "groomer",
  "pet_food",
  "trainer",
  "pet_store",
  "transport",
  "other",
]);

export const resourceProviderContactKindSchema = z.enum([
  "phone",
  "whatsapp",
  "website",
  "email",
  "directions",
  "social",
]);

export const localSponsorPlacementSurfaceSchema = z.enum([
  "resources_directory",
  "provider_details",
  "launch_home_banner",
  "report_success",
  "contextual_care_resources",
]);

export const resourceProviderVerificationStatusSchema = z.enum([
  "unverified",
  "verified",
]);

export const resourceProviderApproximatePublicLocationRadiusMeters = 300;

export function buildApproximatePublicResourceProviderLocation({
  exactLatitude,
  exactLongitude,
}: {
  exactLatitude: number;
  exactLongitude: number;
}) {
  const latitudeStepDegrees =
    resourceProviderApproximatePublicLocationRadiusMeters /
    metersPerLatitudeDegree;
  const longitudeStepDegrees =
    resourceProviderApproximatePublicLocationRadiusMeters /
    getMetersPerLongitudeDegree(exactLatitude);

  return {
    approximateLatitude: roundCoordinateToPrecisionGridCenter(
      exactLatitude,
      latitudeStepDegrees,
    ),
    approximateLongitude: roundCoordinateToPrecisionGridCenter(
      exactLongitude,
      longitudeStepDegrees,
    ),
  };
}

const publicResourceProviderContactOptionSchema = z.object({
  kind: resourceProviderContactKindSchema,
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(500),
});

const resourceProviderLocationInputSchema = z
  .object({
    exactLatitude: boliviaLatitudeSchema,
    exactLongitude: boliviaLongitudeSchema,
    city: z.string().min(2).max(120),
    department: z.string().min(2).max(80),
    approximateLocationLabel: z.string().min(2).max(160),
    locationCell: z.string().min(3).max(96),
    addressLabel: z.string().min(2).max(240).optional(),
  })
  .strict();

const resourceProviderLocationUpdateInputSchema = z
  .object({
    exactLatitude: boliviaLatitudeSchema.optional(),
    exactLongitude: boliviaLongitudeSchema.optional(),
    city: z.string().min(2).max(120).optional(),
    department: z.string().min(2).max(80).optional(),
    approximateLocationLabel: z.string().min(2).max(160).optional(),
    locationCell: z.string().min(3).max(96).optional(),
    addressLabel: z.string().min(2).max(240).nullable().optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    const hasExactLatitude = input.exactLatitude !== undefined;
    const hasExactLongitude = input.exactLongitude !== undefined;

    if (hasExactLatitude !== hasExactLongitude) {
      ctx.addIssue({
        code: "custom",
        path: hasExactLatitude ? ["exactLongitude"] : ["exactLatitude"],
        message: "Exact provider location updates require both coordinates.",
      });
    }

    if (Object.keys(input).length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "At least one provider location field must change.",
      });
    }
  });

const resourceProviderLinkSchema = z.object({
  label: z.string().min(1).max(80),
  url: z.url(),
});

export const createResourceProviderInputSchema = z.object({
  name: z.string().min(2).max(120),
  category: resourceProviderCategorySchema,
  description: z.string().min(10).max(500),
  shortDescription: z.string().min(10).max(1000),
  logoUrl: z.url().optional(),
  photoUrl: z.url().optional(),
  location: resourceProviderLocationInputSchema,
  serviceAreaLabel: z.string().min(2).max(160),
  hoursLabel: z.string().min(2).max(160),
  contactOptions: z
    .array(publicResourceProviderContactOptionSchema)
    .min(1)
    .max(8),
  websiteUrl: z.url().optional(),
  socialLinks: z.array(resourceProviderLinkSchema).max(6).optional(),
  externalLinks: z.array(resourceProviderLinkSchema).max(6).optional(),
  emergencyAvailable: z.boolean().default(false),
  isOpenNow: z.boolean().default(false),
});

export const updateResourceProviderInputSchema = z
  .object({
    providerId: z.uuid(),
    name: z.string().min(2).max(120).optional(),
    category: resourceProviderCategorySchema.optional(),
    description: z.string().min(10).max(500).optional(),
    shortDescription: z.string().min(10).max(1000).optional(),
    logoUrl: z.url().nullable().optional(),
    photoUrl: z.url().nullable().optional(),
    location: resourceProviderLocationUpdateInputSchema.optional(),
    serviceAreaLabel: z.string().min(2).max(160).optional(),
    hoursLabel: z.string().min(2).max(160).optional(),
    contactOptions: z
      .array(publicResourceProviderContactOptionSchema)
      .min(1)
      .max(8)
      .optional(),
    websiteUrl: z.url().nullable().optional(),
    socialLinks: z
      .array(resourceProviderLinkSchema)
      .max(6)
      .nullable()
      .optional(),
    externalLinks: z
      .array(resourceProviderLinkSchema)
      .max(6)
      .nullable()
      .optional(),
    emergencyAvailable: z.boolean().optional(),
    isOpenNow: z.boolean().optional(),
  })
  .strict()
  .refine(({ providerId: _providerId, ...patch }) => {
    return Object.keys(patch).length > 0;
  }, "At least one resource provider field must change.");

export const resourceProviderDetailInputSchema = z.object({
  providerId: z.uuid(),
});

export const nearbyResourceProvidersInputSchema = z.object({
  latitude: boliviaLatitudeSchema,
  longitude: boliviaLongitudeSchema,
  radiusMeters: z.number().int().min(500).max(100_000),
  categoryIds: z.array(resourceProviderCategorySchema).min(1).max(8).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  strategy: z.literal("postgis_radius").default("postgis_radius"),
});

export const updateResourceProviderVerificationInputSchema = z.object({
  providerId: z.uuid(),
  status: resourceProviderVerificationStatusSchema,
  note: z.string().max(1000).optional(),
});

const isoDateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date.");

export const attachLocalSponsorPlacementInputSchema = z
  .object({
    providerId: z.uuid(),
    placementId: z.uuid().optional(),
    surface: localSponsorPlacementSurfaceSchema,
    label: z.string().min(1).max(80).default("Patrocinado"),
    disclosure: z
      .string()
      .min(10)
      .max(240)
      .default("Patrocinado: apoyo local. No cambia la prioridad de reportes."),
    startsOn: isoDateOnlySchema,
    endsOn: isoDateOnlySchema,
  })
  .refine(
    (input) =>
      Date.parse(`${input.endsOn}T00:00:00.000Z`) >=
      Date.parse(`${input.startsOn}T00:00:00.000Z`),
    {
      message: "Sponsor placement end date must be on or after start date.",
      path: ["endsOn"],
    },
  );

export const detachLocalSponsorPlacementInputSchema = z.object({
  providerId: z.uuid(),
  placementId: z.uuid(),
});

export const deleteResourceProviderInputSchema = z.object({
  providerId: z.uuid(),
});

export const localSponsorPlacementPolicySchema = z.object({
  kind: z.literal("Local Sponsor Placement"),
  label: z.string().min(1).max(80),
  disclosure: z.string().min(1).max(240),
  eligibleSurfaces: z.array(localSponsorPlacementSurfaceSchema).min(1).max(5),
  safetyPolicy: z.object({
    recoveryPriority: z.object({
      label: z.literal("Recovery Priority"),
      canAffect: z.literal(false),
    }),
    pushNotifications: z.object({
      eligible: z.literal(false),
    }),
  }),
});

const publicResourceProviderApproximateLocationSchema = z.object({
  latitude: boliviaLatitudeSchema,
  longitude: boliviaLongitudeSchema,
  precision: z.literal("approximate"),
  label: z.string().min(2).max(160),
  locationCell: z.string().min(3).max(96),
});

export const publicResourceProviderSummarySchema = z.object({
  id: z.uuid(),
  name: z.string().min(2).max(120),
  categoryId: resourceProviderCategorySchema,
  description: z.string().min(10).max(500),
  approximateLocationLabel: z.string().min(2).max(160),
  approximateLocation:
    publicResourceProviderApproximateLocationSchema.optional(),
  serviceAreaLabel: z.string().min(2).max(160).optional(),
  distanceMeters: z.number().int().nonnegative().optional(),
  isVerified: z.boolean().optional(),
  sponsorPlacement: localSponsorPlacementPolicySchema.optional(),
  isOpenNow: z.boolean().optional(),
  emergencyAvailable: z.boolean().optional(),
  logoUrl: z.url().optional(),
  photoUrl: z.url().optional(),
  contactOptions: z.array(publicResourceProviderContactOptionSchema),
});

export const publicResourceProviderProfileSchema =
  publicResourceProviderSummarySchema.extend({
    serviceAreaLabel: z.string().min(2).max(160),
    hoursLabel: z.string().min(2).max(160),
    shortDescription: z.string().min(10).max(1000),
    websiteUrl: z.url().optional(),
    socialLinks: z.array(resourceProviderLinkSchema).optional(),
    externalLinks: z.array(resourceProviderLinkSchema).optional(),
  });

export const nearbyReportsInputSchema = z.object({
  latitude: boliviaLatitudeSchema,
  longitude: boliviaLongitudeSchema,
  radiusMeters: z.number().int().min(500).max(100_000),
  types: z.array(reportTypeSchema).min(1).max(4).optional(),
  statuses: z.array(reportStatusSchema).min(1).max(2).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const updateReportInputSchema = z
  .object({
    id: z.string().min(1).max(128),
    title: z.string().min(2).max(120).optional(),
    description: z.string().min(10).max(2000).optional(),
    pet: z
      .object({
        name: z.string().min(1).max(80).nullable().optional(),
        breed: z.string().min(1).max(120).nullable().optional(),
        color: z.string().min(2).max(120).optional(),
        size: z.string().min(2).max(80).nullable().optional(),
        distinguishingTraits: z.string().max(500).nullable().optional(),
      })
      .optional(),
    contact: z
      .object({
        preference: contactPreferenceSchema,
        whatsappPhone: z.string().min(6).max(32).nullable().optional(),
      })
      .optional(),
    location: reportLocationInputSchema.optional(),
    media: z.array(reportMediaInputSchema).max(5).optional(),
  })
  .refine(({ id: _id, ...patch }) => Object.keys(patch).length > 0, {
    message: "At least one report field must change.",
  });

export const resolveReportInputSchema = z.object({
  id: z.string().min(1).max(128),
  outcome: reportOutcomeSchema,
});

export const deleteReportInputSchema = z.object({
  id: z.string().min(1).max(128),
});

export type ReportType = z.infer<typeof reportTypeSchema>;
export type ReportStatus = z.infer<typeof reportStatusSchema>;
export type ReportOutcome = z.infer<typeof reportOutcomeSchema>;
export type PetSpecies = z.infer<typeof petSpeciesSchema>;
export type ContactPreference = z.infer<typeof contactPreferenceSchema>;
export type ReportMediaInput = z.infer<typeof reportMediaInputSchema>;
export type CreateUploadSessionInput = z.infer<
  typeof createUploadSessionInputSchema
>;
export type UploadSessionIdInput = z.infer<typeof uploadSessionIdInputSchema>;
export type ReportLocationInput = z.infer<typeof reportLocationInputSchema>;
export type ResourceProviderCategory = z.infer<
  typeof resourceProviderCategorySchema
>;
export type ResourceProviderContactKind = z.infer<
  typeof resourceProviderContactKindSchema
>;
export type LocalSponsorPlacementSurface = z.infer<
  typeof localSponsorPlacementSurfaceSchema
>;
export type ResourceProviderVerificationStatus = z.infer<
  typeof resourceProviderVerificationStatusSchema
>;
export type CreateResourceProviderInput = z.infer<
  typeof createResourceProviderInputSchema
>;
export type UpdateResourceProviderInput = z.infer<
  typeof updateResourceProviderInputSchema
>;
export type ResourceProviderDetailInput = z.infer<
  typeof resourceProviderDetailInputSchema
>;
export type NearbyResourceProvidersInput = z.infer<
  typeof nearbyResourceProvidersInputSchema
>;
export type UpdateResourceProviderVerificationInput = z.infer<
  typeof updateResourceProviderVerificationInputSchema
>;
export type AttachLocalSponsorPlacementInput = z.infer<
  typeof attachLocalSponsorPlacementInputSchema
>;
export type DetachLocalSponsorPlacementInput = z.infer<
  typeof detachLocalSponsorPlacementInputSchema
>;
export type DeleteResourceProviderInput = z.infer<
  typeof deleteResourceProviderInputSchema
>;
export type LocalSponsorPlacementPolicy = z.infer<
  typeof localSponsorPlacementPolicySchema
>;
export type PublicResourceProviderSummary = z.infer<
  typeof publicResourceProviderSummarySchema
>;
export type PublicResourceProviderProfile = z.infer<
  typeof publicResourceProviderProfileSchema
>;
export type CreateReportInput = z.infer<typeof createReportInputSchema>;
export type ReportDetailInput = z.infer<typeof reportDetailInputSchema>;
export type NearbyReportsInput = z.infer<typeof nearbyReportsInputSchema>;
export type UpdateReportInput = z.infer<typeof updateReportInputSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportInputSchema>;
export type DeleteReportInput = z.infer<typeof deleteReportInputSchema>;

export interface PublicLostReportShareTargetInput {
  publicWebBaseUrl: string;
  reportId: string;
  title: string;
}

export interface PublicLostReportShareTarget {
  appDeepLink: string;
  message: string;
  path: string;
  title: string;
  webUrl: string;
}

export interface PublicAdoptionListingShareTargetInput {
  listingId: string;
  publicWebBaseUrl: string;
  title: string;
}

export interface PublicAdoptionListingShareTarget {
  appDeepLink: string;
  message: string;
  path: string;
  title: string;
  webUrl: string;
}

const publicAdoptionListingPathPrefix = "/adopciones";
const publicLostReportPathPrefix = "/reportes/perdidos";

export function publicAdoptionListingPathForId(listingId: string) {
  return `${publicAdoptionListingPathPrefix}/${encodeURIComponent(listingId)}`;
}

export function publicLostReportPathForId(reportId: string) {
  return `${publicLostReportPathPrefix}/${encodeURIComponent(reportId)}`;
}

export function buildPublicAdoptionListingShareTarget({
  listingId,
  publicWebBaseUrl,
  title,
}: PublicAdoptionListingShareTargetInput): PublicAdoptionListingShareTarget {
  const path = publicAdoptionListingPathForId(listingId);
  const webUrl = `${publicWebBaseUrl.replace(/\/+$/, "")}${path}`;
  const shareTitle = `Mascota en adopcion: ${title}`;

  return {
    appDeepLink: `rastro://${path.replace(/^\//, "")}`,
    message: `Conoce a ${title} en adopcion en Rastro: ${webUrl}`,
    path,
    title: shareTitle,
    webUrl,
  };
}

export function buildPublicLostReportShareTarget({
  publicWebBaseUrl,
  reportId,
  title,
}: PublicLostReportShareTargetInput): PublicLostReportShareTarget {
  const path = publicLostReportPathForId(reportId);
  const webUrl = `${publicWebBaseUrl.replace(/\/+$/, "")}${path}`;
  const shareTitle = `Mascota perdida: ${title}`;

  return {
    appDeepLink: `rastro://${path.replace(/^\//, "")}`,
    message: `Ayuda a encontrar a ${title} en Rastro: ${webUrl}`,
    path,
    title: shareTitle,
    webUrl,
  };
}
