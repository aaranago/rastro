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
});
