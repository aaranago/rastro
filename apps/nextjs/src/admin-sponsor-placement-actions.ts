import type {
  AdminSponsorPlacementCreateInput,
  AdminSponsorPlacementDetachInput,
  AdminSponsorPlacementSurface,
  AdminSponsorPlacementUpdateInput,
} from "./admin-sponsor-placement-model";
import { getMutationFieldErrors } from "./admin-action-field-errors";
import {
  createAdminSponsorPlacement,
  detachAdminSponsorPlacement,
  updateAdminSponsorPlacement,
} from "./admin-sponsor-placement-api-adapter";
import { adminSponsorPlacementSurfaceOptions } from "./admin-sponsor-placement-model";
import {
  getSponsorPlacementMediaFormValues,
  validateDateOnlyRange,
} from "./admin-url-form-parser";

export type AdminSponsorPlacementAction =
  | "create_sponsor_placement"
  | "update_sponsor_placement"
  | "detach_sponsor_placement";

export interface AdminSponsorPlacementFieldError {
  field: string;
  message: string;
}

export interface AdminSponsorPlacementActionResult {
  action: AdminSponsorPlacementAction;
  fieldErrors: AdminSponsorPlacementFieldError[];
  ok: boolean;
  placementId?: string;
  providerId?: string;
  providerName?: string;
  submittedValues?: AdminSponsorPlacementSubmittedValues;
}

export interface AdminSponsorPlacementFeedback
  extends AdminSponsorPlacementActionResult {
  formError?: string;
}

export type AdminSponsorPlacementSubmittedValues = Record<string, string>;

export interface AdminSponsorPlacementActionState {
  feedback?: AdminSponsorPlacementFeedback;
}

export type AdminSponsorPlacementFormAction = (
  state: AdminSponsorPlacementActionState,
  formData: FormData,
) => Promise<AdminSponsorPlacementActionState>;

export interface AdminSponsorPlacementNotice {
  body: string;
  title: string;
  tone: "error" | "success";
}

type ParsedSponsorMutation =
  | {
      mutation: () => Promise<unknown>;
      ok: true;
      placementId?: string;
      providerId: string;
      providerName?: string;
    }
  | {
      fieldErrors: AdminSponsorPlacementFieldError[];
      ok: false;
      placementId?: string;
      providerId?: string;
      providerName?: string;
    };

const requiredFieldMessage = "Este campo es obligatorio.";

export async function applyAdminSponsorPlacementAction(
  formData: FormData,
): Promise<AdminSponsorPlacementActionResult> {
  const action = getActionFormValue(formData);

  if (!action) {
    return buildActionError({
      action: "create_sponsor_placement",
      fieldErrors: [],
      formData,
    });
  }

  const parsed = buildParsedMutation(action, formData);

  if (!parsed.ok) {
    return buildActionError({
      action,
      fieldErrors: parsed.fieldErrors,
      formData,
      placementId: parsed.placementId,
      providerId: parsed.providerId,
      providerName: parsed.providerName,
    });
  }

  try {
    await parsed.mutation();

    return {
      action,
      fieldErrors: [],
      ok: true,
      placementId: parsed.placementId,
      providerId: parsed.providerId,
      providerName: parsed.providerName,
    };
  } catch (error) {
    console.error("Admin sponsor placement mutation failed.", error);
    const fieldErrors = getSponsorPlacementMutationFieldErrors(error);

    return buildActionError({
      action,
      fieldErrors,
      formData,
      placementId: parsed.placementId,
      providerId: parsed.providerId,
      providerName: parsed.providerName,
    });
  }
}

export function buildAdminSponsorPlacementRedirectUrl(
  result: AdminSponsorPlacementActionResult,
) {
  const params = new URLSearchParams({
    accion: result.action,
    estado: result.ok ? "ok" : "error",
  });

  if (result.providerId) {
    params.set("providerId", result.providerId);
  }

  if (result.providerName) {
    params.set("providerName", result.providerName);
  }

  if (result.placementId) {
    params.set("placementId", result.placementId);
  }

  return `/admin/patrocinios?${params.toString()}`;
}

export function buildAdminSponsorPlacementActionState(
  result: AdminSponsorPlacementActionResult,
): AdminSponsorPlacementActionState {
  return {
    feedback: toSponsorPlacementFeedback(result),
  };
}

export function buildAdminSponsorPlacementFeedback(
  searchParams: Record<string, string | string[] | undefined>,
): AdminSponsorPlacementFeedback | undefined {
  const status = getSingleSearchParam(searchParams, "estado");
  const action = getActionSearchParam(searchParams);

  if ((status !== "ok" && status !== "error") || !action) {
    return undefined;
  }

  const feedback: AdminSponsorPlacementFeedback = {
    action,
    fieldErrors: [],
    ok: status === "ok",
    placementId: getSingleSearchParam(searchParams, "placementId"),
    providerId: getSingleSearchParam(searchParams, "providerId"),
    providerName: getSingleSearchParam(searchParams, "providerName"),
  };

  if (!feedback.ok) {
    feedback.formError =
      "No pudimos guardar la acción de patrocinio. Revisa los datos o intenta nuevamente.";
  }

  return feedback;
}

