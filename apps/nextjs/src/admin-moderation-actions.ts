import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type {
  AdminModerationNotice,
  AdminModerationTargetType,
} from "./admin-moderation-dashboard";
import { buildAdminModerationViewer } from "./admin-moderation-access";
import {
  hideAdminReportTarget,
  markFalseReportTarget,
  restoreAdminReportTarget,
  unmarkFalseReportTarget,
} from "./admin-report-moderation-api-adapter";
import { resolveResourceProviderReviewItem } from "./admin-resource-provider-moderation-api-adapter";
import { getSession } from "./auth/server";
import { env } from "./env";

export type AdminModerationActionName =
  | "hide_target"
  | "mark_false_report"
  | "resolve_provider_review"
  | "restore_target"
  | "unmark_false_report";

export interface AdminModerationFeedback {
  action: AdminModerationActionName;
  errorReason?: "confirmation" | "mutation" | "invalid";
  ok: boolean;
  targetTitle?: string;
}

type ParsedAdminModerationAction =
  | ParsedAdminReportModerationAction
  | ParsedAdminResourceProviderResolutionAction;

interface ParsedAdminModerationActionBase {
  action: AdminModerationActionName;
  confirmed: boolean;
  note?: string;
  reason: string;
  returnTo: string;
  reviewItemId?: string;
  targetTitle?: string;
}

interface ParsedAdminReportModerationAction
  extends ParsedAdminModerationActionBase {
  action:
    | "hide_target"
    | "mark_false_report"
    | "restore_target"
    | "unmark_false_report";
  targetId: string;
  targetType: ReportAdminModerationTargetType;
}

interface ParsedAdminResourceProviderResolutionAction
  extends ParsedAdminModerationActionBase {
  action: "resolve_provider_review";
  providerResolutionStatus: AdminResourceProviderResolutionStatus;
  reviewItemId: string;
}

type AdminResourceProviderResolutionStatus =
  | "dismissed_false_report"
  | "resolved_action_taken"
  | "resolved_no_action";

export async function applyAdminModerationForm(formData: FormData) {
  "use server";

  const session = await getSession();
  const viewer = buildAdminModerationViewer(session, env.RASTRO_ADMIN_EMAILS);

  if (viewer.modelViewer.role !== "admin") {
    return;
  }

  const action = parseAdminReportModerationAction(formData);

  if (!action) {
    redirect(
      buildAdminModerationRedirectUrl({
        action: "hide_target",
        errorReason: "invalid",
        ok: false,
        returnTo: getSafeReturnTo(getStringFormValue(formData, "returnTo")),
        targetTitle: getOptionalStringFormValue(formData, "targetTitle"),
      }),
    );
  }

  if (!action.confirmed) {
    redirect(
      buildAdminModerationRedirectUrl({
        action: action.action,
        errorReason: "confirmation",
        ok: false,
        returnTo: action.returnTo,
        targetTitle: action.targetTitle,
      }),
    );
  }

  const result = await applyPersistedModerationAction(action);

  if (result.ok) {
    revalidatePath("/admin/moderacion");
    revalidatePath("/admin/auditoria");

    if (action.reviewItemId) {
      revalidatePath(`/admin/moderacion/${action.reviewItemId}`);
    }

    if (action.action === "resolve_provider_review") {
      revalidatePath("/admin/proveedores");
    } else {
      revalidatePath("/admin/miembros");
    }
  }

  redirect(
    buildAdminModerationRedirectUrl({
      action: action.action,
      errorReason: result.ok ? undefined : "mutation",
      ok: result.ok,
      returnTo: action.returnTo,
      targetTitle: action.targetTitle,
    }),
  );
}

export function buildAdminModerationFeedback(
  searchParams: Record<string, string | string[] | undefined>,
): AdminModerationFeedback | undefined {
  const status = getSingleSearchParam(searchParams, "estado");
  const action = getActionSearchParam(searchParams);

  if ((status !== "ok" && status !== "error") || !action) {
    return undefined;
  }

  return {
    action,
    errorReason: getErrorReasonSearchParam(searchParams),
    ok: status === "ok",
    targetTitle: getSingleSearchParam(searchParams, "objetivo"),
  };
}

