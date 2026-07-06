import type {
  AdminModerationFilters,
  AdminModerationListQuery,
  AdminModerationRiskFilter,
  AdminModerationTargetType,
} from "./admin-moderation-dashboard";

export function buildAdminModerationFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AdminModerationFilters {
  const city = getNonEmptySearchParam(searchParams, "city");
  const department = getNonEmptySearchParam(searchParams, "department");
  const reason = getNonEmptySearchParam(searchParams, "reason");

  return {
    city: city ?? "all",
    department: department ?? "all",
    reason: reason ?? "all",
    risk: getRiskSearchParam(getSingleSearchParam(searchParams, "risk")),
    targetType: getTargetTypeSearchParam(
      getSingleSearchParam(searchParams, "targetType"),
    ),
  };
}

export function buildAdminModerationReturnPath(
  pathname: string,
  filters: AdminModerationFilters,
  listQuery?: AdminModerationListQuery,
) {
  const params = new URLSearchParams();

  appendAdminModerationFilterParams(params, filters);
  appendAdminModerationListParams(params, listQuery);

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function appendAdminModerationListParams(
  params: URLSearchParams,
  listQuery: AdminModerationListQuery | undefined,
) {
  if (!listQuery) {
    return;
  }

  if (listQuery.search) {
    params.set("search", listQuery.search);
  }

  if (listQuery.page > 1) {
    params.set("page", String(listQuery.page));
  }

  params.set("pageSize", String(listQuery.pageSize));

  if (listQuery.sortBy) {
    params.set("sortBy", listQuery.sortBy);
  }

  if (listQuery.sortDirection) {
    params.set("sortDirection", listQuery.sortDirection);
  }
}

export function appendAdminModerationFilterParams(
  params: URLSearchParams,
  filters: AdminModerationFilters,
) {
  if (filters.targetType !== "all") {
    params.set("targetType", filters.targetType);
  }

  if (filters.reason !== "all") {
    params.set("reason", filters.reason);
  }

  if (filters.department !== "all") {
    params.set("department", filters.department);
  }

  if (filters.city !== "all") {
    params.set("city", filters.city);
  }

  if (filters.risk !== "all") {
    params.set("risk", filters.risk);
  }
}

function getNonEmptySearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = getSingleSearchParam(searchParams, key)?.trim();

  return value && value.length > 0 ? value : undefined;
}

function getTargetTypeSearchParam(
  value: string | undefined,
): AdminModerationTargetType | "all" {
  if (
    value === "adoption_listing" ||
    value === "found_pet_report" ||
    value === "in_app_chat" ||
    value === "lost_pet_report" ||
    value === "resource_provider_profile" ||
    value === "sighting_report"
  ) {
    return value;
  }

  return "all";
}

function getRiskSearchParam(
  value: string | undefined,
): AdminModerationRiskFilter {
  return value === "high" || value === "normal" ? value : "all";
}

function getSingleSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0] ?? undefined;
  }

  return value;
}
