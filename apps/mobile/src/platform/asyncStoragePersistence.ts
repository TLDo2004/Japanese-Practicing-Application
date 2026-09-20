import {
  emptyStore,
  LEGACY_CAPACITOR_MIGRATION_KEY,
  LEGACY_CAPACITOR_MIGRATION_VERSION,
  migrate,
  STORAGE_KEY,
  type PersistencePort,
  type ProgressStore,
} from "@jpa/core";
import { decideLegacyCapacitorMigration } from "./legacyCapacitorMigration";

type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export type LegacyProgressReader = () => Promise<string | null>;

/**
 * PersistencePort stays synchronous (shared contract).
 * AsyncStorage is hydrated into memory; writes are fire-and-forget.
 *
 * On hydrate, runs a one-time Capacitor WebView localStorage → AsyncStorage
 * migration when Expo progress is empty and legacy progress is valid.
 * Pass `readLegacyProgress` from the Android native bridge in production.
 */
export function createAsyncStoragePersistence(
  storage: AsyncStorageLike,
  options?: { readLegacyProgress?: LegacyProgressReader },
): PersistencePort & {
  hydrate: () => Promise<void>;
  lastMigrationAction?: string;
} {
  let memory: ProgressStore = emptyStore();
  let hydrated = false;
  let lastMigrationAction: string | undefined;

  const load = (): ProgressStore => memory;

  const save = (patch: Partial<ProgressStore>): ProgressStore => {
    memory = {
      ...memory,
      ...patch,
      lastAt: Date.now(),
      version: 2,
    };
    if (hydrated) {
      void storage.setItem(STORAGE_KEY, JSON.stringify(memory)).catch(() => {});
    }
    return memory;
  };

  const readLegacy = options?.readLegacyProgress ?? (async () => null);

  return {
    load,
    save,
    get lastMigrationAction() {
      return lastMigrationAction;
    },
    async hydrate() {
      try {
        const [asyncRaw, markerRaw] = await Promise.all([
          storage.getItem(STORAGE_KEY),
          storage.getItem(LEGACY_CAPACITOR_MIGRATION_KEY),
        ]);

        const markerNum = markerRaw != null ? Number(markerRaw) : 0;
        const markerDone =
          Number.isFinite(markerNum) && markerNum >= LEGACY_CAPACITOR_MIGRATION_VERSION;

        let legacyRaw: string | null = null;
        if (!markerDone) {
          try {
            legacyRaw = await readLegacy();
          } catch {
            legacyRaw = null;
          }
        }

        const decision = decideLegacyCapacitorMigration({
          markerRaw,
          asyncStorageRaw: asyncRaw,
          legacyProgressRaw: legacyRaw,
        });
        lastMigrationAction = decision.action;
        memory = decision.store;

        const writes: Promise<void>[] = [];
        if (decision.writeProgress) {
          writes.push(storage.setItem(STORAGE_KEY, JSON.stringify(decision.store)));
        }
        if (decision.writeMarker) {
          writes.push(
            storage.setItem(LEGACY_CAPACITOR_MIGRATION_KEY, String(decision.markerVersion)),
          );
        }
        if (writes.length > 0) {
          await Promise.all(writes);
        }
      } catch {
        try {
          const raw = await storage.getItem(STORAGE_KEY);
          memory = migrate(raw ? JSON.parse(raw) : {});
        } catch {
          memory = emptyStore();
        }
      }
      hydrated = true;
    },
  };
}
