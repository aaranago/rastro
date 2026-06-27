import type { Metadata } from "next";

import {
  applyAdminModerationForm,
  buildAdminModerationFeedback,
  buildAdminModerationNotice,
} from "~/admin-moderation-actions";
import { buildAdminModerationViewer } from "~/admin-moderation-access";
import { AdminModerationDashboard } from "~/admin-moderation-dashboard";
import {
  buildForbiddenAdminModerationDashboardProps,
  toPersistedAdminModerationDashboardProps,
} from "~/admin-moderation-dashboard-adapter";
import {
  buildAdminModerationFilters,
  buildAdminModerationReturnPath,
} from "~/admin-moderation-filters";
import {
  listAdminReportModerationQueue,
} from "~/admin-report-moderation-api-adapter";
import { listAdminResourceProviderModerationQueue } from "~/admin-resource-provider-moderation-api-adapter";
import { getAdminSettings } from "~/admin-settings-api-adapter";
import { getSession } from "~/auth/server";
import { env } from "~/env";

export const metadata: Metadata = {
  title: "Moderacion | Rastro",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminModerationPage(
  props: {
    searchParams?: SearchParams;
  } = {},
) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const filters = buildAdminModerationFilters(searchParams);
  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);

  if (viewer.modelViewer.role !== "admin") {
    return (
      <AdminModerationDashboard
        {...buildForbiddenAdminModerationDashboardProps(viewer.dashboardViewer)}
      />
    );
  }

  const [settings, reportQueue, resourceProviderQueue] = await Promise.all([
    getAdminSettings(),
    listAdminReportModerationQueue(),
    listAdminResourceProviderModerationQueue(),
  ]);

  return (
    <AdminModerationDashboard
      filters={filters}
      formAction={applyAdminModerationForm}
      notice={buildAdminModerationNotice(
        buildAdminModerationFeedback(searchParams),
      )}
      returnTo={buildAdminModerationReturnPath("/admin/moderacion", filters)}
      {...toPersistedAdminModerationDashboardProps(
        viewer.dashboardViewer,
        {
          reviewModeEnabled: settings.adoptionReviewModeEnabled,
          verifiedEmailRequiredToPublish:
            settings.verifiedEmailRequiredToPublish,
        },
        {
          reportQueue,
          resourceProviderQueue,
        },
      )}
    />
  );
}