export function buildAdminModerationNotice(
  feedback: AdminModerationFeedback | undefined,
): AdminModerationNotice | undefined {
  if (!feedback) {
    return undefined;
  }

  const targetTitle = feedback.targetTitle ?? "el contenido seleccionado";

  if (feedback.ok) {
    const successCopy = getAdminModerationSuccessCopy(
      feedback.action,
      targetTitle,
    );

    return {
      body: successCopy.body,
      title: successCopy.title,
      tone: "success",
    };
  }

  if (feedback.errorReason === "confirmation") {
    return {
      body: `Marca la confirmación antes de aplicar una decisión sobre ${targetTitle}.`,
      title: "Confirmación requerida",
      tone: "error",
    };
  }

  return {
    body: `No se pudo aplicar la decisión sobre ${targetTitle}. Revisa la cola e inténtalo de nuevo.`,
    title: "No se guardó la decisión",
    tone: "error",
  };
}

function getAdminModerationSuccessCopy(
  action: AdminModerationActionName,
  targetTitle: string,
) {
  switch (action) {
    case "hide_target":
      return {
        body: `${targetTitle} quedó oculto y la cola mostrará el nuevo estado al recargar.`,
        title: "Contenido ocultado",
      };
    case "mark_false_report":
      return {
        body: `${targetTitle} quedó marcado como reporte falso y salió de superficies públicas.`,
        title: "Reporte falso marcado",
      };
    case "resolve_provider_review":
      return {
        body: `La revisión de ${targetTitle} quedó resuelta y auditada.`,
        title: "Revisión de proveedor resuelta",
      };
    case "restore_target":
      return {
        body: `${targetTitle} quedó restaurado y vuelve a usar las reglas públicas normales.`,
        title: "Contenido restaurado",
      };
    case "unmark_false_report":
      return {
        body: `${targetTitle} ya no está marcado como reporte falso.`,
        title: "Marca falsa revertida",
      };
  }
}

function parseAdminReportModerationAction(
  formData: FormData,
): ParsedAdminModerationAction | null {
  const action = getActionFormValue(formData);

  if (!action) {
    return null;
  }

  if (action === "resolve_provider_review") {
    return parseAdminResourceProviderResolutionAction(formData);
  }

  const targetId = getStringFormValue(formData, "targetId");
  const targetType = getReportTargetType(
    getStringFormValue(formData, "targetType"),
  );
  const reason =
    getStringFormValue(formData, "moderationReason") ?? "admin_review";

  if (!targetId || !targetType) {
    return null;
  }

  return {
    action,
    confirmed: getStringFormValue(formData, "confirmModerationAction") === "on",
    note: getOptionalStringFormValue(formData, "moderationNote"),
    reason,
    returnTo: getSafeReturnTo(getStringFormValue(formData, "returnTo")),
    reviewItemId: getOptionalStringFormValue(formData, "reviewItemId"),
    targetId,
    targetTitle: getOptionalStringFormValue(formData, "targetTitle"),
    targetType,
  };
}

function parseAdminResourceProviderResolutionAction(
  formData: FormData,
): ParsedAdminResourceProviderResolutionAction | null {
  const reviewItemId = getOptionalStringFormValue(formData, "reviewItemId");
  const providerResolutionStatus =
    getProviderResolutionStatusFormValue(formData);
  const reason =
    getOptionalStringFormValue(formData, "providerResolutionReason") ??
    "admin_review";

  if (!reviewItemId || !providerResolutionStatus) {
    return null;
  }

  return {
    action: "resolve_provider_review",
    confirmed: getStringFormValue(formData, "confirmModerationAction") === "on",
    note: getOptionalStringFormValue(formData, "providerResolutionNote"),
    providerResolutionStatus,
    reason,
    returnTo: getSafeReturnTo(getStringFormValue(formData, "returnTo")),
    reviewItemId,
    targetTitle: getOptionalStringFormValue(formData, "targetTitle"),
  };
}

