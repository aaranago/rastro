import type { Href } from "expo-router";

import type { ReportIntent } from "../../i18n";
import type { PetProfileRelatedRecord } from "./pet-profile-types";
import { buildReportCreationHref } from "../report-creation/report-creation-routes";

export function buildPetProfileReportCreationHref({
  intent,
}: {
  intent: ReportIntent;
  profileId: string;
}): Href {
  return buildReportCreationHref(intent);
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

