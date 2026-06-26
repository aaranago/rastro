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

vi.mock("~/auth/server", () => authServer);
vi.mock("~/env", () => envMock);
vi.mock(
  "~/admin-resource-provider-api-adapter",
  () => adminResourceProviderApi,
);

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
    expect(html).toContain("2 proveedores en cola");
    expect(html).toContain("Clinica Veterinaria San Roque");
    expect(html).toContain("Patitas La Paz");
    expect(html).toContain("Actualizado");
    expect(html).toContain("Registrar proveedor");
    expect(html).toContain("Latitud exacta");
    expect(html).toContain("Ubicación avanzada y privacidad");
    expect(html).toContain("Opciones de contacto");
    expect(html).toContain("Guardar detalles");
    expect(html).toContain("Guardar identidad");
    expect(html).toContain("Adjuntar patrocinio local");
    expect(html).toContain("Retirar por ID");
    expect(html).toContain("Métricas por departamento");
    expect(html).toContain("Admin Rastro");
    expect(html).not.toContain("modelo administrativo temporal");
    expect(html).not.toContain("no confirma publicacion");
    expect(html).not.toContain("Falta contrato API para actualizar detalles");
    expect(html).not.toContain("Falta contrato API para archivar o eliminar");
    expect(html).not.toMatch(forbiddenTerms);
    expect(html).not.toMatch(marketplaceTerms);
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
});

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
