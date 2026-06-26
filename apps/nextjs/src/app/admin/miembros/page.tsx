import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type {
  AdminMemberProfile,
  AdminMemberSearchResults,
} from "~/admin-member-dashboard";
import {
  applyAdminMemberAction,
  buildAdminMemberRedirectUrl,
  buildAdminMemberWorkflowFeedback,
} from "~/admin-member-actions";
import {
  getAdminMemberProfile,
  searchAdminMembers,
} from "~/admin-member-api-adapter";
import { AdminMemberDashboard } from "~/admin-member-dashboard";
import { buildAdminModerationViewer } from "~/admin-moderation-access";
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
  const [searchedMembers, profile] = await Promise.all([
    query ? searchAdminMembers({ query }) : Promise.resolve([]),
    selectedMemberId ? getAdminMemberProfile(selectedMemberId) : null,
  ]);
  const results =
    searchedMembers.length > 0
      ? searchedMembers
      : profile
        ? [toSearchResult(profile)]
        : [];

  return (
    <AdminMemberDashboard
      formAction={applyAdminMembersForm}
      profile={profile}
      query={query}
      results={results}
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

function toSearchResult(
  profile: NonNullable<AdminMemberProfile>,
): AdminMemberSearchResults[number] {
  return {
    currentSuspension: profile.currentSuspension,
    email: profile.member.email,
    emailVerified: profile.member.emailVerified,
    id: profile.member.id,
    name: profile.member.name,
  };
}

function getStringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : null;
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
