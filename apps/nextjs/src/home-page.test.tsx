import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./app/_components/auth-showcase", () => ({
  AuthShowcase: (props: { returnTo?: string; status?: string }) => (
    <section
      data-return-to={props.returnTo}
      data-status={props.status}
      id="auth"
    >
      Panel de acceso
    </section>
  ),
}));

describe("public home page", () => {
  it("renders Rastro public entry CTAs without starter post CRUD", async () => {
    const { default: HomePage } = await import("./app/page");

    const html = renderToStaticMarkup(
      await HomePage({
        searchParams: Promise.resolve({
          auth: "signin-required",
          returnTo: "/reportes/perdidos/11111111-1111-4111-8111-111111110001",
        }),
      }),
    );

    expect(html).toContain("Red de recuperación en Bolivia");
    expect(html).toContain("Reportes, adopciones y recursos locales");
    expect(html).toContain("Reportar mascota perdida");
    expect(html).toContain(
      'href="/descargar?context=lost-report&amp;target=rastro%3A%2F%2Freport-create%2Flost"',
    );
    expect(html).toContain("Publicar adopción");
    expect(html).toContain(
      'href="/descargar?context=create-adoption&amp;target=rastro%3A%2F%2Freport-create%2Fadoption"',
    );
    expect(html).toContain("Buscar recursos locales");
    expect(html).toContain(
      'href="/descargar?context=resource&amp;target=rastro%3A%2F%2Frecursos"',
    );
    expect(html).toContain("Reportes comunitarios");
    expect(html).toContain("Adopciones responsables");
    expect(html).toContain("Recursos en Bolivia");
    expect(html).toContain("Abrir reportes en la app");
    expect(html).toContain("Abrir Rastro");
    expect(html).toContain("Ver recursos locales");
    expect(html).toContain("rastro-app-activity.png");
    expect(html).toContain("rastro-app-resources.png");
    expect(html).toContain('href="/privacidad"');
    expect(html).toContain('href="/terminos"');
    expect(html).toContain('href="/eliminar-cuenta"');
    expect(html).toContain('data-status="signin-required"');
    expect(html).toContain(
      'data-return-to="/reportes/perdidos/11111111-1111-4111-8111-111111110001"',
    );
    expect(html).not.toContain("Titulo del reporte");
    expect(html).not.toContain("Sin reportes aún");
    expect(html).not.toContain("Eliminar reporte");
  });
});
