import { describe, expect, it } from "vitest";

import {
  parseArchiveProviderInput,
  parseAttachSponsorInput,
  parseCreateProviderInput,
  parseUpdateProviderInput,
  parseVerificationInput,
} from "./admin-resource-provider-form-parser";

describe("admin resource provider form parser", () => {
  it("parses create forms with structured location, three contacts, and links", () => {
    const result = parseCreateProviderInput(
      formData({
        name: "Clinica Veterinaria San Roque",
        category: "veterinary",
        description: "Veterinaria local con atencion general y urgencias.",
        shortDescription:
          "Atencion veterinaria general y orientacion para familias cuidadoras.",
        department: "La Paz",
        city: "La Paz",
        exactLatitude: "-16.510231",
        exactLongitude: "-68.123881",
        approximateLocationLabel: "Sopocachi, La Paz",
        locationCell: "bo-lpb-sopocachi",
        addressLabel: "Plaza Abaroa, La Paz",
        serviceAreaLabel: "Atiende La Paz y El Alto",
        hoursLabel: "Lun - Dom: 24 horas",
        "contactOptions.0.kind": "phone",
        "contactOptions.0.label": "Llamar",
        "contactOptions.0.value": "+591 2 222 1111",
        "contactOptions.1.kind": "whatsapp",
        "contactOptions.1.label": "WhatsApp",
        "contactOptions.1.value": "+591 70000001",
        "contactOptions.2.kind": "email",
        "contactOptions.2.label": "Correo",
        "contactOptions.2.value": "contacto@sanroque.example",
        websiteUrl: "https://sanroque.example.com",
        logoAssetId: "11111111-1111-4111-8111-111111111111",
        logoUrl: "https://example.com/logo.png",
        photoAssetId: "22222222-2222-4222-8222-222222222222",
        photoUrl: "https://example.com/photo.png",
        "socialLinks.0.label": "Instagram",
        "socialLinks.0.url": "https://instagram.example.com/sanroque",
        "externalLinks.0.label": "Ficha municipal",
        "externalLinks.0.url": "https://municipio.example.com/sanroque",
        emergencyAvailable: "on",
      }),
    );

    expect(result).toMatchObject({
      ok: true,
      input: {
        contactOptions: [
          {
            kind: "phone",
            label: "Llamar",
          },
          {
            kind: "whatsapp",
            label: "WhatsApp",
          },
          {
            kind: "email",
            label: "Correo",
          },
        ],
        location: {
          city: "La Paz",
          department: "La Paz",
          exactLatitude: -16.510231,
          exactLongitude: -68.123881,
        },
        logoAssetId: "11111111-1111-4111-8111-111111111111",
        logoUrl: "https://example.com/logo.png",
        photoAssetId: "22222222-2222-4222-8222-222222222222",
        photoUrl: "https://example.com/photo.png",
        socialLinks: [
          {
            label: "Instagram",
            url: "https://instagram.example.com/sanroque",
          },
        ],
        externalLinks: [
          {
            label: "Ficha municipal",
            url: "https://municipio.example.com/sanroque",
          },
        ],
      },
    });
  });

  it("parses edit forms without deleting existing contacts when only description changes", () => {
    const result = parseUpdateProviderInput(
      formData({
        providerId: "11111111-1111-4111-8111-111111111111",
        name: "Clinica Veterinaria San Roque",
        category: "veterinary",
        description:
          "Veterinaria local con atencion general, urgencias y orientacion.",
        shortDescription:
          "Atencion veterinaria general y orientacion para familias cuidadoras.",
        department: "La Paz",
        city: "La Paz",
        approximateLocationLabel: "Sopocachi, La Paz",
        locationCell: "bo-lpb-sopocachi",
        serviceAreaLabel: "Atiende La Paz y El Alto",
        hoursLabel: "Lun - Dom: 24 horas",
        "contactOptions.0.kind": "phone",
        "contactOptions.0.label": "Llamar",
        "contactOptions.0.value": "+591 2 222 1111",
        "contactOptions.1.kind": "whatsapp",
        "contactOptions.1.label": "WhatsApp",
        "contactOptions.1.value": "+591 70000001",
        "contactOptions.2.kind": "email",
        "contactOptions.2.label": "Correo",
        "contactOptions.2.value": "contacto@sanroque.example",
        websiteUrl: "https://sanroque.example.com",
        "socialLinks.0.label": "Instagram",
        "socialLinks.0.url": "https://instagram.example.com/sanroque",
      }),
    );

    expect(result).toMatchObject({
      ok: true,
      input: {
        description:
          "Veterinaria local con atencion general, urgencias y orientacion.",
        contactOptions: [
          {
            kind: "phone",
            label: "Llamar",
            value: "+591 2 222 1111",
          },
          {
            kind: "whatsapp",
            label: "WhatsApp",
            value: "+591 70000001",
          },
          {
            kind: "email",
            label: "Correo",
            value: "contacto@sanroque.example",
          },
        ],
        location: {
          city: "La Paz",
          department: "La Paz",
        },
      },
    });
  });

  it("preserves existing provider media when edit forms omit media URL fields", () => {
    const result = parseUpdateProviderInput(
      formData({
        providerId: "11111111-1111-4111-8111-111111111111",
        name: "Clinica Veterinaria San Roque",
        category: "veterinary",
        description:
          "Veterinaria local con atencion general, urgencias y orientacion.",
        shortDescription:
          "Atencion veterinaria general y orientacion para familias cuidadoras.",
        department: "La Paz",
        city: "La Paz",
        approximateLocationLabel: "Sopocachi, La Paz",
        locationCell: "bo-lpb-sopocachi",
        serviceAreaLabel: "Atiende La Paz y El Alto",
        hoursLabel: "Lun - Dom: 24 horas",
        "contactOptions.0.kind": "phone",
        "contactOptions.0.label": "Llamar",
        "contactOptions.0.value": "+591 2 222 1111",
      }),
    );

    if (!result.ok) {
      throw new Error("Expected parser to accept edit form.");
    }

    expect(result.input.logoUrl).toBeUndefined();
    expect(result.input.photoUrl).toBeUndefined();
    expect(result.input.websiteUrl).toBeUndefined();
  });

  it("clears provider media only when edit forms submit blank media URL fields", () => {
    const result = parseUpdateProviderInput(
      formData({
        providerId: "11111111-1111-4111-8111-111111111111",
        name: "Clinica Veterinaria San Roque",
        category: "veterinary",
        description:
          "Veterinaria local con atencion general, urgencias y orientacion.",
        shortDescription:
          "Atencion veterinaria general y orientacion para familias cuidadoras.",
        department: "La Paz",
        city: "La Paz",
        approximateLocationLabel: "Sopocachi, La Paz",
        locationCell: "bo-lpb-sopocachi",
        serviceAreaLabel: "Atiende La Paz y El Alto",
        hoursLabel: "Lun - Dom: 24 horas",
        logoUrl: "",
        photoUrl: "",
        "contactOptions.0.kind": "phone",
        "contactOptions.0.label": "Llamar",
        "contactOptions.0.value": "+591 2 222 1111",
      }),
    );

    expect(result).toMatchObject({
      ok: true,
      input: {
        logoUrl: null,
        photoUrl: null,
      },
    });
  });

  it("parses field-array contact and link order after reorder and remove", () => {
    const result = parseUpdateProviderInput(
      formData({
        providerId: "11111111-1111-4111-8111-111111111111",
        name: "Clinica Veterinaria San Roque",
        category: "veterinary",
        description:
          "Veterinaria local con atencion general, urgencias y orientacion.",
        shortDescription:
          "Atencion veterinaria general y orientacion para familias cuidadoras.",
        department: "La Paz",
        city: "La Paz",
        approximateLocationLabel: "Sopocachi, La Paz",
        locationCell: "bo-lpb-sopocachi",
        serviceAreaLabel: "Atiende La Paz y El Alto",
        hoursLabel: "Lun - Dom: 24 horas",
        "contactOptions.0.kind": "email",
        "contactOptions.0.label": "Correo",
        "contactOptions.0.value": "contacto@sanroque.example",
        "contactOptions.1.kind": "phone",
        "contactOptions.1.label": "Llamar",
        "contactOptions.1.value": "+591 2 222 1111",
        "externalLinks.0.label": "Ficha municipal",
        "externalLinks.0.url": "https://municipio.example.com/sanroque",
      }),
    );

    expect(result).toMatchObject({
      ok: true,
      input: {
        contactOptions: [
          {
            kind: "email",
            label: "Correo",
          },
          {
            kind: "phone",
            label: "Llamar",
          },
        ],
        externalLinks: [
          {
            label: "Ficha municipal",
          },
        ],
        socialLinks: null,
      },
    });
  });

  it("reports field-level errors for incomplete contact and link rows", () => {
    const result = parseCreateProviderInput(
      formData({
        name: "Clinica Veterinaria San Roque",
        category: "veterinary",
        description: "Veterinaria local con atencion general y urgencias.",
        shortDescription:
          "Atencion veterinaria general y orientacion para familias cuidadoras.",
        department: "La Paz",
        city: "La Paz",
        exactLatitude: "-16.510231",
        exactLongitude: "-68.123881",
        approximateLocationLabel: "Sopocachi, La Paz",
        locationCell: "bo-lpb-sopocachi",
        serviceAreaLabel: "Atiende La Paz y El Alto",
        hoursLabel: "Lun - Dom: 24 horas",
        "contactOptions.0.kind": "whatsapp",
        "contactOptions.0.label": "WhatsApp",
        "socialLinks.0.url": "https://instagram.example.com/sanroque",
      }),
    );

    expect(result).toEqual({
      ok: false,
      fieldErrors: [
        {
          field: "contactOptions.0.value",
          message: "Este campo es obligatorio.",
        },
        {
          field: "contactOptions",
          message: "Registra al menos una opcion de contacto.",
        },
        {
          field: "socialLinks.0.label",
          message: "Este campo es obligatorio.",
        },
      ],
    });
  });

  it("parses verification changes with their own note", () => {
    const result = parseVerificationInput(
      formData({
        providerId: "11111111-1111-4111-8111-111111111111",
        verificationStatus: "verified",
        verificationNote: " Identidad confirmada con licencia municipal. ",
      }),
    );

    expect(result).toEqual({
      ok: true,
      input: {
        providerId: "11111111-1111-4111-8111-111111111111",
        status: "verified",
        note: "Identidad confirmada con licencia municipal.",
      },
    });
  });

  it("reports sponsor date errors at field level", () => {
    const result = parseAttachSponsorInput(
      formData({
        providerId: "11111111-1111-4111-8111-111111111111",
        sponsorSurface: "resources_directory",
        startsOn: "2026-07-31",
        endsOn: "2026-07-01",
      }),
    );

    expect(result).toEqual({
      ok: false,
      fieldErrors: [
        {
          field: "endsOn",
          message:
            "La fecha final debe ser posterior o igual a la fecha inicial.",
        },
      ],
    });
  });

  it("parses sponsor media URL fallbacks and reports invalid URLs", () => {
    expect(
      parseAttachSponsorInput(
        formData({
          providerId: "11111111-1111-4111-8111-111111111111",
          sponsorSurface: "resources_directory",
          sponsorLabel: "Patrocinado",
          sponsorDisclosure:
            "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
          logoAssetId: "11111111-1111-4111-8111-111111111111",
          logoUrl: "https://example.com/sponsor-logo.png",
          imageAssetId: "22222222-2222-4222-8222-222222222222",
          imageUrl: "https://example.com/sponsor-banner.png",
          startsOn: "2026-07-01",
          endsOn: "2026-07-31",
        }),
      ),
    ).toMatchObject({
      ok: true,
      input: {
        logoAssetId: "11111111-1111-4111-8111-111111111111",
        logoUrl: "https://example.com/sponsor-logo.png",
        imageAssetId: "22222222-2222-4222-8222-222222222222",
        imageUrl: "https://example.com/sponsor-banner.png",
      },
    });

    expect(
      parseAttachSponsorInput(
        formData({
          providerId: "11111111-1111-4111-8111-111111111111",
          sponsorSurface: "resources_directory",
          imageUrl: "nota-url",
          startsOn: "2026-07-01",
          endsOn: "2026-07-31",
        }),
      ),
    ).toEqual({
      ok: false,
      fieldErrors: [
        {
          field: "imageUrl",
          message: "Ingresa una URL válida.",
        },
      ],
    });
  });

  it("requires explicit archive confirmation", () => {
    expect(
      parseArchiveProviderInput(
        formData({
          providerId: "11111111-1111-4111-8111-111111111111",
        }),
      ),
    ).toEqual({
      ok: false,
      fieldErrors: [
        {
          field: "archiveConfirmation",
          message: "Confirma que quieres archivar este proveedor.",
        },
      ],
    });

    expect(
      parseArchiveProviderInput(
        formData({
          providerId: "11111111-1111-4111-8111-111111111111",
          archiveConfirmation: "confirmed",
        }),
      ),
    ).toEqual({
      ok: true,
      input: {
        providerId: "11111111-1111-4111-8111-111111111111",
      },
    });
  });
});

function formData(values: Record<string, string>) {
  const data = new FormData();

  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }

  return data;
}
