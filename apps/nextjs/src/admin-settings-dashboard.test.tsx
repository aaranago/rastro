import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AdminSettingsDashboard,
  buildAdminSettingsNotice,
} from "./admin-settings-dashboard";

describe("AdminSettingsDashboard", () => {
  it("renders persisted default settings with confirmation copy", () => {
    const html = renderToStaticMarkup(
      <AdminSettingsDashboard
        settings={{
          adoptionReviewModeEnabled: false,
          updatedAt: null,
          updatedByAdminId: null,
          verifiedEmailRequiredToPublish: false,
        }}
        viewer={{
          displayName: "Admin Rastro",
          role: "admin",
        }}
      />,
    );

    expect(html).toContain("Ajustes de publicación");
    expect(html).toContain("Modo de revisión para adopciones");
    expect(html).toContain("Correo verificado requerido");
    expect(html).toContain("Confirmo aplicar estos ajustes");
    expect(html).toContain("Sin cambios guardados todavía");
    expect(html).toContain("Desactivado");
  });

  it("renders toggled state and success feedback", () => {
    const html = renderToStaticMarkup(
      <AdminSettingsDashboard
        notice={buildAdminSettingsNotice("ok")}
        settings={{
          adoptionReviewModeEnabled: true,
          updatedAt: new Date("2026-06-26T17:00:00.000Z"),
          updatedByAdminId: "member-admin",
          verifiedEmailRequiredToPublish: true,
        }}
        viewer={{
          displayName: "Admin Rastro",
          role: "admin",
        }}
      />,
    );

    expect(html).toContain("Ajustes guardados");
    expect(html).toContain("Activado");
    expect(html).toContain("member-admin");
  });

  it("renders a clear error state", () => {
    const html = renderToStaticMarkup(
      <AdminSettingsDashboard
        notice={buildAdminSettingsNotice("error")}
        settings={{
          adoptionReviewModeEnabled: false,
          updatedAt: null,
          updatedByAdminId: null,
          verifiedEmailRequiredToPublish: false,
        }}
        viewer={{
          displayName: "Admin Rastro",
          role: "admin",
        }}
      />,
    );

    expect(html).toContain("No se pudieron guardar los ajustes");
    expect(html).toContain("Revisa la confirmación");
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="confirm-settings-change-error"');
    expect(html).toContain("Marca esta confirmación antes de guardar cambios.");
  });
});
