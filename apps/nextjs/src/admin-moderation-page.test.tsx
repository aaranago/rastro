import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authServer = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const envMock = vi.hoisted(() => ({
  env: {
    RASTRO_ADMIN_EMAILS: "admin@rastro.bo",
  },
}));

vi.mock("~/auth/server", () => authServer);
vi.mock("~/env", () => envMock);

describe("admin moderation page", () => {
  beforeEach(() => {
    authServer.getSession.mockReset();
  });

  it("renders the moderation dashboard for an allowed admin member", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    const { default: AdminModerationPage } = await import(
      "./app/admin/moderacion/page"
    );

    const html = renderToStaticMarkup(await AdminModerationPage());

    expect(html).toContain("Contenido reportado");
    expect(html).toContain("Bruno reportado como posible riesgo");
    expect(html).toContain("Reporte de mascota perdida");
    expect(html).toContain("Perfil de Resource Provider");
    expect(html).toContain("Review Mode para adopciones");
    expect(html).toContain("Metricas de abuso por ciudad");
    expect(html).toContain("Admin Rastro");
  });

  it("renders access denied for signed-in non-admin members", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "ana@example.com",
        id: "member-ana",
        name: "Ana miembro",
      },
    });
    const { default: AdminModerationPage } = await import(
      "./app/admin/moderacion/page"
    );

    const html = renderToStaticMarkup(await AdminModerationPage());

    expect(html).toContain("Acceso restringido");
    expect(html).toContain("Solo administradores de Rastro");
    expect(html).toContain("Ana miembro");
    expect(html).not.toContain("Cola de revision");
    expect(html).not.toContain("Suspender miembro");
  });
});
