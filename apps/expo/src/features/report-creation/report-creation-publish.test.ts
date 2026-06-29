import { describe, expect, it, vi } from "vitest";

import {
  getReportCreationPublishFailureMessage,
  publishReportCreation,
} from "./report-creation-publish";

describe("publishReportCreation", () => {
  it("keeps the draft and returns a retryable Spanish error when no publish handler exists", async () => {
    const clearDraft = vi.fn();

    const result = await publishReportCreation({
      clearDraft,
      input: { reportKind: "sighting" },
      publishHandler: undefined,
    });

    expect(result).toEqual({
      message:
        "No pudimos publicar porque el servicio no esta disponible. Tu borrador sigue aqui para intentar de nuevo.",
      ok: false,
      reason: "missing-handler",
    });
    expect(clearDraft).not.toHaveBeenCalled();
  });

  it("keeps the draft and returns a retryable Spanish error when publishing fails", async () => {
    const clearDraft = vi.fn();
    const publishHandler = vi.fn(() =>
      Promise.reject(new Error("backend unavailable")),
    );

    const result = await publishReportCreation({
      clearDraft,
      input: { reportKind: "lost" },
      publishHandler,
    });

    expect(result).toEqual({
      message:
        "No pudimos publicar. Tu borrador sigue aqui para intentar de nuevo.",
      ok: false,
      reason: "failed",
    });
    expect(clearDraft).not.toHaveBeenCalled();
  });

  it("ignores duplicate attempts while a publish is already pending", async () => {
    const clearDraft = vi.fn();
    const publishLock = { current: false };
    let resolvePublish: (() => void) | undefined;
    const publishHandler = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePublish = resolve;
        }),
    );

    const firstAttempt = publishReportCreation({
      clearDraft,
      input: { reportKind: "found" },
      publishHandler,
      publishLock,
    });
    const duplicateAttempt = publishReportCreation({
      clearDraft,
      input: { reportKind: "found" },
      publishHandler,
      publishLock,
    });

    await Promise.resolve();

    expect(publishHandler).toHaveBeenCalledTimes(1);
    await expect(duplicateAttempt).resolves.toEqual({
      ok: false,
      reason: "already-publishing",
    });
    expect(clearDraft).not.toHaveBeenCalled();

    resolvePublish?.();
    await expect(firstAttempt).resolves.toEqual({ ok: true });
    expect(clearDraft).toHaveBeenCalledTimes(1);
    expect(publishLock.current).toBe(false);
  });

  it("clears the draft only after the publish handler resolves", async () => {
    const clearDraft = vi.fn();
    let resolvePublish: (() => void) | undefined;
    const publishHandler = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePublish = resolve;
        }),
    );

    const result = publishReportCreation({
      clearDraft,
      input: { reportKind: "adoption" },
      publishHandler,
    });

    await Promise.resolve();

    expect(clearDraft).not.toHaveBeenCalled();

    resolvePublish?.();

    await expect(result).resolves.toEqual({ ok: true });
    expect(clearDraft).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      { data: { code: "UNAUTHORIZED" }, message: "session expired" },
      "Inicia sesion de nuevo para publicar. Tu borrador sigue aqui.",
    ],
    [
      {
        data: { code: "PRECONDITION_FAILED" },
        message: "Verified email is required.",
      },
      "Verifica tu email antes de publicar en Rastro. Tu borrador sigue aqui para intentarlo despues.",
    ],
    [
      {
        data: { code: "PRECONDITION_FAILED" },
        message: "member is suspended",
      },
      "Tu cuenta esta suspendida y no puede publicar en Rastro. Conservamos tu borrador mientras revisas tu estado.",
    ],
    [
      {
        data: { code: "BAD_REQUEST" },
        message: "media must be ready and owned by member",
      },
      "Termina de subir y confirmar las fotos antes de publicar. Tu borrador sigue aqui.",
    ],
    [
      { data: { code: "BAD_REQUEST" }, message: "validation failed" },
      "El backend rechazo datos del borrador. Revisa la informacion marcada y vuelve a intentarlo.",
    ],
    [
      { data: { code: "NOT_FOUND" }, message: "resource not found" },
      "No encontramos un recurso necesario para publicar. Tu borrador sigue aqui para intentarlo de nuevo.",
    ],
    [
      { data: { code: "FORBIDDEN" }, message: "forbidden" },
      "No tienes permiso para publicar este reporte. Tu borrador sigue aqui.",
    ],
  ])(
    "maps backend publish failure %j to Spanish draft-safe copy",
    (error, message) => {
      expect(getReportCreationPublishFailureMessage(error)).toBe(message);
    },
  );
});
