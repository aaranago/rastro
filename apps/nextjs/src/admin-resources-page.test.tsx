import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminResourceProviderProfile } from "./admin-resource-provider-admin-model";

const authServer = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const adminResourceProviderApi = vi.hoisted(() => ({
  listAdminResourceProviderProfiles: vi.fn(),
  createAdminResourceProvider: vi.fn(),
  updateAdminResourceProvider: vi.fn(),
  deleteAdminResourceProvider: vi.fn(),
  updateAdminResourceProviderVerification: vi.fn(),
  attachAdminResourceProviderSponsor: vi.fn(),
  detachAdminResourceProviderSponsor: vi.fn(),
}));

const envMock = vi.hoisted(() => ({
  env: {
    RASTRO_ADMIN_EMAILS: "admin@rastro.bo",
  },
}));

const nextCache = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

const nextNavigation = vi.hoisted(() => ({
  redirect: vi.fn(),
}));

vi.mock("~/auth/server", () => authServer);
vi.mock("~/env", () => envMock);
vi.mock(
  "~/admin-resource-provider-api-adapter",
  () => adminResourceProviderApi,
);
vi.mock(
  "./admin-resource-provider-api-adapter",
  () => adminResourceProviderApi,
);
vi.mock("next/cache", () => nextCache);
vi.mock("next/navigation", () => nextNavigation);

const forbiddenTerms = new RegExp(
  [
    ["Resource", "Provider"].join(" "),
    ["Verification", "Badge"].join(" "),
  ].join("|"),
  "i",
);
const marketplaceTerms = /marketplace|seller|comprar|vender/i;

