import type { Href } from "expo-router";

import type { ReportIntent } from "../../i18n";
import type { PetProfileRelatedRecord } from "./pet-profile-types";
import { buildReportCreationHref } from "../report-creation/report-creation-routes";

export type PetProfileReportCreationIntent = Extract<
  ReportIntent,
  "adoption" | "lost"
>;

export const petProfileReportCreationIntents = [
  "lost",
  "adoption",
] as const satisfies readonly PetProfileReportCreationIntent[];

export function buildPetProfileReportCreationHref({
  intent,
  profileId,
}: {
  intent: PetProfileReportCreationIntent;
  profileId: string;
}): Href {
  const href = buildReportCreationHref(intent) as string;
  const encodedProfileId = encodeURIComponent(profileId.trim());

  return `${href}?petProfileId=${encodedProfileId}` as Href;
}

export function buildPetProfileRelatedRecordHref(
  record: PetProfileRelatedRecord,
): Href {
  const id = encodeURIComponent(record.id.trim());

  switch (record.kind) {
    case "adoption-listing":
      return `/adopciones/${id}` as Href;
    case "found-report":
      return `/reportes/encontrados/${id}` as Href;
    case "lost-report":
      return `/reportes/perdidos/${id}` as Href;
    case "sighting-report":
      return `/reportes/avistamientos/${id}` as Href;
  }
}
