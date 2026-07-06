import type { RouterInputs, RouterOutputs } from "../../utils/api";
import type { PublishFoundPetReportInput } from "../found-reports/found-reports";
import {
  optionalTrimmed,
  toCreateReportContact,
  toNearbyVerificationInput,
  toReadyReportMediaInput,
  truncate,
} from "../report-creation/report-creation-publish-adapter";
import { toReportCreateLocationInput } from "../report-creation/report-location-draft";

export type FoundReportCreateReportInput = RouterInputs["report"]["create"];
export type FoundReportNearbyReportsInput = RouterInputs["report"]["nearby"];
export type FoundReportPublicReport = RouterOutputs["report"]["create"];
export type FoundReportNearbyReportsOutput = RouterOutputs["report"]["nearby"];

interface FoundReportPublishConfirmation {
  id: string;
  status: FoundReportPublicReport["status"];
}

export interface FoundReportPublishApiClient {
  report: {
    create: {
      mutate: (
        input: FoundReportCreateReportInput,
      ) => Promise<FoundReportPublicReport>;
    };
    detail: {
      query: (input: { id: string }) => Promise<FoundReportPublicReport>;
    };
    nearby: {
      query: (
        input: FoundReportNearbyReportsInput,
      ) => Promise<FoundReportNearbyReportsOutput>;
    };
  };
}

const speciesByFoundPetType = {
  Ave: "bird",
  Conejo: "rabbit",
  Gato: "cat",
  Otro: "other",
  Perro: "dog",
} satisfies Record<
  PublishFoundPetReportInput["pet"]["type"],
  FoundReportCreateReportInput["pet"]["species"]
>;

export function createApiFoundReportPublishHandler({
  client,
}: {
  client: FoundReportPublishApiClient;
}) {
  return async (
    input: PublishFoundPetReportInput,
  ): Promise<FoundReportPublishConfirmation> => {
    const createInput = toCreateFoundPetReportInput(input);
    const created = await client.report.create.mutate(createInput);
    const detail = await client.report.detail.query({ id: created.id });
    const nearby = await client.report.nearby.query(
      toNearbyVerificationInput(input.exactLocation),
    );

    if (detail.id !== created.id || detail.type !== "found_pet") {
      throw new Error("Created Found Pet Report could not be confirmed.");
    }

    if (!nearby.results.some((report) => report.id === created.id)) {
      throw new Error("Created Found Pet Report was not returned by nearby.");
    }

    return {
      id: detail.id,
      status: detail.status,
    };
  };
}

export function toCreateFoundPetReportInput(
  input: PublishFoundPetReportInput,
): FoundReportCreateReportInput {
  if (!input.idempotencyKey) {
    throw new Error("Found Pet Report idempotency key is required.");
  }

  const locationCell = input.exactLocation.locationCellLabel.trim();
  const petDescription = input.pet.description.trim();
  const location = toReportCreateLocationInput({
    exposeExactLocation: input.showExactPublicLocation === true,
    location: input.exactLocation,
  });

  return {
    contact: toCreateReportContact(input.contactOption),
    description: [
      input.foundDescription.trim(),
      `Condición: ${input.condition.trim()}`,
    ].join("\n\n"),
    eventOccurredAt: input.foundAt,
    idempotencyKey: input.idempotencyKey,
    location,
    media: toReadyReportMediaInput(input.photos),
    pet: {
      breed: optionalTrimmed(input.pet.breed),
      color: truncate(petDescription, 120),
      distinguishingTraits: optionalTrimmed(petDescription),
      species: speciesByFoundPetType[input.pet.type],
    },
    title: `${input.pet.type} encontrado en ${locationCell}`,
    type: "found_pet",
  };
}
