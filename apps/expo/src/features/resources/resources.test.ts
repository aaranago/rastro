import { describe, expect, it } from "vitest";

import type {
  LocalSponsorPlacement,
  ResourceProviderFixture,
  ResourceProviderProfile,
  ResourceProviderSummary,
} from "./resource-types";
import type {
  ResourceProviderDirectoryResult,
  ResourceProviderProfileResult,
} from "./static-resources-adapter";
import { createInMemoryLastLoadedCache } from "../resilience/last-loaded-cache";
import { createInMemoryTrustSafetyRepository } from "../trust-safety";
import {
  buildResourceProviderProfileViewModel,
  buildResourcesDirectoryViewModel,
} from "./resources-view-model";
import {
  getLocalSponsorPlacementForSurface,
  isLocalSponsorPlacementEligibleForSurface,
} from "./sponsor-surface-policy";
import {
  createCachedResourcesAdapter,
  createStaticResourcesAdapter,
} from "./static-resources-adapter";
import { rastroResourceFixtures } from "./static-resources-fixtures";

describe("Resources directory", () => {
  it("uses a shared helper for Local Sponsor Placement surface eligibility", () => {
    const placement = buildSponsorPlacement({
      eligibleSurfaces: ["resources_directory"],
    });

    expect(
      isLocalSponsorPlacementEligibleForSurface(
        placement,
        "resources_directory",
      ),
    ).toBe(true);
    expect(
      isLocalSponsorPlacementEligibleForSurface(placement, "provider_details"),
    ).toBe(false);
    expect(
      getLocalSponsorPlacementForSurface(placement, "provider_details"),
    ).toBeUndefined();
  });

  it("lets visitors and members browse Resource Providers without sign-in", () => {
    const visitorViewModel = buildResourcesDirectoryViewModel({
      providers: rastroResourceFixtures.providers,
      location: {
        kind: "current",
        label: "La Paz",
      },
      mode: "list",
      status: "ready",
      viewer: {
        kind: "visitor",
      },
    });
    const memberViewModel = buildResourcesDirectoryViewModel({
      providers: rastroResourceFixtures.providers,
      location: {
        kind: "current",
        label: "La Paz",
      },
      mode: "list",
      status: "ready",
      viewer: {
        kind: "member",
      },
    });

    expect(visitorViewModel.access).toEqual({
      audienceLabel: "Visitante",
      canBrowse: true,
      requiresSignIn: false,
      signInCopy: undefined,
    });
    expect(memberViewModel.access).toEqual({
      audienceLabel: "Miembro",
      canBrowse: true,
      requiresSignIn: false,
      signInCopy: undefined,
    });
    expect(visitorViewModel.results.length).toBeGreaterThan(0);
    expect(memberViewModel.results.length).toBeGreaterThan(0);
  });

  it("filters providers by category and labels a manual Bolivia search", () => {
    const viewModel = buildResourcesDirectoryViewModel({
      providers: rastroResourceFixtures.providers,
      selectedCategoryIds: ["veterinary"],
      location: {
        kind: "manual",
        label: "Sopocachi, La Paz",
      },
      mode: "list",
      status: "ready",
    });

    expect(viewModel.location.label).toBe("Buscando en Sopocachi, La Paz");
    expect(viewModel.selectedCategoryLabels).toEqual(["Veterinarias"]);
    expect(viewModel.results.map((provider) => provider.name)).toEqual([
      "Clínica Veterinaria San Roque",
      "Consultorio Dra. Marta Gómez",
    ]);
  });

  it("uses shared Rastro/PostGIS search boundary copy for list and map views", () => {
    const listViewModel = buildResourcesDirectoryViewModel({
      providers: rastroResourceFixtures.providers,
      location: {
        kind: "manual",
        label: "Sopocachi, La Paz",
      },
      mode: "list",
      status: "ready",
    });
    const mapViewModel = buildResourcesDirectoryViewModel({
      providers: rastroResourceFixtures.providers,
      location: {
        kind: "manual",
        label: "Sopocachi, La Paz",
      },
      mode: "map",
      status: "ready",
    });

    expect(listViewModel.searchBoundary).toEqual({
      title: "Búsqueda Rastro/PostGIS",
      body: "Lista y mapa usan el mismo radio de Rastro; el mapa solo orienta la zona.",
      precisionLabel: "Zonas aproximadas en Bolivia",
    });
    expect(mapViewModel.searchBoundary).toEqual(listViewModel.searchBoundary);
  });

  it("presents resources as a distinct local directory, not recovery reports", () => {
    const viewModel = buildResourcesDirectoryViewModel({
      providers: rastroResourceFixtures.providers,
      location: {
        kind: "current",
        label: "La Paz",
      },
      mode: "list",
      status: "ready",
    });

    expect(viewModel.presentation).toEqual({
      sectionLabel: "Directorio de servicios",
      resultKindLabel: "Proveedor local",
      recoverySeparationCopy:
        "Estos recursos no son reportes de recuperación ni cambian la prioridad de mascotas perdidas.",
    });
    expect(viewModel.presentation.recoverySeparationCopy).not.toMatch(
      /perdida cerca|avistamiento|encontrada/i,
    );
  });

  it("labels sponsored placements without implying recovery priority or push notifications", () => {
    const viewModel = buildResourcesDirectoryViewModel({
      providers: rastroResourceFixtures.providers,
      location: {
        kind: "current",
        label: "La Paz",
      },
      mode: "list",
      status: "ready",
    });

    const sponsoredProvider = viewModel.results.find(
      (provider) => provider.id === "clinic-san-roque",
    );

    expect(sponsoredProvider).toMatchObject({
      isSponsored: true,
      sponsorLabel: "Patrocinado",
      sponsorDisclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      logoUrl: "https://example.com/san-roque-logo.png",
      photoUrl: "https://example.com/san-roque-photo.png",
      sponsorLogoUrl: "https://example.com/sponsor-san-roque-logo.png",
      sponsorImageUrl: "https://example.com/sponsor-san-roque-banner.png",
    });
    expect(sponsoredProvider?.sponsorDisclosure).not.toMatch(
      /push|notific|prioridad de recuperaci[oó]n/i,
    );
  });

  it("exposes Local Sponsor Placement surfaces and safety policy in resource results", () => {
    const viewModel = buildResourcesDirectoryViewModel({
      providers: rastroResourceFixtures.providers,
      location: {
        kind: "current",
        label: "La Paz",
      },
      mode: "list",
      status: "ready",
    });

    const sponsoredProvider = viewModel.results.find(
      (provider) => provider.id === "clinic-san-roque",
    );

    expect(sponsoredProvider?.sponsorPlacement).toEqual({
      kind: "Local Sponsor Placement",
      label: "Patrocinado",
      disclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      logoUrl: "https://example.com/sponsor-san-roque-logo.png",
      imageUrl: "https://example.com/sponsor-san-roque-banner.png",
      eligibleSurfaces: [
        "resources_directory",
        "provider_details",
        "report_success",
        "contextual_care_resources",
      ],
      safetyPolicy: {
        recoveryPriority: {
          label: "Recovery Priority",
          canAffect: false,
        },
        pushNotifications: {
          eligible: false,
        },
      },
    });
  });

  it("suppresses wrong-surface sponsor placements in directory cards", () => {
    const provider = buildProviderSummary({
      id: "profile-only-sponsor",
      isVerified: false,
      sponsorPlacement: buildSponsorPlacement({
        eligibleSurfaces: ["provider_details"],
        imageUrl: "https://example.com/profile-only-banner.png",
        logoUrl: "https://example.com/profile-only-logo.png",
      }),
    });

    const viewModel = buildResourcesDirectoryViewModel({
      providers: [provider],
      location: {
        kind: "manual",
        label: "La Paz",
      },
      mode: "list",
      status: "ready",
    });

    expect(viewModel.results[0]).toMatchObject({
      id: "profile-only-sponsor",
      isSponsored: false,
      isVerified: false,
    });
    expect(viewModel.results[0]?.sponsorLabel).toBeUndefined();
    expect(viewModel.results[0]?.sponsorDisclosure).toBeUndefined();
    expect(viewModel.results[0]?.sponsorLogoUrl).toBeUndefined();
    expect(viewModel.results[0]?.sponsorImageUrl).toBeUndefined();
    expect(viewModel.results[0]?.sponsorPlacement).toBeUndefined();
  });

  it("keeps correct-surface directory sponsor media optional and policy explicit", () => {
    const provider = buildProviderSummary({
      sponsorPlacement: buildSponsorPlacement({
        eligibleSurfaces: ["resources_directory"],
        imageUrl: undefined,
        logoUrl: undefined,
      }),
    });

    const viewModel = buildResourcesDirectoryViewModel({
      providers: [provider],
      location: {
        kind: "manual",
        label: "La Paz",
      },
      mode: "list",
      status: "ready",
    });
    const sponsoredProvider = viewModel.results[0];

    expect(sponsoredProvider).toMatchObject({
      isSponsored: true,
      sponsorLabel: "Patrocinado",
      sponsorDisclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
    });
    expect(sponsoredProvider?.sponsorLogoUrl).toBeUndefined();
    expect(sponsoredProvider?.sponsorImageUrl).toBeUndefined();
    expect(sponsoredProvider?.sponsorPlacement?.safetyPolicy).toEqual({
      recoveryPriority: {
        label: "Recovery Priority",
        canAffect: false,
      },
      pushNotifications: {
        eligible: false,
      },
    });
  });

  it("does not expose exact provider coordinates or admin media asset IDs in directory view data", () => {
    const provider = {
      ...buildProviderSummary({
        sponsorPlacement: {
          ...buildSponsorPlacement({
            eligibleSurfaces: ["resources_directory"],
            imageUrl: "https://example.com/public-sponsor-banner.png",
            logoUrl: "https://example.com/public-sponsor-logo.png",
          }),
          imageAssetId: "33333333-3333-4333-8333-333333333333",
          logoAssetId: "22222222-2222-4222-8222-222222222222",
        } as unknown as LocalSponsorPlacement,
      }),
      adminNotes: "No debe salir en mobile",
      exactLatitude: -16.510231,
      exactLongitude: -68.123881,
    } as unknown as ResourceProviderSummary;

    const viewModel = buildResourcesDirectoryViewModel({
      providers: [provider],
      location: {
        kind: "manual",
        label: "Sopocachi, La Paz",
      },
      mode: "map",
      status: "ready",
    });
    const serialized = JSON.stringify(viewModel);

    expect(serialized).toContain("Sopocachi, La Paz");
    expect(serialized).not.toContain("-16.510231");
    expect(serialized).not.toContain("-68.123881");
    expect(serialized).not.toContain("adminNotes");
    expect(serialized).not.toContain("logoAssetId");
    expect(serialized).not.toContain("imageAssetId");
  });

  it("describes empty, denied-location, offline, and error notices with Spanish actions", () => {
    const empty = buildResourcesDirectoryViewModel({
      providers: [],
      location: {
        kind: "manual",
        label: "Oruro",
      },
      mode: "list",
      status: "ready",
    });
    const denied = buildResourcesDirectoryViewModel({
      providers: rastroResourceFixtures.providers,
      location: {
        kind: "denied",
      },
      mode: "list",
      status: "ready",
    });
    const offline = buildResourcesDirectoryViewModel({
      providers: rastroResourceFixtures.providers,
      location: {
        kind: "last",
        label: "Sucre",
      },
      mode: "list",
      status: "ready",
      isOffline: true,
    });
    const error = buildResourcesDirectoryViewModel({
      providers: [],
      location: {
        kind: "manual",
        label: "Cochabamba",
      },
      mode: "map",
      status: "error",
      errorMessage: "Falló la búsqueda de Rastro.",
    });

    expect(empty.notice).toEqual({
      title: "No hay servicios cerca",
      body: "Intenta buscar en otra ubicación o ampliar el radio dentro de Bolivia.",
      actions: [
        { kind: "manual_search", label: "Buscar en otra zona" },
        { kind: "show_all", label: "Ver todos los recursos" },
      ],
    });
    expect(denied.notice).toEqual({
      title: "Busca por zona",
      body: "Sin permiso de ubicación, usa una ciudad, barrio o punto manual en Bolivia.",
      actions: [
        { kind: "manual_search", label: "Buscar zona manual" },
        { kind: "use_current_location", label: "Usar ubicación" },
      ],
    });
    expect(offline.notice).toEqual({
      title: "Sin conexión",
      body: "Mostrando recursos guardados si están disponibles. La búsqueda se actualizará cuando vuelva internet.",
      actions: [{ kind: "retry", label: "Reintentar" }],
    });
    expect(error.notice).toEqual({
      title: "No pudimos cargar recursos",
      body: "Falló la búsqueda de Rastro.",
      actions: [{ kind: "retry", label: "Reintentar" }],
    });
  });

  it("shows the provider profile contract with trust, sponsor, contact, and report details separated", () => {
    const profile = rastroResourceFixtures.profiles.find(
      (providerProfile) => providerProfile.id === "clinic-san-roque",
    );

    if (!profile) {
      throw new Error("Missing Clínica Veterinaria San Roque fixture");
    }

    const viewModel = buildResourceProviderProfileViewModel(profile);

    expect(viewModel).toMatchObject({
      id: "clinic-san-roque",
      name: "Clínica Veterinaria San Roque",
      subtitle: "Veterinaria especializada",
      heroImageUrl: "https://example.com/san-roque-photo.png",
      logoUrl: "https://example.com/san-roque-logo.png",
      sponsorLogoUrl: "https://example.com/sponsor-san-roque-logo.png",
      sponsorImageUrl: "https://example.com/sponsor-san-roque-banner.png",
      badges: [
        { label: "Veterinarias", tone: "category" },
        { label: "Verificado", tone: "verified" },
        { label: "Patrocinado", tone: "sponsor" },
        { label: "Urgencias 24h", tone: "emergency" },
      ],
      primaryActions: [
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
          kind: "directions",
          label: "Cómo llegar",
          value: "geo:-16.5109,-68.1213",
        },
      ],
      sections: [
        {
          title: "Sobre",
          rows: [
            {
              label: "Descripción",
              value:
                "Atención veterinaria general, urgencias y orientación para familias que buscan apoyo cerca de La Paz.",
            },
          ],
        },
        {
          title: "Horario y zona",
          rows: [
            {
              label: "Horario",
              value: "Lun - Dom: 24 horas",
            },
            {
              label: "Ubicación",
              value: "Sopocachi, La Paz",
            },
            {
              label: "Cobertura",
              value: "Atiende La Paz y El Alto",
            },
          ],
        },
      ],
      optionalLinks: [
        {
          label: "Sitio web",
          url: "https://sanroque.example.com",
        },
        {
          label: "Instagram",
          url: "https://instagram.example.com/sanroque",
        },
        {
          label: "Ficha externa",
          url: "https://sanroque.example.com/ficha",
        },
      ],
      sponsorDisclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      reportAction: {
        label: "Reportar",
        providerId: "clinic-san-roque",
      },
    });
  });

  it("exposes Local Sponsor Placement policy on provider profiles separately from verification", () => {
    const profile = rastroResourceFixtures.profiles.find(
      (providerProfile) => providerProfile.id === "clinic-san-roque",
    );

    if (!profile) {
      throw new Error("Missing Clínica Veterinaria San Roque fixture");
    }

    const viewModel = buildResourceProviderProfileViewModel(profile);

    expect(viewModel.badges).toContainEqual({
      label: "Verificado",
      tone: "verified",
    });
    expect(viewModel.badges).toContainEqual({
      label: "Patrocinado",
      tone: "sponsor",
    });
    expect(viewModel.sponsorPlacement).toEqual({
      kind: "Local Sponsor Placement",
      label: "Patrocinado",
      disclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      logoUrl: "https://example.com/sponsor-san-roque-logo.png",
      imageUrl: "https://example.com/sponsor-san-roque-banner.png",
      eligibleSurfaces: [
        "resources_directory",
        "provider_details",
        "report_success",
        "contextual_care_resources",
      ],
      safetyPolicy: {
        recoveryPriority: {
          label: "Recovery Priority",
          canAffect: false,
        },
        pushNotifications: {
          eligible: false,
        },
      },
    });
  });

  it("suppresses wrong-surface sponsor placements on provider profiles without setting verification", () => {
    const profile = buildProviderProfile({
      contactOptions: [
        {
          kind: "phone",
          label: "Llamar",
          value: "+591 2 222 1111",
        },
        {
          kind: "email",
          label: "",
          value: "",
        },
      ],
      hoursLabel: undefined,
      isVerified: false,
      sponsorPlacement: buildSponsorPlacement({
        eligibleSurfaces: ["resources_directory"],
      }),
    });

    const viewModel = buildResourceProviderProfileViewModel(profile);

    expect(viewModel.badges).toEqual([
      {
        label: "Veterinarias",
        tone: "category",
      },
    ]);
    expect(viewModel.primaryActions).toEqual([
      {
        kind: "phone",
        label: "Llamar",
        value: "+591 2 222 1111",
      },
    ]);
    expect(viewModel.sponsorPlacement).toBeUndefined();
    expect(viewModel.sponsorDisclosure).toBeUndefined();
    expect(viewModel.sections[1]?.rows).toEqual([
      {
        label: "Ubicación",
        value: "Sopocachi, La Paz",
      },
      {
        label: "Cobertura",
        value: "Atiende La Paz y El Alto",
      },
    ]);
  });

  it("omits missing provider profile optional fields without leaving empty sections", () => {
    const profile = rastroResourceFixtures.profiles.find(
      (providerProfile) => providerProfile.id === "peludos-felices",
    );

    if (!profile) {
      throw new Error("Missing Peludos Felices fixture");
    }

    const viewModel = buildResourceProviderProfileViewModel(profile);

    expect(viewModel.badges.map((badge) => badge.label)).toEqual([
      "Peluquerías",
    ]);
    expect(viewModel.primaryActions.map((action) => action.label)).toEqual([
      "Llamar",
      "Web",
    ]);
    expect(viewModel.optionalLinks).toEqual([]);
    expect(viewModel.sponsorDisclosure).toBeUndefined();
    expect(viewModel.sections.map((section) => section.title)).toEqual([
      "Sobre",
      "Horario y zona",
    ]);
    expect(viewModel.reportAction).toMatchObject({
      label: "Reportar",
      providerId: "peludos-felices",
    });
  });

  it("creates a moderation item when reporting a provider", async () => {
    const trustSafety = createInMemoryTrustSafetyRepository({
      now: () => "2026-06-18T13:20:00.000Z",
    });
    const adapter = createStaticResourcesAdapter(
      rastroResourceFixtures,
      trustSafety,
    );

    const receipt = await adapter.reportProvider({
      providerId: "clinic-san-roque",
      reason: "stolen_pet_concern",
      detail: "La dirección aproximada no coincide.",
    });

    expect(receipt).toMatchObject({
      status: "created",
      moderationItem: {
        targetType: "resource_provider",
        providerId: "clinic-san-roque",
        providerName: "Clínica Veterinaria San Roque",
        reason: "stolen_pet_concern",
        reviewItem: {
          createdAt: "2026-06-18T13:20:00.000Z",
          reason: "stolen_pet_concern",
          status: "pending",
          targetId: "clinic-san-roque",
          targetType: "resource_provider",
        },
      },
    });
  });

  it("keeps static adapter results radius-sorted and clones sponsor policy data", async () => {
    const nearbyProvider: ResourceProviderFixture = {
      id: "nearby-provider",
      name: "Veterinaria Cerca",
      categoryId: "veterinary",
      description: "Atención general",
      approximateLocationLabel: "Sopocachi, La Paz",
      exactLocation: {
        addressLabel: "Sopocachi, La Paz",
        countryCode: "BO",
        latitude: -16.5103,
        locationCellLabel: "Sopocachi",
        longitude: -68.1299,
      },
      contactOptions: [
        {
          kind: "phone",
          label: "Llamar",
          value: "+591 2 222 0000",
        },
      ],
    };
    const sponsoredFartherProvider: ResourceProviderFixture = {
      id: "sponsored-farther-provider",
      name: "Clínica Patrocinada Lejos",
      categoryId: "veterinary",
      description: "Atención patrocinada",
      approximateLocationLabel: "Miraflores, La Paz",
      exactLocation: {
        addressLabel: "Miraflores, La Paz",
        countryCode: "BO",
        latitude: -16.5006,
        locationCellLabel: "Miraflores",
        longitude: -68.1216,
      },
      sponsorPlacement: {
        kind: "Local Sponsor Placement",
        label: "Patrocinado",
        disclosure:
          "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
        eligibleSurfaces: [
          "resources_directory",
          "provider_details",
          "report_success",
          "contextual_care_resources",
        ],
        safetyPolicy: {
          recoveryPriority: {
            label: "Recovery Priority",
            canAffect: false,
          },
          pushNotifications: {
            eligible: false,
          },
        },
      },
      contactOptions: [
        {
          kind: "phone",
          label: "Llamar",
          value: "+591 2 222 9999",
        },
      ],
    };
    const adapter = createStaticResourcesAdapter({
      providers: [sponsoredFartherProvider, nearbyProvider],
      profiles: [],
    });
    const query = {
      location: {
        coordinate: {
          latitude: -16.5103,
          longitude: -68.1299,
        },
        countryCode: "BO",
        kind: "manual",
        label: "Sopocachi, La Paz",
        locationCellLabel: "Sopocachi",
        manualLocationKind: "place",
      },
      radiusMeters: 2_000,
      strategy: "postgis_radius",
    } as const;

    const firstResults = await adapter.searchProviders(query);
    const firstSponsor = firstResults.find(
      (provider) => provider.id === "sponsored-farther-provider",
    );

    expect(firstResults.map((provider) => provider.id)).toEqual([
      "nearby-provider",
      "sponsored-farther-provider",
    ]);
    expect(firstSponsor?.sponsorPlacement?.safetyPolicy).toEqual({
      recoveryPriority: {
        label: "Recovery Priority",
        canAffect: false,
      },
      pushNotifications: {
        eligible: false,
      },
    });

    (
      firstSponsor?.sponsorPlacement?.eligibleSurfaces as unknown as string[]
    ).push("launch_home_banner");

    const secondResults = await adapter.searchProviders(query);
    const secondSponsor = secondResults.find(
      (provider) => provider.id === "sponsored-farther-provider",
    );

    expect(secondSponsor?.sponsorPlacement?.eligibleSurfaces).toEqual([
      "resources_directory",
      "provider_details",
      "report_success",
      "contextual_care_resources",
    ]);
  });

  it("renders the last loaded resources directory when a later offline search fails", async () => {
    const cache =
      createInMemoryLastLoadedCache<ResourceProviderDirectoryResult>();
    const query = {
      location: {
        coordinate: {
          latitude: -16.5103,
          longitude: -68.1299,
        },
        countryCode: "BO",
        kind: "manual",
        label: "Sopocachi, La Paz",
        locationCellLabel: "Sopocachi",
        manualLocationKind: "place",
      },
      radiusMeters: 2_000,
      strategy: "postgis_radius",
    } as const;
    const onlineAdapter = createCachedResourcesAdapter({
      cache,
      cacheKey: "resources:sopocachi:2000",
      source: createStaticResourcesAdapter(),
    });
    const onlineResult = await onlineAdapter.searchProviderDirectory(query);

    expect(onlineResult.isOffline).toBeUndefined();
    expect(onlineResult.isStale).toBeUndefined();

    const offlineAdapter = createCachedResourcesAdapter({
      cache,
      cacheKey: "resources:sopocachi:2000",
      source: {
        getProviderProfile: () =>
          Promise.reject(new Error("Sin conexion de prueba.")),
        reportProvider: () =>
          Promise.reject(new Error("Sin conexion de prueba.")),
        searchProviders: () =>
          Promise.reject(new Error("Sin conexion de prueba.")),
      },
    });

    const staleResult = await offlineAdapter.searchProviderDirectory(query);
    const viewModel = buildResourcesDirectoryViewModel({
      providers: staleResult.providers,
      location: {
        kind: "manual",
        label: "Sopocachi, La Paz",
      },
      mode: "list",
      status: "ready",
      isOffline: staleResult.isOffline,
      isStale: staleResult.isStale,
    });

    expect(viewModel).toMatchObject({
      state: "offline",
      notice: {
        title: "Datos guardados",
        body: "Sin conexion. Mostrando recursos guardados; pueden estar desactualizados.",
      },
    });
    expect(viewModel.results.length).toBeGreaterThan(0);
  });

  it("renders the last loaded resource provider profile when a later offline detail load fails", async () => {
    const directoryCache =
      createInMemoryLastLoadedCache<ResourceProviderDirectoryResult>();
    const profileCache =
      createInMemoryLastLoadedCache<ResourceProviderProfileResult>();
    const onlineAdapter = createCachedResourcesAdapter({
      cache: directoryCache,
      cacheKey: "resources:sopocachi:2000",
      profileCache,
      source: createStaticResourcesAdapter(),
    });
    const onlineResult =
      await onlineAdapter.getProviderProfileDetail("clinic-san-roque");

    expect(onlineResult.isOffline).toBeUndefined();
    expect(onlineResult.isStale).toBeUndefined();
    expect(onlineResult).toMatchObject({
      profile: {
        id: "clinic-san-roque",
        name: "Clínica Veterinaria San Roque",
      },
    });

    const offlineAdapter = createCachedResourcesAdapter({
      cache: directoryCache,
      cacheKey: "resources:sopocachi:2000",
      profileCache,
      source: {
        getProviderProfile: () =>
          Promise.reject(new Error("Sin conexion de prueba.")),
        reportProvider: () =>
          Promise.reject(new Error("Sin conexion de prueba.")),
        searchProviders: () =>
          Promise.reject(new Error("Sin conexion de prueba.")),
      },
    });
    const staleResult =
      await offlineAdapter.getProviderProfileDetail("clinic-san-roque");

    expect(staleResult).toMatchObject({
      isOffline: true,
      isStale: true,
      profile: {
        id: "clinic-san-roque",
        name: "Clínica Veterinaria San Roque",
      },
    });
  });

  it("describes current, last, manual, denied, and offline search states", () => {
    const currentLocation = buildResourcesDirectoryViewModel({
      providers: rastroResourceFixtures.providers,
      location: {
        kind: "current",
        label: "Cochabamba",
      },
      mode: "list",
      status: "ready",
    });
    const lastLocation = buildResourcesDirectoryViewModel({
      providers: rastroResourceFixtures.providers,
      location: {
        kind: "last",
        label: "Santa Cruz de la Sierra",
      },
      mode: "list",
      status: "ready",
    });
    const manualLocation = buildResourcesDirectoryViewModel({
      providers: rastroResourceFixtures.providers,
      location: {
        kind: "manual",
        label: "Tarija",
      },
      mode: "list",
      status: "ready",
    });
    const deniedLocation = buildResourcesDirectoryViewModel({
      providers: rastroResourceFixtures.providers,
      location: {
        kind: "denied",
      },
      mode: "list",
      status: "ready",
    });
    const offline = buildResourcesDirectoryViewModel({
      providers: rastroResourceFixtures.providers,
      location: {
        kind: "manual",
        label: "Tarija",
      },
      mode: "list",
      status: "ready",
      isOffline: true,
    });

    expect(currentLocation.location.label).toBe("Cerca de Cochabamba");
    expect(currentLocation.location.helper).toBe(
      "Búsqueda por radio PostGIS de Rastro en Bolivia.",
    );
    expect(lastLocation.location.label).toBe(
      "Última ubicación: Santa Cruz de la Sierra",
    );
    expect(lastLocation.location.helper).toBe(
      "Usa la última zona guardada; puedes actualizarla o buscar otra zona de Bolivia.",
    );
    expect(manualLocation.location).toEqual({
      kind: "manual",
      label: "Buscando en Tarija",
      helper: "Búsqueda manual dentro de Bolivia con radio PostGIS de Rastro.",
    });
    expect(deniedLocation).toMatchObject({
      state: "location_denied",
      location: {
        label: "Ubicación desactivada",
        helper: "Busca una ciudad, zona o punto manual en Bolivia.",
      },
      notice: {
        title: "Busca por zona",
      },
    });
    expect(offline).toMatchObject({
      state: "offline",
      notice: {
        title: "Sin conexión",
      },
    });
  });
});

