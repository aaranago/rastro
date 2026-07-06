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
          returnTo: "/adopciones/adoption-nala-db",
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
    expect(html).toContain("Sigue esta adopcion en Rastro");
    expect(html).toContain('href="rastro://"');
    expect(html).toContain('href="/adopciones/adoption-nala-db"');
    expect(html).toContain("Reportes");
    expect(html).toContain("Adopciones");
    expect(html).toContain("Recursos");
    expect(html).toContain("La descarga publica de Rastro");
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
