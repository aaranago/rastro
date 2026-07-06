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
          returnTo: "/reportes/perdidos/report-lost-bruno-db",
        }),
      }),
    );

    expect(html).toContain("Red de recuperacion en Bolivia");
    expect(html).toContain("Reportes, adopciones y recursos locales");
    expect(html).toContain("Reportar mascota perdida");
    expect(html).toContain('href="rastro://report-create/lost"');
    expect(html).toContain("Publicar adopcion");
    expect(html).toContain('href="rastro://report-create/adoption"');
    expect(html).toContain("Buscar recursos locales");
    expect(html).toContain('href="rastro://recursos"');
    expect(html).toContain("Reportes comunitarios");
    expect(html).toContain("Adopciones responsables");
    expect(html).toContain("Recursos en Bolivia");
    expect(html).toContain('data-status="signin-required"');
    expect(html).toContain(
      'data-return-to="/reportes/perdidos/report-lost-bruno-db"',
    );
    expect(html).not.toContain("Titulo del reporte");
    expect(html).not.toContain("Sin reportes aun");
    expect(html).not.toContain("Eliminar");
  });
});
