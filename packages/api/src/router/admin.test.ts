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