describe("admin resources page", () => {
  beforeEach(() => {
    vi.resetModules();
    authServer.getSession.mockReset();
    adminResourceProviderApi.listAdminResourceProviderProfiles.mockReset();
    adminResourceProviderApi.createAdminResourceProvider.mockReset();
    adminResourceProviderApi.updateAdminResourceProvider.mockReset();
    adminResourceProviderApi.deleteAdminResourceProvider.mockReset();
    adminResourceProviderApi.updateAdminResourceProviderVerification.mockReset();
    adminResourceProviderApi.attachAdminResourceProviderSponsor.mockReset();
    adminResourceProviderApi.detachAdminResourceProviderSponsor.mockReset();
    nextCache.revalidatePath.mockReset();
    nextNavigation.redirect.mockReset();
    envMock.env.RASTRO_ADMIN_EMAILS = "admin@rastro.bo";
  });

  it("renders the provider management dashboard for an allowed admin member", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    adminResourceProviderApi.listAdminResourceProviderProfiles.mockResolvedValue(
      adminProviderListResult(
        [
          providerProfile(),
          providerProfile({
            id: "22222222-2222-4222-8222-222222222222",
            approximateLocationLabel: "Miraflores, La Paz",
            city: "La Paz",
            department: "La Paz",
            name: "Patitas La Paz",
            isVerified: false,
            sponsorPlacement: undefined,
          }),
        ],
        { total: 20 },
      ),
    );
    const { default: AdminResourcesPage, metadata } = await import(
      "./app/admin/proveedores/page"
    );

    const html = renderToStaticMarkup(await AdminResourcesPage());

    expect(metadata).toMatchObject({
      title: "Proveedores de recursos | Rastro",
    });
    expect(html).toContain("Gestión de proveedores de recursos");
    expect(html).toContain("Cola de proveedores");
    expect(html).toContain("20 proveedores");
    expect(html).toContain("Clinica Veterinaria San Roque");
    expect(html).toContain("Patitas La Paz");
    expect(html).toContain("Actualizado");
    expect(html).toContain("Registrar proveedor");
    expect(html).toContain("Editar detalles");
    expect(html).toContain("Verificación");
    expect(html).toContain("Patrocinio");
    expect(html).toContain("Archivar");
    expect(html).not.toContain("Latitud exacta");
    expect(html).not.toContain("Ubicación y privacidad");
    expect(html).not.toContain("Opciones de contacto");
    expect(html).not.toContain("Guardar detalles");
    expect(html).not.toContain("Guardar verificación");
    expect(html).not.toContain("Adjuntar patrocinio local");
    expect(html).not.toContain("Retirar por ID");
    expect(html).toContain("Métricas por departamento");
    expect(html).toContain("Admin Rastro");
    expect(html).toContain("<table");
    expect(html).toContain("/admin/proveedores?pageSize=10&amp;sortBy=name");
    expect(html).toContain("/admin/proveedores?page=2&amp;pageSize=10");
    expect(
      adminResourceProviderApi.listAdminResourceProviderProfiles,
    ).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
    });
    expect(html).not.toContain("modelo administrativo temporal");
    expect(html).not.toContain("no confirma publicacion");
    expect(html).not.toContain("Falta contrato API para actualizar detalles");
    expect(html).not.toContain("Falta contrato API para archivar o eliminar");
    expect(html).not.toMatch(forbiddenTerms);
    expect(html).not.toMatch(marketplaceTerms);
  });

  it("passes URL-derived provider list state to the backend", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    adminResourceProviderApi.listAdminResourceProviderProfiles.mockResolvedValue(
      adminProviderListResult([providerProfile()], {
        page: 2,
        pageSize: 25,
        total: 40,
      }),
    );
    const { default: AdminResourcesPage } = await import(
      "./app/admin/proveedores/page"
    );

    const html = renderToStaticMarkup(
      await AdminResourcesPage({
        searchParams: Promise.resolve({
          activeOn: "2026-07-15",
          category: "veterinary",
          city: "La Paz",
          department: "La Paz",
          mediaState: "has_media",
          page: "2",
          pageSize: "25",
          search: "San Roque",
          sortBy: "sponsorState",
          sortDirection: "desc",
          sponsorState: "active",
          sponsorSurface: "resources_directory",
          verification: "verified",
        }),
      }),
    );

    expect(
      adminResourceProviderApi.listAdminResourceProviderProfiles,
    ).toHaveBeenCalledWith({
      filters: {
        activeOn: "2026-07-15",
        category: ["veterinary"],
        city: "La Paz",
        department: "La Paz",
        mediaState: "has_media",
        sponsorState: "active",
        sponsorSurface: ["resources_directory"],
        verification: ["verified"],
      },
      page: 2,
      pageSize: 25,
      search: "San Roque",
      sortBy: "sponsorState",
      sortDirection: "desc",
    });
    expect(html).toContain("Búsqueda: San Roque");
    expect(html).toContain("Patrocinio: Activo");
    expect(html).toContain("Mostrando 26-40 de 40");
  });

  it("renders restricted access for signed-in non-admin members", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "ana@example.com",
        id: "member-ana",
        name: "Ana miembro",
      },
    });
    const { default: AdminResourcesPage } = await import(
      "./app/admin/proveedores/page"
    );

    const html = renderToStaticMarkup(await AdminResourcesPage());

    expect(html).toContain("Acceso restringido");
    expect(html).toContain("Ana miembro");
    expect(
      adminResourceProviderApi.listAdminResourceProviderProfiles,
    ).not.toHaveBeenCalled();
    expect(html).not.toContain("Registrar proveedor");
    expect(html).not.toContain("Guardar identidad");
    expect(html).not.toContain("Adjuntar patrocinio local");
    expect(html).not.toMatch(forbiddenTerms);
    expect(html).not.toMatch(marketplaceTerms);
  });

  it("renders restricted access for visitors", async () => {
    authServer.getSession.mockResolvedValue(null);
    const { default: AdminResourcesPage } = await import(
      "./app/admin/proveedores/page"
    );

    const html = renderToStaticMarkup(await AdminResourcesPage());

    expect(html).toContain("Acceso restringido");
    expect(html).toContain("Visitante sin sesion");
    expect(
      adminResourceProviderApi.listAdminResourceProviderProfiles,
    ).not.toHaveBeenCalled();
    expect(html).not.toContain("Registrar proveedor");
    expect(html).not.toContain("Guardar identidad");
    expect(html).not.toContain("Adjuntar patrocinio local");
    expect(html).not.toMatch(forbiddenTerms);
    expect(html).not.toMatch(marketplaceTerms);
  });

  it("revalidates the sponsor dashboard after provider-side sponsor changes", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    adminResourceProviderApi.listAdminResourceProviderProfiles.mockResolvedValue(
      adminProviderListResult([providerProfile()]),
    );
    adminResourceProviderApi.attachAdminResourceProviderSponsor.mockResolvedValue(
      {},
    );
    const { default: AdminResourcesPage } = await import(
      "./app/admin/proveedores/page"
    );

    const page = await AdminResourcesPage();
    if (!isValidElement<AdminResourcesPageElementProps>(page)) {
      throw new Error("Expected admin resources page element.");
    }

    await page.props.formAction?.(
      {},
      formData({
        endsOn: "2026-07-31",
        providerId: "11111111-1111-4111-8111-111111111111",
        providerName: "Clinica Veterinaria San Roque",
        resourceAction: "attach_sponsor",
        sponsorDisclosure:
          "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
        sponsorLabel: "Patrocinado",
        sponsorSurface: "resources_directory",
        startsOn: "2026-07-01",
      }),
    );

    expect(
      adminResourceProviderApi.attachAdminResourceProviderSponsor,
    ).toHaveBeenCalledWith({
      disclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      endsOn: "2026-07-31",
      label: "Patrocinado",
      providerId: "11111111-1111-4111-8111-111111111111",
      startsOn: "2026-07-01",
      surface: "resources_directory",
    });
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/admin/proveedores");
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/admin/patrocinios");
    expect(nextNavigation.redirect).toHaveBeenCalledWith(
      expect.stringContaining("/admin/proveedores?"),
    );
  });
});

