import type { AdminResourceProviderFormFieldError } from "./admin-resource-provider-form-parser";
import {
  attachAdminResourceProviderSponsor,
  createAdminResourceProvider,
  deleteAdminResourceProvider,
  detachAdminResourceProviderSponsor,
  updateAdminResourceProvider,
  updateAdminResourceProviderVerification,
} from "./admin-resource-provider-api-adapter";
import {
  parseArchiveProviderInput,
  parseAttachSponsorInput,
  parseCreateProviderInput,
  parseDetachSponsorInput,
  parseUpdateProviderInput,
  parseVerificationInput,
} from "./admin-resource-provider-form-parser";

export type AdminResourceProviderWorkflow =
  | "create"
  | "edit"
  | "verification"
  | "sponsor"
  | "archive";

export type AdminResourceProviderAction =
  | "create_provider"
  | "update_provider_details"
  | "update_verification"
  | "attach_sponsor"
  | "detach_sponsor"
  | "archive_provider";

export interface AdminResourceProviderActionResult {
  action: AdminResourceProviderAction;
  fieldErrors: AdminResourceProviderFormFieldError[];
  ok: boolean;
  providerId?: string;
  providerName?: string;
  submittedValues?: AdminResourceProviderSubmittedValues;
  workflow: AdminResourceProviderWorkflow;
}

export interface AdminResourceProviderWorkflowFeedback
  extends AdminResourceProviderActionResult {
  formError?: string;
}

export type AdminResourceProviderSubmittedValues = Record<string, string>;

export interface AdminResourceProviderActionState {
  feedback?: AdminResourceProviderWorkflowFeedback;
}

export type AdminResourceProviderFormAction = (
  state: AdminResourceProviderActionState,
  formData: FormData,
) => Promise<AdminResourceProviderActionState>;

export interface AdminResourceProviderMutationNotice {
  body: string;
  title: string;
  tone: "error" | "success";
}

type ParsedAdminResourceProviderMutation =
  | {
      mutation: () => Promise<unknown>;
      ok: true;
      providerId?: string;
      providerName?: string;
    }
  | {
      fieldErrors: AdminResourceProviderFormFieldError[];
      ok: false;
      providerId?: string;
      providerName?: string;
    };

type AdminResourceProviderActionHandler = (
  formData: FormData,
) => ParsedAdminResourceProviderMutation;

const actionWorkflows = {
  archive_provider: "archive",
  attach_sponsor: "sponsor",
  create_provider: "create",
  detach_sponsor: "sponsor",
  update_provider_details: "edit",
  update_verification: "verification",
} as const satisfies Record<
  AdminResourceProviderAction,
  AdminResourceProviderWorkflow
>;

const actionHandlers = {
  archive_provider: buildArchiveProviderMutation,
  attach_sponsor: buildAttachSponsorMutation,
  create_provider: buildCreateProviderMutation,
  detach_sponsor: buildDetachSponsorMutation,
  update_provider_details: buildUpdateProviderMutation,
  update_verification: buildVerificationMutation,
} as const satisfies Record<
  AdminResourceProviderAction,
  AdminResourceProviderActionHandler
>;

export async function applyAdminResourceProviderAction(
  formData: FormData,
): Promise<AdminResourceProviderActionResult> {
  const action = getActionFormValue(formData);

  if (!action) {
    return buildActionError({
      action: "create_provider",
      fieldErrors: [],
      formData,
    });
  }

  const parsed = actionHandlers[action](formData);

  if (!parsed.ok) {
    return buildActionError({
      action,
      fieldErrors: parsed.fieldErrors,
      formData,
      providerId: parsed.providerId,
      providerName: parsed.providerName,
    });
  }

  return applyApiAction({
    action,
    formData,
    mutation: parsed.mutation,
    providerId: parsed.providerId,
    providerName: parsed.providerName,
  });
}

function buildCreateProviderMutation(
  formData: FormData,
): ParsedAdminResourceProviderMutation {
  const result = parseCreateProviderInput(formData);
  const providerName = result.ok
    ? result.input.name
    : getOptionalStringFormValue(formData, "name");

  if (!result.ok) {
    return {
      fieldErrors: result.fieldErrors,
      ok: false,
      providerName,
    };
  }

  return {
    mutation: () => createAdminResourceProvider(result.input),
    ok: true,
    providerName,
  };
}

function buildUpdateProviderMutation(
  formData: FormData,
): ParsedAdminResourceProviderMutation {
  const result = parseUpdateProviderInput(formData);
  const providerId = getOptionalStringFormValue(formData, "providerId");
  const providerName = result.ok
    ? result.input.name
    : getProviderNameFormValue(formData);

  if (!result.ok) {
    return buildParsedActionError(result.fieldErrors, {
      providerId,
      providerName,
    });
  }

  return {
    mutation: () => updateAdminResourceProvider(result.input),
    ok: true,
    providerId: result.input.providerId,
    providerName,
  };
}

