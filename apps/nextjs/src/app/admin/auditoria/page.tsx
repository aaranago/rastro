import type { Metadata } from "next";

import type { AdminAuditListInput } from "~/admin-audit-api-adapter";
import { listAdminAuditEvents } from "~/admin-audit-api-adapter";
import { AdminAuditLogDashboard } from "~/admin-audit-log-dashboard";
import { buildAdminModerationViewer } from "~/admin-moderation-access";
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
  return {
    action: getOptionalSearchParam(searchParams, "action"),
    actor: getOptionalSearchParam(searchParams, "actor"),
    limit: getAuditLimitSearchParam(searchParams),
    targetType: getOptionalSearchParam(searchParams, "targetType"),
  };
}

function getOptionalSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = getSingleSearchParam(searchParams, key)?.trim();

  return value && value.length > 0 ? value : undefined;
}

function getAuditLimitSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const value = Number(getSingleSearchParam(searchParams, "limit") ?? "50");

  if (!Number.isFinite(value)) {
    return 50;
  }

  return Math.min(Math.max(Math.trunc(value), 1), 200);
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
