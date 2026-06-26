import { describe, expect, it } from "vitest";

import {
  parseCreateProviderInput,
  parseUpdateProviderInput,
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
        contactKind0: "phone",
        contactLabel0: "Llamar",
        contactValue0: "+591 2 222 1111",
        contactKind1: "whatsapp",
        contactLabel1: "WhatsApp",
        contactValue1: "+591 70000001",
        contactKind2: "email",
        contactLabel2: "Correo",
        contactValue2: "contacto@sanroque.example",
        websiteUrl: "https://sanroque.example.com",
        logoUrl: "https://example.com/logo.png",
        photoUrl: "https://example.com/photo.png",
        socialLinkLabel0: "Instagram",
        socialLinkUrl0: "https://instagram.example.com/sanroque",
        externalLinkLabel0: "Ficha municipal",
        externalLinkUrl0: "https://municipio.example.com/sanroque",
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
        logoUrl: "https://example.com/logo.png",
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
        contactKind0: "phone",
        contactLabel0: "Llamar",
        contactValue0: "+591 2 222 1111",
        contactKind1: "whatsapp",
        contactLabel1: "WhatsApp",
        contactValue1: "+591 70000001",
        contactKind2: "email",
        contactLabel2: "Correo",
        contactValue2: "contacto@sanroque.example",
        websiteUrl: "https://sanroque.example.com",
        socialLinkLabel0: "Instagram",
        socialLinkUrl0: "https://instagram.example.com/sanroque",
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
        contactKind0: "whatsapp",
        contactLabel0: "WhatsApp",
        socialLinkUrl0: "https://instagram.example.com/sanroque",
      }),
    );

    expect(result).toEqual({
      ok: false,
      fieldErrors: [
        {
          field: "contactValue0",
          message: "Este campo es obligatorio.",
        },
        {
          field: "contactOptions",
          message: "Registra al menos una opcion de contacto.",
        },
        {
          field: "socialLinkLabel0",
          message: "Este campo es obligatorio.",
        },
      ],
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
