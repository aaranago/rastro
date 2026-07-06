import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { AdminModerationListQuery } from "~/admin-moderation-dashboard";
import { buildAdminModerationViewer } from "~/admin-moderation-access";
import {
  applyAdminModerationForm,
  buildAdminModerationFeedback,
  buildAdminModerationNotice,
} from "~/admin-moderation-actions";
import { AdminModerationReviewDetail } from "~/admin-moderation-dashboard";
import {
  toReportAdminModerationReviewItem,
  toResourceProviderAdminModerationReviewItem,
} from "~/admin-moderation-dashboard-adapter";
import {
  buildAdminModerationFilters,
  buildAdminModerationReturnPath,
} from "~/admin-moderation-filters";
import { getAdminReportModerationQueueItem } from "~/admin-report-moderation-api-adapter";
import { getAdminResourceProviderModerationQueueItem } from "~/admin-resource-provider-moderation-api-adapter";
import {
  getPositiveIntegerSearchParam,
  getSingleSearchParam,
  getSortDirectionSearchParam,
  getTrimmedSearchParam,
} from "~/admin-search-params";
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

  const [settings, item] = await Promise.all([
    getAdminSettings(),
    getAdminModerationReviewItem(reviewItemId),
  ]);

  if (!item) {
    notFound();
  }

  const filters = buildAdminModerationFilters(searchParams);
  const listQuery = buildAdminModerationListQuery(searchParams);

  return (
    <AdminModerationReviewDetail
      backHref={buildAdminModerationReturnPath(
        "/admin/moderacion",
        filters,
        listQuery,
      )}
      formAction={applyAdminModerationForm}
      item={item}
      notice={buildAdminModerationNotice(
        buildAdminModerationFeedback(searchParams),
      )}
      returnTo={buildAdminModerationReturnPath(
        `/admin/moderacion/${reviewItemId}`,
        filters,
        listQuery,
      )}
      settings={{
        reviewModeEnabled: settings.adoptionReviewModeEnabled,
        verifiedEmailRequiredToPublish: settings.verifiedEmailRequiredToPublish,
      }}
      viewer={viewer.dashboardViewer}
    />
  );
}

function buildAdminModerationListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): AdminModerationListQuery {
  const query: AdminModerationListQuery = {
    page: getPositiveIntegerSearchParam(searchParams, "page", 1),
    pageSize: getPositiveIntegerSearchParam(searchParams, "pageSize", 10),
  };
  const search = getTrimmedSearchParam(searchParams, "search");
  const sortBy = getSingleSearchParam(searchParams, "sortBy")?.trim();
  const sortDirection = getSortDirectionSearchParam(searchParams);

  if (search) {
    query.search = search;
  }

  if (sortBy) {
    query.sortBy = sortBy;
  }

  if (sortDirection) {
    query.sortDirection = sortDirection;
  }

  return query;
}

async function getAdminModerationReviewItem(reviewItemId: string) {
  if (reviewItemId.startsWith("report-review-")) {
    const item = await getAdminReportModerationQueueItem(reviewItemId);

    return item ? toReportAdminModerationReviewItem(item) : null;
  }

  const item = await getAdminResourceProviderModerationQueueItem(reviewItemId);

  return item ? toResourceProviderAdminModerationReviewItem(item) : null;
}
