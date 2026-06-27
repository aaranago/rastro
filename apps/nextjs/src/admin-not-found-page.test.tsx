import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdminCatchAllNotFoundPage from "./app/admin/[...notFound]/page";
import AdminNotFound from "./app/admin/not-found";

describe("admin not-found page", () => {
  it("renders an admin-local not-found recovery state", () => {
    const html = renderToStaticMarkup(<AdminNotFound />);

    expect(html).toContain("Ruta admin no encontrada");
    expect(html).toContain("Volver al resumen");
    expect(html).toContain('href="/admin"');
  });

  it("uses the admin-local state for unmatched admin routes", () => {
    const html = renderToStaticMarkup(<AdminCatchAllNotFoundPage />);

    expect(html).toContain("Ruta admin no encontrada");
    expect(html).toContain("Volver al resumen");
  });
});
