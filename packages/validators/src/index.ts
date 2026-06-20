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

export const reportStatusSchema = z.enum(["active", "closed"]);

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
  objectKey: z.string().min(1).max(512),
  canonicalUrl: z.url().optional(),
  thumbnailObjectKey: z.string().min(1).max(512).optional(),
  mimeType: z.string().regex(/^image\/(jpeg|png|webp|heic|heif)$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  altText: z.string().max(240).optional(),
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
export type ReportLocationInput = z.infer<typeof reportLocationInputSchema>;
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
