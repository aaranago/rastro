import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type {
  AdminLocalSponsorPlacementSurface,
  AdminResourceProviderCategory,
  AdminResourceProviderContactKind,
  AdminResourceProviderCreateInput,
  AdminResourceProviderUpdateInput,
  AdminResourceProviderVerificationStatus,
} from "~/admin-resource-provider-admin-model";
import { buildAdminModerationViewer } from "~/admin-moderation-access";
import {
  buildAdminResourceProviderListViewModel,
  buildAdminResourcesForbiddenViewModel,
  localSponsorPlacementSurfaceOptions,
  resourceProviderCategoryOptions,
  resourceProviderContactKindOptions,
} from "~/admin-resource-provider-admin-model";
import {
  attachAdminResourceProviderSponsor,
  createAdminResourceProvider,
  deleteAdminResourceProvider,
  detachAdminResourceProviderSponsor,
  listAdminResourceProviderProfiles,
  updateAdminResourceProvider,
  updateAdminResourceProviderVerification,
} from "~/admin-resource-provider-api-adapter";
import { AdminResourcesDashboard } from "~/admin-resources-dashboard";
import {
  buildForbiddenAdminResourcesDashboardProps,
  toAdminResourcesDashboardProps,
} from "~/admin-resources-dashboard-adapter";
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

  const viewModel = buildAdminResourceProviderListViewModel(
    await listAdminResourceProviderProfiles(),
  );

  return (
    <AdminResourcesDashboard
      formAction={applyAdminResourcesForm}
      notice={buildMutationNotice(getSingleSearchParam(searchParams, "estado"))}
      {...toAdminResourcesDashboardProps(
        viewModel,
        viewModel.metrics,
        viewer.dashboardViewer,
      )}
    />
  );
}

async function applyAdminResourcesForm(formData: FormData) {
  "use server";

  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);

  if (viewer.modelViewer.role !== "admin") {
    return;
  }

  const didApply = await applyAdminResourceAction(formData);

  if (didApply) {
    revalidatePath("/admin/proveedores");
  }

  redirect(`/admin/proveedores?estado=${didApply ? "ok" : "error"}`);
}

async function applyAdminResourceAction(formData: FormData): Promise<boolean> {
  const action = getStringFormValue(formData, "resourceAction");

  if (action === "create_provider") {
    return applyCreateProviderAction(formData);
  }

  if (action === "update_verification") {
    return applyVerificationAction(formData);
  }

  if (action === "update_provider_details") {
    return applyUpdateProviderAction(formData);
  }

  if (action === "archive_provider") {
    return applyArchiveProviderAction(formData);
  }

  if (action === "attach_sponsor") {
    return applyAttachSponsorAction(formData);
  }

  if (action === "detach_sponsor") {
    return applyDetachSponsorAction(formData);
  }

  return false;
}

async function applyCreateProviderAction(formData: FormData): Promise<boolean> {
  const input = getCreateProviderInput(formData);

  if (!input) {
    return false;
  }

  return applyApiMutation(() => createAdminResourceProvider(input));
}

async function applyUpdateProviderAction(formData: FormData): Promise<boolean> {
  const input = getUpdateProviderInput(formData);

  if (!input) {
    return false;
  }

  return applyApiMutation(() => updateAdminResourceProvider(input));
}

async function applyArchiveProviderAction(formData: FormData): Promise<boolean> {
  const providerId = getStringFormValue(formData, "providerId");

  if (providerId === null) {
    return false;
  }

  return applyApiMutation(() => deleteAdminResourceProvider({ providerId }));
}

async function applyVerificationAction(formData: FormData): Promise<boolean> {
  const providerId = getStringFormValue(formData, "providerId");
  const status = getVerificationStatusFormValue(formData);
  const note = getStringFormValue(formData, "verificationNote");

  if (providerId === null || !status || note === null) {
    return false;
  }

  return applyApiMutation(() =>
    updateAdminResourceProviderVerification({
      note,
      providerId,
      status,
    }),
  );
}