async function applyPersistedModerationAction(
  action: ParsedAdminModerationAction,
) {
  try {
    switch (action.action) {
      case "hide_target":
        await hideAdminReportTarget({
          note: action.note,
          reason: action.reason,
          reportId: action.targetId,
        });
        break;
      case "mark_false_report":
        await markFalseReportTarget({
          note: action.note,
          reason: action.reason,
          reportId: action.targetId,
        });
        break;
      case "resolve_provider_review":
        await resolveResourceProviderReviewItem({
          resolutionNote: action.note,
          resolutionReason: action.reason,
          reviewItemId: action.reviewItemId,
          status: action.providerResolutionStatus,
        });
        break;
      case "restore_target":
        await restoreAdminReportTarget({
          note: action.note,
          reason: action.reason,
          reportId: action.targetId,
        });
        break;
      case "unmark_false_report":
        await unmarkFalseReportTarget({
          note: action.note,
          reason: action.reason,
          reportId: action.targetId,
        });
        break;
    }

    return { ok: true };
  } catch (error) {
    console.error("Admin moderation mutation failed.", error);

    return { ok: false };
  }
}

function buildAdminModerationRedirectUrl(input: {
  action: AdminModerationActionName;
  errorReason?: AdminModerationFeedback["errorReason"];
  ok: boolean;
  returnTo: string;
  targetTitle?: string;
}) {
  const url = new URL(input.returnTo, "http://rastro.local");
  url.searchParams.delete("accion");
  url.searchParams.delete("estado");
  url.searchParams.delete("error");
  url.searchParams.delete("objetivo");
  url.searchParams.set("accion", input.action);
  url.searchParams.set("estado", input.ok ? "ok" : "error");

  if (input.errorReason) {
    url.searchParams.set("error", input.errorReason);
  }

  if (input.targetTitle) {
    url.searchParams.set("objetivo", input.targetTitle);
  }

  return `${url.pathname}?${url.searchParams.toString()}`;
}

function getSafeReturnTo(value: string | null) {
  if (!value || value.startsWith("//")) {
    return "/admin/moderacion";
  }

  const url = new URL(value, "http://rastro.local");

  if (
    url.pathname !== "/admin/moderacion" &&
    !url.pathname.startsWith("/admin/moderacion/")
  ) {
    return "/admin/moderacion";
  }

  return `${url.pathname}${url.search}`;
}

function getActionFormValue(
  formData: FormData,
): AdminModerationActionName | null {
  const value = getStringFormValue(formData, "moderationAction");

  return isAdminModerationActionName(value) ? value : null;
}

function getActionSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
): AdminModerationActionName | null {
  const value = getSingleSearchParam(searchParams, "accion");

  return isAdminModerationActionName(value) ? value : null;
}

function isAdminModerationActionName(
  value: string | null | undefined,
): value is AdminModerationActionName {
  return (
    value === "hide_target" ||
    value === "mark_false_report" ||
    value === "resolve_provider_review" ||
    value === "restore_target" ||
    value === "unmark_false_report"
  );
}

function getProviderResolutionStatusFormValue(
  formData: FormData,
): AdminResourceProviderResolutionStatus | null {
  const value = getStringFormValue(formData, "providerResolutionStatus");

  return value === "dismissed_false_report" ||
    value === "resolved_action_taken" ||
    value === "resolved_no_action"
    ? value
    : null;
}

function getErrorReasonSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
): AdminModerationFeedback["errorReason"] | undefined {
  const value = getSingleSearchParam(searchParams, "error");

  return value === "confirmation" || value === "mutation" || value === "invalid"
    ? value
    : undefined;
}

function getStringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : null;
}

function getOptionalStringFormValue(formData: FormData, key: string) {
  const value = getStringFormValue(formData, key)?.trim();

  return value && value.length > 0 ? value : undefined;
}

function getSingleSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0] ?? undefined;
  }

  return value;
}

function getReportTargetType(
  targetType: string | null,
): ReportAdminModerationTargetType | null {
  if (
    targetType === "adoption_listing" ||
    targetType === "found_pet_report" ||
    targetType === "lost_pet_report" ||
    targetType === "sighting_report"
  ) {
    return targetType;
  }

  return null;
}

type ReportAdminModerationTargetType = Extract<
  AdminModerationTargetType,
  | "adoption_listing"
  | "found_pet_report"
  | "lost_pet_report"
  | "sighting_report"
>;
