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

const forbiddenTerms = new RegExp(
  [
    ["Resource", "Provider"].join(" "),
    ["Verification", "Badge"].join(" "),
  ].join("|"),
  "i",
);
const marketplaceTerms = /marketplace|seller|comprar|vender/i;

describe("admin resources page", () => {
  beforeEach(() => {
    vi.resetModules();
    authServer.getSession.mockReset();
    envMock.env.RASTRO_ADMIN_EMAILS = "admin@rastro.bo";
  });

  it("renders the provider management dashboard for an allowed admin member", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    const { default: AdminResourcesPage, metadata } = await import(
      "./app/admin/proveedores/page"
    );

    const html = renderToStaticMarkup(await AdminResourcesPage());

    expect(metadata).toMatchObject({
      title: "Proveedores de recursos | Rastro",
    });
    expect(html).toContain("Gestion de proveedores de recursos");
    expect(html).toContain("Clinica San Roque");
    expect(html).toContain("Patitas La Paz");
    expect(html).toContain("Registrar proveedor");
    expect(html).toContain("Guardar identidad");
    expect(html).toContain("Adjuntar patrocinio local");
    expect(html).toContain("Metricas por departamento");
    expect(html).toContain("Admin Rastro");
    expect(html).not.toMatch(forbiddenTerms);
    expect(html).not.toMatch(marketplaceTerms);
  });

  it("renders restricted access for signed-in non-admin members", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "ana@example.com",
        id: "member-ana",
        name: "Ana miembro",
      },
    });
    const { default: AdminResourcesPage } = await import(
      "./app/admin/proveedores/page"
    );

    const html = renderToStaticMarkup(await AdminResourcesPage());

    expect(html).toContain("Acceso restringido");
    expect(html).toContain("Ana miembro");
    expect(html).not.toContain("Registrar proveedor");
    expect(html).not.toContain("Guardar identidad");
    expect(html).not.toContain("Adjuntar patrocinio local");
    expect(html).not.toMatch(forbiddenTerms);
    expect(html).not.toMatch(marketplaceTerms);
  });

  it("renders restricted access for visitors", async () => {
    authServer.getSession.mockResolvedValue(null);
    const { default: AdminResourcesPage } = await import(
      "./app/admin/proveedores/page"
    );

    const html = renderToStaticMarkup(await AdminResourcesPage());

    expect(html).toContain("Acceso restringido");
    expect(html).toContain("Visitante sin sesion");
    expect(html).not.toContain("Registrar proveedor");
    expect(html).not.toContain("Guardar identidad");
    expect(html).not.toContain("Adjuntar patrocinio local");
    expect(html).not.toMatch(forbiddenTerms);
    expect(html).not.toMatch(marketplaceTerms);
  });
});
