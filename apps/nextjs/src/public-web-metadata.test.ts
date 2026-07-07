import { describe, expect, it, vi } from "vitest";

vi.mock("~/env", () => ({
  env: {
    NODE_ENV: "development",
    VERCEL_ENV: "development",
    VERCEL_PROJECT_PRODUCTION_URL: undefined,
    VERCEL_URL: undefined,
  },
}));

describe("public web metadata", () => {
  it("keeps production metadata off localhost", async () => {
    const { resolveCanonicalPublicWebBaseUrl, resolvePublicMetadataBaseUrl } =
      await import("./public-web-url");

    expect(
      resolvePublicMetadataBaseUrl({
        NODE_ENV: "production",
        VERCEL_ENV: "development",
        VERCEL_PROJECT_PRODUCTION_URL: undefined,
        VERCEL_URL: undefined,
      }),
    ).toBe("https://rastro.bo");
    expect(
      resolveCanonicalPublicWebBaseUrl({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "www.rastro.bo/",
        VERCEL_URL: "rastro-git-main.vercel.app",
      }),
    ).toBe("https://www.rastro.bo");
  });

  it("uses preview URLs for preview metadata only", async () => {
    const { resolvePublicMetadataBaseUrl } = await import("./public-web-url");

    expect(
      resolvePublicMetadataBaseUrl({
        NODE_ENV: "development",
        VERCEL_ENV: "preview",
        VERCEL_PROJECT_PRODUCTION_URL: "rastro.bo",
        VERCEL_URL: "rastro-git-public-hardening.vercel.app",
      }),
    ).toBe("https://rastro-git-public-hardening.vercel.app");
  });

  it("publishes public crawl metadata for the static web shell", async () => {
    const [{ default: manifest }, { default: robots }, { default: sitemap }] =
      await Promise.all([
        import("./app/manifest"),
        import("./app/robots"),
        import("./app/sitemap"),
      ]);

    expect(manifest()).toMatchObject({
      description:
        "Red de recuperación de mascotas en Bolivia para reportes, adopciones responsables y recursos locales.",
      icons: [{ src: "/favicon.ico" }],
      id: "https://rastro.bo/",
      lang: "es-BO",
      name: "Rastro",
      start_url: "/",
    });
    expect(robots()).toMatchObject({
      host: "https://rastro.bo",
      rules: {
        allow: "/",
        disallow: ["/admin", "/api"],
        userAgent: "*",
      },
      sitemap: "https://rastro.bo/sitemap.xml",
    });
    expect(sitemap()).toEqual([
      {
        changeFrequency: "monthly",
        priority: 1,
        url: "https://rastro.bo/",
      },
      {
        changeFrequency: "monthly",
        priority: 0.9,
        url: "https://rastro.bo/descargar",
      },
      {
        changeFrequency: "monthly",
        priority: 0.4,
        url: "https://rastro.bo/privacidad",
      },
      {
        changeFrequency: "monthly",
        priority: 0.4,
        url: "https://rastro.bo/terminos",
      },
      {
        changeFrequency: "monthly",
        priority: 0.3,
        url: "https://rastro.bo/eliminar-cuenta",
      },
    ]);
  });
});
