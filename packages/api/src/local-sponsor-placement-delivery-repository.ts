import type { Database } from "@acme/db/client";
import type {
  LocalSponsorPlacementDeliveryEventType,
  LocalSponsorPlacementSurface,
} from "@acme/validators";
import { and, asc, eq, gte, isNull, lte } from "@acme/db";
import {
  LocalSponsorPlacement,
  LocalSponsorPlacementDeliveryEvent,
  ResourceProvider,
} from "@acme/db/schema";

export interface PersistedLocalSponsorPlacementDeliveryEvent {
  eventType: LocalSponsorPlacementDeliveryEventType;
  id: string;
  occurredAt: Date;
  placementId: string;
  providerId: string;
  source?: string;
  surface: LocalSponsorPlacementSurface;
}

export interface RecordLocalSponsorPlacementDeliveryEventInput {
  eventType: LocalSponsorPlacementDeliveryEventType;
  idempotencyKey?: string;
  memberId?: string;
  placementId?: string;
  providerId: string;
  source?: string;
  surface: LocalSponsorPlacementSurface;
}

export type RecordLocalSponsorPlacementDeliveryEventResult =
  | {
      event: PersistedLocalSponsorPlacementDeliveryEvent;
      status: "duplicate" | "recorded";
    }
  | {
      status: "no_active_placement";
    };

export interface LocalSponsorPlacementDeliveryRepository {
  record(
    input: RecordLocalSponsorPlacementDeliveryEventInput,
  ): Promise<RecordLocalSponsorPlacementDeliveryEventResult>;
}

export function createDrizzleLocalSponsorPlacementDeliveryRepository(
  db: Database,
  options: { now?: () => Date } = {},
): LocalSponsorPlacementDeliveryRepository {
  const now = options.now ?? (() => new Date());

  return {
    record: async (input) => {
      if (input.idempotencyKey) {
        const existing = await findEventByIdempotencyKey(
          db,
          input.idempotencyKey,
        );

        if (existing) {
          return {
            event: existing,
            status: "duplicate",
          };
        }
      }

      const occurredAt = now();
      const placement = await findActivePlacementForDeliveryEvent(db, {
        occurredAt,
        placementId: input.placementId,
        providerId: input.providerId,
        surface: input.surface,
      });

      if (!placement) {
        return {
          status: "no_active_placement",
        };
      }

      const [created] = await db
        .insert(LocalSponsorPlacementDeliveryEvent)
        .values({
          eventType: input.eventType,
          idempotencyKey: input.idempotencyKey ?? null,
          memberId: input.memberId ?? null,
          occurredAt,
          placementId: placement.placementId,
          providerId: placement.providerId,
          source: input.source ?? null,
          surface: input.surface,
        })
        .onConflictDoNothing({
          target: LocalSponsorPlacementDeliveryEvent.idempotencyKey,
        })
        .returning(localSponsorPlacementDeliveryEventSelectFields);

      if (created) {
        return {
          event: toPersistedLocalSponsorPlacementDeliveryEvent(created),
          status: "recorded",
        };
      }

      if (input.idempotencyKey) {
        const existing = await findEventByIdempotencyKey(
          db,
          input.idempotencyKey,
        );

        if (existing) {
          return {
            event: existing,
            status: "duplicate",
          };
        }
      }

      return {
        status: "no_active_placement",
      };
    },
  };
}

const activePlacementSelectFields = {
  placementId: LocalSponsorPlacement.id,
  providerId: LocalSponsorPlacement.providerId,
};

const localSponsorPlacementDeliveryEventSelectFields = {
  eventType: LocalSponsorPlacementDeliveryEvent.eventType,
  id: LocalSponsorPlacementDeliveryEvent.id,
  occurredAt: LocalSponsorPlacementDeliveryEvent.occurredAt,
  placementId: LocalSponsorPlacementDeliveryEvent.placementId,
  providerId: LocalSponsorPlacementDeliveryEvent.providerId,
  source: LocalSponsorPlacementDeliveryEvent.source,
  surface: LocalSponsorPlacementDeliveryEvent.surface,
};

interface LocalSponsorPlacementDeliveryEventRow {
  eventType: LocalSponsorPlacementDeliveryEventType;
  id: string;
  occurredAt: Date;
  placementId: string;
  providerId: string;
  source: string | null;
  surface: LocalSponsorPlacementSurface;
}

async function findActivePlacementForDeliveryEvent(
  db: Database,
  input: {
    occurredAt: Date;
    placementId?: string;
    providerId: string;
    surface: LocalSponsorPlacementSurface;
  },
) {
  const [placement] = await db
    .select(activePlacementSelectFields)
    .from(LocalSponsorPlacement)
    .innerJoin(
      ResourceProvider,
      eq(ResourceProvider.id, LocalSponsorPlacement.providerId),
    )
    .where(
      and(
        eq(LocalSponsorPlacement.providerId, input.providerId),
        input.placementId
          ? eq(LocalSponsorPlacement.id, input.placementId)
          : undefined,
        eq(LocalSponsorPlacement.surface, input.surface),
        isNull(ResourceProvider.deletedAt),
        lte(LocalSponsorPlacement.startsAt, input.occurredAt),
        gte(LocalSponsorPlacement.endsAt, input.occurredAt),
      ),
    )
    .orderBy(asc(LocalSponsorPlacement.startsAt), asc(LocalSponsorPlacement.id))
    .limit(1);

  return placement ?? null;
}

async function findEventByIdempotencyKey(
  db: Database,
  idempotencyKey: string,
): Promise<PersistedLocalSponsorPlacementDeliveryEvent | null> {
  const [event] = await db
    .select(localSponsorPlacementDeliveryEventSelectFields)
    .from(LocalSponsorPlacementDeliveryEvent)
    .where(
      eq(LocalSponsorPlacementDeliveryEvent.idempotencyKey, idempotencyKey),
    )
    .limit(1);

  return event ? toPersistedLocalSponsorPlacementDeliveryEvent(event) : null;
}

function toPersistedLocalSponsorPlacementDeliveryEvent(
  event: LocalSponsorPlacementDeliveryEventRow,
): PersistedLocalSponsorPlacementDeliveryEvent {
  return {
    eventType: event.eventType,
    id: event.id,
    occurredAt: event.occurredAt,
    placementId: event.placementId,
    providerId: event.providerId,
    ...(event.source ? { source: event.source } : {}),
    surface: event.surface,
  };
}