async function applyAttachSponsorAction(formData: FormData): Promise<boolean> {
  const providerId = getStringFormValue(formData, "providerId");
  const placementId = getOptionalStringFormValue(formData, "placementId");
  const surface = getSponsorSurfaceFormValue(formData);
  const startsOn = getStringFormValue(formData, "startsOn");
  const endsOn = getStringFormValue(formData, "endsOn");
  const label = getOptionalStringFormValue(formData, "sponsorLabel");
  const disclosure = getOptionalStringFormValue(formData, "sponsorDisclosure");

  if (providerId === null || !surface || startsOn === null || endsOn === null) {
    return false;
  }

  return applyApiMutation(() =>
    attachAdminResourceProviderSponsor({
      disclosure,
      endsOn,
      label,
      placementId,
      providerId,
      startsOn,
      surface,
    }),
  );
}

async function applyDetachSponsorAction(formData: FormData): Promise<boolean> {
  const providerId = getStringFormValue(formData, "providerId");
  const placementId = getStringFormValue(formData, "placementId");

  if (providerId === null || placementId === null) {
    return false;
  }

  return applyApiMutation(() =>
    detachAdminResourceProviderSponsor({
      placementId,
      providerId,
    }),
  );
}

function getCreateProviderInput(
  formData: FormData,
): AdminResourceProviderCreateInput | null {
  const category = getResourceCategoryFormValue(formData);
  const contactKind = getContactKindFormValue(formData);
  const requiredFields = {
    approximateLocationLabel: getStringFormValue(
      formData,
      "approximateLocationLabel",
    ),
    contactLabel: getStringFormValue(formData, "contactLabel"),
    contactValue: getStringFormValue(formData, "contactValue"),
    description: getStringFormValue(formData, "description"),
    exactLatitude: getNumberFormValue(formData, "exactLatitude"),
    exactLongitude: getNumberFormValue(formData, "exactLongitude"),
    hoursLabel: getStringFormValue(formData, "hoursLabel"),
    locationCell: getStringFormValue(formData, "locationCell"),
    name: getStringFormValue(formData, "name"),
    serviceAreaLabel: getStringFormValue(formData, "serviceAreaLabel"),
    shortDescription: getStringFormValue(formData, "shortDescription"),
  };

  if (!category || !contactKind || !hasRequiredFormValues(requiredFields)) {
    return null;
  }

  return {
    category,
    contactOptions: [
      {
        kind: contactKind,
        label: requiredFields.contactLabel,
        value: requiredFields.contactValue,
      },
    ],
    description: requiredFields.description,
    emergencyAvailable: getBooleanFormValue(formData, "emergencyAvailable"),
    hoursLabel: requiredFields.hoursLabel,
    isOpenNow: getBooleanFormValue(formData, "isOpenNow"),
    location: {
      addressLabel: getOptionalStringFormValue(formData, "addressLabel"),
      approximateLocationLabel: requiredFields.approximateLocationLabel,
      exactLatitude: requiredFields.exactLatitude,
      exactLongitude: requiredFields.exactLongitude,
      locationCell: requiredFields.locationCell,
    },
    name: requiredFields.name,
    serviceAreaLabel: requiredFields.serviceAreaLabel,
    shortDescription: requiredFields.shortDescription,
    websiteUrl: getOptionalStringFormValue(formData, "websiteUrl"),
  };
}

function getUpdateProviderInput(
  formData: FormData,
): AdminResourceProviderUpdateInput | null {
  const providerId = getStringFormValue(formData, "providerId");
  const category = getResourceCategoryFormValue(formData);
  const contactKind = getContactKindFormValue(formData);
  const location = getOptionalLocationUpdateInput(formData);
  const requiredFields = {
    contactLabel: getStringFormValue(formData, "contactLabel"),
    contactValue: getStringFormValue(formData, "contactValue"),
    description: getStringFormValue(formData, "description"),
    hoursLabel: getStringFormValue(formData, "hoursLabel"),
    name: getStringFormValue(formData, "name"),
    serviceAreaLabel: getStringFormValue(formData, "serviceAreaLabel"),
    shortDescription: getStringFormValue(formData, "shortDescription"),
  };

  if (
    providerId === null ||
    !category ||
    !contactKind ||
    !hasRequiredFormValues(requiredFields)
  ) {
    return null;
  }

  if (location === null) {
    return null;
  }

  return {
    category,
    contactOptions: [
      {
        kind: contactKind,
        label: requiredFields.contactLabel,
        value: requiredFields.contactValue,
      },
    ],
    description: requiredFields.description,
    emergencyAvailable: getBooleanFormValue(formData, "emergencyAvailable"),
    hoursLabel: requiredFields.hoursLabel,
    isOpenNow: getBooleanFormValue(formData, "isOpenNow"),
    ...(location ? { location } : {}),
    name: requiredFields.name,
    providerId,
    serviceAreaLabel: requiredFields.serviceAreaLabel,
    shortDescription: requiredFields.shortDescription,
    websiteUrl: getNullableOptionalStringFormValue(formData, "websiteUrl"),
  };
}