function buildVerificationMutation(
  formData: FormData,
): ParsedAdminResourceProviderMutation {
  const result = parseVerificationInput(formData);

  return result.ok
    ? {
        mutation: () => updateAdminResourceProviderVerification(result.input),
        ok: true,
        providerId: result.input.providerId,
        providerName: getProviderNameFormValue(formData),
      }
    : buildParsedActionError(result.fieldErrors, getProviderIdentity(formData));
}

function buildAttachSponsorMutation(
  formData: FormData,
): ParsedAdminResourceProviderMutation {
  const result = parseAttachSponsorInput(formData);

  return result.ok
    ? {
        mutation: () => attachAdminResourceProviderSponsor(result.input),
        ok: true,
        providerId: result.input.providerId,
        providerName: getProviderNameFormValue(formData),
      }
    : buildParsedActionError(result.fieldErrors, getProviderIdentity(formData));
}

function buildDetachSponsorMutation(
  formData: FormData,
): ParsedAdminResourceProviderMutation {
  const result = parseDetachSponsorInput(formData);

  return result.ok
    ? {
        mutation: () => detachAdminResourceProviderSponsor(result.input),
        ok: true,
        providerId: result.input.providerId,
        providerName: getProviderNameFormValue(formData),
      }
    : buildParsedActionError(result.fieldErrors, getProviderIdentity(formData));
}

function buildArchiveProviderMutation(
  formData: FormData,
): ParsedAdminResourceProviderMutation {
  const result = parseArchiveProviderInput(formData);

  return result.ok
    ? {
        mutation: () => deleteAdminResourceProvider(result.input),
        ok: true,
        providerId: result.input.providerId,
        providerName: getProviderNameFormValue(formData),
      }
    : buildParsedActionError(result.fieldErrors, getProviderIdentity(formData));
}

export function buildAdminResourceProviderRedirectUrl(
  result: AdminResourceProviderActionResult,
) {
  const params = new URLSearchParams({
    accion: result.action,
    estado: result.ok ? "ok" : "error",
    flujo: result.workflow,
  });

  if (result.providerId) {
    params.set("providerId", result.providerId);
  }

  if (result.providerName) {
    params.set("providerName", result.providerName);
  }

  return `/admin/proveedores?${params.toString()}`;
}

export function buildAdminResourceProviderActionState(
  result: AdminResourceProviderActionResult,
): AdminResourceProviderActionState {
  return {
    feedback: toWorkflowFeedback(result),
  };
}

export function buildAdminResourceProviderWorkflowFeedback(
  searchParams: Record<string, string | string[] | undefined>,
): AdminResourceProviderWorkflowFeedback | undefined {
  const status = getSingleSearchParam(searchParams, "estado");
  const action = getActionSearchParam(searchParams);
  const workflow = getWorkflowSearchParam(searchParams);

  if ((status !== "ok" && status !== "error") || !action || !workflow) {
    return undefined;
  }

  const feedback: AdminResourceProviderWorkflowFeedback = {
    action,
    fieldErrors: [],
    ok: status === "ok",
    providerId: getSingleSearchParam(searchParams, "providerId"),
    providerName: getSingleSearchParam(searchParams, "providerName"),
    workflow,
  };

  if (!feedback.ok) {
    feedback.formError =
      "No pudimos guardar la acción en la base de datos. Revisa los datos o intenta nuevamente.";
  }

  return feedback;
}

export function buildAdminResourceProviderMutationNotice(
  feedback: AdminResourceProviderWorkflowFeedback | undefined,
): AdminResourceProviderMutationNotice | undefined {
  if (!feedback) {
    return undefined;
  }

  const providerName = feedback.providerName ?? "este proveedor";
  const actionLabel = getActionLabel(feedback.action);

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
        ? `${providerName}: corrige los campos marcados para ${actionLabel}.`
        : `${providerName}: no se pudo completar ${actionLabel}.`,
    title:
      feedback.fieldErrors.length > 0
        ? "Revisa los campos"
        : "No se guardaron los cambios",
    tone: "error",
  };
}

async function applyApiAction(input: {
  action: AdminResourceProviderAction;
  formData: FormData;
  mutation: () => Promise<unknown>;
  providerId?: string;
  providerName?: string;
}): Promise<AdminResourceProviderActionResult> {
  try {
    await input.mutation();
    return {
      action: input.action,
      fieldErrors: [],
      ok: true,
      providerId: input.providerId,
      providerName:
        input.providerName ?? getProviderNameFormValue(input.formData),
      workflow: actionWorkflows[input.action],
    };
  } catch (error) {
    console.error("Admin resource provider mutation failed.", error);
    return buildActionError({
      action: input.action,
      fieldErrors: [],
      formData: input.formData,
      providerId: input.providerId,
      providerName: input.providerName,
    });
  }
}

