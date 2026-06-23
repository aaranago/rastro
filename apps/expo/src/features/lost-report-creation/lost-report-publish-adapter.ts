import type { RouterInputs, RouterOutputs } from "../../utils/api";
import type { PublishLostPetReportInput } from "../lost-reports/lost-reports";
import type { PetProfileType } from "../pet-profiles/pet-profile-types";
import {
  optionalTrimmed,
  toCreateReportContact,
  toNearbyVerificationInput,
  toReadyReportMediaInput,
  truncate,
} from "../report-creation/report-creation-publish-adapter";
import { toReportCreateLocationInput } from "../report-creation/report-location-draft";

export type LostReportCreateReportInput = RouterInputs["report"]["create"];
export type LostReportNearbyReportsInput = RouterInputs["report"]["nearby"];
export type LostReportPublicReport = RouterOutputs["report"]["create"];
export type LostReportNearbyReportsOutput = RouterOutputs["report"]["nearby"];

interface LostReportPublishConfirmation {
  id: string;
  status: LostReportPublicReport["status"];
}

export interface LostReportPublishApiClient {
  report: {
    create: {
      mutate: (
        input: LostReportCreateReportInput,
      ) => Promise<LostReportPublicReport>;
    };
    detail: {
      query: (input: { id: string }) => Promise<LostReportPublicReport>;
    };
    nearby: {
      query: (
        input: LostReportNearbyReportsInput,
      ) => Promise<LostReportNearbyReportsOutput>;
    };
  };
}

const speciesByLostPetType: Record<
  PetProfileType,
  LostReportCreateReportInput["pet"]["species"]
> = {
  Ave: "bird",
  Conejo: "rabbit",
  Gato: "cat",
  Otro: "other",
  Perro: "dog",
};

export function createApiLostReportPublishHandler({
  client,
}: {
  client: LostReportPublishApiClient;
}) {
  return async (
    input: PublishLostPetReportInput,
  ): Promise<LostReportPublishConfirmation> => {
    const createInput = toCreateLostPetReportInput(input);
    const created = await client.report.create.mutate(createInput);
    const detail = await client.report.detail.query({ id: created.id });
    const nearby = await client.report.nearby.query(
      toNearbyVerificationInput(input.exactLocation),
    );

    if (detail.id !== created.id || detail.type !== "lost_pet") {
      throw new Error("Created Lost Pet Report could not be confirmed.");
    }

    if (!nearby.results.some((report) => report.id === created.id)) {
      throw new Error("Created Lost Pet Report was not returned by nearby.");
    }

    return {
      id: detail.id,
      status: detail.status,
    };
  };
}

export function toCreateLostPetReportInput(
  input: PublishLostPetReportInput,
): LostReportCreateReportInput {
  if (!input.idempotencyKey) {
    throw new Error("Lost Pet Report idempotency key is required.");
  }

  const petProfile = input.petProfile.profile;
  if (!petProfile) {
    throw new Error("Lost Pet Report pet profile snapshot is required.");
  }

  const locationCell = input.exactLocation.locationCellLabel.trim();
  const description = petProfile.description.trim();
  const location = toReportCreateLocationInput({
    exposeExactLocation: input.showExactPublicLocation === true,
    location: input.exactLocation,
  });

  return {
    contact: toCreateReportContact(input.contactOption),
    description: input.lastSeenDescription.trim(),
    eventOccurredAt: input.lastSeenAt,
    idempotencyKey: input.idempotencyKey,
    location,
    media: toReadyReportMediaInput(input.photos),
    pet: {
      breed: optionalTrimmed(petProfile.breed),
      color: truncate(description, 120),
      distinguishingTraits: optionalTrimmed(description),
      name: petProfile.name.trim(),
      species: speciesByLostPetType[petProfile.type],
    },
    title: `${petProfile.name.trim()} perdida en ${locationCell}`,
    type: "lost_pet",
  };
}
