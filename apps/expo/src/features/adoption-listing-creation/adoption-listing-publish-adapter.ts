import type { RouterInputs, RouterOutputs } from "../../utils/api";
import type { PublishAdoptionListingInput } from "../adoption-listings/adoption-listings";
import type { PetProfileType } from "../pet-profiles/pet-profile-types";
import {
  optionalTrimmed,
  toCreateReportContact,
  toNearbyVerificationInput,
  toReadyReportMediaInput,
  truncate,
} from "../report-creation/report-creation-publish-adapter";
import { toReportCreateLocationInput } from "../report-creation/report-location-draft";

export type AdoptionListingCreateReportInput = RouterInputs["report"]["create"];
export type AdoptionListingNearbyReportsInput =
  RouterInputs["report"]["nearby"];
export type AdoptionListingPublicReport = RouterOutputs["report"]["create"];
export type AdoptionListingNearbyReportsOutput =
  RouterOutputs["report"]["nearby"];

interface AdoptionListingPublishConfirmation {
  id: string;
  status: AdoptionListingPublicReport["status"];
}

export interface AdoptionListingPublishApiClient {
  report: {
    create: {
      mutate: (
        input: AdoptionListingCreateReportInput,
      ) => Promise<AdoptionListingPublicReport>;
    };
    detail: {
      query: (input: { id: string }) => Promise<AdoptionListingPublicReport>;
    };
    nearby: {
      query: (
        input: AdoptionListingNearbyReportsInput,
      ) => Promise<AdoptionListingNearbyReportsOutput>;
    };
  };
}

export interface AdoptionListingPublishClock {
  now: () => string;
}

const speciesByAdoptionPetType: Record<
  PetProfileType,
  AdoptionListingCreateReportInput["pet"]["species"]
> = {
  Ave: "bird",
  Conejo: "rabbit",
  Gato: "cat",
  Otro: "other",
  Perro: "dog",
};

const systemClock: AdoptionListingPublishClock = {
  now: () => new Date().toISOString(),
};

export function createApiAdoptionListingPublishHandler({
  client,
  now = systemClock.now,
}: {
  client: AdoptionListingPublishApiClient;
  now?: () => string;
}) {
  return async (
    input: PublishAdoptionListingInput,
  ): Promise<AdoptionListingPublishConfirmation> => {
    const createInput = toCreateAdoptionListingReportInput(input, { now });
    const created = await client.report.create.mutate(createInput);
    const detail = await client.report.detail.query({ id: created.id });

    if (detail.id !== created.id || detail.type !== "adoption") {
      throw new Error("Created Adoption Listing could not be confirmed.");
    }

    if (detail.status === "pending_review") {
      return {
        id: detail.id,
        status: detail.status,
      };
    }

    const nearby = await client.report.nearby.query(
      toNearbyVerificationInput(input.exactLocation),
    );

    if (!nearby.results.some((report) => report.id === created.id)) {
      throw new Error("Created Adoption Listing was not returned by nearby.");
    }

    return {
      id: detail.id,
      status: detail.status,
    };
  };
}

export function toCreateAdoptionListingReportInput(
  input: PublishAdoptionListingInput,
  clock: AdoptionListingPublishClock = systemClock,
): AdoptionListingCreateReportInput {
  if (!input.idempotencyKey) {
    throw new Error("Adoption Listing idempotency key is required.");
  }

  const petProfile = input.petProfile.profile;
  if (!petProfile) {
    throw new Error("Adoption Listing pet profile snapshot is required.");
  }

  const locationCell = input.exactLocation.locationCellLabel.trim();
  const description = petProfile.description.trim();
  const location = toReportCreateLocationInput({
    exposeExactLocation: input.showExactPublicLocation === true,
    location: input.exactLocation,
  });

  return {
    contact: toCreateReportContact(input.contactOption),
    description: [
      input.adoptionSummary.trim(),
      optionalSection("Salud y cuidados", input.healthNotes),
      optionalSection("Hogar ideal", input.idealHome),
    ]
      .filter(Boolean)
      .join("\n\n"),
    eventOccurredAt: clock.now(),
    idempotencyKey: input.idempotencyKey,
    location,
    media: toReadyReportMediaInput(input.photos),
    pet: {
      breed: optionalTrimmed(petProfile.breed),
      color: truncate(description, 120),
      distinguishingTraits: optionalTrimmed(description),
      name: petProfile.name.trim(),
      species: speciesByAdoptionPetType[petProfile.type],
    },
    title: `${petProfile.name.trim()} en adopcion en ${locationCell}`,
    type: "adoption",
  };
}

function optionalSection(label: string, value: string | undefined) {
  const trimmed = optionalTrimmed(value);

  return trimmed ? `${label}: ${trimmed}` : undefined;
}
