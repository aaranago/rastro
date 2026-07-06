import { describe, expect, it } from "vitest";

import type { RouterInputs, RouterOutputs } from "@acme/api";
import { buildPublicLostReportShareTarget } from "@acme/validators";

import type {
  AdoptionListingSummary,
  FoundPetReportSummary,
  LostPetReportSummary,
  NearbyLostReportsResult,
  NearbyPublicReportKind,
  NearbyPublicReportSummary,
  NearbySearchLocation,
  SightingReportSummary,
} from "./nearby-types";
import type { NearbyLostReportsViewModel } from "./nearby-view-model";
import { createInMemoryLostPetReportRepository } from "../lost-reports/lost-reports";
import { createInMemoryLastLoadedCache } from "../resilience/last-loaded-cache";
import { createApiNearbyLostReportsAdapter } from "./nearby-api-adapter";
import { createNearbyLostReportRepositoryAdapter } from "./nearby-lost-report-repository-adapter";
import { shareNearbyLostReport } from "./nearby-share";
import { createCachedNearbyLostReportsAdapter } from "./nearby-stale-cache-adapter";
import { createStaticNearbyLostReportsAdapter } from "./nearby-static-adapter";
import { buildNearbyLostReportsViewModel } from "./nearby-view-model";

const manualLocation: NearbySearchLocation = {
  countryCode: "BO",
  label: "Zona Sur, La Paz",
  locationCellLabel: "Zona Sur",
  source: "manual",
};
const resolvedManualLocation: NearbySearchLocation = {
  ...manualLocation,
  coordinates: { latitude: -16.5, longitude: -68.1193 },
  manualLocationKind: "place",
};
const nearbyPublicIds = {
  adoptionNala: "22222222-2222-4222-8222-000000000001",
  apiAdoptionNala: "22222222-2222-4222-8222-000000000101",
  apiFoundCat: "33333333-3333-4333-8333-000000000101",
  apiLostBruno: "11111111-1111-4111-8111-000000000101",
  apiSightingDog: "44444444-4444-4444-8444-000000000101",
  apiVisibleToby: "11111111-1111-4111-8111-000000000102",
  cachedDeletedToby: "11111111-1111-4111-8111-000000000304",
  cachedFalseMarkedLuna: "11111111-1111-4111-8111-000000000302",
  cachedHiddenBruno: "11111111-1111-4111-8111-000000000301",
  cachedPendingReviewNala: "11111111-1111-4111-8111-000000000305",
  cachedUnavailableMichi: "11111111-1111-4111-8111-000000000303",
  foundCat: "33333333-3333-4333-8333-000000000001",
  lostBruno: "11111111-1111-4111-8111-000000000001",
  lostBrunoClosed: "11111111-1111-4111-8111-000000000202",
  lostLuna: "11111111-1111-4111-8111-000000000002",
  lostLunaActive: "11111111-1111-4111-8111-000000000203",
  lostRawManualPin: "11111111-1111-4111-8111-000000000201",
  repositoryToby: "11111111-1111-4111-8111-000000000001",
  sightingDog: "44444444-4444-4444-8444-000000000001",
} as const;

const reports: LostPetReportSummary[] = [
  {
    coordinates: { latitude: -16.5405, longitude: -68.0889 },
    id: nearbyPublicIds.lostBruno,
    petName: "Bruno",
    species: "Perro",
    breed: "Golden Retriever",
    sex: "Macho",
    photoUrl: "https://example.com/bruno.jpg",
    distanceMeters: 300,
    locationCellLabel: "Achumani",
    publicLocation: { kind: "approximate" },
    shareTarget: buildTestShareTarget(nearbyPublicIds.lostBruno, "Bruno"),
    lastSeenAtLabel: "Hace 40 min",
    lastSeenSummary: "Collar azul con plaquita, visto cerca del parque.",
    alertPriority: "urgent",
  },
  {
    coordinates: { latitude: -16.5103, longitude: -68.1299 },
    id: nearbyPublicIds.lostLuna,
    petName: "Luna",
    species: "Gato",
    breed: "Siamés",
    sex: "Hembra",
    photoUrl: "https://example.com/luna.jpg",
    distanceMeters: 12_400,
    locationCellLabel: "Sopocachi",
    publicLocation: { kind: "approximate" },
    shareTarget: buildTestShareTarget(nearbyPublicIds.lostLuna, "Luna"),
    lastSeenAtLabel: "Ayer",
    lastSeenSummary: "Se escapó durante la lluvia.",
    alertPriority: "standard",
  },
];

const sightingReport = {
  breed: "Mestizo",
  coordinates: { latitude: -16.5103, longitude: -68.1299 },
  direction: "Iba hacia la avenida 20 de Octubre.",
  distanceMeters: 650,
  id: nearbyPublicIds.sightingDog,
  locationCellLabel: "Sopocachi",
  observedAtLabel: "Hace 25 min",
  observedCondition: "Asustado, caminando rapido.",
  publicLocation: { kind: "approximate" },
  reportKind: "sighting-report",
  shareTarget: {
    appDeepLink: `rastro://reportes/avistamientos/${nearbyPublicIds.sightingDog}`,
    message: `Avistamiento de Perro en Rastro: https://rastro.bo/reportes/avistamientos/${nearbyPublicIds.sightingDog}`,
    path: `/reportes/avistamientos/${nearbyPublicIds.sightingDog}`,
    title: "Avistamiento de mascota: Perro",
    webUrl: `https://rastro.bo/reportes/avistamientos/${nearbyPublicIds.sightingDog}`,
  },
  sightingSummary:
    "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
  species: "Perro",
  title: "Avistamiento de perro",
} satisfies SightingReportSummary;

const foundReport = {
  breed: "Criollo",
  condition: "Con collar rojo, tranquilo.",
  coordinates: { latitude: -16.5022, longitude: -68.1213 },
  distanceMeters: 850,
  foundAtLabel: "Hace 15 min",
  foundSummary: "Esta resguardado con una vecina cerca de la plaza.",
  id: nearbyPublicIds.foundCat,
  locationCellLabel: "Miraflores",
  publicLocation: { kind: "approximate" },
  reportKind: "found-pet-report",
  shareTarget: {
    appDeepLink: `rastro://reportes/encontrados/${nearbyPublicIds.foundCat}`,
    message: `Mascota encontrada en Rastro: https://rastro.bo/reportes/encontrados/${nearbyPublicIds.foundCat}`,
    path: `/reportes/encontrados/${nearbyPublicIds.foundCat}`,
    title: "Mascota encontrada",
    webUrl: `https://rastro.bo/reportes/encontrados/${nearbyPublicIds.foundCat}`,
  },
  species: "Gato",
  title: "Gato encontrado",
} satisfies FoundPetReportSummary;

