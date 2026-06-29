import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AdminMediaUploadField,
  adminMediaUploadStateLabels,
} from "./admin-media-upload-field";

describe("AdminMediaUploadField", () => {
  it("renders the reusable managed media upload controls and Spanish state labels", () => {
    const html = renderToStaticMarkup(
      <form>
        <AdminMediaUploadField
          assetFieldName="logoAssetId"
          currentUrl="https://cdn.rastro.bo/provider-logo.webp"
          description="Logo cuadrado o compacto del proveedor."
          id="provider-logo-upload"
          label="Logo administrado"
          previewAlt="Logo de Clinica Veterinaria San Roque"
          purpose="provider_logo"
        />
      </form>,
    );

    expect(adminMediaUploadStateLabels).toEqual({
      failed: "Falló la carga",
      idle: "Sin archivo seleccionado",
      pending: "Carga pendiente",
      ready: "Listo para guardar",
      removed: "Retirado",
    });
    expect(html).toContain('data-admin-media-upload="provider_logo"');
    expect(html).toContain('name="logoAssetId"');
    expect(html).toContain('type="hidden"');
    expect(html).toContain("Logo administrado");
    expect(html).toContain("Logo cuadrado o compacto del proveedor.");
    expect(html).toContain('data-admin-media-status="idle"');
    expect(html).toContain("Sin archivo seleccionado");
    expect(html).toContain("Selecciona o reemplaza el archivo antes de guardar.");
    expect(html).toContain('accept="image/jpeg,image/png,image/webp,image/heic,image/heif"');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="0"');
    expect(html).toContain("https://cdn.rastro.bo/provider-logo.webp");
    expect(html).toContain("Reintentar");
    expect(html).toContain("Reemplazar");
    expect(html).toContain("Retirar");
  });

  it("restores a submitted ready asset ID after a failed form render", () => {
    const html = renderToStaticMarkup(
      <form>
        <AdminMediaUploadField
          assetFieldName="logoAssetId"
          currentUrl="https://cdn.rastro.bo/provider-logo.webp"
          description="Logo cuadrado o compacto del proveedor."
          id="provider-logo-upload"
          initialAssetId="11111111-1111-4111-8111-111111111111"
          label="Logo administrado"
          previewAlt="Logo de Clinica Veterinaria San Roque"
          purpose="provider_logo"
        />
      </form>,
    );

    expect(html).toContain('data-admin-media-status="ready"');
    expect(html).toContain("Listo para guardar");
    expect(html).toMatch(
      /<input type="hidden" name="logoAssetId" value="11111111-1111-4111-8111-111111111111"\/>/,
    );
    expect(html).toContain(
      "Archivo verificado. Se guardará al enviar el formulario.",
    );
    expect(html).toContain("Reemplazar");
    expect(html).toContain("Retirar");
  });
});
