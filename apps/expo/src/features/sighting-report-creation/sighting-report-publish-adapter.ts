import type { RouterInputs, RouterOutputs } from "../../utils/api";
import type { PublishSightingReportInput } from "./sighting-report-creation-types";

export type SightingReportCreateReportInput = RouterInputs["report"]["create"];
export type SightingReportNearbyReportsInput = RouterInputs["report"]["nearby"];
export type SightingReportPublicReport = RouterOutputs["report"]["create"];
export type SightingReportNearbyReportsOutput =
  RouterOutputs["report"]["nearby"];

export interface SightingReportPublishConfirmation {
  id: string;
  status: SightingReportPublicReport["status"];
}

export interface SightingReportPublishApiClient {
  report: {
    create: {
      mutate: (
        input: SightingReportCreateReportInput,
      ) => Promise<SightingReportPublicReport>;
    };
    detail: {
      query: (input: { id: string }) => Promise<SightingReportPublicReport>;
    };
    nearby: {
      query: (
        input: SightingReportNearbyReportsInput,
      ) => Promise<SightingReportNearbyReportsOutput>;
    };
  };
}

const productionNearbyVerificationRadiusMeters = 5000;
const productionNearbyVerificationLimit = 50;
const productionNearbyVerificationTypes = [
  "lost_pet",
  "found_pet",
  "sighting",
  "adoption",
] satisfies NonNullable<SightingReportNearbyReportsInput["types"]>;

const speciesBySightingPetType = {
  Ave: "bird",
  Conejo: "rabbit",
  Gato: "cat",
  Otro: "other",
  Perro: "dog",
} satisfies Record<
  PublishSightingReportInput["pet"]["type"],
  SightingReportCreateReportInput["pet"]["species"]
>;

export function createApiSightingReportPublishHandler({
  client,
}: {
  client: SightingReportPublishApiClient;
}) {
  return async (
    input: PublishSightingReportInput,
  ): Promise<SightingReportPublishConfirmation> => {
    const createInput = toCreateSightingReportInput(input);
    const created = await client.report.create.mutate(createInput);
    const detail = await client.report.detail.query({ id: created.id });
    const nearby = await client.report.nearby.query(
      toNearbyVerificationInput(input),
    );

    if (detail.id !== created.id || detail.type !== "sighting") {
      throw new Error("Created Sighting Report could not be confirmed.");
    }

    if (!nearby.results.some((report) => report.id === created.id)) {
      throw new Error("Created Sighting Report was not returned by nearby.");
    }

    return {
      id: detail.id,
      status: detail.status,
    };
  };
}

export function toCreateSightingReportInput(
  input: PublishSightingReportInput,
): SightingReportCreateReportInput {
  if (!input.idempotencyKey) {
    throw new Error("Sighting Report idempotency key is required.");
  }

  const locationCell = input.exactLocation.locationCellLabel.trim();
  const petDescription = truncate(input.pet.description.trim(), 120);

  return {
    contact: toCreateReportContact(input.contactOption),
    description: [
      input.sightingDescription.trim(),
      [
        `Condicion observada: ${input.observedCondition.trim()}`,
        `Direccion: ${input.direction.trim()}`,
      ].join("\n"),
    ].join("\n\n"),
    eventOccurredAt: input.observedAt,
    idempotencyKey: input.idempotencyKey,
    location: {
      exactLatitude: input.exactLocation.latitude,
      exactLongitude: input.exactLocation.longitude,
      exposeExactLocation: input.showExactPublicLocation === true,
      label: input.exactLocation.addressLabel ?? locationCell,
      locationCell,
    },
    media: [],
    pet: {
      breed: optionalTrimmed(input.pet.breed),
      color: petDescription,
      distinguishingTraits: optionalTrimmed(input.pet.description),
      species: speciesBySightingPetType[input.pet.type],
    },
    title: `${input.pet.type} visto en ${locationCell}`,
    type: "sighting",
  };
}

function toNearbyVerificationInput(
  input: PublishSightingReportInput,
): SightingReportNearbyReportsInput {
  return {
    latitude: input.exactLocation.latitude,
    limit: productionNearbyVerificationLimit,
    longitude: input.exactLocation.longitude,
    radiusMeters: productionNearbyVerificationRadiusMeters,
    statuses: ["active"],
    types: productionNearbyVerificationTypes,
  };
}

function toCreateReportContact(
  contactOption: PublishSightingReportInput["contactOption"],
): SightingReportCreateReportInput["contact"] {
  switch (contactOption.kind) {
    case "both":
      return {
        preference: "both",
        whatsappPhone: contactOption.phoneNumber?.trim(),
      };
    case "in-app-chat":
      return {
        preference: "in_app_chat",
      };
    case "whatsapp":
      return {
        preference: "whatsapp",
        whatsappPhone: contactOption.phoneNumber?.trim(),
      };
  }
}

function optionalTrimmed(value: string | undefined) {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : undefined;
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : value.slice(0, maxLength);
}