const adoptionListing = {
  adoptionSummary: "Nala busca un hogar tranquilo y responsable.",
  breed: "Mestizo",
  coordinates: { latitude: -16.5103, longitude: -68.1299 },
  distanceMeters: 1_400,
  id: nearbyPublicIds.adoptionNala,
  locationCellLabel: "Sopocachi",
  petName: "Nala",
  publicLocation: { kind: "approximate" },
  publishedAtLabel: "Hoy",
  reportKind: "adoption-listing",
  shareTarget: {
    appDeepLink: `rastro://adopciones/${nearbyPublicIds.adoptionNala}`,
    message: `Adopción de Nala en Rastro: https://rastro.bo/adopciones/${nearbyPublicIds.adoptionNala}`,
    path: `/adopciones/${nearbyPublicIds.adoptionNala}`,
    title: "Adopción: Nala",
    webUrl: `https://rastro.bo/adopciones/${nearbyPublicIds.adoptionNala}`,
  },
  species: "Gato",
} satisfies AdoptionListingSummary;

function buildTestShareTarget(reportId: string, title: string) {
  return buildPublicLostReportShareTarget({
    publicWebBaseUrl: "https://rastro.bo",
    reportId,
    title,
  });
}

type ApiNearbyReport = RouterOutputs["report"]["nearby"]["results"][number];

const reportPathByApiType = {
  adoption: "adopciones",
  found_pet: "reportes/encontrados",
  lost_pet: "reportes/perdidos",
  sighting: "reportes/avistamientos",
} satisfies Record<ApiNearbyReport["type"], string>;

function buildApiReport({
  createdAt = new Date("2026-06-19T19:40:00.000Z"),
  description,
  eventOccurredAt = createdAt,
  id,
  mediaUrl,
  pet,
  title,
  type,
}: {
  createdAt?: Date;
  description: string;
  eventOccurredAt?: Date;
  id: string;
  mediaUrl?: string;
  pet: Pick<
    ApiNearbyReport["pet"],
    "breed" | "color" | "distinguishingTraits" | "name" | "species"
  >;
  title: string;
  type: ApiNearbyReport["type"];
}): ApiNearbyReport {
  return {
    contact: {
      actions: [
        {
          href: `rastro://${reportPathByApiType[type]}/${id}`,
          kind: "in_app_chat",
        },
      ],
      hasWhatsapp: false,
      preference: "in_app_chat",
    },
    createdAt,
    description,
    eventOccurredAt,
    id,
    location: {
      label: "Zona Sur, La Paz",
      latitude: -16.5,
      locationCell: "bo-lpb-zona-sur",
      longitude: -68.1193,
      precision: "approximate",
    },
    media: mediaUrl
      ? [
          {
            altText: title,
            canonicalUrl: mediaUrl,
            height: 900,
            id: `${id}-media-1`,
            mimeType: "image/jpeg",
            objectKey: `reports/${id}.jpg`,
            position: 0,
            sizeBytes: 100_000,
            thumbnailObjectKey: `reports/${id}-thumb.jpg`,
            width: 1200,
          },
        ]
      : [],
    outcome: null,
    owner: {
      isCurrentMember: false,
    },
    pet: {
      breed: pet.breed,
      color: pet.color,
      distinguishingTraits: pet.distinguishingTraits,
      name: pet.name,
      size: null,
      species: pet.species,
    },
    resolvedAt: null,
    status: "active",
    title,
    type,
    updatedAt: createdAt,
  };
}

