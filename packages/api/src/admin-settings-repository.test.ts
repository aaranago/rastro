import { describe, expect, it } from "vitest";

import {
  createDrizzleAdminSettingsRepository,
  defaultAdminSettings,
  globalAdminSettingsId,
} from "./admin-settings-repository";

interface AdminSettingsRow {
  adoptionReviewModeEnabled: boolean;
  createdAt: Date;
  id: string;
  updatedAt: Date;
  updatedByAdminId: string | null;
  verifiedEmailRequiredToPublish: boolean;
}

describe("admin settings repository", () => {
  it("returns product defaults before a settings row exists", async () => {
    const repository = createDrizzleAdminSettingsRepository(
      createFakeSettingsDb() as never,
    );

    await expect(repository.get()).resolves.toEqual(defaultAdminSettings);
  });

  it("persists and reads Review Mode, verified email gate, and admin metadata", async () => {
    const db = createFakeSettingsDb();
    const repository = createDrizzleAdminSettingsRepository(db as never);

    await expect(
      repository.update({
        adoptionReviewModeEnabled: true,
        adminId: "member-admin",
        verifiedEmailRequiredToPublish: true,
      }),
    ).resolves.toMatchObject({
      adoptionReviewModeEnabled: true,
      updatedByAdminId: "member-admin",
      verifiedEmailRequiredToPublish: true,
    });
    await expect(repository.get()).resolves.toMatchObject({
      adoptionReviewModeEnabled: true,
      updatedByAdminId: "member-admin",
      verifiedEmailRequiredToPublish: true,
    });

    await repository.update({
      adoptionReviewModeEnabled: false,
      adminId: "member-admin-2",
      verifiedEmailRequiredToPublish: false,
    });

    await expect(repository.get()).resolves.toMatchObject({
      adoptionReviewModeEnabled: false,
      updatedByAdminId: "member-admin-2",
      verifiedEmailRequiredToPublish: false,
    });
  });
});

function createFakeSettingsDb() {
  const rows = new Map<string, AdminSettingsRow>();

  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([rows.get(globalAdminSettingsId)].filter(Boolean)),
        }),
      }),
    }),
    insert: () => ({
      values(value: Partial<AdminSettingsRow> & { id: string }) {
        return {
          onConflictDoUpdate({ set }: { set: Partial<AdminSettingsRow> }) {
            return {
              returning: () => {
                const existing = rows.get(value.id);
                const row: AdminSettingsRow = {
                  adoptionReviewModeEnabled:
                    set.adoptionReviewModeEnabled ??
                    value.adoptionReviewModeEnabled ??
                    false,
                  createdAt: existing?.createdAt ?? new Date(),
                  id: value.id,
                  updatedAt: set.updatedAt ?? value.updatedAt ?? new Date(),
                  updatedByAdminId:
                    set.updatedByAdminId ?? value.updatedByAdminId ?? null,
                  verifiedEmailRequiredToPublish:
                    set.verifiedEmailRequiredToPublish ??
                    value.verifiedEmailRequiredToPublish ??
                    false,
                };

                rows.set(value.id, row);

                return Promise.resolve([row]);
              },
            };
          },
        };
      },
    }),
  };
}
