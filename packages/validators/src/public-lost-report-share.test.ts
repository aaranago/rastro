import { describe, expect, it } from "vitest";

import {
  buildPublicLostReportShareTarget,
  publicLostReportPathForId,
} from "./index";

describe("public Lost Pet Report share target", () => {
  const reportId = "11111111-1111-4111-8111-111111110001";

  it("builds one stable web URL, app deep link, and Spanish share copy for a public report", () => {
    const target = buildPublicLostReportShareTarget({
      publicWebBaseUrl: "https://rastro.bo/",
      reportId,
      title: "Bruno",
    });

    expect(publicLostReportPathForId(reportId)).toBe(
      `/reportes/perdidos/${reportId}`,
    );
    expect(target).toEqual({
      appDeepLink: `rastro://reportes/perdidos/${reportId}`,
      message: `Ayuda a encontrar a Bruno en Rastro: https://rastro.bo/reportes/perdidos/${reportId}`,
      path: `/reportes/perdidos/${reportId}`,
      title: "Mascota perdida: Bruno",
      webUrl: `https://rastro.bo/reportes/perdidos/${reportId}`,
    });
  });

  it("rejects malformed ids that cannot exist in the public database route", () => {
    expect(() => publicLostReportPathForId("lost report/sur")).toThrow(
      "Public report detail IDs must be UUIDs.",
    );
  });
});
