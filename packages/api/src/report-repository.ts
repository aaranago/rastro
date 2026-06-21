import type { Database } from "@acme/db/client";
import type {
  ContactPreference,
  CreateReportInput,
  DeleteReportInput,
  NearbyReportsInput,
  PetSpecies,
  ReportOutcome,
  ReportStatus,
  ReportType,
  ResolveReportInput,
  UpdateReportInput,
} from "@acme/validators";
import { and, asc, eq, inArray, isNull, notInArray, or, sql } from "@acme/db";
import {
  Report,
  ReportLifecycleEvent,
  ReportLocation,
  ReportMedia,
} from "@acme/db/schema";

export type PublicLocationPrecision = "exact" | "approximate";

export interface PersistedReportLocation {
  exactLatitude: number;
  exactLongitude: number;
  publicLatitude: number;
  publicLongitude: number;
  precision: PublicLocationPrecision;
  label: string;
  locationCell: string;
}

export interface PersistedReportMedia {
  id: string;
  objectKey: string;
  canonicalUrl: string | null;
  thumbnailObjectKey: string | null;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  altText: string | null;
  position: number;
}

export interface PersistedReport {
  id: string;
  caretakerId: string;
  idempotencyKey: string;
  type: ReportType;
  status: ReportStatus;
  outcome: ReportOutcome | null;
  title: string;
  description: string;
  petName: string | null;
  species: PetSpecies;
  breed: string | null;
  color: string;
  size: string | null;
  distinguishingTraits: string | null;
  eventOccurredAt: Date;
  contactPreference: ContactPreference;
  whatsappPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  deletedAt: Date | null;
  location: PersistedReportLocation;
  media: PersistedReportMedia[];
}

export interface ReportRepository {
  findById(id: string): Promise<PersistedReport | null>;
  findByCaretakerAndIdempotencyKey(input: {
    caretakerId: string;
    idempotencyKey: string;
  }): Promise<PersistedReport | null>;
  create(input: {
    caretakerId: string;
    report: CreateReportInput;
  }): Promise<PersistedReport>;
  nearby(input: NearbyReportsInput): Promise<PersistedReport[]>;
  update(input: {
    actorId: string;
    reportId: string;
    patch: UpdateReportInput;
  }): Promise<PersistedReport>;
  resolve(input: {
    reportId: string;
    outcome: ResolveReportInput["outcome"];
    actorId: string;
  }): Promise<PersistedReport>;
  delete(input: {
    reportId: DeleteReportInput["id"];
    actorId: string;
  }): Promise<{ id: string; deleted: true }>;
}

type ReportRow = typeof Report.$inferSelect & {
  location: typeof ReportLocation.$inferSelect | null;
  media: (typeof ReportMedia.$inferSelect)[];
};

export function buildNearbyReportsOrigin(input: NearbyReportsInput) {
  return sql`ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326)`;
}

export function buildNearbyReportsCondition(input: NearbyReportsInput) {
  return sql`ST_DWithin(${ReportLocation.exactPoint}::geography, ${buildNearbyReportsOrigin(input)}::geography, ${input.radiusMeters})`;
}

export function buildNearbyReportsDistance(input: NearbyReportsInput) {
  return sql<number>`ST_Distance(${ReportLocation.exactPoint}::geography, ${buildNearbyReportsOrigin(input)}::geography)`;
}

function publicLocationFromInput(
  location: CreateReportInput["location"],
): Pick<
  PersistedReportLocation,
  "publicLatitude" | "publicLongitude" | "precision"
> {
  if (location.exposeExactLocation) {
    return {
      precision: "exact",
      publicLatitude: location.exactLatitude,
      publicLongitude: location.exactLongitude,
    };
  }

  return {
    precision: "approximate",
    publicLatitude:
      location.approximateLatitude ??
      Math.round(location.exactLatitude * 100) / 100,
    publicLongitude:
      location.approximateLongitude ??
      Math.round(location.exactLongitude * 100) / 100,
  };
}