export function buildAdminSponsorPlacementNotice(
  feedback: AdminSponsorPlacementFeedback | undefined,
): AdminSponsorPlacementNotice | undefined {
  if (!feedback) {
    return undefined;
  }

  const providerName = feedback.providerName ?? "este proveedor";

  if (feedback.ok) {
    return {
      body: `${providerName}: ${getSuccessBody(feedback.action)}`,
      title: getSuccessTitle(feedback.action),
      tone: "success",
    };
  }

  return {
    body:
      feedback.fieldErrors.length > 0
        ? `${providerName}: corrige los campos marcados.`
        : `${providerName}: no se pudo completar la acción.`,
    title:
      feedback.fieldErrors.length > 0
        ? "Revisa los campos"
        : "No se guardaron los cambios",
    tone: "error",
  };
}

function buildParsedMutation(
  action: AdminSponsorPlacementAction,
  formData: FormData,
): ParsedSponsorMutation {
  if (action === "detach_sponsor_placement") {
    return buildDetachMutation(formData);
  }

  if (action === "update_sponsor_placement") {
    return buildUpdateMutation(formData);
  }

  return buildCreateMutation(formData);
}

function buildCreateMutation(formData: FormData): ParsedSponsorMutation {
  const parsed = parseSponsorPlacementFields(formData, "create");

  if (!parsed.ok) {
    return parsed;
  }

  return {
    mutation: () => createAdminSponsorPlacement(parsed.input),
    ok: true,
    providerId: parsed.input.providerId,
    providerName: getOptionalStringFormValue(formData, "providerName"),
  };
}

function buildUpdateMutation(formData: FormData): ParsedSponsorMutation {
  const parsed = parseSponsorPlacementFields(formData, "update");

  if (!parsed.ok) {
    return parsed;
  }

  if (!("placementId" in parsed.input) || !parsed.input.placementId) {
    return {
      fieldErrors: [
        {
          field: "placementId",
          message: requiredFieldMessage,
        },
      ],
      ok: false,
      providerId: parsed.input.providerId,
      providerName: getOptionalStringFormValue(formData, "providerName"),
    };
  }

  const input: AdminSponsorPlacementUpdateInput = {
    ...parsed.input,
    placementId: parsed.input.placementId,
  };

  return {
    mutation: () => updateAdminSponsorPlacement(input),
    ok: true,
    placementId: input.placementId,
    providerId: input.providerId,
    providerName: getOptionalStringFormValue(formData, "providerName"),
  };
}

function buildDetachMutation(formData: FormData): ParsedSponsorMutation {
  const fieldErrors: AdminSponsorPlacementFieldError[] = [];
  const providerId = getRequiredStringFormValue(
    formData,
    "providerId",
    fieldErrors,
  );
  const placementId = getRequiredStringFormValue(
    formData,
    "placementId",
    fieldErrors,
  );
  const providerName = getOptionalStringFormValue(formData, "providerName");

  if (fieldErrors.length > 0) {
    return {
      fieldErrors,
      ok: false,
      placementId,
      providerId,
      providerName,
    };
  }

  const input: AdminSponsorPlacementDetachInput = {
    placementId,
    providerId,
  };

  return {
    mutation: () => detachAdminSponsorPlacement(input),
    ok: true,
    placementId,
    providerId,
    providerName,
  };
}

type SponsorPlacementParseResult =
  | {
      input:
        | AdminSponsorPlacementCreateInput
        | AdminSponsorPlacementUpdateInput;
      ok: true;
    }
  | {
      fieldErrors: AdminSponsorPlacementFieldError[];
      ok: false;
      placementId?: string;
      providerId?: string;
      providerName?: string;
    };

function parseSponsorPlacementFields(
  formData: FormData,
  mode: "create" | "update",
): SponsorPlacementParseResult {
  const fieldErrors: AdminSponsorPlacementFieldError[] = [];
  const providerId = getRequiredStringFormValue(
    formData,
    "providerId",
    fieldErrors,
  );
  const placementId =
    mode === "update"
      ? getRequiredStringFormValue(formData, "placementId", fieldErrors)
      : undefined;
  const surface = getSponsorSurfaceFormValue(formData, fieldErrors);
  const startsOn = getRequiredDateOnlyFormValue(
    formData,
    "startsOn",
    fieldErrors,
  );
  const endsOn = getRequiredDateOnlyFormValue(formData, "endsOn", fieldErrors);
  const media = getSponsorPlacementMediaFormValues({
    fieldErrors,
    formData,
    getOptionalStringFormValue,
  });

  validateDateOnlyRange({ endsOn, fieldErrors, startsOn });

  if (fieldErrors.length > 0 || !surface) {
    return {
      fieldErrors,
      ok: false,
      placementId,
      providerId,
      providerName: getOptionalStringFormValue(formData, "providerName"),
    };
  }

  const input = {
    disclosure: getRequiredStringFormValue(formData, "disclosure", fieldErrors),
    endsOn,
    imageAssetId: media.imageAssetId,
    imageUrl: media.imageUrl,
    label: getRequiredStringFormValue(formData, "label", fieldErrors),
    logoAssetId: media.logoAssetId,
    logoUrl: media.logoUrl,
    providerId,
    startsOn,
    surface,
    ...(placementId ? { placementId } : {}),
  };

  if (fieldErrors.length > 0) {
    return {
      fieldErrors,
      ok: false,
      placementId,
      providerId,
      providerName: getOptionalStringFormValue(formData, "providerName"),
    };
  }

  return {
    input,
    ok: true,
  };
}

