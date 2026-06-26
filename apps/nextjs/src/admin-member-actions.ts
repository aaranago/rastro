import type { AdminMemberSuspensionInput } from "./admin-member-api-adapter";

export type AdminMemberWorkflow = "suspend" | "unsuspend";

export interface AdminMemberWorkflowFeedback {
  fieldErrors: {
    confirmation?: string;
    reason?: string;
  };
  formError?: string;
  memberId: string | null;
  status: "error" | "success";
  workflow: AdminMemberWorkflow | null;
}

export type AdminMemberActionResult =
  | {
      memberId: string;
      ok: true;
      workflow: AdminMemberWorkflow;
    }
  | {
      feedback: AdminMemberWorkflowFeedback;
      ok: false;
    };

export type PersistMemberSuspension = (
  input: AdminMemberSuspensionInput,
) => Promise<unknown>;

export function parseAdminMemberActionFormData(
  formData: FormData,
): AdminMemberActionResult {
  const workflow = getWorkflow(formData.get("memberAction"));
  const memberId = readString(formData, "memberId");
  const reason = readString(formData, "memberSuspensionReason");
  const fieldErrors: AdminMemberWorkflowFeedback["fieldErrors"] = {};

  if (!workflow || !memberId) {
    return {
      feedback: {
        fieldErrors,
        formError: "No pudimos identificar la accion solicitada.",
        memberId: memberId || null,
        status: "error",
        workflow,
      },
      ok: false,
    };
  }

  if (!reason) {
    fieldErrors.reason = "Ingresa un motivo para registrar la decision.";
  }

  if (
    workflow === "suspend" &&
    formData.get("confirmMemberSuspension") !== "on"
  ) {
    fieldErrors.confirmation =
      "Confirma que entiendes que el miembro no podra publicar.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      feedback: {
        fieldErrors,
        memberId,
        status: "error",
        workflow,
      },
      ok: false,
    };
  }

  return {
    memberId,
    ok: true,
    workflow,
  };
}

export async function applyAdminMemberAction(
  formData: FormData,
  persist: {
    suspend?: PersistMemberSuspension;
    unsuspend?: PersistMemberSuspension;
  } = {},
): Promise<AdminMemberActionResult> {
  const parsed = parseAdminMemberActionFormData(formData);

  if (!parsed.ok) {
    return parsed;
  }

  const reason = readString(formData, "memberSuspensionReason");

  try {
    if (parsed.workflow === "suspend") {
      const suspend =
        persist.suspend ??
        (await import("./admin-member-api-adapter")).suspendAdminMember;

      await suspend({
        memberId: parsed.memberId,
        reason,
      });
    } else {
      const unsuspend =
        persist.unsuspend ??
        (await import("./admin-member-api-adapter")).unsuspendAdminMember;

      await unsuspend({
        memberId: parsed.memberId,
        reason,
      });
    }

    return parsed;
  } catch (error) {
    console.error("Admin member mutation failed.", error);

    return {
      feedback: {
        fieldErrors: {},
        formError: "No pudimos guardar la decision. Intentalo nuevamente.",
        memberId: parsed.memberId,
        status: "error",
        workflow: parsed.workflow,
      },
      ok: false,
    };
  }
}

export function buildAdminMemberRedirectUrl(
  result: AdminMemberActionResult,
  searchQuery: string | null = null,
) {
  const memberId = result.ok ? result.memberId : result.feedback.memberId;
  const workflow = result.ok ? result.workflow : result.feedback.workflow;
  const params = new URLSearchParams();

  if (memberId) {
    params.set("memberId", memberId);
  }

  if (searchQuery) {
    params.set("q", searchQuery);
  }

  if (workflow) {
    params.set("workflow", workflow);
  }

  params.set("estado", result.ok ? "ok" : "error");

  if (!result.ok) {
    for (const [field, message] of Object.entries(
      result.feedback.fieldErrors,
    )) {
      params.set(`error_${field}`, message);
    }

    if (result.feedback.formError) {
      params.set("error_form", result.feedback.formError);
    }
  }

  return `/admin/miembros?${params.toString()}`;
}

export function buildAdminMemberWorkflowFeedback(
  searchParams: Record<string, string | string[] | undefined>,
): AdminMemberWorkflowFeedback | undefined {
  const status = getSingleSearchParam(searchParams, "estado");
  const workflow = getWorkflow(getSingleSearchParam(searchParams, "workflow"));

  if (status !== "ok" && status !== "error") {
    return undefined;
  }

  return {
    fieldErrors: {
      confirmation:
        getSingleSearchParam(searchParams, "error_confirmation") ?? undefined,
      reason: getSingleSearchParam(searchParams, "error_reason") ?? undefined,
    },
    formError: getSingleSearchParam(searchParams, "error_form") ?? undefined,
    memberId: getSingleSearchParam(searchParams, "memberId"),
    status: status === "ok" ? "success" : "error",
    workflow,
  };
}

function getWorkflow(value: FormDataEntryValue | string | null) {
  return value === "suspend" || value === "unsuspend" ? value : null;
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
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