function toPersistedReport(row: ReportRow): PersistedReport {
  if (!row.location) {
    throw new Error(`Report ${row.id} is missing its location row.`);
  }

  return {
    id: row.id,
    caretakerId: row.caretakerId,
    idempotencyKey: row.idempotencyKey,
    type: row.type,
    status: row.status,
    outcome: row.outcome,
    title: row.title,
    description: row.description,
    petName: row.petName,
    species: row.species,
    breed: row.breed,
    color: row.color,
    size: row.size,
    distinguishingTraits: row.distinguishingTraits,
    eventOccurredAt: row.eventOccurredAt,
    contactPreference: row.contactPreference,
    whatsappPhone: row.whatsappPhone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    resolvedAt: row.resolvedAt,
    deletedAt: row.deletedAt,
    location: {
      exactLatitude: row.location.exactLatitude,
      exactLongitude: row.location.exactLongitude,
      publicLatitude: row.location.publicLatitude,
      publicLongitude: row.location.publicLongitude,
      precision: row.location.publicPrecision,
      label: row.location.label,
      locationCell: row.location.locationCell,
    },
    media: row.media.map((media) => ({
      id: media.id,
      objectKey: media.objectKey,
      canonicalUrl: media.canonicalUrl,
      thumbnailObjectKey: media.thumbnailObjectKey,
      mimeType: media.mimeType,
      width: media.width,
      height: media.height,
      sizeBytes: media.sizeBytes,
      altText: media.altText,
      position: media.position ?? 0,
    })),
  };
}

type ReportPatch = Partial<
  Pick<
    typeof Report.$inferInsert,
    | "breed"
    | "color"
    | "contactPreference"
    | "description"
    | "distinguishingTraits"
    | "petName"
    | "size"
    | "title"
    | "whatsappPhone"
  >
>;

function assignIfDefined<TKey extends keyof ReportPatch>(
  patch: ReportPatch,
  key: TKey,
  value: ReportPatch[TKey] | undefined,
) {
  if (value !== undefined) {
    patch[key] = value;
  }
}

function reportPatchFromInput(input: UpdateReportInput) {
  const patch: ReportPatch = {};

  assignIfDefined(patch, "title", input.title);
  assignIfDefined(patch, "description", input.description);
  assignIfDefined(patch, "petName", input.pet?.name);
  assignIfDefined(patch, "breed", input.pet?.breed);
  assignIfDefined(patch, "color", input.pet?.color);
  assignIfDefined(patch, "size", input.pet?.size);
  assignIfDefined(
    patch,
    "distinguishingTraits",
    input.pet?.distinguishingTraits,
  );
  assignIfDefined(patch, "contactPreference", input.contact?.preference);
  assignIfDefined(patch, "whatsappPhone", input.contact?.whatsappPhone);

  return patch;
}

