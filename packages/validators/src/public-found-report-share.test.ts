import { describe, expect, it } from "vitest";

import {
  buildPublicFoundReportShareTarget,
  publicFoundReportPathForId,
} from "./index";

describe("public Found Pet Report share target", () => {
  const reportId = "33333333-3333-4333-8333-333333330001";

  it("builds one stable web URL, app deep link, and Spanish share copy for a public report", () => {
    const target = buildPublicFoundReportShareTarget({
      publicWebBaseUrl: "https://rastro.bo/",
      reportId,
      title: "Luna",
    });

    expect(publicFoundReportPathForId(reportId)).toBe(
      `/reportes/encontrados/${reportId}`,
    );
    expect(target).toEqual({
      appDeepLink: `rastro://reportes/encontrados/${reportId}`,
      message: `Ayuda a reunir a Luna en Rastro: https://rastro.bo/reportes/encontrados/${reportId}`,
      path: `/reportes/encontrados/${reportId}`,
      title: "Mascota encontrada: Luna",
      webUrl: `https://rastro.bo/reportes/encontrados/${reportId}`,
    });
  });

  it("rejects malformed ids that cannot exist in the public database route", () => {
    expect(() => publicFoundReportPathForId("found report/sur")).toThrow(
      "Public report detail IDs must be UUIDs.",
    );
  });
});
