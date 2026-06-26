import type { Database } from "@acme/db/client";
import { eq } from "@acme/db";
import { AdminSettings } from "@acme/db/schema";

export const globalAdminSettingsId = "global";

export interface PersistedAdminSettings {
  adoptionReviewModeEnabled: boolean;
  verifiedEmailRequiredToPublish: boolean;
  updatedAt: Date | null;
  updatedByAdminId: string | null;
}

export interface AdminSettingsRepository {
  get(): Promise<PersistedAdminSettings>;
  update(input: {
    adoptionReviewModeEnabled: boolean;
    adminId: string;
    verifiedEmailRequiredToPublish: boolean;
  }): Promise<PersistedAdminSettings>;
}

export const defaultAdminSettings = {
  adoptionReviewModeEnabled: false,
  updatedAt: null,
  updatedByAdminId: null,
  verifiedEmailRequiredToPublish: false,
} satisfies PersistedAdminSettings;

export function createDrizzleAdminSettingsRepository(
  db: Database,
): AdminSettingsRepository {
  return {
    get: async () => {
      const [row] = await db
        .select()
        .from(AdminSettings)
        .where(eq(AdminSettings.id, globalAdminSettingsId))
        .limit(1);

      return row ? toPersistedAdminSettings(row) : defaultAdminSettings;
    },
    update: async ({
      adoptionReviewModeEnabled,
      adminId,
      verifiedEmailRequiredToPublish,
    }) => {
      const now = new Date();
      const [row] = await db
        .insert(AdminSettings)
        .values({
          adoptionReviewModeEnabled,
          id: globalAdminSettingsId,
          updatedAt: now,
          updatedByAdminId: adminId,
          verifiedEmailRequiredToPublish,
        })
        .onConflictDoUpdate({
          target: AdminSettings.id,
          set: {
            adoptionReviewModeEnabled,
            updatedAt: now,
            updatedByAdminId: adminId,
            verifiedEmailRequiredToPublish,
          },
        })
        .returning();

      if (!row) {
        throw new Error("Admin settings could not be persisted.");
      }

      return toPersistedAdminSettings(row);
    },
  };
}

function toPersistedAdminSettings(
  row: typeof AdminSettings.$inferSelect,
): PersistedAdminSettings {
  return {
    adoptionReviewModeEnabled: row.adoptionReviewModeEnabled,
    updatedAt: row.updatedAt,
    updatedByAdminId: row.updatedByAdminId,
    verifiedEmailRequiredToPublish: row.verifiedEmailRequiredToPublish,
  };
}
