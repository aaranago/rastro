import { describe, expect, it } from "vitest";

import type { AdminResourceManagementViewer } from "./admin-resources";
import {
  createInMemoryAdminResourceManagement,
  localSponsorPlacementSurfaceOptions,
  resourceProviderCategoryOptions,
} from "./admin-resources";

const adminViewer = {
  memberId: "member-admin-la-paz",
  role: "admin",
} satisfies AdminResourceManagementViewer;

const memberViewer = {
  memberId: "member-camila",
  role: "member",
} satisfies AdminResourceManagementViewer;

const visitorViewer = {
  role: "visitor",
} satisfies AdminResourceManagementViewer;

describe("admin resource management", () => {
  it("guards provider and sponsor management to admin viewers without mutating state", () => {
    const resources = createInMemoryAdminResourceManagement({
      now: "2026-07-15",
    });

    expect(resources.listProviders(memberViewer)).toEqual({
      status: "forbidden",
      viewModel: {
        body: "Esta superficie está disponible solo para administradores de Rastro.",
        locale: "es-BO",
        title: "Acceso restringido",
      },
    });
    expect(
      resources.createProvider(visitorViewer, {
        category: "veterinary",
        city: "El Alto",
        contactLabel: "WhatsApp verificado",
        department: "La Paz",
        name: "Veterinaria Alto Norte",
        serviceAreaLabel: "El Alto y La Paz",
      }),
    ).toMatchObject({
      status: "forbidden",
    });
    expect(
      resources.attachSponsorPlacement(memberViewer, {
        endsOn: "2026-09-30",
        placementId: "sponsor-alto-norte",
        providerId: "clinic-san-roque",
        startsOn: "2026-07-01",
        surface: "resources_directory",
      }),
    ).toMatchObject({
      status: "forbidden",
    });

    const authorized = resources.listProviders(adminViewer);

    if (authorized.status !== "authorized") {
      throw new Error("Expected admin access");
    }

    expect(authorized.viewModel.providers).toHaveLength(2);
    expect(authorized.viewModel.providers[0]?.sponsorPlacements).toEqual([]);
  });

  it("uses the same Recursos category and sponsor-surface IDs as the public resource model", () => {
    expect(resourceProviderCategoryOptions.map((option) => option.id)).toEqual([
      "veterinary",
      "shelter",
      "groomer",
      "pet_food",
      "trainer",
      "pet_store",
      "transport",
      "other",
    ]);
    expect(
      localSponsorPlacementSurfaceOptions.map((option) => option.id),
    ).toEqual(["resources_directory", "provider_details"]);
  });

  it("lists and creates providers with Spanish Bolivia copy", () => {
    const resources = createInMemoryAdminResourceManagement();

    const initial = resources.listProviders(adminViewer);

    expect(initial).toMatchObject({
      status: "authorized",
      viewModel: {
        createActionLabel: "Registrar proveedor",
        locale: "es-BO",
        title: "Gestión de proveedores de recursos",
      },
    });

    if (initial.status !== "authorized") {
      throw new Error("Expected admin access");
    }

    expect(initial.viewModel.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "veterinary",
          categoryLabel: "Clínica veterinaria",
          city: "Santa Cruz de la Sierra",
          department: "Santa Cruz",
          name: "Clínica San Roque",
          serviceAreaLabel: "Santa Cruz urbano",
        }),
      ]),
    );

    const created = resources.createProvider(adminViewer, {
      category: "shelter",
      city: "  Sucre  ",
      contactLabel: "Contacto institucional verificado",
      department: "  Chuquisaca ",
      name: " Refugio Patitas Sucre ",
      serviceAreaLabel: "Sucre y municipios cercanos",
    });

    expect(created).toMatchObject({
      announcement: {
        title: "Proveedor de recursos creado",
      },
      provider: {
        city: "Sucre",
        department: "Chuquisaca",
        name: "Refugio Patitas Sucre",
        providerId: "provider-refugio-patitas-sucre-3",
        verificationBadge: {
          label: "Sin insignia de verificacion",
          status: "unverified",
        },
      },
      status: "created",
    });
    expect(resources.listProviders(adminViewer)).toMatchObject({
      status: "authorized",
      viewModel: {
        providers: [
          expect.any(Object),
          expect.any(Object),
          expect.objectContaining({
            name: "Refugio Patitas Sucre",
          }),
        ],
      },
    });
  });

  it("rejects blank provider fields without creating a provider", () => {
    const resources = createInMemoryAdminResourceManagement();

    expect(
      resources.createProvider(adminViewer, {
        category: "other",
        city: " ",
        contactLabel: "",
        department: "La Paz",
        name: "  ",
        serviceAreaLabel: " ",
      }),
    ).toEqual({
      announcement: {
        body: "No pudimos crear el proveedor de recursos.",
        title: "Revisa los datos ingresados",
      },
      fieldErrors: [
        {
          field: "name",
          message: "Este campo es obligatorio.",
        },
        {
          field: "city",
          message: "Este campo es obligatorio.",
        },
        {
          field: "serviceAreaLabel",
          message: "Este campo es obligatorio.",
        },
        {
          field: "contactLabel",
          message: "Este campo es obligatorio.",
        },
      ],
      status: "invalid_input",
    });
    expect(resources.listProviders(adminViewer)).toMatchObject({
      status: "authorized",
      viewModel: {
        providers: [expect.any(Object), expect.any(Object)],
      },
    });
  });

  it("updates an existing provider verification badge without sponsor disclosure", () => {
    const resources = createInMemoryAdminResourceManagement();

    const updated = resources.updateProviderVerificationBadge(adminViewer, {
      note: "  Identidad revisada con licencia municipal de La Paz. ",
      providerId: "provider-patitas-la-paz",
      status: "verified",
    });

    expect(updated).toMatchObject({
      announcement: {
        title: "Insignia de verificacion actualizada",
      },
      provider: {
        providerId: "provider-patitas-la-paz",
        verificationBadge: {
          label: "Insignia de verificacion",
          note: "Identidad revisada con licencia municipal de La Paz.",
          status: "verified",
        },
      },
      status: "updated",
    });

    if (updated.status !== "updated") {
      throw new Error("Expected verification badge update");
    }

    expect("sponsorPlacements" in updated.provider).toBe(false);
  });

  it("attaches and detaches sponsor placements with explicit safety policy", () => {
    const resources = createInMemoryAdminResourceManagement({
      now: "2026-07-15",
    });

    const attached = resources.attachSponsorPlacement(adminViewer, {
      endsOn: "2026-08-31",
      placementId: " sponsor-san-roque-julio ",
      providerId: " clinic-san-roque ",
      startsOn: "2026-07-01",
      surface: "provider_details",
    });

    expect(attached).toMatchObject({
      announcement: {
        body: "El patrocinio queda etiquetado y no cambia la prioridad de recuperacion ni las alertas.",
        title: "Patrocinio local adjuntado",
      },
      provider: {
        providerId: "clinic-san-roque",
        sponsorPlacements: [
          {
            disclosureLabel: "Patrocinado local",
            placementId: "sponsor-san-roque-julio",
            safetyPolicy: {
              pushNotifications: {
                eligible: false,
              },
              recoveryPriority: {
                canAffect: false,
              },
            },
            surface: "provider_details",
            surfaceLabel: "Perfil del proveedor",
          },
        ],
      },
      status: "updated",
    });

    if (attached.status !== "updated") {
      throw new Error("Expected sponsor placement to attach");
    }

    expect(attached.provider.sponsorPlacements[0]?.safetyPolicy).toEqual({
      eligibleSurfaces: ["provider_details"],
      pushNotifications: {
        eligible: false,
        note: "Los patrocinadores locales no activan push notifications.",
      },
      recoveryPriority: {
        canAffect: false,
        note: "Reportes de mascota perdida, encontrada y avistamiento mantienen prioridad.",
      },
    });

    expect(
      resources.detachSponsorPlacement(adminViewer, {
        placementId: " sponsor-san-roque-julio ",
        providerId: " clinic-san-roque ",
      }),
    ).toMatchObject({
      announcement: {
        title: "Patrocinio local retirado",
      },
      provider: {
        providerId: "clinic-san-roque",
        sponsorPlacements: [],
      },
      status: "updated",
    });
  });

  it("rejects invalid sponsor dates and reports missing providers or placements", () => {
    const resources = createInMemoryAdminResourceManagement();

    expect(
      resources.attachSponsorPlacement(adminViewer, {
        endsOn: "2026-06-30",
        placementId: "sponsor-san-roque-julio",
        providerId: "clinic-san-roque",
        startsOn: "2026-07-01",
        surface: "resources_directory",
      }),
    ).toEqual({
      announcement: {
        body: "No pudimos adjuntar el patrocinio local.",
        title: "Revisa los datos ingresados",
      },
      fieldErrors: [
        {
          field: "endsOn",
          message:
            "La fecha final debe ser posterior o igual a la fecha inicial.",
        },
      ],
      status: "invalid_input",
    });
    expect(
      resources.attachSponsorPlacement(adminViewer, {
        endsOn: "2026-09-31",
        placementId: "sponsor-san-roque-julio",
        providerId: "provider-does-not-exist",
        startsOn: "2026-07-01",
        surface: "resources_directory",
      }),
    ).toMatchObject({
      fieldErrors: [
        {
          field: "endsOn",
        },
      ],
      status: "invalid_input",
    });
    expect(
      resources.updateProviderVerificationBadge(adminViewer, {
        note: "Identidad revisada por Rastro.",
        providerId: "provider-does-not-exist",
        status: "verified",
      }),
    ).toEqual({
      announcement: {
        body: "No encontramos el proveedor de recursos solicitado.",
        title: "Proveedor de recursos no encontrado",
      },
      status: "not_found",
    });
    expect(
      resources.detachSponsorPlacement(adminViewer, {
        placementId: "placement-does-not-exist",
        providerId: "clinic-san-roque",
      }),
    ).toEqual({
      announcement: {
        body: "No encontramos el patrocinio local solicitado.",
        title: "Patrocinio local no encontrado",
      },
      status: "not_found",
    });
  });

  it("exposes active sponsor metrics by department and city using the management clock", () => {
    const resources = createInMemoryAdminResourceManagement({
      now: "2026-07-15",
    });

    resources.attachSponsorPlacement(adminViewer, {
      endsOn: "2026-08-31",
      placementId: "sponsor-san-roque-julio",
      providerId: "clinic-san-roque",
      startsOn: "2026-07-01",
      surface: "resources_directory",
    });
    resources.attachSponsorPlacement(adminViewer, {
      endsOn: "2026-12-31",
      placementId: "sponsor-patitas-fin-ano",
      providerId: "provider-patitas-la-paz",
      startsOn: "2026-10-01",
      surface: "provider_details",
    });
    resources.updateProviderVerificationBadge(adminViewer, {
      note: "Identidad confirmada por Rastro.",
      providerId: "provider-patitas-la-paz",
      status: "verified",
    });

    expect(resources.getMetrics(adminViewer)).toEqual({
      metrics: {
        byCity: [
          {
            activeSponsorPlacementCount: 1,
            label: "Santa Cruz de la Sierra",
            providerCount: 1,
            verifiedProviderCount: 1,
          },
          {
            activeSponsorPlacementCount: 0,
            label: "La Paz",
            providerCount: 1,
            verifiedProviderCount: 1,
          },
        ],
        byDepartment: [
          {
            activeSponsorPlacementCount: 1,
            label: "Santa Cruz",
            providerCount: 1,
            verifiedProviderCount: 1,
          },
          {
            activeSponsorPlacementCount: 0,
            label: "La Paz",
            providerCount: 1,
            verifiedProviderCount: 1,
          },
        ],
      },
      status: "authorized",
    });
  });
});
