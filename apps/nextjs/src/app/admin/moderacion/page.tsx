import type { Metadata } from "next";

import type {
  AdminModerationFilters,
  AdminModerationListQuery,
  AdminModerationQueueSection,
  AdminModerationQueueSortOption,
} from "~/admin-moderation-dashboard";
import type { AdminReportModerationQueueListInput } from "~/admin-report-moderation-api-adapter";
import type { AdminResourceProviderModerationQueueListInput } from "~/admin-resource-provider-moderation-api-adapter";
import { buildAdminModerationViewer } from "~/admin-moderation-access";
import {
  applyAdminModerationForm,
  buildAdminModerationFeedback,
  buildAdminModerationNotice,
} from "~/admin-moderation-actions";
import { AdminModerationDashboard } from "~/admin-moderation-dashboard";
import {
  buildForbiddenAdminModerationDashboardProps,
  toPersistedAdminModerationDashboardProps,
} from "~/admin-moderation-dashboard-adapter";
import {
  appendAdminModerationFilterParams,
  buildAdminModerationFilters,
  buildAdminModerationReturnPath,
} from "~/admin-moderation-filters";
import { listAdminReportModerationQueueList } from "~/admin-report-moderation-api-adapter";
import { listAdminResourceProviderModerationQueueList } from "~/admin-resource-provider-moderation-api-adapter";
import {
  buildAdminQueryHref,
  getPositiveIntegerSearchParam,
  getSingleSearchParam,
  getSortDirectionSearchParam,
} from "~/admin-search-params";
import { getAdminSettings } from "~/admin-settings-api-adapter";
import { getSession } from "~/auth/server";
import { env } from "~/env";

