import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { AdminMemberListInput } from "~/admin-member-api-adapter";
import {
  applyAdminMemberAction,
  buildAdminMemberRedirectUrl,
  buildAdminMemberWorkflowFeedback,
} from "~/admin-member-actions";
import {
  getAdminMemberProfile,
  listAdminMembers,
} from "~/admin-member-api-adapter";
import { AdminMemberDashboard } from "~/admin-member-dashboard";
import { buildAdminModerationViewer } from "~/admin-moderation-access";
import {
  buildAdminQueryHref,
  getPositiveIntegerSearchParam,
  getSingleSearchParam,
  getSortDirectionSearchParam,
} from "~/admin-search-params";
import { getSession } from "~/auth/server";
import { env } from "~/env";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Miembros admin | Rastro",
};

export default async function AdminMembersPage(
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

  const query = getSingleSearchParam(searchParams, "q")?.trim() ?? "";
  const selectedMemberId = getSingleSearchParam(searchParams, "memberId");
  const listInput = buildAdminMemberListInput(searchParams, query);
  const [listState, profile] = await Promise.all([
    listAdminMembers(listInput),
    selectedMemberId ? getAdminMemberProfile(selectedMemberId) : null,
  ]);

  return (
    <AdminMemberDashboard
      formAction={applyAdminMembersForm}
      listHrefForPage={(page) =>
        buildAdminMemberListHref({
          page,
          pageSize: listState.pageSize,
          query,
          sortBy: listInput.sortBy,
          sortDirection: listInput.sortDirection,
        })
      }
      listState={listState}
      profile={profile}
      query={query}
      viewer={viewer.dashboardViewer}
      workflowFeedback={buildAdminMemberWorkflowFeedback(searchParams)}
    />
  );
}

// Wired into AdminMemberDashboard as the form action.
// fallow-ignore-next-line unused-server-action
export async function applyAdminMembersForm(formData: FormData) {
  "use server";

  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);

  if (viewer.modelViewer.role !== "admin") {
    redirect("/admin/miembros?estado=error");
  }

  const query = getStringFormValue(formData, "q");
  const result = await applyAdminMemberAction(formData);

  if (result.ok) {
    revalidatePath("/admin/miembros");
    revalidatePath("/admin/moderacion");
  }

  redirect(buildAdminMemberRedirectUrl(result, query));
}

function getStringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : null;
}

function buildAdminMemberListInput(
  searchParams: Record<string, string | string[] | undefined>,
  query: string,
): AdminMemberListInput {
  const input: AdminMemberListInput = {
    page: getPositiveIntegerSearchParam(searchParams, "page", 1),
    pageSize: getPositiveIntegerSearchParam(searchParams, "pageSize", 10),
  };
  const sortBy = getMemberSortBySearchParam(searchParams);
  const sortDirection = getSortDirectionSearchParam(searchParams);

  if (query.length > 0) {
    input.search = query;
  }

  if (sortBy) {
    input.sortBy = sortBy;
  }

  if (sortDirection) {
    input.sortDirection = sortDirection;
  }

  return input;
}

function buildAdminMemberListHref(input: {
  page: number;
  pageSize: number;
  query: string;
  sortBy: ReturnType<typeof getMemberSortBySearchParam>;
  sortDirection: ReturnType<typeof getSortDirectionSearchParam>;
}) {
  return buildAdminQueryHref({
    basePath: "/admin/miembros",
    page: input.page,
    pageSize: input.pageSize,
    searchParam: {
      key: "q",
      value: input.query,
    },
    sortBy: input.sortBy,
    sortDirection: input.sortDirection,
  });
}

function getMemberSortBySearchParam(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const value = getSingleSearchParam(searchParams, "sortBy");

  return value === "createdAt" ||
    value === "email" ||
    value === "emailVerified" ||
    value === "name" ||
    value === "suspensionStatus"
    ? value
    : undefined;
}
