import { describe, expect, it, vi } from "vitest";

import { publicLostReportPathForId } from "@acme/validators";

import type { PublicReportDetail } from "./public-report-detail-api-adapter";
import {
  buildPublicLostReportMetadata,
  getPublicLostReportViewModel,
} from "./public-lost-reports";

const privateCoordinateLabel = "Pin manual -16.536229, -68.073419";

function publicReportDetail(
  overrides: Partial<PublicReportDetail> = {},
): PublicReportDetail {
  return {
    id: "11111111-1111-4111-8111-111111110001",
    type: "lost_pet",
    status: "active",
    outcome: null,
    title: "Bruno está perdido en Achumani DB",
    description:
      "Bruno responde a su nombre y llevaba collar azul. Puede estar asustado por el trafico.",
    pet: {
      name: "Bruno",
      species: "dog",
      breed: "Mestizo",
      color: "miel",
      size: "mediano",
      distinguishingTraits: null,
    },
    eventOccurredAt: new Date("2026-06-19T22:40:00.000Z"),
    contact: {
      actions: [
        {
          href: "https://wa.me/59176543210",
          kind: "whatsapp",
        },
        {
          href: "rastro://reportes/perdidos/11111111-1111-4111-8111-111111110001",
          kind: "in_app_chat",
        },
      ],
      preference: "both",
      hasWhatsapp: true,
    },
    location: {
      latitude: -16.536229,
      longitude: -68.073419,
      precision: "approximate",
      label: "Achumani, La Paz",
      locationCell: "bo-lpb-achumani",
    },
    media: [
      {
        id: "media-bruno-2",
        objectKey: "reports/bruno-2.jpg",
        canonicalUrl: "https://cdn.rastro.bo/reports/bruno-2.jpg",
        thumbnailObjectKey: null,
        mimeType: "image/jpeg",
        width: 1200,
        height: 900,
        sizeBytes: 200000,
        altText: "Bruno con collar azul",
        position: 1,
      },
      {
        id: "media-bruno-1",
        objectKey: "reports/bruno-1.jpg",
        canonicalUrl: "https://cdn.rastro.bo/reports/bruno-1.jpg",
        thumbnailObjectKey: null,
        mimeType: "image/jpeg",
        width: 1200,
        height: 900,
        sizeBytes: 200000,
        altText: "Bruno, perro mestizo color miel",
        position: 0,
      },
    ],
    owner: {
      isCurrentMember: false,
    },
    createdAt: new Date("2026-06-19T22:45:00.000Z"),
    updatedAt: new Date("2026-06-19T22:45:00.000Z"),
    resolvedAt: null,
    ...overrides,
  };
}

