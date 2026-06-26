import { describe, expect, it } from "vitest";

import { appRouter } from "../root";

function createCaller(context: unknown) {
  return appRouter.createCaller(context as never);
}

describe("admin settings router", () => {
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
