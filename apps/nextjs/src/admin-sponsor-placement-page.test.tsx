import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminResourceProviderProfile } from "./admin-resource-provider-admin-model";
import type { AdminSponsorPlacementRecord } from "./admin-sponsor-placement-model";

const authServer = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const resourceProviderApi = vi.hoisted(() => ({
  listAdminResourceProviderProfiles: vi.fn(),
}));

const sponsorApi = vi.hoisted(() => ({
  listAdminSponsorPlacements: vi.fn(),
}));

const envMock = vi.hoisted(() => ({
  env: {
    RASTRO_ADMIN_EMAILS: "admin@rastro.bo",
  },
}));

vi.mock("~/auth/server", () => authServer);
vi.mock("~/env", () => envMock);
vi.mock("~/admin-resource-provider-api-adapter", () => resourceProviderApi);
vi.mock("~/admin-sponsor-placement-api-adapter", () => sponsorApi);

describe("admin sponsor placement page", () => {
  beforeEach(() => {
    vi.resetModules();
    authServer.getSession.mockReset();
    resourceProviderApi.listAdminResourceProviderProfiles.mockReset();
    sponsorApi.listAdminSponsorPlacements.mockReset();
    envMock.env.RASTRO_ADMIN_EMAILS = "admin@rastro.bo";
  });

  it("renders the sponsor placement dashboard for allowlisted admins", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    sponsorApi.listAdminSponsorPlacements.mockResolvedValue(
      adminSponsorListResult([sponsorPlacement()], { total: 20 }),
    );
    resourceProviderApi.listAdminResourceProviderProfiles.mockResolvedValue(
      adminProviderListResult([providerProfile()]),
    );
    const { default: AdminSponsorPlacementsPage, metadata } = await import(
      "./app/admin/patrocinios/page"
    );

    const html = renderToStaticMarkup(await AdminSponsorPlacementsPage());

    expect(metadata).toMatchObject({
      title: "Patrocinios locales | Rastro",
    });
    expect(html).toContain("Gestión de patrocinios locales");
    expect(html).toContain("Clinica Veterinaria San Roque");
    expect(html).toContain("Política de seguridad respaldada por datos");
    expect(html).toContain("<table");
    expect(html).toContain("/admin/patrocinios?pageSize=10&amp;sortBy=");
    expect(html).toContain("/admin/patrocinios?page=2&amp;pageSize=10");
    expect(sponsorApi.listAdminSponsorPlacements).toHaveBeenCalledTimes(1);
    expect(sponsorApi.listAdminSponsorPlacements).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
    });
    expect(
      resourceProviderApi.listAdminResourceProviderProfiles,
    ).toHaveBeenCalledTimes(1);
    expect(
      resourceProviderApi.listAdminResourceProviderProfiles,
    ).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
    });
  });

  it("passes URL-derived sponsor list state to the backend", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    sponsorApi.listAdminSponsorPlacements.mockResolvedValue(
      adminSponsorListResult([sponsorPlacement()], {
        page: 2,
        pageSize: 25,
        total: 40,
      }),
    );
    resourceProviderApi.listAdminResourceProviderProfiles.mockResolvedValue(
      adminProviderListResult([providerProfile()]),
    );
    const { default: AdminSponsorPlacementsPage } = await import(
      "./app/admin/patrocinios/page"
    );

    const html = renderToStaticMarkup(
      await AdminSponsorPlacementsPage({
        searchParams: Promise.resolve({
          activeOn: "2026-07-15",
          category: "veterinary",
          city: "La Paz",
          department: "La Paz",
          endsTo: "2026-08-31",
          mediaState: "has_media",
          page: "2",
          pageSize: "25",
          search: "San Roque",
          sortBy: "startsOn",
          sortDirection: "asc",
          state: "active",
          surface: "resources_directory",
          verification: "verified",
        }),
      }),
    );

    expect(sponsorApi.listAdminSponsorPlacements).toHaveBeenCalledWith({
      filters: {
        activeOn: "2026-07-15",
        category: ["veterinary"],
        city: "La Paz",
        department: "La Paz",
        endsTo: "2026-08-31",
        mediaState: "has_media",
        state: "active",
        surface: ["resources_directory"],
        verification: ["verified"],
      },
      page: 2,
      pageSize: 25,
      search: "San Roque",
      sortBy: "startsOn",
      sortDirection: "asc",
    });
    expect(
      resourceProviderApi.listAdminResourceProviderProfiles,
    ).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
    });
    expect(html).toContain("Búsqueda: San Roque");
    expect(html).toContain("Estado: Activo");
    expect(html).toContain("Mostrando 26-40 de 40");
  });

  it("renders access denied without fetching placements for non-admin members", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "ana@example.com",
        id: "member-ana",
        name: "Ana miembro",
      },
    });
    const { default: AdminSponsorPlacementsPage } = await import(
      "./app/admin/patrocinios/page"
    );

    const html = renderToStaticMarkup(await AdminSponsorPlacementsPage());

    expect(html).toContain("Acceso restringido");
    expect(html).toContain("Ana miembro");
    expect(sponsorApi.listAdminSponsorPlacements).not.toHaveBeenCalled();
    expect(
      resourceProviderApi.listAdminResourceProviderProfiles,
    ).not.toHaveBeenCalled();
    expect(html).not.toContain("Crear patrocinio");
  });
});