export function createDrizzleReportRepository(db: Database): ReportRepository {
  const findById: ReportRepository["findById"] = async (id) => {
    const row = await db.query.Report.findFirst({
      where: eq(Report.id, id),
      with: {
        location: true,
        media: {
          orderBy: asc(ReportMedia.position),
          where: eq(ReportMedia.status, "ready"),
        },
      },
    });

    return row ? toPersistedReport(row) : null;
  };

  const repository: ReportRepository = {
    findById,
    findByCaretakerAndIdempotencyKey: async ({
      caretakerId,
      idempotencyKey,
    }) => {
      const row = await db.query.Report.findFirst({
        where: and(
          eq(Report.caretakerId, caretakerId),
          eq(Report.idempotencyKey, idempotencyKey),
        ),
        with: {
          location: true,
          media: {
            orderBy: asc(ReportMedia.position),
            where: eq(ReportMedia.status, "ready"),
          },
        },
      });

      return row ? toPersistedReport(row) : null;
    },
    create: async ({ caretakerId, report }) => {
      const existing = await repository.findByCaretakerAndIdempotencyKey({
        caretakerId,
        idempotencyKey: report.idempotencyKey,
      });

      if (existing) {
        return existing;
      }

      const created = await db.transaction(async (tx) => {
        const [createdReport] = await tx
          .insert(Report)
          .values({
            caretakerId,
            color: report.pet.color,
            contactPreference: report.contact.preference,
            description: report.description,
            distinguishingTraits: report.pet.distinguishingTraits ?? null,
            eventOccurredAt: new Date(report.eventOccurredAt),
            idempotencyKey: report.idempotencyKey,
            petName: report.pet.name ?? null,
            species: report.pet.species,
            breed: report.pet.breed ?? null,
            size: report.pet.size ?? null,
            title: report.title,
            type: report.type,
            whatsappPhone: report.contact.whatsappPhone ?? null,
          })
          .onConflictDoNothing({
            target: [Report.caretakerId, Report.idempotencyKey],
          })
          .returning({ id: Report.id });

        if (!createdReport) {
          return null;
        }

        const persisted = createdReport;
        const publicLocation = publicLocationFromInput(report.location);

        await tx.insert(ReportLocation).values({
          exactLatitude: report.location.exactLatitude,
          exactLongitude: report.location.exactLongitude,
          exactPoint: {
            x: report.location.exactLongitude,
            y: report.location.exactLatitude,
          },
          label: report.location.label,
          locationCell: report.location.locationCell,
          publicLatitude: publicLocation.publicLatitude,
          publicLongitude: publicLocation.publicLongitude,
          publicPoint: {
            x: publicLocation.publicLongitude,
            y: publicLocation.publicLatitude,
          },
          publicPrecision: publicLocation.precision,
          reportId: persisted.id,
        });

        for (const [index, media] of report.media.entries()) {
          const [attachedMedia] = await tx
            .update(ReportMedia)
            .set({
              altText: media.altText ?? null,
              position: index,
              reportId: persisted.id,
              status: "ready",
            })
            .where(
              and(
                eq(ReportMedia.id, media.mediaId),
                eq(ReportMedia.ownerId, caretakerId),
                eq(ReportMedia.uploadDraftId, report.idempotencyKey),
                eq(ReportMedia.uploadReportType, report.type),
                eq(ReportMedia.status, "ready"),
                isNull(ReportMedia.reportId),
              ),
            )
            .returning({ id: ReportMedia.id });

          if (!attachedMedia) {
            throw new Error("Report media must be ready and owned by member.");
          }
        }

        await tx.insert(ReportLifecycleEvent).values({
          actorId: caretakerId,
          reportId: persisted.id,
          toStatus: "active",
          type: "created",
        });

        return persisted;
      });

      if (!created) {
        const duplicate = await repository.findByCaretakerAndIdempotencyKey({
          caretakerId,
          idempotencyKey: report.idempotencyKey,
        });

        if (!duplicate) {
          throw new Error("Duplicate report could not be reloaded.");
        }

        return duplicate;
      }

      const persistedReport = await repository.findById(created.id);
      if (!persistedReport) {
        throw new Error("Created report could not be reloaded.");
      }
      return persistedReport;
    },
    nearby: async (input) => {
      const filters = [
        isNull(Report.deletedAt),
        buildNearbyReportsCondition(input),
        input.statuses
          ? inArray(Report.status, input.statuses)
          : eq(Report.status, "active"),
        input.types ? inArray(Report.type, input.types) : undefined,
      ].filter((filter) => filter !== undefined);
      const distance = buildNearbyReportsDistance(input);
      const rows = await db
        .select({
          distanceMeters: distance,
          id: Report.id,
        })
        .from(Report)
        .innerJoin(ReportLocation, eq(ReportLocation.reportId, Report.id))
        .where(and(...filters))
        .orderBy(distance)
        .limit(input.limit);
      const reports = await Promise.all(
        rows.map((row) => repository.findById(row.id)),
      );

      return reports.filter((report) => report !== null);
    },
    update: async ({ actorId, reportId, patch }) => {
      await db.transaction(async (tx) => {
        const reportPatch = reportPatchFromInput(patch);

        if (Object.keys(reportPatch).length > 0) {
          await tx
            .update(Report)
            .set(reportPatch)
            .where(eq(Report.id, reportId));
        }

        if (patch.location) {
          const publicLocation = publicLocationFromInput(patch.location);
          await tx
            .update(ReportLocation)
            .set({
              exactLatitude: patch.location.exactLatitude,
              exactLongitude: patch.location.exactLongitude,
              exactPoint: {
                x: patch.location.exactLongitude,
                y: patch.location.exactLatitude,
              },
              label: patch.location.label,
              locationCell: patch.location.locationCell,
              publicLatitude: publicLocation.publicLatitude,
              publicLongitude: publicLocation.publicLongitude,
              publicPoint: {
                x: publicLocation.publicLongitude,
                y: publicLocation.publicLatitude,
              },
              publicPrecision: publicLocation.precision,
            })
            .where(eq(ReportLocation.reportId, reportId));
        }

        if (patch.media) {
          const [reportContext] = await tx
            .select({ type: Report.type })
            .from(Report)
            .where(eq(Report.id, reportId))
            .limit(1);

          if (!reportContext) {
            throw new Error("Report could not be found for media update.");
          }

          const replacementMediaIds = patch.media.map((media) => media.mediaId);
          const removalFilters = [
            eq(ReportMedia.reportId, reportId),
            eq(ReportMedia.status, "ready"),
            replacementMediaIds.length > 0
              ? notInArray(ReportMedia.id, replacementMediaIds)
              : undefined,
          ].filter((filter) => filter !== undefined);

          await tx
            .update(ReportMedia)
            .set({
              removedAt: new Date(),
              status: "removed",
            })
            .where(and(...removalFilters));

          for (const [index, media] of patch.media.entries()) {
            const [attachedMedia] = await tx
              .update(ReportMedia)
              .set({
                altText: media.altText ?? null,
                position: index,
                reportId,
                removedAt: null,
                status: "ready",
              })
              .where(
                and(
                  eq(ReportMedia.id, media.mediaId),
                  eq(ReportMedia.ownerId, actorId),
                  eq(ReportMedia.status, "ready"),
                  or(
                    eq(ReportMedia.reportId, reportId),
                    and(
                      isNull(ReportMedia.reportId),
                      eq(ReportMedia.uploadDraftId, reportId),
                      eq(ReportMedia.uploadReportType, reportContext.type),
                    ),
                  ),
                ),
              )
              .returning({ id: ReportMedia.id });

            if (!attachedMedia) {
              throw new Error(
                "Report media must be ready and owned by member.",
              );
            }
          }
        }

        await tx.insert(ReportLifecycleEvent).values({
          actorId,
          reportId,
          type: "updated",
        });
      });

      const updatedReport = await repository.findById(reportId);
      if (!updatedReport) {
        throw new Error("Updated report could not be reloaded.");
      }
      return updatedReport;
    },
    resolve: async ({ reportId, outcome, actorId }) => {
      await db.transaction(async (tx) => {
        await tx
          .update(Report)
          .set({
            outcome,
            resolvedAt: new Date(),
            status: "closed",
          })
          .where(eq(Report.id, reportId));
        await tx.insert(ReportLifecycleEvent).values({
          actorId,
          fromStatus: "active",
          outcome,
          reportId,
          toStatus: "closed",
          type: "resolved",
        });
      });

      const resolvedReport = await repository.findById(reportId);
      if (!resolvedReport) {
        throw new Error("Resolved report could not be reloaded.");
      }
      return resolvedReport;
    },
    delete: async ({ reportId, actorId }) => {
      await db.transaction(async (tx) => {
        await tx
          .update(Report)
          .set({
            deletedAt: new Date(),
            outcome: "inactive",
            status: "closed",
          })
          .where(eq(Report.id, reportId));
        await tx.insert(ReportLifecycleEvent).values({
          actorId,
          fromStatus: "active",
          outcome: "inactive",
          reportId,
          toStatus: "closed",
          type: "deleted",
        });
      });

      return { id: reportId, deleted: true };
    },
  };

  return repository;
}

