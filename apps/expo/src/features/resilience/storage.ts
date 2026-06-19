import * as SecureStore from "expo-secure-store";

export interface AsyncKeyValueStorage {
  getItem(key: string): Promise<null | string>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
}

export function createExpoSecureStoreKeyValueStorage(): AsyncKeyValueStorage {
  return {
    getItem: (key) => SecureStore.getItemAsync(key),
    removeItem: (key) => SecureStore.deleteItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
  };
}
