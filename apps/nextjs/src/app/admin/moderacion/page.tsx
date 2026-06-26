import type { Metadata } from "next";
import { revalidatePath } from "next/cache";

import type {
  AdminModerationAction,
  HideableAdminModerationTargetType,
} from "~/admin-moderation";
import { createInMemoryAdminModerationDashboard } from "~/admin-moderation";
import { buildAdminModerationViewer } from "~/admin-moderation-access";
import { AdminModerationDashboard } from "~/admin-moderation-dashboard";
import {
  buildForbiddenAdminModerationDashboardProps,
  toAdminModerationDashboardProps,
} from "~/admin-moderation-dashboard-adapter";
import { getAdminSettings } from "~/admin-settings-api-adapter";
import { getSession } from "~/auth/server";
import { env } from "~/env";

export const metadata: Metadata = {
  title: "Moderacion | Rastro",
};

const adminModerationDashboard = createInMemoryAdminModerationDashboard();

export default async function AdminModerationPage() {
  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);
  const result = adminModerationDashboard.getViewModel(viewer.modelViewer);

  if (result.status === "forbidden") {
    return (
      <AdminModerationDashboard
        {...buildForbiddenAdminModerationDashboardProps(viewer.dashboardViewer)}
      />
    );
  }

  const settings = await getAdminSettings();

  return (
    <AdminModerationDashboard
      formAction={applyAdminModerationForm}
      {...toAdminModerationDashboardProps(
        result.viewModel,
        viewer.dashboardViewer,
        {
          reviewModeEnabled: settings.adoptionReviewModeEnabled,
          verifiedEmailRequiredToPublish:
            settings.verifiedEmailRequiredToPublish,
        },
      )}
    />
  );
}

async function applyAdminModerationForm(formData: FormData) {
  "use server";

  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);

  if (viewer.modelViewer.role !== "admin") {
    return;
  }

  const actions = parseAdminModerationActions(formData);

  for (const action of actions) {
    adminModerationDashboard.applyAction(viewer.modelViewer, action);
  }

  revalidatePath("/admin/moderacion");
}

function parseAdminModerationActions(
  formData: FormData,
): AdminModerationAction[] {
  const actionType = getStringFormValue(formData, "moderationAction");

  if (actionType === "ban_member" || actionType === "unban_member") {
    const memberId = getStringFormValue(formData, "memberId");

    return memberId ? [{ memberId, type: actionType }] : [];
  }

  if (actionType === "hide_target" || actionType === "restore_target") {
    const targetId = getStringFormValue(formData, "targetId");
    const targetType = getHideableTargetType(
      getStringFormValue(formData, "targetType"),
    );

    return targetId && targetType
      ? [{ targetId, targetType, type: actionType }]
      : [];
  }

  return [];
}

function getStringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : null;
}

function getHideableTargetType(
  targetType: string | null,
): HideableAdminModerationTargetType | null {
  if (
    targetType === "adoption_listing" ||
    targetType === "found_pet_report" ||
    targetType === "lost_pet_report" ||
    targetType === "sighting_report"
  ) {
    return targetType;
  }

  return null;
}
