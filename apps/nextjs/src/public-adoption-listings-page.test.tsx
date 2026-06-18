import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const commerceTerms =
  /precio|fee|payment|deposit|bidding|checkout|compra|comprar|venta|vender|marketplace/i;

describe("public Adoption Listing page", () => {
  it("renders Spanish non-monetary adoption details with an optional verification badge", async () => {
    const { default: PublicAdoptionListingPage } = await import(
      "./app/adopciones/[listingId]/page"
    );

    const html = renderToStaticMarkup(
      await PublicAdoptionListingPage({
        params: Promise.resolve({
          listingId: "adopt-nala-sopocachi",
        }),
      }),
    );

    expect(html).toContain("En adopcion");
    expect(html).toContain("Nala busca nuevo hogar");
    expect(html).toContain("Gato - Mestiza joven");
    expect(html).toContain("Organizacion verificada");
    expect(html).toContain("Identidad verificada por Rastro.");
    expect(html).toContain("Enviar mensaje en Rastro");
    expect(html).toContain("Escribir por WhatsApp");
    expect(html).not.toMatch(commerceTerms);
  });
});
