import { describe, expect, it } from "vitest";

import {
  buildResourceProviderProfileViewModel,
  buildResourcesDirectoryViewModel,
} from "./resources-view-model";
import { createStaticResourcesAdapter } from "./static-resources-adapter";
import { rastroResourceFixtures } from "./static-resources-fixtures";

describe("Resources directory", () => {
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
    });
    expect(sponsoredProvider?.sponsorDisclosure).not.toMatch(
      /push|notific|prioridad de recuperaci[oó]n/i,
    );
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
    expect(viewModel.sections.map((section) => section.title)).toEqual([
      "Sobre",
      "Horario y zona",
    ]);
    expect(viewModel.reportAction).toMatchObject({
      label: "Reportar perfil",
      providerId: "peludos-felices",
    });
  });

  it("creates a moderation item when reporting a provider", async () => {
    const adapter = createStaticResourcesAdapter(rastroResourceFixtures);

    const receipt = await adapter.reportProvider({
      providerId: "clinic-san-roque",
      reason: "incorrect_location",
      detail: "La dirección aproximada no coincide.",
    });

    expect(receipt).toMatchObject({
      status: "created",
      moderationItem: {
        targetType: "resource_provider",
        providerId: "clinic-san-roque",
        providerName: "Clínica Veterinaria San Roque",
        reason: "incorrect_location",
      },
    });
  });

  it("describes current, last, denied, and offline search states", () => {
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
    expect(lastLocation.location.label).toBe(
      "Última ubicación: Santa Cruz de la Sierra",
    );
    expect(deniedLocation).toMatchObject({
      state: "location_denied",
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
