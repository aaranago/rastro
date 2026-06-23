import type { RouterInputs } from "../../utils/api";

export type ReportCreationCreateReportInput = RouterInputs["report"]["create"];
export type ReportCreationNearbyReportsInput = RouterInputs["report"]["nearby"];

export type ReportCreationPublishContactOption =
  | {
      kind: "both";
      phoneNumber?: string;
    }
  | {
      kind: "in-app-chat";
    }
  | {
      kind: "whatsapp";
      phoneNumber?: string;
    };

const productionNearbyVerificationRadiusMeters = 5000;
const productionNearbyVerificationLimit = 50;
const productionNearbyVerificationTypes = [
  "lost_pet",
  "found_pet",
  "sighting",
  "adoption",
] satisfies NonNullable<ReportCreationNearbyReportsInput["types"]>;

export function toCreateReportContact(
  contactOption: ReportCreationPublishContactOption,
): ReportCreationCreateReportInput["contact"] {
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

export function toNearbyVerificationInput({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}): ReportCreationNearbyReportsInput {
  return {
    latitude,
    limit: productionNearbyVerificationLimit,
    longitude,
    radiusMeters: productionNearbyVerificationRadiusMeters,
    statuses: ["active"],
    types: productionNearbyVerificationTypes,
  };
}

export function toReadyReportMediaInput(photos: readonly { id?: string }[]) {
  return photos.flatMap((photo) => (photo.id ? [{ mediaId: photo.id }] : []));
}

export function optionalTrimmed(value: string | undefined) {
  const trimmed = value?.trim() ?? "";

  return trimmed.length > 0 ? trimmed : undefined;
}

export function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : value.slice(0, maxLength);
}
