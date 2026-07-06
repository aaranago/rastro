import { describe, expect, it } from "vitest";

import {
  buildPublicSightingReportShareTarget,
  publicSightingReportPathForId,
} from "./index";

describe("public Sighting Report share target", () => {
  const reportId = "44444444-4444-4444-8444-444444440001";

  it("builds one stable web URL, app deep link, and Spanish share copy for a public report", () => {
    const target = buildPublicSightingReportShareTarget({
      publicWebBaseUrl: "https://rastro.bo/",
      reportId,
      title: "Toby",
    });

    expect(publicSightingReportPathForId(reportId)).toBe(
      `/reportes/avistamientos/${reportId}`,
    );
    expect(target).toEqual({
      appDeepLink: `rastro://reportes/avistamientos/${reportId}`,
      message: `Ayuda a ubicar este avistamiento de Toby en Rastro: https://rastro.bo/reportes/avistamientos/${reportId}`,
      path: `/reportes/avistamientos/${reportId}`,
      title: "Avistamiento de mascota: Toby",
      webUrl: `https://rastro.bo/reportes/avistamientos/${reportId}`,
    });
  });

  it("rejects malformed ids that cannot exist in the public database route", () => {
    expect(() => publicSightingReportPathForId("sighting report/sur")).toThrow(
      "Public report detail IDs must be UUIDs.",
    );
  });
});