function getOptionalLocationUpdateInput(
  formData: FormData,
): AdminResourceProviderUpdateInput["location"] | null | undefined {
  const exactLatitude = getNumberFormValue(formData, "exactLatitude");
  const exactLongitude = getNumberFormValue(formData, "exactLongitude");
  const approximateLocationLabel = getStringFormValue(
    formData,
    "approximateLocationLabel",
  );
  const locationCell = getStringFormValue(formData, "locationCell");
  const addressLabel = getOptionalStringFormValue(formData, "addressLabel");

  if (exactLatitude === null && exactLongitude === null) {
    return undefined;
  }

  if (
    exactLatitude === null ||
    exactLongitude === null ||
    approximateLocationLabel === null ||
    locationCell === null
  ) {
    return null;
  }

  return {
    addressLabel,
    approximateLocationLabel,
    exactLatitude,
    exactLongitude,
    locationCell,
  };
}

function hasRequiredFormValues<
  T extends Record<string, number | string | null>,
>(values: T): values is { [Key in keyof T]: Exclude<T[Key], null> } {
  return Object.values(values).every((value) => value !== null);
}

async function applyApiMutation(
  action: () => Promise<unknown>,
): Promise<boolean> {
  try {
    await action();
    return true;
  } catch (error) {
    console.error("Admin resource provider mutation failed.", error);
    return false;
  }
}

function getStringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : null;
}

function getOptionalStringFormValue(formData: FormData, key: string) {
  const value = getStringFormValue(formData, key);
  const trimmed = value?.trim();

  if (trimmed === "") {
    return undefined;
  }

  return trimmed;
}

function getNullableOptionalStringFormValue(formData: FormData, key: string) {
  return getOptionalStringFormValue(formData, key) ?? null;
}

function getNumberFormValue(formData: FormData, key: string) {
  const value = getStringFormValue(formData, key);

  if (value === null || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getBooleanFormValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function getResourceCategoryFormValue(
  formData: FormData,
): AdminResourceProviderCategory | null {
  const value = getStringFormValue(formData, "category");

  if (resourceProviderCategoryOptions.some((option) => option.id === value)) {
    return value as AdminResourceProviderCategory;
  }

  return null;
}

function getContactKindFormValue(
  formData: FormData,
): AdminResourceProviderContactKind | null {
  const value = getStringFormValue(formData, "contactKind");

  if (
    resourceProviderContactKindOptions.some((option) => option.id === value)
  ) {
    return value as AdminResourceProviderContactKind;
  }

  return null;
}

function getSponsorSurfaceFormValue(
  formData: FormData,
): AdminLocalSponsorPlacementSurface | null {
  const value = getStringFormValue(formData, "sponsorSurface");

  if (
    localSponsorPlacementSurfaceOptions.some((option) => option.id === value)
  ) {
    return value as AdminLocalSponsorPlacementSurface;
  }

  return null;
}

function getVerificationStatusFormValue(
  formData: FormData,
): AdminResourceProviderVerificationStatus | null {
  const value = getStringFormValue(formData, "verificationStatus");

  if (value === "verified" || value === "unverified") {
    return value;
  }

  return null;
}

function getSingleSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];

  return Array.isArray(value) ? value[0] : value;
}

function buildMutationNotice(status: string | undefined) {
  if (status === "ok") {
    return {
      body: "La acción se guardó en la base de datos y el directorio usa esos datos.",
      title: "Cambios guardados",
      tone: "success" as const,
    };
  }

  if (status === "error") {
    return {
      body: "No pudimos guardar la acción. Revisa que los campos requeridos sean válidos.",
      title: "No se guardaron los cambios",
      tone: "error" as const,
    };
  }

  return undefined;
}