function sponsorPlacement(): AdminSponsorPlacementRecord {
  return {
    category: "veterinary",
    city: "La Paz",
    department: "La Paz",
    disclosure: "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
    endsOn: "2026-07-31",
    isActive: true,
    label: "Patrocinado",
    placementId: "22222222-2222-4222-8222-222222222222",
    providerId: "11111111-1111-4111-8111-111111111111",
    providerName: "Clinica Veterinaria San Roque",
    providerVerificationStatus: "verified",
    safetyPolicy: {
      eligibleSurfaces: ["resources_directory"],
      recoveryPriority: {
        label: "Recovery Priority",
        canAffect: false,
      },
      pushNotifications: {
        eligible: false,
      },
    },
    startsOn: "2026-07-01",
    surface: "resources_directory",
  };
}

function providerProfile(): AdminResourceProviderProfile {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Clinica Veterinaria San Roque",
    categoryId: "veterinary",
    city: "La Paz",
    description: "Veterinaria local con atencion general y urgencias.",
    department: "La Paz",
    approximateLocationLabel: "Sopocachi, La Paz",
    serviceAreaLabel: "Atiende La Paz y El Alto",
    hoursLabel: "Lun - Dom: 24 horas",
    shortDescription:
      "Atencion veterinaria general y orientacion para familias cuidadoras.",
    isVerified: true,
    emergencyAvailable: true,
    isOpenNow: true,
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
    contactOptions: [
      {
        kind: "phone",
        label: "Llamar",
        value: "+591 2 222 1111",
      },
    ],
    sponsorPlacements: [],
  };
}

function adminSponsorListResult(
  items: AdminSponsorPlacementRecord[],
  overrides: Partial<{
    page: number;
    pageSize: number;
    total: number;
  }> = {},
) {
  const page = overrides.page ?? 1;
  const pageSize = overrides.pageSize ?? 10;
  const total = overrides.total ?? items.length;

  return {
    availableFilters: [
      {
        key: "category",
        label: "Categoría",
        options: [{ label: "Clínica veterinaria", value: "veterinary" }],
        type: "enum" as const,
      },
      {
        key: "city",
        label: "Ciudad",
        type: "text" as const,
      },
      {
        key: "department",
        label: "Departamento",
        type: "text" as const,
      },
      {
        key: "verification",
        label: "Verificación",
        options: [{ label: "Verificado", value: "verified" }],
        type: "enum" as const,
      },
      {
        key: "state",
        label: "Estado",
        options: [{ label: "Activo", value: "active" }],
        type: "enum" as const,
      },
      {
        key: "surface",
        label: "Superficie",
        options: [
          { label: "Directorio de recursos", value: "resources_directory" },
        ],
        type: "enum" as const,
      },
      {
        key: "activeOn",
        label: "Activo en fecha",
        type: "date" as const,
      },
      {
        key: "endsTo",
        label: "Termina hasta",
        type: "date" as const,
      },
      {
        key: "mediaState",
        label: "Medios",
        options: [{ label: "Con medios", value: "has_media" }],
        type: "enum" as const,
      },
    ],
    availableSorts: [
      { defaultDirection: "asc" as const, label: "Inicio", value: "startsOn" },
      {
        defaultDirection: "asc" as const,
        label: "Proveedor",
        value: "providerName",
      },
    ],
    hasNextPage: page * pageSize < total,
    hasPreviousPage: page > 1,
    items,
    page,
    pageCount: Math.ceil(total / pageSize),
    pageSize,
    total,
  };
}

function adminProviderListResult(items: AdminResourceProviderProfile[]) {
  return {
    availableFilters: [],
    availableSorts: [],
    hasNextPage: false,
    hasPreviousPage: false,
    items,
    page: 1,
    pageCount: items.length > 0 ? 1 : 0,
    pageSize: 10,
    total: items.length,
  };
}
