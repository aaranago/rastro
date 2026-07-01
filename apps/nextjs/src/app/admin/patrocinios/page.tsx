import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { AdminSponsorPlacementActionState } from "~/admin-sponsor-placement-actions";
import { buildAdminModerationViewer } from "~/admin-moderation-access";
import { listAdminResourceProviderProfiles } from "~/admin-resource-provider-api-adapter";
import {
  applyAdminSponsorPlacementAction,
  buildAdminSponsorPlacementActionState,
  buildAdminSponsorPlacementFeedback,
  buildAdminSponsorPlacementNotice,
  buildAdminSponsorPlacementRedirectUrl,
} from "~/admin-sponsor-placement-actions";
import { listAdminSponsorPlacements } from "~/admin-sponsor-placement-api-adapter";
import { AdminSponsorPlacementDashboard } from "~/admin-sponsor-placement-dashboard";
import {
  buildAdminSponsorPlacementDashboardViewModel,
  buildAdminSponsorPlacementsForbiddenViewModel,
} from "~/admin-sponsor-placement-model";
import { parseAdminSponsorPlacementListSearchParams } from "~/admin-url-form-parser";
import { getSession } from "~/auth/server";
import { env } from "~/env";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Patrocinios locales | Rastro",
};

export default async function AdminSponsorPlacementsPage(
  props: {
    searchParams?: SearchParams;
  } = {},
) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);

  if (viewer.modelViewer.role !== "admin") {
    return (
      <AdminSponsorPlacementDashboard
        accessDenied={buildAdminSponsorPlacementsForbiddenViewModel()}
        viewer={viewer.dashboardViewer}
        viewModel={buildAdminSponsorPlacementDashboardViewModel({
          placements: [],
          providers: [],
        })}
      />
    );
  }

  const listInput = parseAdminSponsorPlacementListSearchParams(searchParams);
  const [placements, providers] = await Promise.all([
    listAdminSponsorPlacements(listInput),
    listAdminResourceProviderProfiles({
      page: 1,
      pageSize: 100,
    }),
  ]);
  const workflowFeedback = buildAdminSponsorPlacementFeedback(searchParams);

  return (
    <AdminSponsorPlacementDashboard
      accessDenied={buildAdminSponsorPlacementsForbiddenViewModel()}
      formAction={applyAdminSponsorPlacementsForm}
      notice={buildAdminSponsorPlacementNotice(workflowFeedback)}
      viewer={viewer.dashboardViewer}
      viewModel={buildAdminSponsorPlacementDashboardViewModel({
        listInput,
        placements,
        providers,
      })}
      workflowFeedback={workflowFeedback}
    />
  );
}

async function applyAdminSponsorPlacementsForm(
  _state: AdminSponsorPlacementActionState,
  formData: FormData,
): Promise<AdminSponsorPlacementActionState> {
  "use server";

  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);

  if (viewer.modelViewer.role !== "admin") {
    return {};
  }

  const result = await applyAdminSponsorPlacementAction(formData);

  if (result.ok) {
    revalidatePath("/admin/patrocinios");
    revalidatePath("/admin/proveedores");
    redirect(buildAdminSponsorPlacementRedirectUrl(result));
  }

  return buildAdminSponsorPlacementActionState(result);
}
