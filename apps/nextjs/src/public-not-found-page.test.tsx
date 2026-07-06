import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PublicNotFound from "./app/not-found";

describe("public not-found page", () => {
  it("renders Spanish recovery actions for unavailable public links", () => {
    const html = renderToStaticMarkup(<PublicNotFound />);

    expect(html).toContain("Reporte o adopcion no disponible");
    expect(html).toContain("Volver al inicio");
    expect(html).toContain('href="/"');
    expect(html).toContain("Abrir o instalar Rastro");
    expect(html).toContain('href="/descargar"');
    expect(html).toContain("rastro-app-activity.png");
    expect(html).not.toContain("This page could not be found");
  });
});
