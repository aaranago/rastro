import { describe, expect, it } from "vitest";

import {
  buildPublicFoundReportShareTarget,
  publicFoundReportPathForId,
} from "./index";

describe("public Found Pet Report share target", () => {
  it("builds one stable web URL, app deep link, and Spanish share copy for a public report", () => {
    const target = buildPublicFoundReportShareTarget({
      publicWebBaseUrl: "https://rastro.bo/",
      reportId: "found-luna-sopocachi",
      title: "Luna",
    });

    expect(publicFoundReportPathForId("found-luna-sopocachi")).toBe(
      "/reportes/encontrados/found-luna-sopocachi",
    );
    expect(target).toEqual({
      appDeepLink: "rastro://reportes/encontrados/found-luna-sopocachi",
      message:
        "Ayuda a reunir a Luna en Rastro: https://rastro.bo/reportes/encontrados/found-luna-sopocachi",
      path: "/reportes/encontrados/found-luna-sopocachi",
      title: "Mascota encontrada: Luna",
      webUrl: "https://rastro.bo/reportes/encontrados/found-luna-sopocachi",
    });
  });

  it("encodes ids safely without changing the public route shape", () => {
    expect(publicFoundReportPathForId("found report/sur")).toBe(
      "/reportes/encontrados/found%20report%2Fsur",
    );
  });
});
