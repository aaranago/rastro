import { headers } from "next/headers";

import { appRouter, createTRPCContext } from "@acme/api";

import { auth } from "~/auth/server";
import { env } from "~/env";

export interface AdminSettingsState {
  adoptionReviewModeEnabled: boolean;
  updatedAt: Date | null;
  updatedByAdminId: string | null;
  verifiedEmailRequiredToPublish: boolean;
}

export interface AdminSettingsUpdateInput {
  adoptionReviewModeEnabled: boolean;
  verifiedEmailRequiredToPublish: boolean;
}

export async function getAdminSettings(): Promise<AdminSettingsState> {
  const caller = await createAdminSettingsCaller();

  return caller.admin.settings.get();
}

// Called through a runtime import from the server action helper.
// fallow-ignore-next-line unused-export
export async function updateAdminSettings(
  input: AdminSettingsUpdateInput,
): Promise<AdminSettingsState> {
  const caller = await createAdminSettingsCaller();

  return caller.admin.settings.update(input);
}

async function createAdminSettingsCaller() {
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("x-trpc-source", "next-admin-settings");
  const context = await createTRPCContext({
    adminEmailList: env.RASTRO_ADMIN_EMAILS,
    auth,
    headers: requestHeaders,
  });

  return appRouter.createCaller(context);
}
