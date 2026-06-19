import { describe, expect, it } from "vitest";

import type { AsyncKeyValueStorage } from "./storage";
import { createRetryQueue, retryQueueStatusLabelsEs } from "./retry-queue";

describe("retry queue", () => {
  it("persists media upload and report submission retries by idempotency key with Spanish status labels", async () => {
    const storage = createMemoryStorage();
    const queue = createRetryQueue({ storage });

    await queue.enqueue({
      idempotencyKey: "media-upload:photo-1",
      operation: {
        kind: "media-upload",
        localUri: "file:///photo-1.jpg",
        mediaId: "photo-1",
      },
    });
    await queue.enqueue({
      idempotencyKey: "report-submission:lost-report-1",
      operation: {
        kind: "report-submission",
        payload: { reportId: "lost-report-1" },
        reportKind: "lost-report",
      },
    });

    const persisted = await createRetryQueue({ storage }).listItems();

    expect(persisted).toMatchObject([
      {
        attempts: 0,
        idempotencyKey: "media-upload:photo-1",
        operation: { kind: "media-upload" },
        status: "queued",
        statusLabel: "Pendiente",
      },
      {
        attempts: 0,
        idempotencyKey: "report-submission:lost-report-1",
        operation: { kind: "report-submission", reportKind: "lost-report" },
        status: "queued",
        statusLabel: "Pendiente",
      },
    ]);
    expect(retryQueueStatusLabelsEs).toEqual({
      blocked: "Requiere revision",
      queued: "Pendiente",
      retrying: "Reintentando",
      succeeded: "Enviado",
    });
  });

  it("claims only due queued work and requeues failed attempts without duplicate retries", async () => {
    let currentTime = new Date("2026-06-18T14:00:00.000Z");
    const storage = createMemoryStorage();
    const queue = createRetryQueue({
      now: () => currentTime,
      storage,
    });

    await queue.enqueue({
      idempotencyKey: "media-upload:due",
      nextAttemptAt: "2026-06-18T13:59:00.000Z",
      operation: {
        kind: "media-upload",
        localUri: "file:///due.jpg",
        mediaId: "due",
      },
    });
    await queue.enqueue({
      idempotencyKey: "media-upload:future",
      nextAttemptAt: "2026-06-18T14:30:00.000Z",
      operation: {
        kind: "media-upload",
        localUri: "file:///future.jpg",
        mediaId: "future",
      },
    });

    const claimed = await queue.claimRetryableItems({ limit: 5 });

    expect(claimed).toMatchObject([
      {
        attempts: 1,
        idempotencyKey: "media-upload:due",
        status: "retrying",
        statusLabel: "Reintentando",
      },
    ]);
    await expect(queue.claimRetryableItems({ limit: 5 })).resolves.toEqual([]);

    await queue.requeueFailedAttempt({
      errorMessage: "Sin conexion",
      idempotencyKey: "media-upload:due",
      nextAttemptAt: "2026-06-18T14:10:00.000Z",
    });

    await expect(queue.claimRetryableItems({ limit: 5 })).resolves.toEqual([]);

    currentTime = new Date("2026-06-18T14:11:00.000Z");

    await expect(
      queue.claimRetryableItems({ limit: 5 }),
    ).resolves.toMatchObject([
      {
        attempts: 2,
        errorMessage: "Sin conexion",
        idempotencyKey: "media-upload:due",
        status: "retrying",
      },
    ]);
  });

  it("marks successful work as sent and excludes it from later claims", async () => {
    const storage = createMemoryStorage();
    const queue = createRetryQueue({ storage });

    await queue.enqueue({
      idempotencyKey: "report-submission:lost-report-2",
      operation: {
        kind: "report-submission",
        payload: { reportId: "lost-report-2" },
        reportKind: "lost-report",
      },
    });
    await queue.claimRetryableItems();

    await expect(
      queue.markSucceeded({
        idempotencyKey: "report-submission:lost-report-2",
      }),
    ).resolves.toMatchObject({
      idempotencyKey: "report-submission:lost-report-2",
      status: "succeeded",
      statusLabel: "Enviado",
    });
    await expect(queue.claimRetryableItems()).resolves.toEqual([]);
    const [storedItem] = await queue.listItems();

    expect(storedItem).toMatchObject({
      idempotencyKey: "report-submission:lost-report-2",
      status: "succeeded",
    });
    expect(storedItem).not.toHaveProperty("errorMessage");
    expect(storedItem).not.toHaveProperty("nextAttemptAt");
  });
});

function createMemoryStorage(): AsyncKeyValueStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => Promise.resolve(values.get(key) ?? null),
    removeItem: (key) => {
      values.delete(key);

      return Promise.resolve();
    },
    setItem: (key, value) => {
      values.set(key, value);

      return Promise.resolve();
    },
  };
}
