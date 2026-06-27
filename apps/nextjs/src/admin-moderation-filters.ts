import type {
  AdminModerationFilters,
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
) {
  const params = new URLSearchParams();

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

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
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
