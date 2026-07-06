import type { RouterInputs, RouterOutputs } from "../../utils/api";
import type { PublishSightingReportInput } from "./sighting-report-creation-types";
import {
  optionalTrimmed,
  toCreateReportContact,
  toNearbyVerificationInput,
  toReadyReportMediaInput,
  truncate,
} from "../report-creation/report-creation-publish-adapter";
import { toReportCreateLocationInput } from "../report-creation/report-location-draft";

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
      toNearbyVerificationInput(input.exactLocation),
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
  const location = toReportCreateLocationInput({
    exposeExactLocation: input.showExactPublicLocation === true,
    location: input.exactLocation,
  });

  return {
    contact: toCreateReportContact(input.contactOption),
    description: [
      input.sightingDescription.trim(),
      [
        `Condición observada: ${input.observedCondition.trim()}`,
        `Dirección: ${input.direction.trim()}`,
      ].join("\n"),
    ].join("\n\n"),
    eventOccurredAt: input.observedAt,
    idempotencyKey: input.idempotencyKey,
    location,
    media: toReadyReportMediaInput(input.photos),
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