export interface PublicReport {
  id: string;
  type: ReportType;
  status: ReportStatus;
  outcome: ReportOutcome | null;
  title: string;
  description: string;
  pet: {
    name: string | null;
    species: PetSpecies;
    breed: string | null;
    color: string;
    size: string | null;
    distinguishingTraits: string | null;
  };
  eventOccurredAt: Date;
  contact: {
    preference: ContactPreference;
    hasWhatsapp: boolean;
  };
  location: {
    latitude: number;
    longitude: number;
    precision: PublicLocationPrecision;
    label: string;
    locationCell: string;
  };
  media: {
    id: string;
    objectKey: string;
    canonicalUrl: string | null;
    thumbnailObjectKey: string | null;
    mimeType: string;
    width: number;
    height: number;
    sizeBytes: number;
    altText: string | null;
    position: number;
  }[];
  owner: {
    isCurrentMember: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

export function toPublicReport(
  report: PersistedReport,
  currentMemberId: string | null,
): PublicReport {
  return {
    id: report.id,
    type: report.type,
    status: report.status,
    outcome: report.outcome,
    title: report.title,
    description: report.description,
    pet: {
      name: report.petName,
      species: report.species,
      breed: report.breed,
      color: report.color,
      size: report.size,
      distinguishingTraits: report.distinguishingTraits,
    },
    eventOccurredAt: report.eventOccurredAt,
    contact: {
      preference: report.contactPreference,
      hasWhatsapp: report.whatsappPhone !== null,
    },
    location: {
      latitude: report.location.publicLatitude,
      longitude: report.location.publicLongitude,
      precision: report.location.precision,
      label: report.location.label,
      locationCell: report.location.locationCell,
    },
    media: report.media.map((media) => ({
      id: media.id,
      objectKey: media.objectKey,
      canonicalUrl: media.canonicalUrl,
      thumbnailObjectKey: media.thumbnailObjectKey,
      mimeType: media.mimeType,
      width: media.width,
      height: media.height,
      sizeBytes: media.sizeBytes,
      altText: media.altText,
      position: media.position,
    })),
    owner: {
      isCurrentMember: currentMemberId === report.caretakerId,
    },
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    resolvedAt: report.resolvedAt,
  };
}
