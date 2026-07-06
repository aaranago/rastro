import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SocialAuthProvider } from "~/auth/server";

const authServer = vi.hoisted(() => ({
  getEnabledSocialAuthProviders: vi.fn<() => SocialAuthProvider[]>(() => []),
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

    expect(html).toContain("Configuración de cuenta");
    expect(html).toContain("Cerrar sesión");
    expect(html).toContain("Restablecer contraseña");
    expect(html).toContain("Solicitar enlace");
    expect(html).toContain("Solicitar eliminación");
    expect(html).toContain("perfiles de mascota");
    expect(html).toContain("reportes y publicaciones de adopción");
    expect(html).toContain("conversaciones");
    expect(html).toContain("contenido público");
    expect(html).toContain("registros de seguridad");
  });

  it("preserves a safe local return path for visitor sign-in forms", async () => {
    authServer.getSession.mockResolvedValue(null);
    authServer.getEnabledSocialAuthProviders.mockReturnValue(["google"]);
    const { AuthShowcase } = await import("./auth-showcase");

    const html = renderToStaticMarkup(
      await AuthShowcase({
        returnTo: "/reportes/perdidos/11111111-1111-4111-8111-111111110001",
        status: "signin-required",
      }),
    );

    expect(html).toContain("Ingresa para continuar con esta acción en Rastro.");
    expect(html).toContain(
      'name="returnTo" value="/reportes/perdidos/11111111-1111-4111-8111-111111110001"',
    );
    expect(html).toContain("Continuar con Google");
  });
});
