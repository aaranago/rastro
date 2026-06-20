import { beforeEach, describe, expect, it, vi } from "vitest";

import { createExpoSecureStoreKeyValueStorage } from "./storage";

const secureStoreBoundary = vi.hoisted(() => ({
  touchedKeys: [] as string[],
  values: new Map<string, string>(),
}));
const secureStoreSafeKeyPattern = /^[A-Za-z0-9._-]+$/;

vi.mock("expo-secure-store", () => {
  function assertSecureStoreSafeKey(key: string) {
    secureStoreBoundary.touchedKeys.push(key);

    if (!secureStoreSafeKeyPattern.test(key)) {
      throw new Error(`Invalid SecureStore key: ${key}`);
    }
  }

  return {
    deleteItemAsync: (key: string) => {
      assertSecureStoreSafeKey(key);
      secureStoreBoundary.values.delete(key);

      return Promise.resolve();
    },
    getItemAsync: (key: string) => {
      assertSecureStoreSafeKey(key);

      return Promise.resolve(secureStoreBoundary.values.get(key) ?? null);
    },
    setItemAsync: (key: string, value: string) => {
      assertSecureStoreSafeKey(key);
      secureStoreBoundary.values.set(key, value);

      return Promise.resolve();
    },
  };
});

describe("Expo SecureStore key-value storage", () => {
  beforeEach(() => {
    secureStoreBoundary.touchedKeys.length = 0;
    secureStoreBoundary.values.clear();
  });

  it("persists namespaced logical keys without passing colons to SecureStore", async () => {
    const storage = createExpoSecureStoreKeyValueStorage();
    const onboardingKey = "rastro:shell:first-run-tour:v1";
    const sightingDraftKey = "rastro:creation-draft:v1:member:sighting-report";
    const retryQueueKey = "rastro:retry-queue:items:v1";

    await storage.setItem(onboardingKey, "completed");
    await storage.setItem(sightingDraftKey, "draft");
    await storage.setItem(retryQueueKey, "queued");

    await expect(storage.getItem(onboardingKey)).resolves.toBe("completed");
    await expect(storage.getItem(sightingDraftKey)).resolves.toBe("draft");
    await expect(storage.getItem(retryQueueKey)).resolves.toBe("queued");

    await storage.removeItem(sightingDraftKey);

    await expect(storage.getItem(sightingDraftKey)).resolves.toBeNull();
    expect(secureStoreBoundary.touchedKeys).not.toContain(onboardingKey);
    expect(secureStoreBoundary.touchedKeys).not.toContain(sightingDraftKey);
    expect(secureStoreBoundary.touchedKeys).not.toContain(retryQueueKey);
    expect(
      secureStoreBoundary.touchedKeys.every((key) =>
        secureStoreSafeKeyPattern.test(key),
      ),
    ).toBe(true);
  });
});