interface AdminResourcesPageElementProps {
  formAction?: (
    state: Record<string, unknown>,
    formData: FormData,
  ) => Promise<unknown>;
}

function providerProfile(
  overrides: Partial<AdminResourceProviderProfile> = {},
): AdminResourceProviderProfile {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Clinica Veterinaria San Roque",
    categoryId: "veterinary",
    city: "La Paz",
    description: "Veterinaria local con atencion general y urgencias.",
    department: "La Paz",
    approximateLocationLabel: "Sopocachi, La Paz",
    approximateLocation: {
      latitude: -16.51051,
      longitude: -68.124602,
      precision: "approximate",
      label: "Sopocachi, La Paz",
      locationCell: "bo-lpb-sopocachi",
    },
    serviceAreaLabel: "Atiende La Paz y El Alto",
    hoursLabel: "Lun - Dom: 24 horas",
    shortDescription:
      "Atencion veterinaria general y orientacion para familias cuidadoras.",
    isVerified: true,
    sponsorPlacement: {
      kind: "Local Sponsor Placement",
      label: "Patrocinado",
      disclosure:
        "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
      eligibleSurfaces: ["resources_directory"],
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
    sponsorPlacements: [
      {
        disclosure:
          "Patrocinado: apoyo local. No cambia la prioridad de reportes.",
        endsOn: "2026-07-31",
        isActive: true,
        label: "Patrocinado",
        placementId: "22222222-2222-4222-8222-222222222222",
        startsOn: "2026-07-01",
        surface: "resources_directory",
      },
    ],
    verificationNote: "Identidad revisada por Rastro.",
    ...overrides,
  };
}

function adminProviderListResult(
  items: AdminResourceProviderProfile[],
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
        key: "sponsorState",
        label: "Patrocinio",
        options: [{ label: "Activo", value: "active" }],
        type: "enum" as const,
      },
      {
        key: "sponsorSurface",
        label: "Superficie patrocinada",
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
        key: "mediaState",
        label: "Medios",
        options: [{ label: "Con medios", value: "has_media" }],
        type: "enum" as const,
      },
    ],
    availableSorts: [
      { defaultDirection: "asc" as const, label: "Nombre", value: "name" },
      {
        defaultDirection: "desc" as const,
        label: "Patrocinio",
        value: "sponsorState",
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

function formData(values: Record<string, string>) {
  const data = new FormData();

  for (const [key, value] of Object.entries(values)) {
    data.set(key, value);
  }

  return data;
}
