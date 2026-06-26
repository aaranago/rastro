import { describe, expect, it } from "vitest";

import { appRouter } from "../root";

function createCaller(context: unknown) {
  return appRouter.createCaller(context as never);
}

describe("admin settings router", () => {
  it("searches members only for allowlisted admins", async () => {
    const searches: unknown[] = [];
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      authApi: {},
      db: {},
      memberSuspensionRepository: {
        searchMembers: (input: unknown) => {
          searches.push(input);

          return Promise.resolve([
            {
              currentSuspension: null,
              email: "camila@example.com",
              emailVerified: true,
              id: "member-camila",
              name: "Camila R.",
            },
          ]);
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin",
        },
      },
    });

    await expect(
      caller.admin.members.search({
        query: "camila@example.com",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        email: "camila@example.com",
        id: "member-camila",
      }),
    ]);
    expect(searches).toEqual([
      {
        query: "camila@example.com",
      },
    ]);
  });

  it("rejects member search for non-admin members", async () => {
    let searchWasCalled = false;
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      authApi: {},
      db: {},
      memberSuspensionRepository: {
        searchMembers: () => {
          searchWasCalled = true;
          return Promise.resolve([]);
        },
      },
      session: {
        user: {
          email: "ana@example.com",
          id: "member-ana",
        },
      },
    });

    await expect(
      caller.admin.members.search({
        query: "ana",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(searchWasCalled).toBe(false);
  });

  it("returns member safety profiles for allowlisted admins", async () => {
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      authApi: {},
      db: {},
      memberSuspensionRepository: {
        getMemberProfile: (memberId: string) =>
          Promise.resolve({
            currentSuspension: {
              id: "member-suspension-1",
              memberId,
              reason: "Reportes falsos repetidos.",
              revokedAt: null,
              revokedByAdminId: null,
              revokedReason: null,
              status: "active",
              suspendedAt: new Date("2026-06-26T16:00:00.000Z"),
              suspendedByAdminId: "member-admin",
              updatedAt: new Date("2026-06-26T16:00:00.000Z"),
            },
            member: {
              createdAt: new Date("2026-06-20T12:00:00.000Z"),
              email: "diego@example.com",
              emailVerified: false,
              id: memberId,
              name: "Diego P.",
              updatedAt: new Date("2026-06-26T12:00:00.000Z"),
            },
            moderationReports: [
              {
                action: "hide",
                adminId: "member-admin",
                createdAt: new Date("2026-06-26T16:20:00.000Z"),
                id: "moderation-action-1",
                note: "Contenido duplicado.",
                reason: "spam",
                reportId: "report-1",
                reportTitle: "Bruno perdido",
                reportType: "lost_pet",
              },
            ],
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
              moderationReportCount: 1,
              reportCount: 1,
            },
            suspensionHistory: [
              {
                id: "member-suspension-1",
                memberId,
                reason: "Reportes falsos repetidos.",
                revokedAt: null,
                revokedByAdminId: null,
                revokedReason: null,
                status: "active",
                suspendedAt: new Date("2026-06-26T16:00:00.000Z"),
                suspendedByAdminId: "member-admin",
                updatedAt: new Date("2026-06-26T16:00:00.000Z"),
              },
            ],
          }),
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin",
        },
      },
    });

    await expect(
      caller.admin.members.profile({
        memberId: "member-diego",
      }),
    ).resolves.toMatchObject({
      currentSuspension: {
        reason: "Reportes falsos repetidos.",
        status: "active",
      },
      member: {
        email: "diego@example.com",
        emailVerified: false,
      },
      moderationReports: [
        {
          reason: "spam",
          reportTitle: "Bruno perdido",
        },
      ],
      recentReports: [
        {
          locationLabel: "Sopocachi, La Paz",
          title: "Bruno perdido",
        },
      ],
    });
  });

  it("persists member suspend and unsuspend actions with required reasons", async () => {
    const actions: unknown[] = [];
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      authApi: {},
      db: {},
      memberSuspensionRepository: {
        suspendMember: (input: unknown) => {
          actions.push(["suspend", input]);

          return Promise.resolve({
            id: "member-suspension-1",
            memberId: "member-diego",
            reason: "Estafa confirmada por moderación.",
            revokedAt: null,
            revokedByAdminId: null,
            revokedReason: null,
            status: "active",
            suspendedAt: new Date("2026-06-26T16:00:00.000Z"),
            suspendedByAdminId: "member-admin",
            updatedAt: new Date("2026-06-26T16:00:00.000Z"),
          });
        },
        unsuspendMember: (input: unknown) => {
          actions.push(["unsuspend", input]);

          return Promise.resolve({
            id: "member-suspension-1",
            memberId: "member-diego",
            reason: "Estafa confirmada por moderación.",
            revokedAt: new Date("2026-06-26T17:00:00.000Z"),
            revokedByAdminId: "member-admin",
            revokedReason: "Apelación revisada.",
            status: "revoked",
            suspendedAt: new Date("2026-06-26T16:00:00.000Z"),
            suspendedByAdminId: "member-admin",
            updatedAt: new Date("2026-06-26T17:00:00.000Z"),
          });
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin",
        },
      },
    });

    await expect(
      caller.admin.members.suspend({
        memberId: "member-diego",
        reason: "Estafa confirmada por moderación.",
      }),
    ).resolves.toMatchObject({
      memberId: "member-diego",
      reason: "Estafa confirmada por moderación.",
      status: "active",
    });
    await expect(
      caller.admin.members.unsuspend({
        memberId: "member-diego",
        reason: "Apelación revisada.",
      }),
    ).resolves.toMatchObject({
      memberId: "member-diego",
      revokedReason: "Apelación revisada.",
      status: "revoked",
    });

    expect(actions).toEqual([
      [
        "suspend",
        {
          adminId: "member-admin",
          memberId: "member-diego",
          reason: "Estafa confirmada por moderación.",
        },
      ],
      [
        "unsuspend",
        {
          adminId: "member-admin",
          memberId: "member-diego",
          reason: "Apelación revisada.",
        },
      ],
    ]);
  });

  it("rejects suspend mutations with blank reasons before persistence", async () => {
    let suspendWasCalled = false;
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      authApi: {},
      db: {},
      memberSuspensionRepository: {
        suspendMember: () => {
          suspendWasCalled = true;
          return Promise.resolve(null);
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin",
        },
      },
    });

    await expect(
      caller.admin.members.suspend({
        memberId: "member-diego",
        reason: " ",
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(suspendWasCalled).toBe(false);
  });

  it("rejects settings reads for non-admin members", async () => {
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      authApi: {},
      db: {},
      session: {
        user: {
          email: "ana@example.com",
          id: "member-ana",
        },
      },
    });

    await expect(caller.admin.settings.get()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows only allowlisted admins to update persisted settings", async () => {
    const updates: unknown[] = [];
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminSettingsRepository: {
        update: (input: unknown) => {
          updates.push(input);

          return Promise.resolve({
            adoptionReviewModeEnabled: true,
            updatedAt: new Date("2026-06-26T16:00:00.000Z"),
            updatedByAdminId: "member-admin",
            verifiedEmailRequiredToPublish: true,
          });
        },
      },
      authApi: {},
      db: {},
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin",
        },
      },
    });

    await expect(
      caller.admin.settings.update({
        adoptionReviewModeEnabled: true,
        verifiedEmailRequiredToPublish: true,
      }),
    ).resolves.toMatchObject({
      adoptionReviewModeEnabled: true,
      updatedByAdminId: "member-admin",
      verifiedEmailRequiredToPublish: true,
    });
    expect(updates).toEqual([
      {
        adoptionReviewModeEnabled: true,
        adminId: "member-admin",
        verifiedEmailRequiredToPublish: true,
      },
    ]);
  });

  it("lists the DB-backed Resource Provider moderation queue for allowlisted admins", async () => {
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      authApi: {},
      db: {},
      resourceProviderModerationRepository: {
        listResourceProviderQueue: () =>
          Promise.resolve([
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
                name: "Clinica Veterinaria San Roque",
                verificationStatus: "verified",
              },
              reason: "incorrect_location",
              reportCount: 2,
              status: "pending",
            },
          ]),
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin",
        },
      },
    });

    await expect(
      caller.admin.moderation.resourceProviderQueue(),
    ).resolves.toMatchObject([
      {
        newestReport: {
          reporter: {
            displayName: "Ana S.",
          },
        },
        provider: {
          city: "La Paz",
          name: "Clinica Veterinaria San Roque",
        },
        reason: "incorrect_location",
        reportCount: 2,
      },
    ]);
  });

  it("lists the DB-backed report and Adoption Listing moderation queue for allowlisted admins", async () => {
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      authApi: {},
      db: {},
      reportModerationRepository: {
        listReportQueue: () =>
          Promise.resolve([
            {
              createdAt: new Date("2026-06-26T17:00:00.000Z"),
              id: "report-review-11111111-1111-4111-8111-111111111111",
              newestAction: null,
              reportCount: 1,
              target: {
                caretaker: {
                  displayName: "Camila R.",
                  email: "camila@example.com",
                  memberId: "member-camila",
                },
                city: "La Paz",
                department: "La Paz",
                hiddenAt: null,
                hiddenByAdminId: null,
                hiddenNote: null,
                hiddenReason: null,
                id: "11111111-1111-4111-8111-111111111111",
                locationLabel: "Sopocachi, La Paz",
                reportType: "adoption",
                status: "visible",
                title: "Nala busca nuevo hogar",
                type: "adoption_listing",
              },
              updatedAt: new Date("2026-06-26T17:00:00.000Z"),
            },
          ]),
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin",
        },
      },
    });

    await expect(caller.admin.moderation.reportQueue()).resolves.toMatchObject([
      {
        target: {
          id: "11111111-1111-4111-8111-111111111111",
          reportType: "adoption",
          status: "visible",
          type: "adoption_listing",
        },
      },
    ]);
  });

  it("persists report hide and restore actions with the admin actor", async () => {
    const actions: unknown[] = [];
    const hiddenAt = new Date("2026-06-26T17:10:00.000Z");
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      authApi: {},
      db: {},
      reportModerationRepository: {
        hideReportTarget: (input: unknown) => {
          actions.push(["hide", input]);

          return Promise.resolve({
            createdAt: hiddenAt,
            id: "report-review-11111111-1111-4111-8111-111111111111",
            newestAction: {
              action: "hide",
              adminId: "member-admin",
              createdAt: hiddenAt,
              note: "Fotos ajenas al reporte.",
              reason: "spam",
            },
            reportCount: 1,
            target: {
              caretaker: {
                displayName: "Camila R.",
                email: "camila@example.com",
                memberId: "member-camila",
              },
              city: "La Paz",
              department: "La Paz",
              hiddenAt,
              hiddenByAdminId: "member-admin",
              hiddenNote: "Fotos ajenas al reporte.",
              hiddenReason: "spam",
              id: "11111111-1111-4111-8111-111111111111",
              locationLabel: "Sopocachi, La Paz",
              reportType: "lost_pet",
              status: "hidden",
              title: "Luna perdida cerca de Sopocachi",
              type: "lost_pet_report",
            },
            updatedAt: hiddenAt,
          });
        },
        restoreReportTarget: (input: unknown) => {
          actions.push(["restore", input]);

          return Promise.resolve({
            createdAt: hiddenAt,
            id: "report-review-11111111-1111-4111-8111-111111111111",
            newestAction: {
              action: "restore",
              adminId: "member-admin",
              createdAt: new Date("2026-06-26T17:20:00.000Z"),
              note: "Contenido validado.",
              reason: "approved_after_review",
            },
            reportCount: 1,
            target: {
              caretaker: {
                displayName: "Camila R.",
                email: "camila@example.com",
                memberId: "member-camila",
              },
              city: "La Paz",
              department: "La Paz",
              hiddenAt: null,
              hiddenByAdminId: null,
              hiddenNote: null,
              hiddenReason: null,
              id: "11111111-1111-4111-8111-111111111111",
              locationLabel: "Sopocachi, La Paz",
              reportType: "lost_pet",
              status: "visible",
              title: "Luna perdida cerca de Sopocachi",
              type: "lost_pet_report",
            },
            updatedAt: new Date("2026-06-26T17:20:00.000Z"),
          });
        },
      },
      session: {
        user: {
          email: "admin@rastro.bo",
          id: "member-admin",
        },
      },
    });

    await expect(
      caller.admin.moderation.hideReportTarget({
        note: "Fotos ajenas al reporte.",
        reason: "spam",
        reportId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toMatchObject({
      newestAction: {
        action: "hide",
        adminId: "member-admin",
        reason: "spam",
      },
      target: {
        hiddenByAdminId: "member-admin",
        status: "hidden",
      },
    });

    await expect(
      caller.admin.moderation.restoreReportTarget({
        note: "Contenido validado.",
        reason: "approved_after_review",
        reportId: "11111111-1111-4111-8111-111111111111",
      }),
    ).resolves.toMatchObject({
      newestAction: {
        action: "restore",
        adminId: "member-admin",
      },
      target: {
        hiddenAt: null,
        status: "visible",
      },
    });

    expect(actions).toEqual([
      [
        "hide",
        {
          adminId: "member-admin",
          note: "Fotos ajenas al reporte.",
          reason: "spam",
          reportId: "11111111-1111-4111-8111-111111111111",
        },
      ],
      [
        "restore",
        {
          adminId: "member-admin",
          note: "Contenido validado.",
          reason: "approved_after_review",
          reportId: "11111111-1111-4111-8111-111111111111",
        },
      ],
    ]);
  });

  it("rejects report moderation mutations for non-admin members", async () => {
    let hideWasCalled = false;
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      authApi: {},
      db: {},
      reportModerationRepository: {
        hideReportTarget: () => {
          hideWasCalled = true;
          return Promise.resolve(null);
        },
      },
      session: {
        user: {
          email: "ana@example.com",
          id: "member-ana",
        },
      },
    });

    await expect(
      caller.admin.moderation.hideReportTarget({
        reason: "spam",
        reportId: "11111111-1111-4111-8111-111111111111",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(hideWasCalled).toBe(false);
  });

  it("rejects Resource Provider moderation queue reads for non-admin members", async () => {
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      authApi: {},
      db: {},
      resourceProviderModerationRepository: {
        listResourceProviderQueue: () => Promise.resolve([]),
      },
      session: {
        user: {
          email: "ana@example.com",
          id: "member-ana",
        },
      },
    });

    await expect(
      caller.admin.moderation.resourceProviderQueue(),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
