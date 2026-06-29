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
  listAdminMembers: vi.fn(),
}));

vi.mock("~/auth/server", () => authServer);
vi.mock("~/env", () => envMock);
vi.mock("~/admin-member-api-adapter", () => memberApi);

describe("admin members page", () => {
  beforeEach(() => {
    vi.resetModules();
    authServer.getSession.mockReset();
    memberApi.getAdminMemberProfile.mockReset();
    memberApi.listAdminMembers.mockReset();
  });

  it("loads the first member page and the selected member profile for allowlisted admins", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin",
        name: "Admin Rastro",
      },
    });
    memberApi.listAdminMembers.mockResolvedValue(
      adminMemberListResult([
        {
          createdAt: new Date("2026-06-20T12:00:00.000Z"),
          currentSuspension: null,
          email: "camila@example.com",
          emailVerified: true,
          id: "member-camila",
          name: "Camila R.",
          updatedAt: new Date("2026-06-26T12:00:00.000Z"),
        },
      ]),
    );
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
    expect(memberApi.listAdminMembers).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
      search: "camila",
    });
    expect(memberApi.getAdminMemberProfile).toHaveBeenCalledWith(
      "member-camila",
    );
  });

  it("loads the first 10 members without requiring search", async () => {
    authServer.getSession.mockResolvedValue({
      user: {
        email: "admin@rastro.bo",
        id: "member-admin",
        name: "Admin Rastro",
      },
    });
    memberApi.listAdminMembers.mockResolvedValue(
      adminMemberListResult([
        {
          createdAt: new Date("2026-06-20T12:00:00.000Z"),
          currentSuspension: null,
          email: "ana@example.com",
          emailVerified: true,
          id: "member-ana",
          name: "Ana S.",
          updatedAt: new Date("2026-06-26T12:00:00.000Z"),
        },
      ]),
    );
    const { default: AdminMembersPage } = await import(
      "./app/admin/miembros/page"
    );

    const html = renderToStaticMarkup(await AdminMembersPage());

    expect(html).toContain("Ana S.");
    expect(memberApi.listAdminMembers).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
    });
    expect(memberApi.getAdminMemberProfile).not.toHaveBeenCalled();
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
    expect(memberApi.listAdminMembers).not.toHaveBeenCalled();
    expect(memberApi.getAdminMemberProfile).not.toHaveBeenCalled();
  });
});

function adminMemberListResult<T>(items: T[]) {
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
