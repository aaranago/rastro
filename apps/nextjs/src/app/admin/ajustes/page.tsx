import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildAdminModerationViewer } from "~/admin-moderation-access";
import { applyAdminSettingsUpdateFromFormData } from "~/admin-settings-actions";
import { getAdminSettings } from "~/admin-settings-api-adapter";
import {
  AdminSettingsDashboard,
  buildAdminSettingsNotice,
} from "~/admin-settings-dashboard";
import { getSession } from "~/auth/server";
import { env } from "~/env";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Ajustes admin | Rastro",
};

export default async function AdminSettingsPage(
  props: {
    searchParams?: SearchParams;
  } = {},
) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);

  if (viewer.modelViewer.role !== "admin") {
    return null;
  }

  return (
    <AdminSettingsDashboard
      formAction={applyAdminSettingsForm}
      notice={buildAdminSettingsNotice(
        getSingleSearchParam(searchParams, "estado"),
      )}
      settings={await getAdminSettings()}
      viewer={viewer.dashboardViewer}
    />
  );
}

// Wired into AdminSettingsDashboard as the form action.
// fallow-ignore-next-line unused-server-action
export async function applyAdminSettingsForm(formData: FormData) {
  "use server";

  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);

  if (viewer.modelViewer.role !== "admin") {
    redirect("/admin/ajustes?estado=error");
  }

  const didApply = await applyAdminSettingsUpdateFromFormData(formData);

  if (didApply) {
    revalidatePath("/admin/ajustes");
  }

  redirect(`/admin/ajustes?estado=${didApply ? "ok" : "error"}`);
}

function getSingleSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
