import { describe, expect, it } from "vitest";

import {
  buildPublicSightingReportShareTarget,
  publicSightingReportPathForId,
} from "./index";

describe("public Sighting Report share target", () => {
  it("builds one stable web URL, app deep link, and Spanish share copy for a public report", () => {
    const target = buildPublicSightingReportShareTarget({
      publicWebBaseUrl: "https://rastro.bo/",
      reportId: "sighting-toby-miraflores",
      title: "Toby",
    });

    expect(publicSightingReportPathForId("sighting-toby-miraflores")).toBe(
      "/reportes/avistamientos/sighting-toby-miraflores",
    );
    expect(target).toEqual({
      appDeepLink: "rastro://reportes/avistamientos/sighting-toby-miraflores",
      message:
        "Ayuda a ubicar este avistamiento de Toby en Rastro: https://rastro.bo/reportes/avistamientos/sighting-toby-miraflores",
      path: "/reportes/avistamientos/sighting-toby-miraflores",
      title: "Avistamiento de mascota: Toby",
      webUrl:
        "https://rastro.bo/reportes/avistamientos/sighting-toby-miraflores",
    });
  });

  it("encodes ids safely without changing the public route shape", () => {
    expect(publicSightingReportPathForId("sighting report/sur")).toBe(
      "/reportes/avistamientos/sighting%20report%2Fsur",
    );
  });
});
