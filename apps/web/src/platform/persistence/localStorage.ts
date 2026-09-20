import { emptyStore, migrate, STORAGE_KEY, type PersistencePort, type ProgressStore } from "@jpa/core";

export function createLocalStoragePersistence(storage: Pick<Storage, "getItem" | "setItem">): PersistencePort {
  const load = (): ProgressStore => {
    try {
      return migrate(JSON.parse(storage.getItem(STORAGE_KEY) || "{}"));
    } catch {
      return emptyStore();
    }
  };
  return {
    load,
    save(patch: Partial<ProgressStore>) {
      const store: ProgressStore = {
        ...load(),
        ...patch,
        lastAt: Date.now(),
        version: 2,
      };
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(store));
      } catch {
        /* quota / private mode */
      }
      return store;
    },
  };
}
