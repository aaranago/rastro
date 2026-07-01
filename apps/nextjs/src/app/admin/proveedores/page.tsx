import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { AdminResourceProviderActionState } from "~/admin-resource-provider-actions";
import { buildAdminModerationViewer } from "~/admin-moderation-access";
import {
  applyAdminResourceProviderAction,
  buildAdminResourceProviderActionState,
  buildAdminResourceProviderMutationNotice,
  buildAdminResourceProviderRedirectUrl,
  buildAdminResourceProviderWorkflowFeedback,
} from "~/admin-resource-provider-actions";
import {
  buildAdminResourceProviderListViewModel,
  buildAdminResourcesForbiddenViewModel,
} from "~/admin-resource-provider-admin-model";
import { listAdminResourceProviderProfiles } from "~/admin-resource-provider-api-adapter";
import { AdminResourcesDashboard } from "~/admin-resources-dashboard";
import {
  buildForbiddenAdminResourcesDashboardProps,
  toAdminResourcesDashboardProps,
} from "~/admin-resources-dashboard-adapter";
import { parseAdminResourceProviderListSearchParams } from "~/admin-url-form-parser";
import { getSession } from "~/auth/server";
import { env } from "~/env";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Proveedores de recursos | Rastro",
};

export default async function AdminResourcesPage(
  props: {
    searchParams?: SearchParams;
  } = {},
) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);

  if (viewer.modelViewer.role !== "admin") {
    return (
      <AdminResourcesDashboard
        {...buildForbiddenAdminResourcesDashboardProps(
          viewer.dashboardViewer,
          buildAdminResourcesForbiddenViewModel(),
        )}
      />
    );
  }

  const listInput = parseAdminResourceProviderListSearchParams(searchParams);
  const viewModel = buildAdminResourceProviderListViewModel(
    await listAdminResourceProviderProfiles(listInput),
    listInput,
  );
  const workflowFeedback =
    buildAdminResourceProviderWorkflowFeedback(searchParams);

  return (
    <AdminResourcesDashboard
      formAction={applyAdminResourcesForm}
      notice={buildAdminResourceProviderMutationNotice(workflowFeedback)}
      workflowFeedback={workflowFeedback}
      {...toAdminResourcesDashboardProps(
        viewModel,
        viewModel.metrics,
        viewer.dashboardViewer,
      )}
    />
  );
}

async function applyAdminResourcesForm(
  _state: AdminResourceProviderActionState,
  formData: FormData,
): Promise<AdminResourceProviderActionState> {
  "use server";

  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);

  if (viewer.modelViewer.role !== "admin") {
    return {};
  }

  const result = await applyAdminResourceProviderAction(formData);

  if (result.ok) {
    revalidatePath("/admin/proveedores");
    if (result.workflow === "sponsor") {
      revalidatePath("/admin/patrocinios");
    }
    redirect(buildAdminResourceProviderRedirectUrl(result));
  }

  return buildAdminResourceProviderActionState(result);
}
