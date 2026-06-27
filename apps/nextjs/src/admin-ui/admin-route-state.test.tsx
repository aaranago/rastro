import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminRouteLoading } from "./admin-route-state";

describe("admin route states", () => {
  it("renders a shared loading state with accessible busy semantics", () => {
    const html = renderToStaticMarkup(
      <AdminRouteLoading
        description="Cargando información administrativa."
        eyebrow="ADMIN-012"
        title="Panel de administración"
      />,
    );

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-label="Cargando Panel de administración"');
    expect(html).toContain("ADMIN-012");
    expect(html).toContain("Cargando resumen");
    expect(html).toContain('data-slot="skeleton"');
  });
});
