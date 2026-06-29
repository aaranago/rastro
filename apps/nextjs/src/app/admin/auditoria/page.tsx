import type { Metadata } from "next";

import type { AdminAuditListInput } from "~/admin-audit-api-adapter";
import { listAdminAuditEvents } from "~/admin-audit-api-adapter";
import { AdminAuditLogDashboard } from "~/admin-audit-log-dashboard";
import { buildAdminModerationViewer } from "~/admin-moderation-access";
import {
  getPositiveIntegerSearchParam,
  getSingleSearchParam,
  getSortDirectionSearchParam,
} from "~/admin-search-params";
import { getSession } from "~/auth/server";
import { env } from "~/env";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Auditoría admin | Rastro",
};

export default async function AdminAuditPage(
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

  const query = parseAdminAuditSearchParams(searchParams);

  return (
    <AdminAuditLogDashboard
      query={query}
      state={await listAdminAuditEvents(query)}
    />
  );
}

function parseAdminAuditSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): AdminAuditListInput {
  const input: AdminAuditListInput = {
    page: getPositiveIntegerSearchParam(searchParams, "page", 1),
    pageSize: getAuditPageSizeSearchParam(searchParams),
  };
  const action = getOptionalSearchParam(searchParams, "action");
  const actor = getOptionalSearchParam(searchParams, "actor");
  const search = getOptionalSearchParam(searchParams, "search");
  const sortBy = getAuditSortBySearchParam(searchParams);
  const sortDirection = getSortDirectionSearchParam(searchParams);
  const targetType = getOptionalSearchParam(searchParams, "targetType");

  if (action) {
    input.action = action;
  }

  if (actor) {
    input.actor = actor;
  }

  if (search) {
    input.search = search;
  }

  if (sortBy) {
    input.sortBy = sortBy;
  }

  if (sortDirection) {
    input.sortDirection = sortDirection;
  }

  if (targetType) {
    input.targetType = targetType;
  }

  return input;
}

function getOptionalSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = getSingleSearchParam(searchParams, key)?.trim();

  return value && value.length > 0 ? value : undefined;
}

function getAuditPageSizeSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const value =
    getSingleSearchParam(searchParams, "pageSize") ??
    getSingleSearchParam(searchParams, "limit");

  if (!value) {
    return 10;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 10;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 100);
}

function getAuditSortBySearchParam(
  searchParams: Record<string, string | string[] | undefined>,
): AdminAuditListInput["sortBy"] {
  const value = getSingleSearchParam(searchParams, "sortBy");

  return value === "action" ||
    value === "actor" ||
    value === "createdAt" ||
    value === "targetLabel" ||
    value === "targetType"
    ? value
    : undefined;
}