function buildActionError(input: {
  action: AdminSponsorPlacementAction;
  fieldErrors: AdminSponsorPlacementFieldError[];
  formData: FormData;
  placementId?: string;
  providerId?: string;
  providerName?: string;
}): AdminSponsorPlacementActionResult {
  return {
    action: input.action,
    fieldErrors: input.fieldErrors,
    ok: false,
    placementId:
      input.placementId ??
      getOptionalStringFormValue(input.formData, "placementId"),
    providerId:
      input.providerId ??
      getOptionalStringFormValue(input.formData, "providerId"),
    providerName:
      input.providerName ??
      getOptionalStringFormValue(input.formData, "providerName"),
    submittedValues: collectSubmittedValues(input.formData),
  };
}

function toSponsorPlacementFeedback(
  result: AdminSponsorPlacementActionResult,
): AdminSponsorPlacementFeedback {
  const feedback: AdminSponsorPlacementFeedback = {
    ...result,
  };

  if (!feedback.ok && feedback.fieldErrors.length === 0) {
    feedback.formError =
      "No pudimos guardar la acción de patrocinio. Revisa los datos o intenta nuevamente.";
  }

  return feedback;
}

function getSponsorPlacementMutationFieldErrors(
  error: unknown,
): AdminSponsorPlacementFieldError[] {
  return getMutationFieldErrors(error);
}

function getSuccessTitle(action: AdminSponsorPlacementAction) {
  if (action === "detach_sponsor_placement") {
    return "Patrocinio retirado";
  }

  return action === "update_sponsor_placement"
    ? "Patrocinio actualizado"
    : "Patrocinio creado";
}

function getSuccessBody(action: AdminSponsorPlacementAction) {
  if (action === "detach_sponsor_placement") {
    return "el patrocinio ya no aparece en superficies de recursos.";
  }

  return action === "update_sponsor_placement"
    ? "la superficie, fechas y disclosure quedaron actualizados."
    : "el patrocinio quedó etiquetado sin afectar recuperación ni push.";
}

function getActionFormValue(
  formData: FormData,
): AdminSponsorPlacementAction | null {
  const value = getStringFormValue(formData, "sponsorAction");

  return value === "create_sponsor_placement" ||
    value === "update_sponsor_placement" ||
    value === "detach_sponsor_placement"
    ? value
    : null;
}

function getActionSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
): AdminSponsorPlacementAction | null {
  const value = getSingleSearchParam(searchParams, "accion");

  return value === "create_sponsor_placement" ||
    value === "update_sponsor_placement" ||
    value === "detach_sponsor_placement"
    ? value
    : null;
}

function getSingleSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  return typeof value === "string" ? value : undefined;
}

function getRequiredStringFormValue(
  formData: FormData,
  key: string,
  fieldErrors: AdminSponsorPlacementFieldError[],
) {
  const value = getOptionalStringFormValue(formData, key);

  if (!value) {
    fieldErrors.push({ field: key, message: requiredFieldMessage });
    return "";
  }

  return value;
}

function collectSubmittedValues(formData: FormData) {
  const values: AdminSponsorPlacementSubmittedValues = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      values[key] = value;
    }
  }

  return values;
}

function getRequiredDateOnlyFormValue(
  formData: FormData,
  key: string,
  fieldErrors: AdminSponsorPlacementFieldError[],
) {
  const value = getRequiredStringFormValue(formData, key, fieldErrors);

  if (!value) {
    return "";
  }

  if (!isValidDateOnly(value)) {
    fieldErrors.push({
      field: key,
      message: "Ingresa una fecha válida en formato AAAA-MM-DD.",
    });
    return "";
  }

  return value;
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
  );
}

function getSponsorSurfaceFormValue(
  formData: FormData,
  fieldErrors: AdminSponsorPlacementFieldError[],
): AdminSponsorPlacementSurface | null {
  const value = getStringFormValue(formData, "surface");

  if (
    adminSponsorPlacementSurfaceOptions.some((option) => option.id === value)
  ) {
    return value as AdminSponsorPlacementSurface;
  }

  fieldErrors.push({
    field: "surface",
    message: "Selecciona una superficie válida.",
  });
  return null;
}

function getStringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : null;
}

function getOptionalStringFormValue(formData: FormData, key: string) {
  const value = getStringFormValue(formData, key);
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed;
}
