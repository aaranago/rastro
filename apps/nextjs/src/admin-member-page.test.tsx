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

const memberApi = vi.hoisted(() => ({
  getAdminMemberProfile: vi.fn(),
  searchAdminMembers: vi.fn(),
}));

vi.mock("~/auth/server", () => authServer);
vi.mock("~/env", () => envMock);
vi.mock("~/admin-member-api-adapter", () => memberApi);

describe("admin members page", () => {
  beforeEach(() => {
    vi.resetModules();
    authServer.getSession.mockReset();
    memberApi.getAdminMemberProfile.mockReset();
    memberApi.searchAdminMembers.mockReset();
  });

  it("loads search results and the selected member profile for allowlisted admins", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin",
        name: "Admin Rastro",
      },
    });
    memberApi.searchAdminMembers.mockResolvedValue([
      {
        currentSuspension: null,
        email: "camila@example.com",
        emailVerified: true,
        id: "member-camila",
        name: "Camila R.",
      },
    ]);
    memberApi.getAdminMemberProfile.mockResolvedValue({
      currentSuspension: null,
      member: {
        createdAt: new Date("2026-06-20T12:00:00.000Z"),
        email: "camila@example.com",
        emailVerified: true,
        id: "member-camila",
        name: "Camila R.",
        updatedAt: new Date("2026-06-26T12:00:00.000Z"),
      },
      moderationReports: [],
      recentReports: [
        {
          createdAt: new Date("2026-06-26T15:00:00.000Z"),
          hiddenAt: null,
          id: "report-1",
          locationLabel: "Sopocachi, La Paz",
          status: "active",
          title: "Bruno perdido",
          type: "lost_pet",
        },
      ],
      summary: {
        adoptionListingCount: 0,
        moderationReportCount: 0,
        reportCount: 1,
      },
      suspensionHistory: [],
    });
    const { default: AdminMembersPage } = await import(
      "./app/admin/miembros/page"
    );

    const html = renderToStaticMarkup(
      await AdminMembersPage({
        searchParams: Promise.resolve({
          memberId: "member-camila",
          q: "camila",
        }),
      }),
    );

    expect(html).toContain("Gestión de miembros");
    expect(html).toContain("Camila R.");
    expect(html).toContain("camila@example.com");
    expect(html).toContain("Bruno perdido");
    expect(html).toContain("Suspender miembro");
    expect(memberApi.searchAdminMembers).toHaveBeenCalledWith({
      query: "camila",
    });
    expect(memberApi.getAdminMemberProfile).toHaveBeenCalledWith(
      "member-camila",
    );
  });

  it("does not call member APIs for non-admin members", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "ana@example.com",
        id: "member-ana",
        name: "Ana miembro",
      },
    });
    const { default: AdminMembersPage } = await import(
      "./app/admin/miembros/page"
    );

    const html = renderToStaticMarkup(
      await AdminMembersPage({
        searchParams: Promise.resolve({
          memberId: "member-camila",
          q: "camila",
        }),
      }),
    );

    expect(html).toBe("");
    expect(memberApi.searchAdminMembers).not.toHaveBeenCalled();
    expect(memberApi.getAdminMemberProfile).not.toHaveBeenCalled();
  });
});
