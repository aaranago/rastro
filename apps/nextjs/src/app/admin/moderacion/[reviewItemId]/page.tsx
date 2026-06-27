import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  applyAdminModerationForm,
  buildAdminModerationFeedback,
  buildAdminModerationNotice,
} from "~/admin-moderation-actions";
import { buildAdminModerationViewer } from "~/admin-moderation-access";
import { AdminModerationReviewDetail } from "~/admin-moderation-dashboard";
import { toPersistedAdminModerationDashboardProps } from "~/admin-moderation-dashboard-adapter";
import {
  buildAdminModerationFilters,
  buildAdminModerationReturnPath,
} from "~/admin-moderation-filters";
import { listAdminReportModerationQueue } from "~/admin-report-moderation-api-adapter";
import { listAdminResourceProviderModerationQueue } from "~/admin-resource-provider-moderation-api-adapter";
import { getAdminSettings } from "~/admin-settings-api-adapter";
import { getSession } from "~/auth/server";
import { env } from "~/env";

export const metadata: Metadata = {
  title: "Revisión de moderación | Rastro",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface AdminModerationReviewItemPageProps {
  params: Promise<{
    reviewItemId: string;
  }>;
  searchParams?: SearchParams;
}

export default async function AdminModerationReviewItemPage(
  props: AdminModerationReviewItemPageProps,
) {
  const [{ reviewItemId }, searchParams] = await Promise.all([
    props.params,
    props.searchParams ?? Promise.resolve({}),
  ]);
  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);

  if (viewer.modelViewer.role !== "admin") {
    return null;
  }

  const [settings, reportQueue, resourceProviderQueue] = await Promise.all([
    getAdminSettings(),
    listAdminReportModerationQueue(),
    listAdminResourceProviderModerationQueue(),
  ]);
  const dashboardProps = toPersistedAdminModerationDashboardProps(
    viewer.dashboardViewer,
    {
      reviewModeEnabled: settings.adoptionReviewModeEnabled,
      verifiedEmailRequiredToPublish: settings.verifiedEmailRequiredToPublish,
    },
    {
      reportQueue,
      resourceProviderQueue,
    },
  );
  const item = dashboardProps.flaggedItems.find(
    (flaggedItem) => flaggedItem.id === reviewItemId,
  );

  if (!item) {
    notFound();
  }

  const filters = buildAdminModerationFilters(searchParams);

  return (
    <AdminModerationReviewDetail
      formAction={applyAdminModerationForm}
      item={item}
      notice={buildAdminModerationNotice(
        buildAdminModerationFeedback(searchParams),
      )}
      returnTo={buildAdminModerationReturnPath(
        `/admin/moderacion/${reviewItemId}`,
        filters,
      )}
      settings={dashboardProps.settings}
      viewer={viewer.dashboardViewer}
    />
  );
}
