import { describe, expect, it } from "vitest";

import { publicLostReportPathForId } from "@acme/validators";

import {
  buildPublicLostReportMetadata,
  getPublicLostReportViewModel,
} from "./public-lost-reports";

describe("public Lost Pet Report page data", () => {
  it("resolves a public report at the stable share route without exposing approximate exact location details", () => {
    const report = getPublicLostReportViewModel("lost-bruno-achumani");

    expect(report?.sharePath).toBe(
      publicLostReportPathForId("lost-bruno-achumani"),
    );
    expect(report?.pet.name).toBe("Bruno");
    expect(report?.photos).toHaveLength(2);
    expect(report?.publicLocation).toEqual({
      label: "Achumani, La Paz",
      privacyNote: "Zona aproximada compartida por seguridad.",
      type: "approximate",
    });
    expect(JSON.stringify(report)).not.toContain("Calle 17");
    expect(JSON.stringify(report)).not.toContain("-16.53622");
  });

  it("exposes exact address and coordinates only when the public report opts in", () => {
    const report = getPublicLostReportViewModel("lost-luna-obrajes");

    expect(report?.publicLocation).toEqual({
      address: "Calle 8 de Obrajes, La Paz",
      coordinates: {
        latitude: -16.52177,
        longitude: -68.11085,
      },
      label: "Calle 8 de Obrajes, La Paz",
      privacyNote: "Ubicacion exacta compartida por la persona cuidadora.",
      type: "exact",
    });
  });

  it("builds Spanish social metadata for a public report", () => {
    const metadata = buildPublicLostReportMetadata(
      "lost-bruno-achumani",
      "https://rastro.bo/",
    );

    expect(metadata).toMatchObject({
      alternates: {
        canonical: "https://rastro.bo/reportes/perdidos/lost-bruno-achumani",
      },
      description:
        "Ayuda a encontrar a Bruno, Perro Mestizo mediano. Ultima vez visto en zona aproximada: Achumani, La Paz.",
      openGraph: {
        description:
          "Ayuda a encontrar a Bruno, Perro Mestizo mediano. Ultima vez visto en zona aproximada: Achumani, La Paz.",
        images: [
          {
            alt: "Bruno, perro mestizo color miel",
            url: "https://images.unsplash.com/photo-1552053831-71594a27632d",
          },
        ],
        locale: "es_BO",
        siteName: "Rastro",
        title: "Bruno esta perdido en Achumani, La Paz | Rastro",
        type: "article",
        url: "https://rastro.bo/reportes/perdidos/lost-bruno-achumani",
      },
      title: "Bruno esta perdido en Achumani, La Paz | Rastro",
      twitter: {
        card: "summary_large_image",
        description:
          "Ayuda a encontrar a Bruno, Perro Mestizo mediano. Ultima vez visto en zona aproximada: Achumani, La Paz.",
        images: ["https://images.unsplash.com/photo-1552053831-71594a27632d"],
        title: "Bruno esta perdido en Achumani, La Paz | Rastro",
      },
    });
  });

  it("returns the public detail content, selected contact options, and app prompts", () => {
    const report = getPublicLostReportViewModel("lost-bruno-achumani");

    expect(report).toMatchObject({
      appPrompts: {
        downloadHref: "https://rastro.bo/descargar",
        downloadLabel: "Descargar Rastro",
        openHref: "rastro://reportes/perdidos/lost-bruno-achumani",
        openLabel: "Abrir en la app",
      },
      contactOptions: [
        {
          href: "https://wa.me/59176543210",
          kind: "whatsapp",
          label: "Escribir por WhatsApp",
        },
        {
          href: "rastro://reportes/perdidos/lost-bruno-achumani",
          kind: "app-chat",
          label: "Enviar mensaje en Rastro",
        },
      ],
      description:
        "Es sociable, responde a su nombre y llevaba collar azul. Puede estar asustado por el trafico.",
      lastSeen: {
        label: "Visto por ultima vez",
        value: "15 de junio de 2026, 18:40",
      },
      statusLabel: "Reporte activo",
      title: "Bruno esta perdido",
    });
  });
});
