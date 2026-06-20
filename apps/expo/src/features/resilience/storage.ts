import * as SecureStore from "expo-secure-store";

export interface AsyncKeyValueStorage {
  getItem(key: string): Promise<null | string>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
}

const secureStoreSafeKeyPattern = /^[A-Za-z0-9._-]+$/;
const encodedKeyPrefix = "rastro_storage_";

export function createExpoSecureStoreKeyValueStorage(): AsyncKeyValueStorage {
  return {
    getItem: (key) => SecureStore.getItemAsync(toSecureStoreKey(key)),
    removeItem: (key) => SecureStore.deleteItemAsync(toSecureStoreKey(key)),
    setItem: (key, value) =>
      SecureStore.setItemAsync(toSecureStoreKey(key), value),
  };
}

function toSecureStoreKey(logicalKey: string): string {
  if (
    secureStoreSafeKeyPattern.test(logicalKey) &&
    !logicalKey.startsWith(encodedKeyPrefix)
  ) {
    return logicalKey;
  }

  return `${encodedKeyPrefix}${Array.from(logicalKey)
    .map((character) => character.codePointAt(0)?.toString(16).padStart(2, "0"))
    .join("_")}`;
}
