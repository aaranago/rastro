import { describe, expect, it, vi } from "vitest";

import {
  publicFoundReportPathForId,
  publicSightingReportPathForId,
} from "@acme/validators";

import type { PublicReportDetail } from "./public-report-detail-api-adapter";
import {
  buildPublicFoundReportMetadata,
  buildPublicSightingReportMetadata,
  getPublicFoundReportViewModel,
  getPublicSightingReportViewModel,
} from "./public-community-reports";

const privateCoordinateLabel = "Pin manual -16.506789, -68.123456";

function publicReportDetail(
  overrides: Partial<PublicReportDetail> = {},
): PublicReportDetail {
  return {
    id: "33333333-3333-4333-8333-333333330001",
    type: "found_pet",
    status: "active",
    outcome: null,
    title: "Luna fue encontrada en Sopocachi DB",
    description:
      "Luna estaba tranquila y llevaba una pañoleta roja cerca de la plaza.",
    pet: {
      name: "Luna",
      species: "dog",
      breed: "Mestiza joven",
      color: "blanca",
      size: "mediana",
      distinguishingTraits: null,
    },
    eventOccurredAt: new Date("2026-06-19T22:40:00.000Z"),
    contact: {
      actions: [
        {
          href: "rastro://chats/report/33333333-3333-4333-8333-333333330001",
          kind: "in_app_chat",
        },
        {
          href: "https://wa.me/59171234567",
          kind: "whatsapp",
        },
      ],
      preference: "both",
      hasWhatsapp: true,
    },
    location: {
      latitude: -16.506789,
      longitude: -68.123456,
      precision: "approximate",
      label: "Sopocachi, La Paz",
      locationCell: "bo-lpb-sopocachi",
    },
    media: [
      {
        id: "media-luna-1",
        objectKey: "reports/luna-1.jpg",
        canonicalUrl: "https://cdn.rastro.bo/reports/luna-1.jpg",
        thumbnailObjectKey: null,
        mimeType: "image/jpeg",
        width: 1200,
        height: 900,
        sizeBytes: 200000,
        altText: "Luna, perrita blanca encontrada",
        position: 0,
      },
    ],
    owner: {
      isCurrentMember: false,
    },
    createdAt: new Date("2026-06-19T23:15:00.000Z"),
    updatedAt: new Date("2026-06-19T23:15:00.000Z"),
    resolvedAt: null,
    ...overrides,
  };
}