describe("public Lost Pet Report page data", () => {
  it("maps a persisted lost report at the stable share route", async () => {
    const loadReportDetail = vi.fn().mockResolvedValue(publicReportDetail());

    const report = await getPublicLostReportViewModel(
      "11111111-1111-4111-8111-111111110001",
      loadReportDetail,
    );

    expect(loadReportDetail).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111110001",
    );
    expect(report?.sharePath).toBe(
      publicLostReportPathForId("11111111-1111-4111-8111-111111110001"),
    );
    expect(report).toMatchObject({
      abuseReport: {
        isOwner: false,
        reportId: "11111111-1111-4111-8111-111111110001",
      },
      appPrompts: {
        downloadHref:
          "https://rastro.bo/descargar?context=report&returnTo=%2Freportes%2Fperdidos%2F11111111-1111-4111-8111-111111110001&target=rastro%3A%2F%2Freportes%2Fperdidos%2F11111111-1111-4111-8111-111111110001",
        downloadLabel: "Instalar o abrir Rastro",
        openHref:
          "https://rastro.bo/descargar?context=report&returnTo=%2Freportes%2Fperdidos%2F11111111-1111-4111-8111-111111110001&target=rastro%3A%2F%2Freportes%2Fperdidos%2F11111111-1111-4111-8111-111111110001",
        openLabel: "Abrir en la app",
      },
      contactOptions: [
        {
          href: "https://wa.me/59176543210",
          kind: "whatsapp",
          label: "Escribir por WhatsApp",
        },
        {
          href: "https://rastro.bo/descargar?context=report&returnTo=%2Freportes%2Fperdidos%2F11111111-1111-4111-8111-111111110001&target=rastro%3A%2F%2Fchats%2Freport%2F11111111-1111-4111-8111-111111110001",
          kind: "app-chat",
          label: "Enviar mensaje en Rastro",
        },
      ],
      description:
        "Bruno responde a su nombre y llevaba collar azul. Puede estar asustado por el trafico.",
      lastSeen: {
        label: "Visto por última vez",
        value: "19 de junio de 2026, 18:40",
      },
      pet: {
        breed: "Mestizo - miel - mediano",
        name: "Bruno",
        type: "Perro",
      },
      photos: [
        {
          alt: "Bruno, perro mestizo color miel",
          src: "https://cdn.rastro.bo/reports/bruno-1.jpg",
        },
        {
          alt: "Bruno con collar azul",
          src: "https://cdn.rastro.bo/reports/bruno-2.jpg",
        },
      ],
      publicLocation: {
        label: "Achumani, La Paz",
        privacyNote: "Zona aproximada compartida por seguridad.",
        type: "approximate",
      },
      statusLabel: "Reporte activo",
      title: "Bruno está perdido en Achumani DB",
    });
  });

  it("returns null for persisted reports with the wrong type", async () => {
    const report = await getPublicLostReportViewModel(
      "22222222-2222-4222-8222-222222220001",
      () =>
        Promise.resolve(
          publicReportDetail({
            id: "22222222-2222-4222-8222-222222220001",
            type: "adoption",
          }),
        ),
    );

    expect(report).toBeNull();
  });

  it("returns null when report.detail returns null for hidden, deleted, or unknown reports", async () => {
    const report = await getPublicLostReportViewModel(
      "55555555-5555-4555-8555-555555550001",
      () => Promise.resolve(null),
    );

    expect(report).toBeNull();
  });

  it("does not expose coordinate strings from public labels or public coordinates", async () => {
    const report = await getPublicLostReportViewModel(
      "11111111-1111-4111-8111-111111110001",
      () =>
        Promise.resolve(
          publicReportDetail({
            location: {
              latitude: -16.536229,
              longitude: -68.073419,
              precision: "approximate",
              label: privateCoordinateLabel,
              locationCell: "bo-lpb-achumani",
            },
          }),
        ),
    );

    const serializedReport = JSON.stringify(report);

    expect(report?.publicLocation.label).toBe(
      "bo lpb achumani - zona aproximada",
    );
    expect(serializedReport).not.toContain(privateCoordinateLabel);
    expect(serializedReport).not.toContain("-16.536229");
    expect(serializedReport).not.toContain("-68.073419");
    expect(serializedReport).not.toContain("coordinates");
  });

  it("builds Spanish social metadata for a persisted public report", async () => {
    const metadata = await buildPublicLostReportMetadata(
      "11111111-1111-4111-8111-111111110001",
      "https://rastro.bo/",
      () => Promise.resolve(publicReportDetail()),
    );

    expect(metadata).toMatchObject({
      alternates: {
        canonical:
          "https://rastro.bo/reportes/perdidos/11111111-1111-4111-8111-111111110001",
      },
      description:
        "Ayuda a encontrar a Bruno, Perro Mestizo - miel - mediano. Última vez visto en zona aproximada: Achumani, La Paz.",
      openGraph: {
        description:
          "Ayuda a encontrar a Bruno, Perro Mestizo - miel - mediano. Última vez visto en zona aproximada: Achumani, La Paz.",
        images: [
          {
            alt: "Bruno, perro mestizo color miel",
            url: "https://cdn.rastro.bo/reports/bruno-1.jpg",
          },
        ],
        locale: "es_BO",
        siteName: "Rastro",
        title: "Bruno está perdido en Achumani, La Paz | Rastro",
        type: "article",
        url: "https://rastro.bo/reportes/perdidos/11111111-1111-4111-8111-111111110001",
      },
      title: "Bruno está perdido en Achumani, La Paz | Rastro",
      twitter: {
        card: "summary_large_image",
        description:
          "Ayuda a encontrar a Bruno, Perro Mestizo - miel - mediano. Última vez visto en zona aproximada: Achumani, La Paz.",
        images: ["https://cdn.rastro.bo/reports/bruno-1.jpg"],
        title: "Bruno está perdido en Achumani, La Paz | Rastro",
      },
    });
    expect(JSON.stringify(metadata)).not.toContain("-16.536229");
    expect(JSON.stringify(metadata)).not.toContain("-68.073419");
  });
});
