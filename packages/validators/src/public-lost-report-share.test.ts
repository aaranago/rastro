import { describe, expect, it } from "vitest";

import {
  buildPublicLostReportShareTarget,
  publicLostReportPathForId,
} from "./index";

describe("public Lost Pet Report share target", () => {
  it("builds one stable web URL, app deep link, and Spanish share copy for a public report", () => {
    const target = buildPublicLostReportShareTarget({
      publicWebBaseUrl: "https://rastro.bo/",
      reportId: "lost-bruno-achumani",
      title: "Bruno",
    });

    expect(publicLostReportPathForId("lost-bruno-achumani")).toBe(
      "/reportes/perdidos/lost-bruno-achumani",
    );
    expect(target).toEqual({
      appDeepLink: "rastro://reportes/perdidos/lost-bruno-achumani",
      message:
        "Ayuda a encontrar a Bruno en Rastro: https://rastro.bo/reportes/perdidos/lost-bruno-achumani",
      path: "/reportes/perdidos/lost-bruno-achumani",
      title: "Mascota perdida: Bruno",
      webUrl: "https://rastro.bo/reportes/perdidos/lost-bruno-achumani",
    });
  });

  it("encodes ids safely without changing the public route shape", () => {
    expect(publicLostReportPathForId("lost report/sur")).toBe(
      "/reportes/perdidos/lost%20report%2Fsur",
    );
  });
});
