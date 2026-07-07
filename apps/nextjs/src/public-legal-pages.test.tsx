import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("public legal pages", () => {
  it("renders the privacy page with app-specific data handling", async () => {
    const { default: PrivacyPage, metadata } = await import(
      "./app/privacidad/page"
    );

    const html = renderToStaticMarkup(<PrivacyPage />);

    expect(metadata).toMatchObject({
      title: "Privacidad | Rastro",
    });
    expect(html).toContain("Política de privacidad");
    expect(html).toContain("zonas aproximadas");
    expect(html).toContain("Rastro no vende datos personales");
    expect(html).toContain("soporte@rastro.bo");
    expect(html).toContain('href="/eliminar-cuenta"');
  });

  it("renders the terms page with adoption and sponsor policy guardrails", async () => {
    const { default: TermsPage, metadata } = await import(
      "./app/terminos/page"
    );

    const html = renderToStaticMarkup(<TermsPage />);

    expect(metadata).toMatchObject({
      title: "Términos | Rastro",
    });
    expect(html).toContain("Términos de uso");
    expect(html).toContain("adopciones no monetarias");
    expect(html).toContain("No se permite vender mascotas");
    expect(html).toContain("no afectan la prioridad de recuperación");
    expect(html).toContain("soporte@rastro.bo");
  });

  it("renders a standalone account deletion route for app-store review", async () => {
    const { default: AccountDeletionPage, metadata } = await import(
      "./app/eliminar-cuenta/page"
    );

    const html = renderToStaticMarkup(<AccountDeletionPage />);

    expect(metadata).toMatchObject({
      title: "Eliminar cuenta | Rastro",
    });
    expect(html).toContain("Eliminar cuenta");
    expect(html).toContain("Desde la app");
    expect(html).toContain("Desde la web");
    expect(html).toContain("Si no puedes iniciar sesión");
    expect(html).toContain("soporte@rastro.bo");
    expect(html).toContain('href="/#auth"');
  });
});