describe("nearby Lost Pet Report discovery", () => {
  it("maps report.nearby API results into nearby summaries while sending radius and category filters", async () => {
    const apiCalls: {
      input: RouterInputs["report"]["nearby"];
      options?: { signal?: AbortSignal };
    }[] = [];
    const apiResponse = {
      query: {
        latitude: -16.5,
        limit: 50,
        longitude: -68.1193,
        radiusMeters: 10_000,
        types: ["lost_pet", "found_pet", "sighting", "adoption"],
      },
      results: [
        buildApiReport({
          description: "Collar azul con placa, visto cerca del parque.",
          id: nearbyPublicIds.apiLostBruno,
          mediaUrl: "https://cdn.rastro.bo/reports/bruno.jpg",
          pet: {
            breed: "Golden Retriever",
            color: "Dorado",
            distinguishingTraits: "Collar azul",
            name: "Bruno",
            species: "dog",
          },
          title: "Bruno perdido",
          type: "lost_pet",
        }),
        buildApiReport({
          description: "Esta resguardado con una vecina cerca de la plaza.",
          eventOccurredAt: new Date("2026-06-19T18:00:00.000Z"),
          id: nearbyPublicIds.apiFoundCat,
          pet: {
            breed: "Criollo",
            color: "Gris",
            distinguishingTraits: "Con collar rojo, tranquilo.",
            name: null,
            species: "cat",
          },
          title: "Gato encontrado",
          type: "found_pet",
        }),
        buildApiReport({
          description:
            "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
          eventOccurredAt: new Date("2026-06-19T19:35:00.000Z"),
          id: nearbyPublicIds.apiSightingDog,
          pet: {
            breed: "Mestizo",
            color: "Cafe",
            distinguishingTraits: "Asustado, caminando rapido.",
            name: null,
            species: "dog",
          },
          title: "Avistamiento de perro",
          type: "sighting",
        }),
        buildApiReport({
          createdAt: new Date("2026-06-19T12:00:00.000Z"),
          description: "Nala busca un hogar tranquilo y responsable.",
          id: nearbyPublicIds.apiAdoptionNala,
          mediaUrl: "https://cdn.rastro.bo/reports/nala.jpg",
          pet: {
            breed: "Mestizo",
            color: "Negro",
            distinguishingTraits: "Vacunada y desparasitada.",
            name: "Nala",
            species: "cat",
          },
          title: "Nala en adopción",
          type: "adoption",
        }),
      ],
    } satisfies RouterOutputs["report"]["nearby"];
    const abortController = new AbortController();
    const adapter = createApiNearbyLostReportsAdapter({
      client: {
        report: {
          nearby: {
            query(input, options) {
              apiCalls.push({ input, options });

              return Promise.resolve(apiResponse);
            },
          },
        },
      },
      now: () => "2026-06-19T20:00:00.000Z",
      publicWebBaseUrl: "https://rastro.bo",
    });

    const result = await adapter.searchLostPetReports(
      {
        categories: [
          "lost-pet-report",
          "found-pet-report",
          "sighting-report",
          "adoption-listing",
        ],
        location: {
          coordinates: { latitude: -16.5, longitude: -68.1193 },
          countryCode: "BO",
          label: "Zona Sur, La Paz",
          locationCellLabel: "Zona Sur",
          manualLocationKind: "place",
          source: "manual",
        },
        radiusKm: 10,
      },
      { signal: abortController.signal },
    );

    expect(apiCalls).toHaveLength(1);
    expect(apiCalls[0]).toMatchObject({
      input: {
        latitude: -16.5,
        longitude: -68.1193,
        radiusMeters: 10_000,
        types: ["lost_pet", "found_pet", "sighting", "adoption"],
      },
    });
    expect(apiCalls[0]?.options?.signal).toBe(abortController.signal);
    expect(result.generatedAt).toBe("2026-06-19T20:00:00.000Z");
    expect(result.reports).toMatchObject([
      {
        alertPriority: "urgent",
        coordinates: { latitude: -16.5, longitude: -68.1193 },
        distanceMeters: 0,
        id: nearbyPublicIds.apiLostBruno,
        lastSeenAtLabel: "Hace 20 min",
        lastSeenSummary: "Collar azul con placa, visto cerca del parque.",
        locationCellLabel: "Zona Sur, La Paz",
        petName: "Bruno",
        photoUrl: "https://cdn.rastro.bo/reports/bruno.jpg",
        publicLocation: { kind: "approximate" },
        reportKind: "lost-pet-report",
        shareTarget: {
          path: `/reportes/perdidos/${nearbyPublicIds.apiLostBruno}`,
          webUrl: `https://rastro.bo/reportes/perdidos/${nearbyPublicIds.apiLostBruno}`,
        },
        species: "Perro",
      },
      {
        coordinates: { latitude: -16.5, longitude: -68.1193 },
        condition: "Con collar rojo, tranquilo.",
        distanceMeters: 0,
        foundAtLabel: "Hace 2 h",
        foundSummary: "Esta resguardado con una vecina cerca de la plaza.",
        id: nearbyPublicIds.apiFoundCat,
        locationCellLabel: "Zona Sur, La Paz",
        reportKind: "found-pet-report",
        shareTarget: {
          path: `/reportes/encontrados/${nearbyPublicIds.apiFoundCat}`,
        },
        species: "Gato",
        title: "Gato encontrado",
      },
      {
        coordinates: { latitude: -16.5, longitude: -68.1193 },
        distanceMeters: 0,
        direction: "Zona Sur, La Paz",
        id: nearbyPublicIds.apiSightingDog,
        locationCellLabel: "Zona Sur, La Paz",
        observedAtLabel: "Hace 25 min",
        observedCondition: "Asustado, caminando rapido.",
        reportKind: "sighting-report",
        shareTarget: {
          path: `/reportes/avistamientos/${nearbyPublicIds.apiSightingDog}`,
        },
        sightingSummary:
          "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
        title: "Avistamiento de perro",
      },
      {
        adoptionSummary: "Nala busca un hogar tranquilo y responsable.",
        coordinates: { latitude: -16.5, longitude: -68.1193 },
        distanceMeters: 0,
        healthNotes: "Vacunada y desparasitada.",
        id: nearbyPublicIds.apiAdoptionNala,
        locationCellLabel: "Zona Sur, La Paz",
        petName: "Nala",
        photoUrl: "https://cdn.rastro.bo/reports/nala.jpg",
        publishedAtLabel: "Hace 8 h",
        reportKind: "adoption-listing",
        shareTarget: {
          path: `/adopciones/${nearbyPublicIds.apiAdoptionNala}`,
        },
      },
    ]);
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: result.query.location },
      mode: "map",
      radiusKm: 10,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(viewModel.mapPins).toMatchObject([
      {
        coordinates: { latitude: -16.5, longitude: -68.1193 },
        publicSummaryId: nearbyPublicIds.apiLostBruno,
      },
      {
        coordinates: { latitude: -16.5, longitude: -68.1193 },
        publicSummaryId: nearbyPublicIds.apiFoundCat,
      },
      {
        coordinates: { latitude: -16.5, longitude: -68.1193 },
        publicSummaryId: nearbyPublicIds.apiSightingDog,
      },
      {
        coordinates: { latitude: -16.5, longitude: -68.1193 },
        publicSummaryId: nearbyPublicIds.apiAdoptionNala,
      },
    ]);
    expect(JSON.stringify(result.reports)).not.toContain("images.unsplash.com");
    expect(JSON.stringify(result.reports)).not.toContain("file://");
    expect(JSON.stringify(result.reports)).not.toContain("bo-lpb-zona-sur");
  });

  it("builds a genuine empty nearby state from an empty API response", async () => {
    const adapter = createApiNearbyLostReportsAdapter({
      client: {
        report: {
          nearby: {
            query: () =>
              Promise.resolve({
                query: {
                  latitude: -16.5,
                  limit: 50,
                  longitude: -68.1193,
                  radiusMeters: 5_000,
                  types: ["lost_pet", "found_pet"],
                },
                results: [],
              }),
          },
        },
      },
      now: () => "2026-06-19T20:00:00.000Z",
    });

    const result = await adapter.searchLostPetReports({
      categories: ["lost-pet-report", "found-pet-report"],
      location: {
        coordinates: { latitude: -16.5, longitude: -68.1193 },
        countryCode: "BO",
        label: "Zona Sur, La Paz",
        locationCellLabel: "Zona Sur",
        source: "manual",
      },
      radiusKm: 5,
    });
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: result.query.location },
      mode: "list",
      radiusKm: 5,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "empty");
    expect(result.reports).toEqual([]);
    expect(viewModel.title).toBe("No hay reportes cerca");
    expect(viewModel.searchBoundaryLabel).toBe("Radio de 5 km · Zona Sur");
    expect(JSON.stringify(viewModel)).not.toContain("Bruno");
    expect(JSON.stringify(viewModel)).not.toContain("fixture");
  });

  it("replaces stale nearby cards with the backend-visible list after a successful refresh", async () => {
    const cache = createInMemoryLastLoadedCache<NearbyLostReportsResult>();
    const cacheKey = "nearby-api:zona-sur:5:moderation";
    const omittedByBackend = [
      buildCachedLostReport(nearbyPublicIds.cachedHiddenBruno, "Bruno oculto"),
      buildCachedLostReport(
        nearbyPublicIds.cachedFalseMarkedLuna,
        "Luna marcada falsa",
      ),
      buildCachedLostReport(
        nearbyPublicIds.cachedDeletedToby,
        "Toby eliminado",
      ),
      buildCachedLostReport(
        nearbyPublicIds.cachedUnavailableMichi,
        "Michi no disponible",
      ),
      buildCachedLostReport(
        nearbyPublicIds.cachedPendingReviewNala,
        "Nala en revisión",
      ),
    ];
    const backendVisibleReport = buildApiReport({
      description: "Collar verde, visto cerca de la plaza.",
      id: nearbyPublicIds.apiVisibleToby,
      pet: {
        breed: "Mestizo",
        color: "Cafe",
        distinguishingTraits: "Collar verde",
        name: "Toby",
        species: "dog",
      },
      title: "Toby perdido",
      type: "lost_pet",
    });
    const adapter = createCachedNearbyLostReportsAdapter({
      cache,
      cacheKey,
      source: createApiNearbyLostReportsAdapter({
        client: {
          report: {
            nearby: {
              query: () =>
                Promise.resolve({
                  query: {
                    latitude: -16.5,
                    limit: 50,
                    longitude: -68.1193,
                    radiusMeters: 5_000,
                    types: ["lost_pet"],
                  },
                  results: [backendVisibleReport],
                }),
            },
          },
        },
        now: () => "2026-06-19T20:00:00.000Z",
      }),
    });

    await cache.write(
      cacheKey,
      buildCachedNearbyResult({
        reports: omittedByBackend,
      }),
    );

    const refreshedResult = await adapter.searchLostPetReports({
      categories: ["lost-pet-report"],
      location: resolvedManualLocation,
      radiusKm: 5,
    });
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: resolvedManualLocation },
      mode: "list",
      radiusKm: 5,
      result: { kind: "success", value: refreshedResult },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(refreshedResult.reports.map((report) => report.id)).toEqual([
      nearbyPublicIds.apiVisibleToby,
    ]);
    expect(viewModel.cards.map((card) => card.id)).toEqual([
      nearbyPublicIds.apiVisibleToby,
    ]);
    expect(JSON.stringify(viewModel)).not.toContain("hidden-bruno");
    expect(JSON.stringify(viewModel)).not.toContain("false-marked-luna");
    expect(JSON.stringify(viewModel)).not.toContain("deleted-toby");
    expect(JSON.stringify(viewModel)).not.toContain("unavailable-michi");
    expect(JSON.stringify(viewModel)).not.toContain("pending-review-nala");
  });

  it("keeps a successful empty backend refresh authoritative over stale moderated cards", async () => {
    const cache = createInMemoryLastLoadedCache<NearbyLostReportsResult>();
    const cacheKey = "nearby-api:zona-sur:5:moderation-empty";
    const adapter = createCachedNearbyLostReportsAdapter({
      cache,
      cacheKey,
      source: createApiNearbyLostReportsAdapter({
        client: {
          report: {
            nearby: {
              query: () =>
                Promise.resolve({
                  query: {
                    latitude: -16.5,
                    limit: 50,
                    longitude: -68.1193,
                    radiusMeters: 5_000,
                    types: ["lost_pet"],
                  },
                  results: [],
                }),
            },
          },
        },
        now: () => "2026-06-19T20:00:00.000Z",
      }),
    });

    await cache.write(
      cacheKey,
      buildCachedNearbyResult({
        reports: [
          buildCachedLostReport(
            nearbyPublicIds.cachedHiddenBruno,
            "Bruno oculto",
          ),
          buildCachedLostReport(
            nearbyPublicIds.cachedPendingReviewNala,
            "Nala en revisión",
          ),
        ],
      }),
    );

    const refreshedResult = await adapter.searchLostPetReports({
      categories: ["lost-pet-report"],
      location: resolvedManualLocation,
      radiusKm: 5,
    });
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: resolvedManualLocation },
      mode: "list",
      radiusKm: 5,
      result: { kind: "success", value: refreshedResult },
    });
    const offlineAdapter = createCachedNearbyLostReportsAdapter({
      cache,
      cacheKey,
      source: {
        searchLostPetReports: () =>
          Promise.reject(new Error("Sin conexión de prueba.")),
      },
    });
    const staleAfterSuccess = await offlineAdapter.searchLostPetReports({
      categories: ["lost-pet-report"],
      location: resolvedManualLocation,
      radiusKm: 5,
    });

    assertNearbyViewModelKind(viewModel, "empty");
    expect(refreshedResult.reports).toEqual([]);
    expect(viewModel.title).toBe("No hay reportes cerca");
    expect(JSON.stringify(viewModel)).not.toContain("hidden-bruno");
    expect(JSON.stringify(viewModel)).not.toContain("pending-review-nala");
    expect(staleAfterSuccess.isOffline).toBe(true);
    expect(staleAfterSuccess.isStale).toBe(true);
    expect(staleAfterSuccess.reports).toEqual([]);
  });

  it("does not let a failed cache write return older excluded cards after backend success", async () => {
    const staleCachedResult = buildCachedNearbyResult({
      reports: [
        buildCachedLostReport(
          nearbyPublicIds.cachedHiddenBruno,
          "Bruno oculto",
        ),
        buildCachedLostReport(
          nearbyPublicIds.cachedFalseMarkedLuna,
          "Luna marcada falsa",
        ),
      ],
    });
    let shouldFailBackend = false;
    const adapter = createCachedNearbyLostReportsAdapter({
      cache: {
        read: () => Promise.resolve(staleCachedResult),
        write: () => Promise.reject(new Error("Cache no disponible.")),
      },
      cacheKey: "nearby-api:zona-sur:5:cache-write-fails",
      source: createApiNearbyLostReportsAdapter({
        client: {
          report: {
            nearby: {
              query: () => {
                if (shouldFailBackend) {
                  return Promise.reject(new Error("Sin conexión."));
                }

                return Promise.resolve({
                  query: {
                    latitude: -16.5,
                    limit: 50,
                    longitude: -68.1193,
                    radiusMeters: 5_000,
                    types: ["lost_pet"],
                  },
                  results: [
                    buildApiReport({
                      description: "Visto por la avenida principal.",
                      id: nearbyPublicIds.apiVisibleToby,
                      pet: {
                        breed: "Mestizo",
                        color: "Cafe",
                        distinguishingTraits: "Pecho blanco",
                        name: "Toby",
                        species: "dog",
                      },
                      title: "Toby perdido",
                      type: "lost_pet",
                    }),
                  ],
                });
              },
            },
          },
        },
        now: () => "2026-06-19T20:00:00.000Z",
      }),
    });

    const refreshedResult = await adapter.searchLostPetReports({
      categories: ["lost-pet-report"],
      location: resolvedManualLocation,
      radiusKm: 5,
    });

    shouldFailBackend = true;

    const staleAfterFailedRefresh = await adapter.searchLostPetReports({
      categories: ["lost-pet-report"],
      location: resolvedManualLocation,
      radiusKm: 5,
    });

    expect(refreshedResult.reports.map((report) => report.id)).toEqual([
      nearbyPublicIds.apiVisibleToby,
    ]);
    expect(staleAfterFailedRefresh.isOffline).toBe(true);
    expect(staleAfterFailedRefresh.isStale).toBe(true);
    expect(staleAfterFailedRefresh.reports.map((report) => report.id)).toEqual([
      nearbyPublicIds.apiVisibleToby,
    ]);
    expect(JSON.stringify(staleAfterFailedRefresh)).not.toContain(
      "hidden-bruno",
    );
    expect(JSON.stringify(staleAfterFailedRefresh)).not.toContain(
      "false-marked-luna",
    );
  });

  it("surfaces backend failure for retry instead of treating it as a moderation refresh", async () => {
    const adapter = createCachedNearbyLostReportsAdapter({
      cache: createInMemoryLastLoadedCache<NearbyLostReportsResult>(),
      cacheKey: "nearby-api:zona-sur:5:no-cache",
      source: {
        searchLostPetReports: () =>
          Promise.reject(new Error("No pudimos conectar con Rastro.")),
      },
    });

    await expect(
      adapter.searchLostPetReports({
        categories: ["lost-pet-report"],
        location: resolvedManualLocation,
        radiusKm: 5,
      }),
    ).rejects.toThrow("No pudimos conectar con Rastro.");

    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: resolvedManualLocation },
      mode: "list",
      radiusKm: 5,
      result: {
        kind: "error",
        message: "No pudimos conectar con Rastro.",
      },
    });

    assertNearbyViewModelKind(viewModel, "error");
    expect(viewModel.retryLabel).toBe("Reintentar");
    expect(viewModel.message).toBe("No pudimos conectar con Rastro.");
  });

  it("marks stale cached API results after a failed refresh", async () => {
    const cache = createInMemoryLastLoadedCache<NearbyLostReportsResult>();
    const location: NearbySearchLocation = {
      coordinates: { latitude: -16.5, longitude: -68.1193 },
      countryCode: "BO",
      label: "Zona Sur, La Paz",
      locationCellLabel: "Zona Sur",
      source: "manual",
    };
    const onlineAdapter = createCachedNearbyLostReportsAdapter({
      cache,
      cacheKey: "nearby-api:zona-sur:5:lost",
      source: createApiNearbyLostReportsAdapter({
        client: {
          report: {
            nearby: {
              query: () =>
                Promise.resolve({
                  query: {
                    latitude: -16.5,
                    limit: 50,
                    longitude: -68.1193,
                    radiusMeters: 5_000,
                    types: ["lost_pet"],
                  },
                  results: [
                    buildApiReport({
                      description:
                        "Collar azul con placa, visto cerca del parque.",
                      id: nearbyPublicIds.apiLostBruno,
                      pet: {
                        breed: "Golden Retriever",
                        color: "Dorado",
                        distinguishingTraits: "Collar azul",
                        name: "Bruno",
                        species: "dog",
                      },
                      title: "Bruno perdido",
                      type: "lost_pet",
                    }),
                  ],
                }),
            },
          },
        },
        now: () => "2026-06-19T20:00:00.000Z",
      }),
    });

    await onlineAdapter.searchLostPetReports({
      categories: ["lost-pet-report"],
      location,
      radiusKm: 5,
    });

    const offlineAdapter = createCachedNearbyLostReportsAdapter({
      cache,
      cacheKey: "nearby-api:zona-sur:5:lost",
      source: createApiNearbyLostReportsAdapter({
        client: {
          report: {
            nearby: {
              query: () => Promise.reject(new Error("Sin conexión.")),
            },
          },
        },
      }),
    });

    const staleResult = await offlineAdapter.searchLostPetReports({
      categories: ["lost-pet-report"],
      location,
      radiusKm: 5,
    });
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location },
      mode: "list",
      radiusKm: 5,
      result: { kind: "success", value: staleResult },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(staleResult.isOffline).toBe(true);
    expect(staleResult.isStale).toBe(true);
    expect(viewModel.offlineLabel).toBe("Sin conexión · resultados guardados");
    expect(viewModel.cards.map((card) => card.id)).toEqual([
      nearbyPublicIds.apiLostBruno,
    ]);
  });

  it("browses Lost Pet Reports published through the Rastro-owned search boundary without signing in", async () => {
    const repository = createInMemoryLostPetReportRepository({
      now: () => "2026-06-18T12:00:00.000Z",
    });
    const adapter = createNearbyLostReportRepositoryAdapter({ repository });
    const location: NearbySearchLocation = {
      coordinates: { latitude: -16.5103, longitude: -68.1299 },
      countryCode: "BO",
      label: "Sopocachi, La Paz",
      locationCellLabel: "Sopocachi",
      manualLocationKind: "place",
      source: "manual",
    };

    await repository.publishLostPetReport(
      {
        displayName: "Camila",
        kind: "member",
        memberId: "member-camila",
      },
      {
        contactOption: { kind: "in-app-chat" },
        exactLocation: {
          addressLabel: "Plaza Abaroa, La Paz",
          countryCode: "BO",
          latitude: -16.5103,
          locationCellLabel: "Sopocachi",
          longitude: -68.1299,
        },
        lastSeenAt: "2026-06-18T11:30:00.000Z",
        lastSeenDescription: "Collar rojo, visto cerca de la plaza.",
        petProfile: {
          kind: "inline",
          profile: {
            breed: "Mestizo",
            description: "Patas blancas y collar rojo.",
            name: "Toby",
            photos: [{ id: "pet-photo-1", uri: "file:///toby.heic" }],
            type: "Perro",
          },
        },
        photos: [{ id: "report-photo-1", uri: "file:///toby-lost.heic" }],
      },
    );

    const result = await adapter.searchLostPetReports({
      location,
      radiusKm: 5,
    });
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location },
      mode: "list",
      radiusKm: 5,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(result.searchBoundary).toMatchObject({
      engine: "rastro-postgis-radius",
      owner: "rastro",
      publicLocationPrecision: "location-cell",
      radiusKm: 5,
    });
    expect(viewModel.accessPolicy.requiresSignIn).toBe(false);
    expect(viewModel.cards).toHaveLength(1);
    expect(viewModel.cards[0]).toMatchObject({
      publicLocationLabel: "Sopocachi · zona aproximada",
      reportActionLabel: "Reportar",
      shareTarget: {
        message: `Ayuda a encontrar a Toby en Rastro: https://rastro.bo/reportes/perdidos/${nearbyPublicIds.repositoryToby}`,
        webUrl: `https://rastro.bo/reportes/perdidos/${nearbyPublicIds.repositoryToby}`,
      },
      title: "Toby",
    });
    expect(result.reports[0]?.shareTarget.webUrl).toBe(
      `https://rastro.bo/reportes/perdidos/${nearbyPublicIds.repositoryToby}`,
    );
    expect(viewModel.cards[0]?.shareTarget.message).not.toContain(
      "Plaza Abaroa",
    );
    expect(viewModel.cards[0]?.distanceLabel).toBe("a 0 m");
  });

  it("builds a radius-limited browse model with an urgent alert and approximate public locations", async () => {
    const adapter = createStaticNearbyLostReportsAdapter({ reports });

    const result = await adapter.searchLostPetReports({
      location: manualLocation,
      radiusKm: 5,
    });

    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: manualLocation },
      mode: "list",
      radiusKm: 5,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(viewModel.cards).toHaveLength(1);
    expect(viewModel.cards[0]?.title).toBe("Bruno");
    expect(viewModel.cards[0]?.publicLocationLabel).toContain(
      "zona aproximada",
    );
    expect(viewModel.urgentAlert?.title).toBe("Alerta activa");
    expect(viewModel.urgentAlert?.message).toContain("Bruno");
    expect(viewModel.locationLabel).toBe("Zona Sur, La Paz");
  });

  it("does not expose raw manual-pin coordinates in public location labels", async () => {
    const firstReport = reports[0];

    if (!firstReport) {
      throw new Error("Expected nearby lost report fixture.");
    }

    const adapter = createStaticNearbyLostReportsAdapter({
      reports: [
        {
          ...firstReport,
          id: nearbyPublicIds.lostRawManualPin,
          locationCellLabel: "Pin manual -16.4882, -68.1287",
        },
      ],
    });
    const result = await adapter.searchLostPetReports({
      location: manualLocation,
      radiusKm: 5,
    });
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: manualLocation },
      mode: "map",
      radiusKm: 5,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(viewModel.cards[0]?.publicLocationLabel).toBe("Zona aproximada");
    expect(viewModel.publicSummaries[0]?.publicLocationLabel).toBe(
      "Zona aproximada",
    );
    expect(viewModel.mapPins[0]?.label).toBe("Zona aproximada");
  });

  it("keeps Closed Reports understandable with reduced urgency and does not promote them as nearby alerts", async () => {
    const urgentReport = reports[0];
    const activeReport = reports[1];

    if (!urgentReport || !activeReport) {
      throw new Error("Expected nearby report fixtures.");
    }

    const closedReport = {
      ...urgentReport,
      alertPriority: "urgent",
      id: nearbyPublicIds.lostBrunoClosed,
      outcome: "reunited",
      status: "closed",
    } satisfies LostPetReportSummary;
    const adapter = createStaticNearbyLostReportsAdapter({
      reports: [
        closedReport,
        {
          ...activeReport,
          distanceMeters: 900,
          id: nearbyPublicIds.lostLunaActive,
          status: "active",
        } satisfies LostPetReportSummary,
      ],
    });

    const result = await adapter.searchLostPetReports({
      location: manualLocation,
      radiusKm: 5,
    });

    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: manualLocation },
      mode: "list",
      radiusKm: 5,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(viewModel.urgentAlert).toBeUndefined();
    expect(viewModel.cards.map((card) => card.id)).toEqual([
      nearbyPublicIds.lostLunaActive,
      nearbyPublicIds.lostBrunoClosed,
    ]);
    expect(viewModel.cards[1]).toMatchObject({
      lifecycle: {
        outcome: "reunited",
        outcomeLabel: "Reunida",
        status: "closed",
        statusLabel: "Cerrado",
        tone: "closed",
      },
      priorityLabel: "Cerrado · Reunida",
      urgency: "reduced",
    });
  });

  it("browses Sighting Reports with sighting-specific labels and detail links without signing in", async () => {
    const adapter = createStaticNearbyLostReportsAdapter({
      reports: [sightingReport],
    });

    const result = await adapter.searchLostPetReports({
      location: manualLocation,
      radiusKm: 5,
    });

    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: manualLocation },
      mode: "list",
      radiusKm: 5,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(viewModel.accessPolicy.requiresSignIn).toBe(false);
    expect(viewModel.cards).toHaveLength(1);
    expect(viewModel.cards[0]).toMatchObject({
      eventAtLabel: "Hace 25 min",
      priorityLabel: "Avistamiento",
      publicLocationLabel: "Sopocachi · zona aproximada",
      reportKind: "sighting-report",
      shareTarget: {
        path: `/reportes/avistamientos/${nearbyPublicIds.sightingDog}`,
        webUrl: `https://rastro.bo/reportes/avistamientos/${nearbyPublicIds.sightingDog}`,
      },
      subtitle: "Mestizo • Asustado, caminando rapido.",
      summary:
        "Paso por la esquina de la plaza y siguio caminando sin dejarse acercar.",
      title: "Avistamiento de perro",
    });
    expect(viewModel.cards[0]?.summary).not.toMatch(/encontrad|asegurad/i);
    expect(viewModel.mapPins[0]).toMatchObject({
      publicSummaryId: nearbyPublicIds.sightingDog,
      title: "Avistamiento de perro",
    });
    expect(result.reports[0]).toMatchObject({
      direction: "Iba hacia la avenida 20 de Octubre.",
      observedCondition: "Asustado, caminando rapido.",
      reportKind: "sighting-report",
    });
  });

  it("selects matching detail route targets for lost, found, sighting, and adoption cards and map pins", async () => {
    const lostReport = reports[0];

    if (!lostReport) {
      throw new Error("Expected nearby lost report fixture.");
    }

    const mixedReports = [
      lostReport,
      foundReport,
      sightingReport,
      adoptionListing,
    ] satisfies NearbyPublicReportSummary[];
    const adapter = createStaticNearbyLostReportsAdapter({
      reports: mixedReports,
    });

    const result = await adapter.searchLostPetReports({
      location: manualLocation,
      radiusKm: 5,
    });
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: manualLocation },
      mode: "map",
      radiusKm: 5,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");

    const cardHrefsByKind = Object.fromEntries(
      viewModel.cards.map((card) => [card.reportKind, card.routeTarget.href]),
    ) as Partial<Record<NearbyPublicReportKind, string>>;
    const pinHrefsByKind = Object.fromEntries(
      viewModel.mapPins.map((pin) => [pin.reportKind, pin.routeTarget.href]),
    ) as Partial<Record<NearbyPublicReportKind, string>>;

    expect(cardHrefsByKind).toEqual({
      "adoption-listing": `/adopciones/${nearbyPublicIds.adoptionNala}`,
      "found-pet-report": `/reportes/encontrados/${nearbyPublicIds.foundCat}`,
      "lost-pet-report": `/reportes/perdidos/${nearbyPublicIds.lostBruno}`,
      "sighting-report": `/reportes/avistamientos/${nearbyPublicIds.sightingDog}`,
    });
    expect(pinHrefsByKind).toEqual(cardHrefsByKind);
    expect(viewModel.mapPins.map((pin) => pin.routeTarget)).toEqual(
      viewModel.cards.map((card) => card.routeTarget),
    );
  });

  it("shares a Nearby Lost Pet Report card through the native share sheet with Spanish copy and the stable web URL", async () => {
    const adapter = createStaticNearbyLostReportsAdapter({ reports });
    const shareCalls: unknown[] = [];

    const result = await adapter.searchLostPetReports({
      location: manualLocation,
      radiusKm: 5,
    });
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: manualLocation },
      mode: "list",
      radiusKm: 5,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    const card = viewModel.cards[0];
    expect(card).toBeDefined();

    if (!card) {
      throw new Error("Expected a shareable Nearby Lost Pet Report card.");
    }

    const shareResult = await shareNearbyLostReport(card, {
      share: (...args) => {
        shareCalls.push(args);

        return Promise.resolve({ action: "sharedAction" });
      },
    });

    expect(shareResult).toEqual({ action: "sharedAction" });
    expect(shareCalls).toEqual([
      [
        {
          message: `Ayuda a encontrar a Bruno en Rastro: https://rastro.bo/reportes/perdidos/${nearbyPublicIds.lostBruno}`,
          title: "Mascota perdida: Bruno",
          url: `https://rastro.bo/reportes/perdidos/${nearbyPublicIds.lostBruno}`,
        },
        {
          dialogTitle: "Compartir reporte de mascota perdida",
          subject: "Mascota perdida: Bruno",
        },
      ],
    ]);
  });

  it("exposes a sign-in-free Rastro/PostGIS browse contract shared by list and map states", async () => {
    const currentLocation: NearbySearchLocation = {
      coordinates: { latitude: -16.5405, longitude: -68.0889 },
      countryCode: "BO",
      label: "Achumani, La Paz",
      locationCellLabel: "Achumani",
      source: "current",
    };
    const adapter = createStaticNearbyLostReportsAdapter({ reports });

    const result = await adapter.searchLostPetReports({
      location: currentLocation,
      radiusKm: 10,
    });

    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: currentLocation },
      mode: "map",
      radiusKm: 10,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(result.searchBoundary).toMatchObject({
      engine: "rastro-postgis-radius",
      owner: "rastro",
      radiusKm: 10,
    });
    expect(result.searchBoundary.center.source).toBe("current");
    expect(viewModel.accessPolicy).toEqual({
      audiences: ["visitor", "member"],
      requiresSignIn: false,
    });
    expect(viewModel.searchBoundaryLabel).toBe("Radio de 10 km · Achumani");
    expect(viewModel.searchBoundaryLabel).not.toContain("Rastro/PostGIS");
    expect(viewModel.publicSummaries.map((summary) => summary.id)).toEqual(
      viewModel.cards.map((card) => card.publicSummaryId),
    );
    expect(viewModel.publicSummaries.map((summary) => summary.id)).toEqual(
      viewModel.mapPins.map((pin) => pin.publicSummaryId),
    );
    expect(viewModel.publicSummaries[0]?.publicLocationLabel).toContain(
      "zona aproximada",
    );
  });

  it("uses a manual Bolivia location when device location is denied", async () => {
    const adapter = createStaticNearbyLostReportsAdapter({ reports });

    const result = await adapter.searchLostPetReports({
      location: manualLocation,
      radiusKm: 10,
    });

    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "denied", manualLocation },
      mode: "map",
      radiusKm: 10,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(viewModel.locationLabel).toBe("Zona Sur, La Paz");
    expect(viewModel.locationSourceLabel).toBe("Zona elegida");
    expect(viewModel.mode).toBe("map");
  });

  it("labels current, last detected, manual place, and manual map-pin searches in Bolivia", async () => {
    const searchLocations = [
      {
        expectedSourceLabel: "Ubicación actual",
        location: {
          coordinates: { latitude: -16.5405, longitude: -68.0889 },
          countryCode: "BO",
          label: "Achumani, La Paz",
          locationCellLabel: "Achumani",
          source: "current",
        },
      },
      {
        expectedSourceLabel: "Última ubicación detectada",
        location: {
          coordinates: { latitude: -16.5, longitude: -68.1193 },
          countryCode: "BO",
          label: "Zona Sur, La Paz",
          locationCellLabel: "Zona Sur",
          source: "last",
        },
      },
      {
        expectedSourceLabel: "Zona elegida",
        location: {
          countryCode: "BO",
          label: "Queru Queru, Cochabamba",
          locationCellLabel: "Queru Queru",
          manualLocationKind: "place",
          source: "manual",
        },
      },
      {
        expectedSourceLabel: "Punto elegido",
        location: {
          coordinates: { latitude: -17.7833, longitude: -63.1821 },
          countryCode: "BO",
          label: "Pin en Equipetrol, Santa Cruz",
          locationCellLabel: "Equipetrol",
          manualLocationKind: "map-pin",
          source: "manual",
        },
      },
    ] satisfies {
      expectedSourceLabel: string;
      location: NearbySearchLocation;
    }[];
    const adapter = createStaticNearbyLostReportsAdapter({ reports });

    for (const { expectedSourceLabel, location } of searchLocations) {
      const result = await adapter.searchLostPetReports({
        location,
        radiusKm: 5,
      });

      const viewModel = buildNearbyLostReportsViewModel({
        locationState: { kind: "ready", location },
        mode: "list",
        radiusKm: 5,
        result: { kind: "success", value: result },
      });

      assertNearbyViewModelKind(viewModel, "ready");
      expect(result.searchBoundary.center.countryCode).toBe("BO");
      expect(result.searchBoundary.center.source).toBe(location.source);
      expect(viewModel.locationSourceLabel).toBe(expectedSourceLabel);
    }
  });

  it("shows a Spanish empty state when no nearby lost reports match the radius", async () => {
    const adapter = createStaticNearbyLostReportsAdapter({
      reports: reports.slice(1),
    });

    const result = await adapter.searchLostPetReports({
      location: manualLocation,
      radiusKm: 5,
    });

    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: manualLocation },
      mode: "list",
      radiusKm: 5,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "empty");
    expect(viewModel.title).toBe("No hay reportes cerca");
    expect(viewModel.message).toContain("mascotas perdidas");
    expect(viewModel.message).not.toContain("Lost Pet Reports");
  });

  it("switches the empty-state action to changing zone at maximum radius", () => {
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: resolvedManualLocation },
      mode: "list",
      radiusKm: 20,
      result: {
        kind: "success",
        value: {
          ...buildCachedNearbyResult({ reports: [] }),
          query: {
            categories: ["lost-pet-report"],
            location: resolvedManualLocation,
            radiusKm: 20,
          },
          searchBoundary: {
            center: resolvedManualLocation,
            engine: "rastro-postgis-radius",
            owner: "rastro",
            publicLocationPrecision: "location-cell",
            radiusKm: 20,
          },
        },
      },
    });

    assertNearbyViewModelKind(viewModel, "empty");
    expect(viewModel.radiusActionLabel).toBe("Cambiar zona");
    expect(viewModel.message).toContain("otra zona");
    expect(viewModel.message).not.toContain("ampliando");
  });

  it("marks stale cached results while preserving compact radius options", async () => {
    const adapter = createStaticNearbyLostReportsAdapter({
      isOffline: true,
      isStale: true,
      reports,
    });

    const result = await adapter.searchLostPetReports({
      location: manualLocation,
      radiusKm: 20,
    });

    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: manualLocation },
      mode: "list",
      radiusKm: 20,
      result: { kind: "success", value: result },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(viewModel.offlineLabel).toBe("Sin conexión · resultados guardados");
    expect(viewModel.radiusOptionsKm).toEqual([5, 10, 20]);
    expect(viewModel.cards.map((card) => card.title)).toEqual([
      "Bruno",
      "Luna",
    ]);
  });

  it("applies category and radius filters to the nearby query and labels empty stale results", async () => {
    const lostReport = reports[0];

    if (!lostReport) {
      throw new Error("Expected nearby lost report fixture.");
    }

    const farAdoptionListing = {
      ...adoptionListing,
      distanceMeters: 8_400,
    } satisfies AdoptionListingSummary;
    const filteredReports = [
      lostReport,
      foundReport,
      sightingReport,
      farAdoptionListing,
    ] satisfies NearbyPublicReportSummary[];
    const adapter = createStaticNearbyLostReportsAdapter({
      isOffline: true,
      isStale: true,
      reports: filteredReports,
    });

    const filteredResult = await adapter.searchLostPetReports({
      categories: ["found-pet-report", "sighting-report"],
      location: manualLocation,
      radiusKm: 5,
    });

    expect(filteredResult.query).toMatchObject({
      categories: ["found-pet-report", "sighting-report"],
      radiusKm: 5,
    });
    expect(filteredResult.reports.map(getNearbyReportKind)).toEqual([
      "sighting-report",
      "found-pet-report",
    ]);

    const emptyResult = await adapter.searchLostPetReports({
      categories: ["adoption-listing"],
      location: manualLocation,
      radiusKm: 5,
    });
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: manualLocation },
      mode: "list",
      radiusKm: 5,
      result: { kind: "success", value: emptyResult },
    });

    assertNearbyViewModelKind(viewModel, "empty");
    expect(viewModel.offlineLabel).toBe("Sin conexión · resultados guardados");
    expect(viewModel.searchBoundaryLabel).toBe("Radio de 5 km · Zona Sur");
    expect(JSON.stringify(viewModel)).not.toContain("Rastro/PostGIS");
  });

  it("renders the last loaded nearby list when a later offline search fails", async () => {
    const cache = createInMemoryLastLoadedCache<NearbyLostReportsResult>();
    const onlineAdapter = createCachedNearbyLostReportsAdapter({
      cache,
      cacheKey: "nearby:manual-zona-sur:20",
      source: createStaticNearbyLostReportsAdapter({
        generatedAt: "2026-06-18T12:00:00.000Z",
        reports,
      }),
    });
    const cachedOnlineResult = await onlineAdapter.searchLostPetReports({
      location: manualLocation,
      radiusKm: 20,
    });

    expect(cachedOnlineResult.isOffline).toBeUndefined();
    expect(cachedOnlineResult.isStale).toBeUndefined();

    const offlineAdapter = createCachedNearbyLostReportsAdapter({
      cache,
      cacheKey: "nearby:manual-zona-sur:20",
      source: {
        searchLostPetReports: () =>
          Promise.reject(new Error("Sin conexión de prueba.")),
      },
    });

    const staleResult = await offlineAdapter.searchLostPetReports({
      location: manualLocation,
      radiusKm: 20,
    });
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "ready", location: manualLocation },
      mode: "list",
      radiusKm: 20,
      result: { kind: "success", value: staleResult },
    });

    assertNearbyViewModelKind(viewModel, "ready");
    expect(viewModel.offlineLabel).toBe("Sin conexión · resultados guardados");
    expect(viewModel.cards.map((card) => card.title)).toEqual([
      "Bruno",
      "Luna",
    ]);
  });

  it("shows a manual-search fallback when location is denied and no manual place is selected", () => {
    const viewModel = buildNearbyLostReportsViewModel({
      locationState: { kind: "denied" },
      mode: "list",
      radiusKm: 5,
      result: { kind: "loading" },
    });

    assertNearbyViewModelKind(viewModel, "location-denied");
    expect(viewModel.title).toBe("Ubicación no disponible");
    expect(viewModel.manualLocationActionLabel).toBe("Elegir una zona");
    expect(viewModel.useCurrentLocationActionLabel).toBe("Usar mi ubicación");
    expect(viewModel.message).toContain("Bolivia");
  });
});

