import { describe, expect, it } from "vitest";

import type { PetProfileRelatedRecord } from "./pet-profile-types";
import {
  buildPetProfileRelatedRecordHref,
  buildPetProfileReportCreationHref,
  petProfileReportCreationIntents,
} from "./pet-profile-navigation";

describe("pet profile navigation", () => {
  it.each([
    ["lost", "/report-create/lost?petProfileId=pet-profile-kira"],
    ["adoption", "/report-create/adoption?petProfileId=pet-profile-kira"],
  ] as const)("opens %s report creation from a pet profile", (intent, href) => {
    expect(
      buildPetProfileReportCreationHref({
        intent,
        profileId: "pet-profile-kira",
      }),
    ).toBe(href);
  });

  it("encodes profile ids before building report creation routes", () => {
    expect(
      buildPetProfileReportCreationHref({
        intent: "lost",
        profileId: " pet profile kira ",
      }),
    ).toBe("/report-create/lost?petProfileId=pet%20profile%20kira");
  });

  it("only exposes report creation intents that preserve the selected profile", () => {
    expect(petProfileReportCreationIntents).toEqual(["lost", "adoption"]);
  });

  it.each([
    ["lost-report", "/reportes/perdidos/lost-1"],
    ["found-report", "/reportes/encontrados/found-1"],
    ["sighting-report", "/reportes/avistamientos/sighting-1"],
    ["adoption-listing", "/adopciones/adoption-1"],
  ] as const)("opens %s related records", (kind, href) => {
    const record: PetProfileRelatedRecord = {
      id: `${kind.replace("-report", "").replace("-listing", "")}-1`,
      kind,
      status: "active",
      title: "Registro vinculado",
    };

    expect(buildPetProfileRelatedRecordHref(record)).toBe(href);
  });

  it("encodes related record ids before building detail routes", () => {
    expect(
      buildPetProfileRelatedRecordHref({
        id: "report with spaces",
        kind: "lost-report",
        status: "active",
        title: "Registro vinculado",
      }),
    ).toBe("/reportes/perdidos/report%20with%20spaces");
  });
});