function buildProviderSummary(
  overrides: Partial<ResourceProviderSummary> = {},
): ResourceProviderSummary {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Clinica Veterinaria San Roque",
    categoryId: "veterinary",
    description: "Veterinaria local con atencion general y urgencias.",
    approximateLocationLabel: "Sopocachi, La Paz",
    serviceAreaLabel: "Atiende La Paz y El Alto",
    distanceMeters: 800,
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
        value: "contacto@example.com",
      },
    ],
    ...overrides,
  };
}

function buildProviderProfile(
  overrides: Partial<ResourceProviderProfile> = {},
): ResourceProviderProfile {
  return {
    ...buildProviderSummary(),
    serviceAreaLabel: "Atiende La Paz y El Alto",
    hoursLabel: "Lun - Dom: 24 horas",
    shortDescription:
      "Atencion veterinaria general y orientacion para familias cuidadoras.",
    websiteUrl: "https://sanroque.example.com",
    ...overrides,
  };
}

function buildSponsorPlacement(
  overrides: Partial<LocalSponsorPlacement> = {},
): LocalSponsorPlacement {
  return {
    kind: "Local Sponsor Placement",
    label: "Patrocinado",
    disclosure: "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
    logoUrl: "https://example.com/sponsor-logo.png",
    imageUrl: "https://example.com/sponsor-banner.png",
    eligibleSurfaces: ["resources_directory", "provider_details"],
    safetyPolicy: {
      recoveryPriority: {
        label: "Recovery Priority",
        canAffect: false,
      },
      pushNotifications: {
        eligible: false,
      },
    },
    ...overrides,
  };
}
