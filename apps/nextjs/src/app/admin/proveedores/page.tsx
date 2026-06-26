import type { Metadata } from "next";
import { revalidatePath } from "next/cache";

import type {
  CreateResourceProviderInput,
  LocalSponsorPlacementSurface,
  ResourceProviderCategory,
  VerificationBadgeStatus,
} from "~/admin-resources";
import { buildAdminModerationViewer } from "~/admin-moderation-access";
import {
  createInMemoryAdminResourceManagement,
  localSponsorPlacementSurfaceOptions,
  resourceProviderCategoryOptions,
} from "~/admin-resources";
import { AdminResourcesDashboard } from "~/admin-resources-dashboard";
import {
  buildForbiddenAdminResourcesDashboardProps,
  toAdminResourceManagementViewer,
  toAdminResourcesDashboardProps,
} from "~/admin-resources-dashboard-adapter";
import { getSession } from "~/auth/server";
import { env } from "~/env";

export const metadata: Metadata = {
  title: "Proveedores de recursos | Rastro",
};

const adminResourceManagement = createInMemoryAdminResourceManagement();

export default async function AdminResourcesPage() {
  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);
  const resourceViewer = toAdminResourceManagementViewer(viewer.modelViewer);
  const result = adminResourceManagement.listProviders(resourceViewer);

  if (result.status === "forbidden") {
    return (
      <AdminResourcesDashboard
        {...buildForbiddenAdminResourcesDashboardProps(
          viewer.dashboardViewer,
          result.viewModel,
        )}
      />
    );
  }

  const metricsResult = adminResourceManagement.getMetrics(resourceViewer);
  const metrics =
    metricsResult.status === "authorized"
      ? metricsResult.metrics
      : result.viewModel.metrics;

  return (
    <AdminResourcesDashboard
      formAction={applyAdminResourcesForm}
      {...toAdminResourcesDashboardProps(
        result.viewModel,
        metrics,
        viewer.dashboardViewer,
      )}
    />
  );
}

async function applyAdminResourcesForm(formData: FormData) {
  "use server";

  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);
  const resourceViewer = toAdminResourceManagementViewer(viewer.modelViewer);

  if (resourceViewer.role !== "admin") {
    return;
  }

  const didApply = applyAdminResourceAction(formData, resourceViewer);

  if (didApply) {
    revalidatePath("/admin/proveedores");
  }
}

function applyAdminResourceAction(
  formData: FormData,
  viewer: ReturnType<typeof toAdminResourceManagementViewer>,
): boolean {
  const action = getStringFormValue(formData, "resourceAction");

  if (action === "create_provider") {
    return applyCreateProviderAction(formData, viewer);
  }

  if (action === "update_verification") {
    return applyVerificationAction(formData, viewer);
  }

  if (action === "attach_sponsor") {
    return applyAttachSponsorAction(formData, viewer);
  }

  if (action === "detach_sponsor") {
    return applyDetachSponsorAction(formData, viewer);
  }

  return false;
}

function applyCreateProviderAction(
  formData: FormData,
  viewer: ReturnType<typeof toAdminResourceManagementViewer>,
): boolean {
  const input = getCreateProviderInput(formData);

  if (!input) {
    return false;
  }

  adminResourceManagement.createProvider(viewer, input);
  return true;
}

function applyVerificationAction(
  formData: FormData,
  viewer: ReturnType<typeof toAdminResourceManagementViewer>,
): boolean {
  const providerId = getStringFormValue(formData, "providerId");
  const status = getVerificationStatusFormValue(formData);
  const note = getStringFormValue(formData, "verificationNote");

  if (providerId === null || !status || note === null) {
    return false;
  }

  adminResourceManagement.updateProviderVerificationBadge(viewer, {
    note,
    providerId,
    status,
  });
  return true;
}

function applyAttachSponsorAction(
  formData: FormData,
  viewer: ReturnType<typeof toAdminResourceManagementViewer>,
): boolean {
  const providerId = getStringFormValue(formData, "providerId");
  const placementId = getStringFormValue(formData, "placementId");
  const surface = getSponsorSurfaceFormValue(formData);
  const startsOn = getStringFormValue(formData, "startsOn");
  const endsOn = getStringFormValue(formData, "endsOn");

  if (
    providerId === null ||
    placementId === null ||
    !surface ||
    startsOn === null ||
    endsOn === null
  ) {
    return false;
  }

  adminResourceManagement.attachSponsorPlacement(viewer, {
    endsOn,
    placementId,
    providerId,
    startsOn,
    surface,
  });
  return true;
}

function applyDetachSponsorAction(
  formData: FormData,
  viewer: ReturnType<typeof toAdminResourceManagementViewer>,
): boolean {
  const providerId = getStringFormValue(formData, "providerId");
  const placementId = getStringFormValue(formData, "placementId");

  if (providerId === null || placementId === null) {
    return false;
  }

  adminResourceManagement.detachSponsorPlacement(viewer, {
    placementId,
    providerId,
  });
  return true;
}

function getCreateProviderInput(
  formData: FormData,
): CreateResourceProviderInput | null {
  const category = getResourceCategoryFormValue(formData);
  const city = getStringFormValue(formData, "city");
  const contactLabel = getStringFormValue(formData, "contactLabel");
  const department = getStringFormValue(formData, "department");
  const name = getStringFormValue(formData, "name");
  const serviceAreaLabel = getStringFormValue(formData, "serviceAreaLabel");

  if (
    !category ||
    city === null ||
    contactLabel === null ||
    department === null ||
    name === null ||
    serviceAreaLabel === null
  ) {
    return null;
  }

  return {
    category,
    city,
    contactLabel,
    department,
    name,
    serviceAreaLabel,
  };
}

function getStringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : null;
}

function getResourceCategoryFormValue(
  formData: FormData,
): ResourceProviderCategory | null {
  const value = getStringFormValue(formData, "category");

  if (resourceProviderCategoryOptions.some((option) => option.id === value)) {
    return value as ResourceProviderCategory;
  }

  return null;
}

function getSponsorSurfaceFormValue(
  formData: FormData,
): LocalSponsorPlacementSurface | null {
  const value = getStringFormValue(formData, "sponsorSurface");

  if (
    localSponsorPlacementSurfaceOptions.some((option) => option.id === value)
  ) {
    return value as LocalSponsorPlacementSurface;
  }

  return null;
}

function getVerificationStatusFormValue(
  formData: FormData,
): VerificationBadgeStatus | null {
  const value = getStringFormValue(formData, "verificationStatus");

  if (value === "verified" || value === "unverified") {
    return value;
  }

  return null;
}
