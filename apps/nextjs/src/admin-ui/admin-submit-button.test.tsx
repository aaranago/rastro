import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminSubmitButton } from "./admin-submit-button";

describe("admin submit button", () => {
  it("renders a submit control with idle busy semantics", () => {
    const html = renderToStaticMarkup(
      <AdminSubmitButton pendingLabel="Guardando cambios">
        Guardar cambios
      </AdminSubmitButton>,
    );

    expect(html).toContain('type="submit"');
    expect(html).toContain('aria-busy="false"');
    expect(html).toContain("Guardar cambios");
    expect(html).not.toContain("Guardando cambios");
  });
});
