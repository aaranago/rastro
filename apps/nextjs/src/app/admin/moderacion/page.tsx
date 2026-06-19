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

  return (
    <AdminModerationDashboard
      formAction={applyAdminModerationForm}
      {...toAdminModerationDashboardProps(
        result.viewModel,
        viewer.dashboardViewer,
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

  const actions = parseAdminModerationActions(formData, viewer.modelViewer);

  for (const action of actions) {
    adminModerationDashboard.applyAction(viewer.modelViewer, action);
  }

  revalidatePath("/admin/moderacion");
}

function parseAdminModerationActions(
  formData: FormData,
  viewer: ReturnType<typeof buildAdminModerationViewer>["modelViewer"],
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

  if (actionType === "save_settings") {
    return getSettingsActions(formData, viewer);
  }

  return [];
}

function getSettingsActions(
  formData: FormData,
  viewer: ReturnType<typeof buildAdminModerationViewer>["modelViewer"],
): AdminModerationAction[] {
  const result = adminModerationDashboard.getViewModel(viewer);

  if (result.status !== "authorized") {
    return [];
  }

  const nextReviewModeEnabled = formData.get("reviewModeEnabled") === "on";
  const nextVerifiedEmailRequired =
    formData.get("verifiedEmailRequiredToPublish") === "on";
  const actions: AdminModerationAction[] = [];

  if (
    result.viewModel.settings.adoptionReviewMode.enabled !==
    nextReviewModeEnabled
  ) {
    actions.push({ type: "toggle_adoption_review_mode" });
  }

  if (
    result.viewModel.settings.verifiedEmailRequiredToPublish.enabled !==
    nextVerifiedEmailRequired
  ) {
    actions.push({ type: "toggle_verified_email_required_to_publish" });
  }

  return actions;
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
