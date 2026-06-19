import type { AsyncKeyValueStorage } from "./storage";

export type RetryQueueStatus = "blocked" | "queued" | "retrying" | "succeeded";

export const retryQueueStatusLabelsEs = {
  blocked: "Requiere revision",
  queued: "Pendiente",
  retrying: "Reintentando",
  succeeded: "Enviado",
} as const satisfies Record<RetryQueueStatus, string>;

export type RetryQueueOperation =
  | {
      kind: "media-upload";
      localUri: string;
      mediaId: string;
    }
  | {
      kind: "report-submission";
      payload: unknown;
      reportKind: "found-report" | "lost-report" | "sighting-report";
    };

export interface RetryQueueItem {
  attempts: number;
  createdAt: string;
  errorMessage?: string;
  idempotencyKey: string;
  maxAttempts: number;
  nextAttemptAt?: string;
  operation: RetryQueueOperation;
  status: RetryQueueStatus;
  updatedAt: string;
}

export type RetryQueueListItem = RetryQueueItem & {
  statusLabel: (typeof retryQueueStatusLabelsEs)[RetryQueueStatus];
};

export interface CreateRetryQueueInput {
  namespace?: string;
  now?: () => Date;
  storage: AsyncKeyValueStorage;
}

export interface EnqueueRetryInput {
  idempotencyKey: string;
  maxAttempts?: number;
  nextAttemptAt?: string;
  operation: RetryQueueOperation;
}

export interface RetryQueue {
  claimRetryableItems(
    input?: ClaimRetryableItemsInput,
  ): Promise<RetryQueueListItem[]>;
  enqueue(input: EnqueueRetryInput): Promise<RetryQueueListItem>;
  listItems(): Promise<RetryQueueListItem[]>;
  markSucceeded(input: MarkRetrySucceededInput): Promise<RetryQueueListItem>;
  requeueFailedAttempt(
    input: RequeueFailedAttemptInput,
  ): Promise<RetryQueueListItem>;
}

export interface ClaimRetryableItemsInput {
  limit?: number;
}

export interface RequeueFailedAttemptInput {
  errorMessage?: string;
  idempotencyKey: string;
  nextAttemptAt?: string;
}

export interface MarkRetrySucceededInput {
  idempotencyKey: string;
}

const defaultNamespace = "rastro:retry-queue";
const queueStorageKey = "items:v1";
const defaultMaxAttempts = 5;

