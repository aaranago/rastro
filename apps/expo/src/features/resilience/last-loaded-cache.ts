export interface LastLoadedCache<TValue> {
  read(key: string): Promise<TValue | null>;
  write(key: string, value: TValue): Promise<void>;
}

export function createInMemoryLastLoadedCache<
  TValue,
>(): LastLoadedCache<TValue> {
  const values = new Map<string, TValue>();

  return {
    read: (key) => Promise.resolve(values.get(key) ?? null),
    write: (key, value) => {
      values.set(key, value);
      return Promise.resolve();
    },
  };
}
