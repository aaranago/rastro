import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type {
  AdminModerationNotice,
  AdminModerationTargetType,
} from "./admin-moderation-dashboard";
import { buildAdminModerationViewer } from "./admin-moderation-access";
import {
  hideAdminReportTarget,
  restoreAdminReportTarget,
} from "./admin-report-moderation-api-adapter";
import { getSession } from "./auth/server";
import { env } from "./env";

export type AdminModerationActionName = "hide_target" | "restore_target";

export interface AdminModerationFeedback {
  action: AdminModerationActionName;
  errorReason?: "confirmation" | "mutation" | "invalid";
  ok: boolean;
  targetTitle?: string;
}

interface ParsedAdminModerationAction {
  action: AdminModerationActionName;
  confirmed: boolean;
  note?: string;
  reason: string;
  returnTo: string;
  reviewItemId?: string;
  targetId: string;
  targetTitle?: string;
  targetType: HideableAdminModerationTargetType;
}

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

    if (action.reviewItemId) {
      revalidatePath(`/admin/moderacion/${action.reviewItemId}`);
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
    return {
      body:
        feedback.action === "hide_target"
          ? `${targetTitle} quedó oculto y la cola mostrará el nuevo estado al recargar.`
          : `${targetTitle} quedó restaurado y vuelve a usar las reglas públicas normales.`,
      title:
        feedback.action === "hide_target"
          ? "Contenido ocultado"
          : "Contenido restaurado",
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

function parseAdminReportModerationAction(
  formData: FormData,
): ParsedAdminModerationAction | null {
  const action = getActionFormValue(formData);

  if (!action) {
    return null;
  }

  const targetId = getStringFormValue(formData, "targetId");
  const targetType = getHideableTargetType(
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

async function applyPersistedModerationAction(
  action: ParsedAdminModerationAction,
) {
  try {
    if (action.action === "hide_target") {
      await hideAdminReportTarget({
        note: action.note,
        reason: action.reason,
        reportId: action.targetId,
      });
    } else {
      await restoreAdminReportTarget({
        note: action.note,
        reason: action.reason,
        reportId: action.targetId,
      });
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

  return value === "hide_target" || value === "restore_target" ? value : null;
}

function getActionSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
): AdminModerationActionName | null {
  const value = getSingleSearchParam(searchParams, "accion");

  return value === "hide_target" || value === "restore_target" ? value : null;
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

function getHideableTargetType(
  targetType: string | null,
): HideableAdminModerationTargetType | null {
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

type HideableAdminModerationTargetType = Extract<
  AdminModerationTargetType,
  "adoption_listing" | "found_pet_report" | "lost_pet_report" | "sighting_report"
>;