describe("public found and sighting report page data", () => {
  it("maps a persisted found report to its stable public web route", async () => {
    const loadReportDetail = vi.fn().mockResolvedValue(publicReportDetail());

    const report = await getPublicFoundReportViewModel(
      "33333333-3333-4333-8333-333333330001",
      loadReportDetail,
    );

    expect(loadReportDetail).toHaveBeenCalledWith(
      "33333333-3333-4333-8333-333333330001",
    );
    expect(report?.sharePath).toBe(
      publicFoundReportPathForId("33333333-3333-4333-8333-333333330001"),
    );
    expect(report).toMatchObject({
      appPrompts: {
        downloadHref:
          "https://rastro.bo/descargar?context=report&returnTo=%2Freportes%2Fencontrados%2F33333333-3333-4333-8333-333333330001&target=rastro%3A%2F%2Freportes%2Fencontrados%2F33333333-3333-4333-8333-333333330001",
        downloadLabel: "Instalar o abrir Rastro",
        openHref:
          "rastro://reportes/encontrados/33333333-3333-4333-8333-333333330001",
        openLabel: "Abrir en la app",
      },
      contactOptions: [
        {
          href: "rastro://chats/report/33333333-3333-4333-8333-333333330001",
          kind: "app-chat",
          label: "Enviar mensaje en Rastro",
        },
        {
          href: "https://wa.me/59171234567",
          kind: "whatsapp",
          label: "Escribir por WhatsApp",
        },
      ],
      description:
        "Luna estaba tranquila y llevaba una pañoleta roja cerca de la plaza.",
      descriptionLabel: "Descripción del encuentro",
      event: {
        label: "Encontrado",
        value: "19 de junio de 2026, 18:40",
      },
      pet: {
        breed: "Mestiza joven - blanca - mediana",
        name: "Luna",
        type: "Perro",
      },
      publicLocation: {
        label: "Sopocachi, La Paz",
        privacyNote: "Zona aproximada compartida por seguridad.",
        type: "approximate",
      },
      statusLabel: "Mascota encontrada",
      title: "Luna fue encontrada en Sopocachi DB",
    });
  });

  it("maps a persisted sighting report to its stable public web route", async () => {
    const report = await getPublicSightingReportViewModel(
      "44444444-4444-4444-8444-444444440001",
      () =>
        Promise.resolve(
          publicReportDetail({
            id: "44444444-4444-4444-8444-444444440001",
            type: "sighting",
            title: "Toby fue visto en Miraflores DB",
            description:
              "Caminaba hacia la plaza y parecía desorientado pero sin heridas visibles.",
            pet: {
              name: "Toby",
              species: "dog",
              breed: "Mediano",
              color: "cafe",
              size: "mediano",
              distinguishingTraits: null,
            },
          }),
        ),
    );

    expect(report?.sharePath).toBe(
      publicSightingReportPathForId("44444444-4444-4444-8444-444444440001"),
    );
    expect(report).toMatchObject({
      appPrompts: {
        openHref:
          "rastro://reportes/avistamientos/44444444-4444-4444-8444-444444440001",
      },
      description:
        "Caminaba hacia la plaza y parecía desorientado pero sin heridas visibles.",
      descriptionLabel: "Descripción del avistamiento",
      event: {
        label: "Avistado",
        value: "19 de junio de 2026, 18:40",
      },
      pet: {
        breed: "Mediano - cafe",
        name: "Toby",
        type: "Perro",
      },
      statusLabel: "Avistamiento activo",
      title: "Toby fue visto en Miraflores DB",
    });
  });

  it("returns null for wrong report types, hidden reports, and unknown reports", async () => {
    await expect(
      getPublicFoundReportViewModel(
        "44444444-4444-4444-8444-444444440001",
        () =>
          Promise.resolve(
            publicReportDetail({
              id: "44444444-4444-4444-8444-444444440001",
              type: "sighting",
            }),
          ),
      ),
    ).resolves.toBeNull();

    await expect(
      getPublicSightingReportViewModel(
        "55555555-5555-4555-8555-555555550001",
        () => Promise.resolve(null),
      ),
    ).resolves.toBeNull();
  });

  it("builds Spanish social metadata without coordinate leakage", async () => {
    const metadata = await buildPublicFoundReportMetadata(
      "33333333-3333-4333-8333-333333330001",
      "https://rastro.bo/",
      () =>
        Promise.resolve(
          publicReportDetail({
            location: {
              latitude: -16.506789,
              longitude: -68.123456,
              precision: "approximate",
              label: privateCoordinateLabel,
              locationCell: "bo-lpb-sopocachi",
            },
          }),
        ),
    );

    expect(metadata).toMatchObject({
      alternates: {
        canonical:
          "https://rastro.bo/reportes/encontrados/33333333-3333-4333-8333-333333330001",
      },
      openGraph: {
        locale: "es_BO",
        siteName: "Rastro",
        title:
          "Mascota encontrada: Luna en bo lpb sopocachi - zona aproximada | Rastro",
        type: "article",
      },
      title:
        "Mascota encontrada: Luna en bo lpb sopocachi - zona aproximada | Rastro",
    });
    expect(JSON.stringify(metadata)).not.toContain(privateCoordinateLabel);
    expect(JSON.stringify(metadata)).not.toContain("-16.506789");
    expect(JSON.stringify(metadata)).not.toContain("-68.123456");

    await expect(
      buildPublicSightingReportMetadata(
        "77777777-7777-4777-8777-777777770001",
        "https://rastro.bo",
        () => Promise.resolve(null),
      ),
    ).resolves.toBeNull();
  });
});
