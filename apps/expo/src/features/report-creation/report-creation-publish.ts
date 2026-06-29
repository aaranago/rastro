const reportCreationPublishUnavailableMessage =
  "No pudimos publicar porque el servicio no esta disponible. Tu borrador sigue aqui para intentar de nuevo.";
const reportCreationPublishFailedMessage =
  "No pudimos publicar. Tu borrador sigue aqui para intentar de nuevo.";
const reportCreationPublishAuthRequiredMessage =
  "Inicia sesion de nuevo para publicar. Tu borrador sigue aqui.";
const reportCreationPublishVerifiedEmailRequiredMessage =
  "Verifica tu email antes de publicar en Rastro. Tu borrador sigue aqui para intentarlo despues.";
const reportCreationPublishSuspendedMemberMessage =
  "Tu cuenta esta suspendida y no puede publicar en Rastro. Conservamos tu borrador mientras revisas tu estado.";
const reportCreationPublishMediaReadinessMessage =
  "Termina de subir y confirmar las fotos antes de publicar. Tu borrador sigue aqui.";
const reportCreationPublishValidationMessage =
  "El backend rechazo datos del borrador. Revisa la informacion marcada y vuelve a intentarlo.";
const reportCreationPublishNotFoundMessage =
  "No encontramos un recurso necesario para publicar. Tu borrador sigue aqui para intentarlo de nuevo.";
const reportCreationPublishForbiddenMessage =
  "No tienes permiso para publicar este reporte. Tu borrador sigue aqui.";

export type ReportCreationPublishHandler<TInput, TConfirmation = void> = (
  input: TInput,
) => Promise<TConfirmation> | TConfirmation;

export type ReportCreationPublishResult<TConfirmation = unknown> =
  | {
      confirmation?: TConfirmation;
      ok: true;
    }
  | {
      message: string;
      ok: false;
      reason: "failed" | "missing-handler";
    }
  | {
      ok: false;
      reason: "already-publishing";
    };

export interface ReportCreationPublishLock {
  current: boolean;
}

export async function publishReportCreation<TInput, TConfirmation = void>({
  clearDraft,
  input,
  publishLock,
  publishHandler,
}: {
  clearDraft: () => Promise<void> | void;
  input: TInput;
  publishLock?: ReportCreationPublishLock;
  publishHandler?: ReportCreationPublishHandler<TInput, TConfirmation>;
}): Promise<ReportCreationPublishResult<TConfirmation>> {
  if (publishLock?.current) {
    return {
      ok: false,
      reason: "already-publishing",
    };
  }

  if (!publishHandler) {
    return {
      message: reportCreationPublishUnavailableMessage,
      ok: false,
      reason: "missing-handler",
    };
  }

  if (publishLock) {
    publishLock.current = true;
  }

  try {
    const confirmation = await publishHandler(input);
    await clearDraft();

    const maybeConfirmation: TConfirmation | undefined = confirmation;

    return maybeConfirmation === undefined
      ? { ok: true }
      : { confirmation: maybeConfirmation, ok: true };
  } catch (error) {
    return {
      message: getReportCreationPublishFailureMessage(error),
      ok: false,
      reason: "failed",
    };
  } finally {
    if (publishLock) {
      publishLock.current = false;
    }
  }
}

export function getReportCreationPublishFailureMessage(error: unknown) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);
  const normalizedMessage = message.toLowerCase();

  if (code === "UNAUTHORIZED") {
    return reportCreationPublishAuthRequiredMessage;
  }

  if (code === "FORBIDDEN") {
    return reportCreationPublishForbiddenMessage;
  }

  if (code === "NOT_FOUND") {
    return reportCreationPublishNotFoundMessage;
  }

  if (code === "PRECONDITION_FAILED") {
    if (normalizedMessage.includes("verified email")) {
      return reportCreationPublishVerifiedEmailRequiredMessage;
    }

    if (
      normalizedMessage.includes("suspend") ||
      normalizedMessage.includes("suspendido")
    ) {
      return reportCreationPublishSuspendedMemberMessage;
    }

    if (
      normalizedMessage.includes("media storage") ||
      normalizedMessage.includes("upload")
    ) {
      return reportCreationPublishMediaReadinessMessage;
    }
  }

  if (
    code === "BAD_REQUEST" &&
    (normalizedMessage.includes("media") ||
      normalizedMessage.includes("upload") ||
      normalizedMessage.includes("ready") ||
      normalizedMessage.includes("owned"))
  ) {
    return reportCreationPublishMediaReadinessMessage;
  }

  if (
    code === "BAD_REQUEST" ||
    normalizedMessage.includes("validation") ||
    normalizedMessage.includes("invalid")
  ) {
    return reportCreationPublishValidationMessage;
  }

  return reportCreationPublishFailedMessage;
}

function getErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  if (typeof error.code === "string") {
    return error.code;
  }

  const dataCode = getNestedString(error.data, "code");
  if (dataCode) {
    return dataCode;
  }

  const shapeCode = getNestedString(error.shape, "code");
  if (shapeCode) {
    return shapeCode;
  }

  return getErrorCode(error.cause);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return [
      error.message,
      getNestedMessage(error.cause),
      isRecord(error) ? getNestedMessage(error.data) : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return getNestedMessage(error);
}

function getNestedMessage(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (!isRecord(value)) {
    return "";
  }

  const message = typeof value.message === "string" ? value.message : "";
  const dataMessage = getNestedMessage(value.data);
  const causeMessage = getNestedMessage(value.cause);

  return [message, dataMessage, causeMessage].filter(Boolean).join(" ");
}

function getNestedString(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return typeof value[key] === "string" ? value[key] : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