function buildActionError(input: {
  action: AdminResourceProviderAction;
  fieldErrors: AdminResourceProviderFormFieldError[];
  formData: FormData;
  providerId?: string;
  providerName?: string;
}): AdminResourceProviderActionResult {
  return {
    action: input.action,
    fieldErrors: input.fieldErrors,
    ok: false,
    providerId:
      input.providerId ??
      getOptionalStringFormValue(input.formData, "providerId"),
    providerName:
      input.providerName ?? getProviderNameFormValue(input.formData),
    submittedValues: collectSubmittedValues(input.formData),
    workflow: actionWorkflows[input.action],
  };
}

function toWorkflowFeedback(
  result: AdminResourceProviderActionResult,
): AdminResourceProviderWorkflowFeedback {
  const feedback: AdminResourceProviderWorkflowFeedback = {
    ...result,
  };

  if (!feedback.ok && feedback.fieldErrors.length === 0) {
    feedback.formError =
      "No pudimos guardar la acción en la base de datos. Revisa los datos o intenta nuevamente.";
  }

  return feedback;
}

function buildParsedActionError(
  fieldErrors: AdminResourceProviderFormFieldError[],
  provider: { providerId?: string; providerName?: string },
): ParsedAdminResourceProviderMutation {
  return {
    fieldErrors,
    ok: false,
    providerId: provider.providerId,
    providerName: provider.providerName,
  };
}

function getProviderIdentity(formData: FormData) {
  return {
    providerId: getOptionalStringFormValue(formData, "providerId"),
    providerName: getProviderNameFormValue(formData),
  };
}

function getActionFormValue(
  formData: FormData,
): AdminResourceProviderAction | null {
  const value = getOptionalStringFormValue(formData, "resourceAction");

  return isAdminResourceProviderAction(value) ? value : null;
}

function getActionSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
): AdminResourceProviderAction | null {
  const value = getSingleSearchParam(searchParams, "accion");

  return isAdminResourceProviderAction(value) ? value : null;
}

function getWorkflowSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
): AdminResourceProviderWorkflow | null {
  const value = getSingleSearchParam(searchParams, "flujo");

  return isAdminResourceProviderWorkflow(value) ? value : null;
}

function isAdminResourceProviderAction(
  value: string | undefined,
): value is AdminResourceProviderAction {
  return (
    value === "archive_provider" ||
    value === "attach_sponsor" ||
    value === "create_provider" ||
    value === "detach_sponsor" ||
    value === "update_provider_details" ||
    value === "update_verification"
  );
}

function isAdminResourceProviderWorkflow(
  value: string | undefined,
): value is AdminResourceProviderWorkflow {
  return (
    value === "archive" ||
    value === "create" ||
    value === "edit" ||
    value === "sponsor" ||
    value === "verification"
  );
}

function getProviderNameFormValue(formData: FormData) {
  return (
    getOptionalStringFormValue(formData, "providerName") ??
    getOptionalStringFormValue(formData, "name")
  );
}

function collectSubmittedValues(formData: FormData) {
  const values: AdminResourceProviderSubmittedValues = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      values[key] = value;
    }
  }

  return values;
}

function getOptionalStringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  const trimmed = typeof value === "string" ? value.trim() : "";

  return trimmed.length > 0 ? trimmed : undefined;
}

function getSingleSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];

  return Array.isArray(value) ? value[0] : value;
}

function getActionLabel(action: AdminResourceProviderAction) {
  if (action === "create_provider") {
    return "registrar proveedor";
  }

  if (action === "update_provider_details") {
    return "editar detalles";
  }

  if (action === "update_verification") {
    return "actualizar verificación";
  }

  if (action === "attach_sponsor") {
    return "adjuntar patrocinio";
  }

  if (action === "detach_sponsor") {
    return "retirar patrocinio";
  }

  return "archivar proveedor";
}

function getSuccessTitle(action: AdminResourceProviderAction) {
  if (action === "create_provider") {
    return "Proveedor registrado";
  }

  if (action === "update_provider_details") {
    return "Detalles actualizados";
  }

  if (action === "update_verification") {
    return "Verificación actualizada";
  }

  if (action === "attach_sponsor") {
    return "Patrocinio adjuntado";
  }

  if (action === "detach_sponsor") {
    return "Patrocinio retirado";
  }

  return "Proveedor archivado";
}

function getSuccessBody(action: AdminResourceProviderAction) {
  if (action === "create_provider") {
    return "el proveedor fue creado y queda disponible para gestión administrativa.";
  }

  if (action === "update_provider_details") {
    return "los detalles del proveedor fueron actualizados.";
  }

  if (action === "update_verification") {
    return "la verificación de identidad fue actualizada con su nota.";
  }

  if (action === "attach_sponsor") {
    return "el patrocinio local fue adjuntado sin cambiar prioridad ni alertas.";
  }

  if (action === "detach_sponsor") {
    return "el patrocinio local fue retirado.";
  }

  return "el proveedor fue archivado.";
}