export const metadata: Metadata = {
  title: "Moderación | Rastro",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminModerationPage(
  props: {
    searchParams?: SearchParams;
  } = {},
) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const filters = buildAdminModerationFilters(searchParams);
  const listQuery = buildAdminModerationListQuery(searchParams);
  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);

  if (viewer.modelViewer.role !== "admin") {
    return (
      <AdminModerationDashboard
        {...buildForbiddenAdminModerationDashboardProps(viewer.dashboardViewer)}
      />
    );
  }

  const loadReportQueue = shouldLoadReportQueue(filters);
  const loadResourceProviderQueue = shouldLoadResourceProviderQueue(filters);
  const [settings, reportQueue, resourceProviderQueue] = await Promise.all([
    getAdminSettings(),
    loadReportQueue
      ? listAdminReportModerationQueueList(
          buildReportQueueListInput(listQuery, filters),
        )
      : Promise.resolve(null),
    loadResourceProviderQueue
      ? listAdminResourceProviderModerationQueueList(
          buildResourceProviderQueueListInput(listQuery, filters),
        )
      : Promise.resolve(null),
  ]);

  return (
    <AdminModerationDashboard
      filters={filters}
      formAction={applyAdminModerationForm}
      listHrefForPage={(queue, page) =>
        buildAdminModerationListHref({
          filters,
          page,
          pageSize: queue.pageSize,
          search: listQuery.search,
          sortBy: getCurrentSortForQueue(queue, listQuery),
          sortDirection: listQuery.sortDirection,
        })
      }
      listHrefForSort={(queue, sort, sortDirection) =>
        buildAdminModerationListHref({
          filters,
          page: 1,
          pageSize: queue.pageSize,
          search: listQuery.search,
          sortBy: sort.value,
          sortDirection,
        })
      }
      listQuery={listQuery}
      notice={buildAdminModerationNotice(
        buildAdminModerationFeedback(searchParams),
      )}
      returnTo={buildAdminModerationReturnPath(
        "/admin/moderacion",
        filters,
        listQuery,
      )}
      reviewHrefForItem={(item) =>
        buildAdminModerationReturnPath(
          `/admin/moderacion/${item.id}`,
          filters,
          listQuery,
        )
      }
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

function buildAdminModerationListQuery(
  searchParams: Record<string, string | string[] | undefined>,
): AdminModerationListQuery {
  const query: AdminModerationListQuery = {
    page: getPositiveIntegerSearchParam(searchParams, "page", 1),
    pageSize: getAdminListPageSizeSearchParam(searchParams),
  };
  const search = getOptionalSearchParam(searchParams, "search");
  const sortBy = getOptionalSearchParam(searchParams, "sortBy");
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

function buildReportQueueListInput(
  query: AdminModerationListQuery,
  filters: AdminModerationFilters,
): AdminReportModerationQueueListInput {
  const input: AdminReportModerationQueueListInput = {
    page: query.page,
    pageSize: query.pageSize,
    filters: buildReportQueueFilters(filters),
  };
  const sortBy = getReportSortBySearchParam(query.sortBy);

  if (query.search) {
    input.search = query.search;
  }

  if (sortBy) {
    input.sortBy = sortBy;
  }

  if (query.sortDirection) {
    input.sortDirection = query.sortDirection;
  }

  return input;
}

function buildResourceProviderQueueListInput(
  query: AdminModerationListQuery,
  filters: AdminModerationFilters,
): AdminResourceProviderModerationQueueListInput {
  const input: AdminResourceProviderModerationQueueListInput = {
    page: query.page,
    pageSize: query.pageSize,
    filters: buildResourceProviderQueueFilters(filters),
  };
  const sortBy = getResourceProviderSortBySearchParam(query.sortBy);

  if (query.search) {
    input.search = query.search;
  }

  if (sortBy) {
    input.sortBy = sortBy;
  }

  if (query.sortDirection) {
    input.sortDirection = query.sortDirection;
  }

  return input;
}

function shouldLoadReportQueue(filters: AdminModerationFilters) {
  return (
    filters.targetType === "all" ||
    filters.targetType === "adoption_listing" ||
    filters.targetType === "found_pet_report" ||
    filters.targetType === "lost_pet_report" ||
    filters.targetType === "sighting_report"
  );
}

function shouldLoadResourceProviderQueue(filters: AdminModerationFilters) {
  return (
    filters.targetType === "all" ||
    filters.targetType === "resource_provider_profile"
  );
}

function buildReportQueueFilters(filters: AdminModerationFilters) {
  const result: NonNullable<AdminReportModerationQueueListInput["filters"]> =
    {};
  const type = getReportTypesForTargetType(filters.targetType);

  if (filters.city !== "all") {
    result.city = filters.city;
  }

  if (filters.department !== "all") {
    result.department = filters.department;
  }

  if (filters.reason !== "all") {
    result.reason = filters.reason;
  }

  if (filters.risk === "high") {
    result.risk = "caretaker_suspended";
  } else if (filters.risk === "normal") {
    result.risk = "none";
  }

  if (type) {
    result.type = type;
  }

  return result;
}

function buildResourceProviderQueueFilters(filters: AdminModerationFilters) {
  const result: NonNullable<
    AdminResourceProviderModerationQueueListInput["filters"]
  > = {};
  const reason = getResourceProviderReason(filters.reason);

  if (filters.city !== "all") {
    result.city = filters.city;
  }

  if (filters.department !== "all") {
    result.department = filters.department;
  }

  if (reason) {
    result.reason = [reason];
  }

  return result;
}

function getReportTypesForTargetType(
  targetType: AdminModerationFilters["targetType"],
):
  | NonNullable<
      NonNullable<AdminReportModerationQueueListInput["filters"]>["type"]
    >
  | undefined {
  switch (targetType) {
    case "adoption_listing":
      return ["adoption"];
    case "found_pet_report":
      return ["found_pet"];
    case "lost_pet_report":
      return ["lost_pet"];
    case "sighting_report":
      return ["sighting"];
    default:
      return undefined;
  }
}

function getResourceProviderReason(reason: string) {
  return resourceProviderReasonValues.includes(
    reason as (typeof resourceProviderReasonValues)[number],
  )
    ? (reason as (typeof resourceProviderReasonValues)[number])
    : undefined;
}

const resourceProviderReasonValues = [
  "animal_cruelty",
  "impersonation",
  "incorrect_location",
  "offensive_content",
  "other",
  "scam",
  "spam",
  "stolen_pet_concern",
] as const;

function getCurrentSortForQueue(
  queue: AdminModerationQueueSection,
  query: AdminModerationListQuery,
) {
  if (!query.sortBy) {
    return undefined;
  }

  return queue.availableSorts.some((sort) => sort.value === query.sortBy)
    ? query.sortBy
    : undefined;
}

function buildAdminModerationListHref(input: {
  filters: AdminModerationFilters;
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortDirection?: AdminModerationQueueSortOption["defaultDirection"];
}) {
  return buildAdminQueryHref({
    basePath: "/admin/moderacion",
    page: input.page,
    pageSize: input.pageSize,
    searchParam: {
      key: "search",
      value: input.search,
    },
    sortBy: input.sortBy,
    sortDirection: input.sortDirection,
    writeFilters: (params) =>
      appendAdminModerationFilterParams(params, input.filters),
  });
}

function getReportSortBySearchParam(
  value: string | undefined,
): AdminReportModerationQueueListInput["sortBy"] {
  return value === "city" ||
    value === "createdAt" ||
    value === "department" ||
    value === "falseReportState" ||
    value === "title" ||
    value === "type" ||
    value === "updatedAt" ||
    value === "visibility"
    ? value
    : undefined;
}

function getResourceProviderSortBySearchParam(
  value: string | undefined,
): AdminResourceProviderModerationQueueListInput["sortBy"] {
  return value === "city" ||
    value === "createdAt" ||
    value === "department" ||
    value === "lastReportedAt" ||
    value === "providerName" ||
    value === "reason" ||
    value === "status" ||
    value === "verification"
    ? value
    : undefined;
}

function getOptionalSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = getSingleSearchParam(searchParams, key)?.trim();

  return value && value.length > 0 ? value : undefined;
}

function getAdminListPageSizeSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
) {
  return Math.min(
    getPositiveIntegerSearchParam(searchParams, "pageSize", 10),
    100,
  );
}
