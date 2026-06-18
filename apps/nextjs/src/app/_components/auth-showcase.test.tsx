import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authServer = vi.hoisted(() => ({
  getEnabledSocialAuthProviders: vi.fn(() => []),
  getSession: vi.fn(),
  socialAuthProviderLabels: {
    apple: "Continuar con Apple",
    facebook: "Continuar con Facebook",
    google: "Continuar con Google",
  },
}));

vi.mock("~/auth/actions", () => ({
  initiateAccountDeletion: vi.fn(),
  requestPasswordReset: vi.fn(),
  signInWithEmail: vi.fn(),
  signInWithSocialProvider: vi.fn(),
  signOut: vi.fn(),
  signUpWithEmail: vi.fn(),
}));

vi.mock("~/auth/server", () => authServer);

describe("AuthShowcase account settings", () => {
  beforeEach(() => {
    authServer.getEnabledSocialAuthProviders.mockReturnValue([]);
    authServer.getSession.mockResolvedValue({
      user: {
        email: "ana@example.com",
        name: "Ana",
      },
    });
  });

  it("lets a signed-in member manage access and understand account deletion", async () => {
    const { AuthShowcase } = await import("./auth-showcase");

    const html = renderToStaticMarkup(await AuthShowcase({}));

    expect(html).toContain("Configuracion de cuenta");
    expect(html).toContain("Cerrar sesion");
    expect(html).toContain("Restablecer contrasena");
    expect(html).toContain("Solicitar enlace");
    expect(html).toContain("Solicitar eliminacion");
    expect(html).toContain("perfiles de mascota");
    expect(html).toContain("reportes y publicaciones de adopcion");
    expect(html).toContain("conversaciones");
    expect(html).toContain("contenido publico");
    expect(html).toContain("registros de seguridad");
  });
});
