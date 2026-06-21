const reportCreationPublishUnavailableMessage =
  "No pudimos publicar porque el servicio no esta disponible. Tu borrador sigue aqui para intentar de nuevo.";
const reportCreationPublishFailedMessage =
  "No pudimos publicar. Tu borrador sigue aqui para intentar de nuevo.";

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
  } catch {
    return {
      message: reportCreationPublishFailedMessage,
      ok: false,
      reason: "failed",
    };
  } finally {
    if (publishLock) {
      publishLock.current = false;
    }
  }
}