export function createRetryQueue({
  namespace = defaultNamespace,
  now = () => new Date(),
  storage,
}: CreateRetryQueueInput): RetryQueue {
  const storageKey = `${namespace}:${queueStorageKey}`;

  return {
    async claimRetryableItems(input) {
      const claimedAt = now().toISOString();
      const limit = input?.limit ?? 1;
      const items = await loadItems(storage, storageKey);
      const retryableItems = items
        .filter((item) => isRetryable(item, claimedAt))
        .sort(compareRetryPriority)
        .slice(0, limit);
      const claimedKeys = new Set(
        retryableItems.map((item) => item.idempotencyKey),
      );
      const claimedItems = items.map((item) => {
        if (!claimedKeys.has(item.idempotencyKey)) {
          return item;
        }

        return {
          ...item,
          attempts: item.attempts + 1,
          status: "retrying",
          updatedAt: claimedAt,
        } satisfies RetryQueueItem;
      });

      await saveItems(storage, storageKey, claimedItems);

      return claimedItems
        .filter((item) => claimedKeys.has(item.idempotencyKey))
        .map(withStatusLabel);
    },
    async enqueue(input) {
      const queuedAt = now().toISOString();
      const items = await loadItems(storage, storageKey);
      const existingIndex = items.findIndex(
        (item) => item.idempotencyKey === input.idempotencyKey,
      );
      const existing = items[existingIndex];
      const item = {
        attempts: existing?.attempts ?? 0,
        createdAt: existing?.createdAt ?? queuedAt,
        idempotencyKey: input.idempotencyKey,
        maxAttempts:
          input.maxAttempts ?? existing?.maxAttempts ?? defaultMaxAttempts,
        nextAttemptAt: input.nextAttemptAt ?? existing?.nextAttemptAt,
        operation: input.operation,
        status: "queued",
        updatedAt: queuedAt,
      } satisfies RetryQueueItem;

      if (existingIndex === -1) {
        items.push(item);
      } else {
        items[existingIndex] = item;
      }

      await saveItems(storage, storageKey, items);

      return withStatusLabel(item);
    },
    async listItems() {
      return (await loadItems(storage, storageKey)).map(withStatusLabel);
    },
    async markSucceeded(input) {
      const succeededAt = now().toISOString();
      const items = await loadItems(storage, storageKey);
      const itemIndex = items.findIndex(
        (item) => item.idempotencyKey === input.idempotencyKey,
      );
      const item = items[itemIndex];

      if (item === undefined) {
        throw new Error(
          `Cannot mark missing retry item as succeeded: ${input.idempotencyKey}`,
        );
      }

      const {
        errorMessage: _errorMessage,
        nextAttemptAt: _nextAttemptAt,
        ...retryItem
      } = item;
      const succeededItem = {
        ...retryItem,
        status: "succeeded",
        updatedAt: succeededAt,
      } satisfies RetryQueueItem;

      items[itemIndex] = succeededItem;

      await saveItems(storage, storageKey, items);

      return withStatusLabel(succeededItem);
    },
    async requeueFailedAttempt(input) {
      const requeuedAt = now().toISOString();
      const items = await loadItems(storage, storageKey);
      const itemIndex = items.findIndex(
        (item) => item.idempotencyKey === input.idempotencyKey,
      );
      const item = items[itemIndex];

      if (item === undefined) {
        throw new Error(
          `Cannot requeue missing retry item: ${input.idempotencyKey}`,
        );
      }

      const requeuedItem = {
        ...item,
        errorMessage: input.errorMessage,
        nextAttemptAt: input.nextAttemptAt,
        status: item.attempts >= item.maxAttempts ? "blocked" : "queued",
        updatedAt: requeuedAt,
      } satisfies RetryQueueItem;

      items[itemIndex] = requeuedItem;

      await saveItems(storage, storageKey, items);

      return withStatusLabel(requeuedItem);
    },
  };
}

async function loadItems(
  storage: AsyncKeyValueStorage,
  storageKey: string,
): Promise<RetryQueueItem[]> {
  const stored = await storage.getItem(storageKey);

  if (stored === null) {
    return [];
  }

  return JSON.parse(stored) as RetryQueueItem[];
}

async function saveItems(
  storage: AsyncKeyValueStorage,
  storageKey: string,
  items: RetryQueueItem[],
): Promise<void> {
  await storage.setItem(storageKey, JSON.stringify(items));
}

function withStatusLabel(item: RetryQueueItem): RetryQueueListItem {
  return {
    ...item,
    statusLabel: retryQueueStatusLabelsEs[item.status],
  };
}

function isRetryable(item: RetryQueueItem, nowIso: string): boolean {
  return (
    item.status === "queued" &&
    item.attempts < item.maxAttempts &&
    (item.nextAttemptAt === undefined || item.nextAttemptAt <= nowIso)
  );
}

function compareRetryPriority(left: RetryQueueItem, right: RetryQueueItem) {
  const leftNextAttemptAt = left.nextAttemptAt ?? left.createdAt;
  const rightNextAttemptAt = right.nextAttemptAt ?? right.createdAt;

  if (leftNextAttemptAt !== rightNextAttemptAt) {
    return leftNextAttemptAt.localeCompare(rightNextAttemptAt);
  }

  return left.createdAt.localeCompare(right.createdAt);
}
