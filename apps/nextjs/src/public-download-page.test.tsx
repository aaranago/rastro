import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("public download page", () => {
  it("renders a Spanish install fallback for public adoption links", async () => {
    const { default: DownloadPage, metadata } = await import(
      "./app/descargar/page"
    );

    const html = renderToStaticMarkup(
      await DownloadPage({
        searchParams: Promise.resolve({
          context: "adoption",
          returnTo: "/adopciones/22222222-2222-4222-8222-222222220001",
          target: "rastro://adopciones/22222222-2222-4222-8222-222222220001",
        }),
      }),
    );

    expect(metadata).toMatchObject({
      alternates: {
        canonical: "https://rastro.bo/descargar",
      },
      openGraph: {
        locale: "es_BO",
        siteName: "Rastro",
        title: "Descargar Rastro",
        type: "website",
        url: "https://rastro.bo/descargar",
      },
      title: "Descargar Rastro | Rastro",
    });
    expect(html).toContain("Sigue esta adopción en Rastro");
    expect(html).toContain(
      'href="rastro://adopciones/22222222-2222-4222-8222-222222220001"',
    );
    expect(html).toContain(
      'href="/adopciones/22222222-2222-4222-8222-222222220001"',
    );
    expect(html).toContain("Reportes");
    expect(html).toContain("Adopciones");
    expect(html).toContain("Recursos");
    expect(html).toContain("Instalar, abrir o solicitar acceso");
    expect(html).toContain("Disponible pronto");
    expect(html).toContain("Solicitar acceso Android");
    expect(html).toContain("Solicitar aviso iPhone");
    expect(html).toContain("rastro-app-activity.png");
    expect(html).not.toMatch(/precio|compra|comprar|venta|vender|marketplace/i);
  });

  it("falls back to the home page for unsafe return targets", async () => {
    const { default: DownloadPage } = await import("./app/descargar/page");

    const html = renderToStaticMarkup(
      await DownloadPage({
        searchParams: Promise.resolve({
          context: "unknown",
          returnTo: "https://evil.example/phishing",
        }),
      }),
    );

    expect(html).toContain("Descargar Rastro");
    expect(html).toContain('href="/"');
    expect(html).not.toContain("evil.example");
  });

  it("renders creation-specific copy for lost-report entry points", async () => {
    const { default: DownloadPage } = await import("./app/descargar/page");

    const html = renderToStaticMarkup(
      await DownloadPage({
        searchParams: Promise.resolve({
          context: "lost-report",
          target: "rastro://report-create/lost",
        }),
      }),
    );

    expect(html).toContain("Reporta una mascota perdida");
    expect(html).toContain('href="rastro://report-create/lost"');
    expect(html).not.toContain("Sigue este reporte en Rastro");
  });

  it("only forwards public app-open targets", async () => {
    const { default: DownloadPage } = await import("./app/descargar/page");

    const allowedHtml = renderToStaticMarkup(
      await DownloadPage({
        searchParams: Promise.resolve({
          target:
            "rastro://reportes/perdidos/11111111-1111-4111-8111-111111110001",
        }),
      }),
    );
    const authCallbackHtml = renderToStaticMarkup(
      await DownloadPage({
        searchParams: Promise.resolve({
          target:
            "rastro://auth/callback?cookie=better-auth.session_token%3Dattacker",
        }),
      }),
    );
    const arbitraryAppRouteHtml = renderToStaticMarkup(
      await DownloadPage({
        searchParams: Promise.resolve({
          target: "rastro://chats/55555555-5555-4555-8555-555555555555",
        }),
      }),
    );

    expect(allowedHtml).toContain(
      'href="rastro://reportes/perdidos/11111111-1111-4111-8111-111111110001"',
    );
    expect(authCallbackHtml).toContain('href="rastro://"');
    expect(authCallbackHtml).not.toContain("auth/callback");
    expect(authCallbackHtml).not.toContain("better-auth.session_token");
    expect(arbitraryAppRouteHtml).toContain('href="rastro://"');
    expect(arbitraryAppRouteHtml).not.toContain("rastro://chats");
  });

  it("ignores unsafe app-open targets", async () => {
    const { default: DownloadPage } = await import("./app/descargar/page");

    const html = renderToStaticMarkup(
      await DownloadPage({
        searchParams: Promise.resolve({
          target: "https://evil.example/open",
        }),
      }),
    );

    expect(html).toContain('href="rastro://"');
    expect(html).not.toContain("evil.example");
  });

  it("does not return visitors back to the download fallback", async () => {
    const { default: DownloadPage } = await import("./app/descargar/page");

    const html = renderToStaticMarkup(
      await DownloadPage({
        searchParams: Promise.resolve({
          returnTo: "/descargar/?context=report",
        }),
      }),
    );

    expect(html).toContain('href="/"');
    expect(html).not.toContain('href="/descargar/?context=report"');
  });
});
