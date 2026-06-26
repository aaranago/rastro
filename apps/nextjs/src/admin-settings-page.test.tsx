import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authServer = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const adminSettingsApi = vi.hoisted(() => ({
  getAdminSettings: vi.fn(),
}));

const envMock = vi.hoisted(() => ({
  env: {
    RASTRO_ADMIN_EMAILS: "admin@rastro.bo",
  },
}));

vi.mock("~/auth/server", () => authServer);
vi.mock("~/env", () => envMock);
vi.mock("~/admin-settings-api-adapter", () => adminSettingsApi);

describe("admin settings page", () => {
  beforeEach(() => {
    vi.resetModules();
    authServer.getSession.mockReset();
    adminSettingsApi.getAdminSettings.mockReset();
  });

  it("renders /admin/ajustes for an allowed admin with persisted defaults", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    adminSettingsApi.getAdminSettings.mockResolvedValue({
      adoptionReviewModeEnabled: false,
      updatedAt: null,
      updatedByAdminId: null,
      verifiedEmailRequiredToPublish: false,
    });
    const { default: AdminSettingsPage, metadata } = await import(
      "./app/admin/ajustes/page"
    );

    const html = renderToStaticMarkup(
      await AdminSettingsPage({
        searchParams: Promise.resolve({ estado: "error" }),
      }),
    );

    expect(metadata).toMatchObject({
      title: "Ajustes admin | Rastro",
    });
    expect(html).toContain("Ajustes de publicación");
    expect(html).toContain("Review Mode para adopciones");
    expect(html).toContain("Correo verificado requerido");
    expect(html).toContain("No se pudieron guardar los ajustes");
    expect(html).toContain("Admin Rastro");
  });
});
