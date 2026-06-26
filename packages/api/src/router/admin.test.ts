import { describe, expect, it } from "vitest";

import { appRouter } from "../root";

function createCaller(context: unknown) {
  return appRouter.createCaller(context as never);
}

function createAuditRecorder(events: unknown[] = []) {
  return {
    list: () =>
      Promise.resolve({
        availableFilters: {
          actions: [],
          actors: [],
          targetTypes: [],
        },
        events: [],
        total: 0,
      }),
    record: (input: unknown) => {
      events.push(input);

      return Promise.resolve(input);
    },
  };
}

describe("admin settings router", () => {
  it("lists, records, and exposes admin-owned audit events for allowlisted admins", async () => {
    const auditEvents: unknown[] = [];
    const caller = createCaller({
      adminAuditRepository: {
        ...createAuditRecorder(auditEvents),
        list: (input: unknown) =>
          Promise.resolve({
            availableFilters: {
              actions: ["settings.update"],
              actors: [
                {
                  email: "admin@rastro.bo",
                  id: "member-admin",
                  label: "admin@rastro.bo",
                },
              ],
              targetTypes: ["admin_settings"],
            },
            events: [
              {
                action: "settings.update",
                actor: {
                  email: "admin@rastro.bo",
                  id: "member-admin",
                  label: "admin@rastro.bo",
                },
                createdAt: new Date("2026-06-26T16:00:00.000Z"),
                id: "admin-audit-event-1",
                metadata: null,
                source: "admin.settings.update",
                summary: "Actualizo ajustes globales de publicacion.",
                target: {
                  id: "global",
                  label: "Ajustes globales",
                  type: "admin_settings",
                },
              },
            ],
            total: 1,
            input,
          }),
      },
      adminEmailList: "admin@rastro.bo",
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
      caller.admin.audit.list({
        actor: "admin@rastro.bo",
        targetType: "admin_settings",
      }),
    ).resolves.toMatchObject({
      filters: {
        actions: ["settings.update"],
        targetTypes: ["admin_settings"],
        actors: [
          {
            label: "admin@rastro.bo",
            value: "member-admin",
          },
        ],
      },
      events: [
        {
          action: "settings.update",
          occurredAt: new Date("2026-06-26T16:00:00.000Z"),
          target: {
            id: "global",
          },
        },
      ],
      total: 1,
    });

    await caller.admin.audit.record({
      action: "settings.update",
      summary: "Evento manual desde administracion.",
      target: {
        id: "global",
        label: "Ajustes globales",
        type: "admin_settings",
      },
    });

    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "settings.update",
        actor: {
          email: "admin@rastro.bo",
          id: "member-admin",
        },
        source: "admin.audit.record",
      }),
    ]);
  });

  it("returns operational metrics overview for allowlisted admins", async () => {
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminMetricsRepository: {
        overview: () =>
          Promise.resolve({
            auditEventCount: 7,
            cityRows: [
              {
                adoptionListingCount: 1,
                city: "La Paz",
                contentReportCount: 3,
                department: "La Paz",
                hiddenReportCount: 1,
                pendingProviderReportCount: 2,
                pendingReviewReportCount: 1,
                resourceProviderCount: 4,
                sponsorPlacementCount: 1,
                verifiedResourceProviderCount: 3,
              },
            ],
            departmentRows: [
              {
                adoptionListingCount: 1,
                city: null,
                contentReportCount: 3,
                department: "La Paz",
                hiddenReportCount: 1,
                pendingProviderReportCount: 2,
                pendingReviewReportCount: 1,
                resourceProviderCount: 4,
                sponsorPlacementCount: 1,
                verifiedResourceProviderCount: 3,
              },
            ],
            generatedAt: new Date("2026-06-26T16:00:00.000Z"),
            summaryCards: [
              {
                id: "content-reports",
                label: "Reportes",
                value: 3,
              },
            ],
            suspendedMemberCount: 2,
          }),
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

    await expect(caller.admin.metrics.overview()).resolves.toMatchObject({
      byCity: [
        {
          abuseReportCount: 2,
          activeSponsorPlacementCount: 1,
          city: "La Paz",
          department: "La Paz",
          hiddenContentCount: 1,
          pendingModerationCount: 3,
          resourceProviderCount: 4,
        },
      ],
      byDepartment: [
        {
          city: null,
          department: "La Paz",
          hiddenContentCount: 1,
          pendingModerationCount: 3,
        },
      ],
      summary: {
        abuseReportCount: 2,
        activeSponsorPlacementCount: 1,
        auditEventCount: 7,
        hiddenContentCount: 1,
        pendingModerationCount: 3,
        resourceProviderCount: 4,
        suspendedMemberCount: 2,
        verifiedResourceProviderCount: 3,
      },
    });
  });

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
    const auditEvents: unknown[] = [];
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminAuditRepository: createAuditRecorder(auditEvents),
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
    expect(auditEvents).toHaveLength(2);
    expect(auditEvents[0]).toMatchObject({
      action: "member.suspend",
      actor: {
        email: "admin@rastro.bo",
        id: "member-admin",
      },
      target: {
        id: "member-diego",
        type: "member",
      },
    });
    expect(auditEvents[1]).toMatchObject({
      action: "member.unsuspend",
      target: {
        id: "member-diego",
        type: "member",
      },
    });
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
    const auditEvents: unknown[] = [];
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminAuditRepository: createAuditRecorder(auditEvents),
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
    expect(auditEvents).toEqual([
      expect.objectContaining({
        action: "settings.update",
        metadata: {
          adoptionReviewModeEnabled: true,
          verifiedEmailRequiredToPublish: true,
        },
        target: {
          id: "global",
          label: "Ajustes globales",
          type: "admin_settings",
        },
      }),
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
    const auditEvents: unknown[] = [];
    const hiddenAt = new Date("2026-06-26T17:10:00.000Z");
    const caller = createCaller({
      adminEmailList: "admin@rastro.bo",
      adminAuditRepository: createAuditRecorder(auditEvents),
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
    expect(auditEvents).toHaveLength(2);
    expect(auditEvents[0]).toMatchObject({
      action: "report.hide",
      metadata: {
        reason: "spam",
        reportType: "lost_pet",
      },
      target: {
        id: "11111111-1111-4111-8111-111111111111",
        label: "Luna perdida cerca de Sopocachi",
        type: "lost_pet_report",
      },
    });
    expect(auditEvents[1]).toMatchObject({
      action: "report.restore",
      metadata: {
        reason: "approved_after_review",
      },
      target: {
        id: "11111111-1111-4111-8111-111111111111",
        label: "Luna perdida cerca de Sopocachi",
        type: "lost_pet_report",
      },
    });
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
