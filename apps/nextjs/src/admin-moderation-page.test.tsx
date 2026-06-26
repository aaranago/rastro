import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authServer = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const envMock = vi.hoisted(() => ({
  env: {
    RASTRO_ADMIN_EMAILS: "admin@rastro.bo",
  },
}));

const adminSettingsApi = vi.hoisted(() => ({
  getAdminSettings: vi.fn(),
}));
const resourceProviderModerationApi = vi.hoisted(() => ({
  listAdminResourceProviderModerationQueue: vi.fn(),
}));

vi.mock("~/auth/server", () => authServer);
vi.mock("~/env", () => envMock);
vi.mock("~/admin-settings-api-adapter", () => adminSettingsApi);
vi.mock(
  "~/admin-resource-provider-moderation-api-adapter",
  () => resourceProviderModerationApi,
);

describe("admin moderation page", () => {
  beforeEach(() => {
    vi.resetModules();
    authServer.getSession.mockReset();
    adminSettingsApi.getAdminSettings.mockReset();
    adminSettingsApi.getAdminSettings.mockResolvedValue({
      adoptionReviewModeEnabled: false,
      updatedAt: null,
      updatedByAdminId: null,
      verifiedEmailRequiredToPublish: false,
    });
    resourceProviderModerationApi.listAdminResourceProviderModerationQueue.mockReset();
    resourceProviderModerationApi.listAdminResourceProviderModerationQueue.mockResolvedValue(
      [],
    );
  });

  it("renders the moderation dashboard for an allowed admin member", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin-la-paz",
        name: "Admin Rastro",
      },
    });
    resourceProviderModerationApi.listAdminResourceProviderModerationQueue.mockResolvedValue(
      [
        {
          createdAt: new Date("2026-06-26T16:00:00.000Z"),
          id: "22222222-2222-4222-8222-222222222222",
          lastReportedAt: new Date("2026-06-26T16:00:00.000Z"),
          newestReport: {
            createdAt: new Date("2026-06-26T16:00:00.000Z"),
            detail: "La direccion visible no coincide con el local.",
            reporter: {
              displayName: "Ana S.",
              email: "ana@example.com",
              memberId: "member-ana",
            },
          },
          provider: {
            city: "La Paz",
            department: "La Paz",
            id: "11111111-1111-4111-8111-111111111111",
            locationLabel: "Sopocachi, La Paz",
            name: "Clinica Veterinaria San Roque DB",
            verificationStatus: "verified",
          },
          reason: "incorrect_location",
          reportCount: 2,
          status: "pending",
        },
      ],
    );
    const { default: AdminModerationPage } = await import(
      "./app/admin/moderacion/page"
    );

    const html = renderToStaticMarkup(await AdminModerationPage());

    expect(html).toContain("Contenido reportado");
    expect(html).toContain("Bruno reportado como posible riesgo");
    expect(html).toContain("Reporte de mascota perdida");
    expect(html).toContain("Perfil de proveedor de recursos");
    expect(html).toContain("Clinica Veterinaria San Roque DB");
    expect(html).toContain("Ubicación incorrecta");
    expect(html).toContain("Reportado por Ana S.");
    expect(html).toContain("Sopocachi, La Paz");
    expect(html).toContain("2 reportes");
    expect(html).not.toContain("Clinica San Roque");
    expect(html).toContain("Review Mode para adopciones");
    expect(html).toContain("Métricas de abuso por ciudad");
    expect(html).toContain("Admin Rastro");
    expect(
      resourceProviderModerationApi.listAdminResourceProviderModerationQueue,
    ).toHaveBeenCalledOnce();
  });

  it("renders access denied for signed-in non-admin members", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "ana@example.com",
        id: "member-ana",
        name: "Ana miembro",
      },
    });
    const { default: AdminModerationPage } = await import(
      "./app/admin/moderacion/page"
    );

    const html = renderToStaticMarkup(await AdminModerationPage());

    expect(html).toContain("Acceso restringido");
    expect(html).toContain("Solo administradores de Rastro");
    expect(html).toContain("Ana miembro");
    expect(html).not.toContain("Cola de revisión");
    expect(html).not.toContain("Suspender miembro");
    expect(
      resourceProviderModerationApi.listAdminResourceProviderModerationQueue,
    ).not.toHaveBeenCalled();
  });
});