function assertNearbyViewModelKind<
  K extends NearbyLostReportsViewModel["kind"],
>(
  viewModel: NearbyLostReportsViewModel,
  kind: K,
): asserts viewModel is Extract<NearbyLostReportsViewModel, { kind: K }> {
  expect(viewModel.kind).toBe(kind);
}

function getNearbyReportKind(
  report: NearbyPublicReportSummary,
): NearbyPublicReportKind {
  return report.reportKind ?? "lost-pet-report";
}

function buildCachedLostReport(
  id: string,
  petName: string,
): LostPetReportSummary {
  const baseReport = reports[0];

  if (!baseReport) {
    throw new Error("Expected nearby lost report fixture.");
  }

  return {
    ...baseReport,
    id,
    petName,
    shareTarget: buildTestShareTarget(id, petName),
  };
}

function buildCachedNearbyResult({
  reports: cachedReports,
}: {
  reports: NearbyPublicReportSummary[];
}): NearbyLostReportsResult {
  return {
    generatedAt: "2026-06-19T19:00:00.000Z",
    query: {
      categories: ["lost-pet-report"],
      location: resolvedManualLocation,
      radiusKm: 5,
    },
    reports: cachedReports,
    searchBoundary: {
      center: resolvedManualLocation,
      engine: "rastro-postgis-radius",
      owner: "rastro",
      publicLocationPrecision: "location-cell",
      radiusKm: 5,
    },
  };
}
