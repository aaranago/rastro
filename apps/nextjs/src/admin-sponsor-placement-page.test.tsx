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
    sponsorApi.listAdminSponsorPlacements.mockResolvedValue([
      sponsorPlacement(),
    ]);
    resourceProviderApi.listAdminResourceProviderProfiles.mockResolvedValue([
      providerProfile(),
    ]);
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
    expect(sponsorApi.listAdminSponsorPlacements).toHaveBeenCalledTimes(1);
    expect(
      resourceProviderApi.listAdminResourceProviderProfiles,
    ).toHaveBeenCalledTimes(1);
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
