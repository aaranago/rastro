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

export const alertSubscriptionCategorySchema = z.enum(["lost_pet"]);

export const alertPushTokenPlatformSchema = z.enum([
  "ios",
  "android",
  "web",
  "unknown",
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

export const adminMediaAssetPurposeSchema = z.enum([
  "provider_logo",
  "provider_photo",
  "sponsor_logo",
  "sponsor_image",
]);

export const adminMediaAssetStatusSchema = z.enum([
  "pending",
  "ready",
  "failed",
  "removed",
]);

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

export const createAdminMediaUploadSessionInputSchema = z.object({
  checksumSha256: z.string().min(8).max(128).optional(),
  height: z.number().int().positive(),
  mimeType: imageMimeTypeSchema,
  purpose: adminMediaAssetPurposeSchema,
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive(),
});

export const adminMediaAssetIdInputSchema = z.object({
  assetId: z.uuid(),
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

export const openReportChatConversationInputSchema = z
  .object({
    reportId: z.string().min(1).max(128),
  })
  .strict();

export const chatConversationIdInputSchema = z
  .object({
    conversationId: z.uuid(),
  })
  .strict();

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

export const moderationReportReasonSchema = z.enum([
  "spam",
  "scam",
  "incorrect_location",
  "offensive_content",
  "animal_cruelty",
  "stolen_pet_concern",
  "impersonation",
  "other",
]);

export const sendChatMessageInputSchema = z
  .object({
    conversationId: z.uuid(),
    text: z.string().trim().min(1).max(1000),
  })
  .strict();

export const blockChatMemberInputSchema = z
  .object({
    conversationId: z.uuid(),
    blockedMemberId: z.string().min(1).max(256),
  })
  .strict();

export const reportChatConversationInputSchema = z
  .object({
    conversationId: z.uuid(),
    reason: moderationReportReasonSchema.optional(),
    note: z.string().trim().min(10).max(1000).optional(),
  })
  .strict();

export const alertGetInputSchema = z.object({}).strict();

export const alertUpsertSettingsInputSchema = z
  .object({
    categories: z
      .array(alertSubscriptionCategorySchema)
      .min(1)
      .max(1)
      .default(["lost_pet"]),
    radiusMeters: z.number().int().min(500).max(100_000),
  })
  .strict();

export const alertRecordLocationInputSchema = z
  .object({
    latitude: boliviaLatitudeSchema,
    longitude: boliviaLongitudeSchema,
    label: z.string().trim().min(2).max(160).optional(),
    locationCell: z.string().trim().min(3).max(96).optional(),
  })
  .strict();

export const alertPauseInputSchema = z
  .object({
    pausedUntil: z.iso.datetime(),
  })
  .strict();

export const alertUnsubscribeInputSchema = z.object({}).strict();

const expoPushTokenSchema = z
  .string()
  .trim()
  .min(20)
  .max(512)
  .regex(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/);

export const alertRegisterPushTokenInputSchema = z
  .object({
    token: expoPushTokenSchema,
    platform: alertPushTokenPlatformSchema.default("unknown"),
    deviceId: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

const isoDateTimeOutputSchema = z.iso.datetime();

export const alertSubscriptionOutputSchema = z.object({
  id: z.uuid(),
  categories: z.array(alertSubscriptionCategorySchema).min(1),
  radiusMeters: z.number().int().min(500).max(100_000),
  location: z
    .object({
      latitude: boliviaLatitudeSchema,
      longitude: boliviaLongitudeSchema,
      label: z.string().min(2).max(160).nullable(),
      locationCell: z.string().min(3).max(96).nullable(),
      recordedAt: isoDateTimeOutputSchema,
    })
    .nullable(),
  pausedUntil: isoDateTimeOutputSchema.nullable(),
  unsubscribedAt: isoDateTimeOutputSchema.nullable(),
  status: z.enum(["active", "paused", "unsubscribed", "needs_location"]),
  createdAt: isoDateTimeOutputSchema,
  updatedAt: isoDateTimeOutputSchema,
});

export const alertPushTokenOutputSchema = z.object({
  id: z.uuid(),
  token: z.string().min(1).max(512),
  platform: alertPushTokenPlatformSchema,
  deviceId: z.string().min(1).max(128).nullable(),
  registeredAt: isoDateTimeOutputSchema,
  lastSeenAt: isoDateTimeOutputSchema,
  disabledAt: isoDateTimeOutputSchema.nullable(),
});

export const alertNotificationDeliveryOutputSchema = z.object({
  id: z.uuid(),
  subscriptionId: z.uuid(),
  reportId: z.uuid(),
  pushTokenId: z.uuid().nullable(),
  status: z.enum(["pending", "sent", "failed", "skipped"]),
  title: z.string().min(1).max(160),
  body: z.string().min(1),
  deepLink: z.string().min(1),
  matchedAt: isoDateTimeOutputSchema,
  sentAt: isoDateTimeOutputSchema.nullable(),
  failedAt: isoDateTimeOutputSchema.nullable(),
  failureReason: z.string().min(1).nullable(),
  createdAt: isoDateTimeOutputSchema,
});

export const alertGetOutputSchema = z.object({
  subscription: alertSubscriptionOutputSchema.nullable(),
  pushTokens: z.array(alertPushTokenOutputSchema),
});

export const alertUpsertSettingsOutputSchema = alertSubscriptionOutputSchema;
export const alertRecordLocationOutputSchema = alertSubscriptionOutputSchema;
export const alertPauseOutputSchema = alertSubscriptionOutputSchema;
export const alertUnsubscribeOutputSchema = alertSubscriptionOutputSchema;
export const alertRegisterPushTokenOutputSchema = alertPushTokenOutputSchema;

export const activityInboxInputSchema = z
  .object({
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict();

const activityChatSubjectOutputSchema = z.object({
  href: z.string().min(1),
  id: z.string().min(1).max(128),
  kind: z.enum([
    "adoption-listing",
    "found-pet-report",
    "lost-pet-report",
    "sighting-report",
  ]),
  subtitle: z.string().min(1).max(240),
  title: z.string().min(1).max(240),
});

const activityChatParticipantOutputSchema = z.object({
  displayName: z.string().min(1).max(240),
  memberId: z.string().min(1).max(256),
});

const activityChatMessageSummaryOutputSchema = z.object({
  createdAt: isoDateTimeOutputSchema,
  id: z.string().min(1).max(128),
  senderMemberId: z.string().min(1).max(256),
  text: z.string().min(1).max(1000),
});

export const activityInboxAlertDeliveryItemOutputSchema = z
  .object({
    type: z.literal("alert_delivery"),
    id: z.string().min(1).max(160),
    occurredAt: isoDateTimeOutputSchema,
    delivery: alertNotificationDeliveryOutputSchema,
  })
  .strict();

export const activityInboxChatConversationItemOutputSchema = z
  .object({
    type: z.literal("chat_conversation"),
    id: z.string().min(1).max(160),
    occurredAt: isoDateTimeOutputSchema,
    conversation: z.object({
      href: z.string().min(1),
      id: z.uuid(),
      latestMessage: activityChatMessageSummaryOutputSchema.nullable(),
      otherParticipant: activityChatParticipantOutputSchema,
      subject: activityChatSubjectOutputSchema,
      updatedAt: isoDateTimeOutputSchema,
    }),
  })
  .strict();

export const activityInboxItemOutputSchema = z.discriminatedUnion("type", [
  activityInboxAlertDeliveryItemOutputSchema,
  activityInboxChatConversationItemOutputSchema,
]);

export const activityInboxOutputSchema = z
  .object({
    items: z.array(activityInboxItemOutputSchema),
  })
  .strict();

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
  logoAssetId: z.uuid().optional(),
  logoUrl: z.url().optional(),
  photoAssetId: z.uuid().optional(),
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
    logoAssetId: z.uuid().nullable().optional(),
    logoUrl: z.url().nullable().optional(),
    photoAssetId: z.uuid().nullable().optional(),
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

export const createResourceProviderReportInputSchema = z
  .object({
    providerId: z.uuid(),
    reason: moderationReportReasonSchema,
    detail: z.string().trim().min(10).max(1000),
  })
  .strict();

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

const localSponsorPlacementDateWindowSchema = z
  .object({
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

const localSponsorPlacementFieldsSchema = z.object({
  surface: localSponsorPlacementSurfaceSchema,
  label: z.string().min(1).max(80).default("Patrocinado"),
  disclosure: z
    .string()
    .min(10)
    .max(240)
    .default("Patrocinado: apoyo local. No cambia la prioridad de reportes."),
  logoAssetId: z.uuid().nullable().optional(),
  logoUrl: z.url().nullable().optional(),
  imageAssetId: z.uuid().nullable().optional(),
  imageUrl: z.url().nullable().optional(),
});

export const attachLocalSponsorPlacementInputSchema =
  localSponsorPlacementFieldsSchema
    .extend({
      providerId: z.uuid(),
      placementId: z.uuid().optional(),
    })
    .and(localSponsorPlacementDateWindowSchema);

export const updateLocalSponsorPlacementInputSchema =
  localSponsorPlacementFieldsSchema
    .extend({
      providerId: z.uuid(),
      placementId: z.uuid(),
    })
    .and(localSponsorPlacementDateWindowSchema);

export const detachLocalSponsorPlacementInputSchema = z.object({
  providerId: z.uuid(),
  placementId: z.uuid(),
});

export const deleteResourceProviderInputSchema = z.object({
  providerId: z.uuid(),
});

export function createAdminListBaseInputSchema() {
  return z.object({
    page: z.number().int().min(1).optional(),
    pageSize: z.number().int().min(1).max(100).optional(),
    search: z.string().trim().max(160).optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
  });
}

const adminListBaseInputSchema = createAdminListBaseInputSchema().strict();

export const adminResourceProviderSortBySchema = z.enum([
  "category",
  "city",
  "department",
  "mediaState",
  "name",
  "sponsorState",
  "updatedAt",
  "verification",
]);

export const adminSponsorPlacementSortBySchema = z.enum([
  "city",
  "department",
  "endsOn",
  "mediaState",
  "providerName",
  "startsOn",
  "state",
  "surface",
]);

export const adminResourceProviderSponsorStateSchema = z.enum([
  "any",
  "active",
  "inactive",
  "none",
]);

export const adminSponsorPlacementStateSchema = z.enum([
  "any",
  "active",
  "expired",
  "scheduled",
]);

export const adminResourceProviderMediaStateSchema = z.enum([
  "any",
  "has_media",
  "missing_media",
]);

export const adminResourceProviderListInputSchema = adminListBaseInputSchema
  .extend({
    filters: z
      .object({
        activeOn: isoDateOnlySchema.optional(),
        category: z.array(resourceProviderCategorySchema).max(8).optional(),
        city: z.string().trim().min(1).max(120).optional(),
        department: z.string().trim().min(1).max(80).optional(),
        mediaState: adminResourceProviderMediaStateSchema.optional(),
        sponsorState: adminResourceProviderSponsorStateSchema.optional(),
        sponsorSurface: z
          .array(localSponsorPlacementSurfaceSchema)
          .max(5)
          .optional(),
        verification: z
          .array(resourceProviderVerificationStatusSchema)
          .max(2)
          .optional(),
      })
      .strict()
      .optional(),
    sortBy: adminResourceProviderSortBySchema.optional(),
  })
  .strict();

export const adminSponsorPlacementListInputSchema = adminListBaseInputSchema
  .extend({
    filters: z
      .object({
        activeOn: isoDateOnlySchema.optional(),
        category: z.array(resourceProviderCategorySchema).max(8).optional(),
        city: z.string().trim().min(1).max(120).optional(),
        department: z.string().trim().min(1).max(80).optional(),
        endsFrom: isoDateOnlySchema.optional(),
        endsTo: isoDateOnlySchema.optional(),
        mediaState: adminResourceProviderMediaStateSchema.optional(),
        startsFrom: isoDateOnlySchema.optional(),
        startsTo: isoDateOnlySchema.optional(),
        state: adminSponsorPlacementStateSchema.optional(),
        surface: z.array(localSponsorPlacementSurfaceSchema).max(5).optional(),
        verification: z
          .array(resourceProviderVerificationStatusSchema)
          .max(2)
          .optional(),
      })
      .strict()
      .optional(),
    sortBy: adminSponsorPlacementSortBySchema.optional(),
  })
  .strict();

export const localSponsorPlacementPolicySchema = z.object({
  kind: z.literal("Local Sponsor Placement"),
  label: z.string().min(1).max(80),
  disclosure: z.string().min(1).max(240),
  logoUrl: z.url().optional(),
  imageUrl: z.url().optional(),
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
export type AlertSubscriptionCategory = z.infer<
  typeof alertSubscriptionCategorySchema
>;
export type AlertPushTokenPlatform = z.infer<
  typeof alertPushTokenPlatformSchema
>;
export type ContactPreference = z.infer<typeof contactPreferenceSchema>;
export type ReportMediaInput = z.infer<typeof reportMediaInputSchema>;
export type CreateUploadSessionInput = z.infer<
  typeof createUploadSessionInputSchema
>;
export type UploadSessionIdInput = z.infer<typeof uploadSessionIdInputSchema>;
export type AdminMediaAssetPurpose = z.infer<
  typeof adminMediaAssetPurposeSchema
>;
export type AdminMediaAssetStatus = z.infer<typeof adminMediaAssetStatusSchema>;
export type CreateAdminMediaUploadSessionInput = z.infer<
  typeof createAdminMediaUploadSessionInputSchema
>;
export type AdminMediaAssetIdInput = z.infer<
  typeof adminMediaAssetIdInputSchema
>;
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
export type ModerationReportReason = z.infer<
  typeof moderationReportReasonSchema
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
export type CreateResourceProviderReportInput = z.infer<
  typeof createResourceProviderReportInputSchema
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
export type UpdateLocalSponsorPlacementInput = z.infer<
  typeof updateLocalSponsorPlacementInputSchema
>;
export type DetachLocalSponsorPlacementInput = z.infer<
  typeof detachLocalSponsorPlacementInputSchema
>;
export type DeleteResourceProviderInput = z.infer<
  typeof deleteResourceProviderInputSchema
>;
export type AdminResourceProviderSortBy = z.infer<
  typeof adminResourceProviderSortBySchema
>;
export type AdminSponsorPlacementSortBy = z.infer<
  typeof adminSponsorPlacementSortBySchema
>;
export type AdminResourceProviderSponsorState = z.infer<
  typeof adminResourceProviderSponsorStateSchema
>;
export type AdminSponsorPlacementState = z.infer<
  typeof adminSponsorPlacementStateSchema
>;
export type AdminResourceProviderMediaState = z.infer<
  typeof adminResourceProviderMediaStateSchema
>;
export type AdminResourceProviderListInput = z.infer<
  typeof adminResourceProviderListInputSchema
>;
export type AdminResourceProviderListFilters = NonNullable<
  AdminResourceProviderListInput["filters"]
>;
export type AdminSponsorPlacementListInput = z.infer<
  typeof adminSponsorPlacementListInputSchema
>;
export type AdminSponsorPlacementListFilters = NonNullable<
  AdminSponsorPlacementListInput["filters"]
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
export type OpenReportChatConversationInput = z.infer<
  typeof openReportChatConversationInputSchema
>;
export type ChatConversationIdInput = z.infer<
  typeof chatConversationIdInputSchema
>;
export type SendChatMessageInput = z.infer<typeof sendChatMessageInputSchema>;
export type BlockChatMemberInput = z.infer<typeof blockChatMemberInputSchema>;
export type ReportChatConversationInput = z.infer<
  typeof reportChatConversationInputSchema
>;
export type AlertGetInput = z.infer<typeof alertGetInputSchema>;
export type AlertUpsertSettingsInput = z.infer<
  typeof alertUpsertSettingsInputSchema
>;
export type AlertRecordLocationInput = z.infer<
  typeof alertRecordLocationInputSchema
>;
export type AlertPauseInput = z.infer<typeof alertPauseInputSchema>;
export type AlertUnsubscribeInput = z.infer<typeof alertUnsubscribeInputSchema>;
export type AlertRegisterPushTokenInput = z.infer<
  typeof alertRegisterPushTokenInputSchema
>;
export type AlertSubscriptionOutput = z.infer<
  typeof alertSubscriptionOutputSchema
>;
export type AlertPushTokenOutput = z.infer<typeof alertPushTokenOutputSchema>;
export type AlertNotificationDeliveryOutput = z.infer<
  typeof alertNotificationDeliveryOutputSchema
>;
export type AlertGetOutput = z.infer<typeof alertGetOutputSchema>;
export type ActivityInboxInput = z.infer<typeof activityInboxInputSchema>;
export type ActivityInboxAlertDeliveryItemOutput = z.infer<
  typeof activityInboxAlertDeliveryItemOutputSchema
>;
export type ActivityInboxChatConversationItemOutput = z.infer<
  typeof activityInboxChatConversationItemOutputSchema
>;
export type ActivityInboxItemOutput = z.infer<
  typeof activityInboxItemOutputSchema
>;
export type ActivityInboxOutput = z.infer<typeof activityInboxOutputSchema>;

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
