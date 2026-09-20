import { describe, expect, it } from "vitest";
import {
  emptyStore,
  LEGACY_CAPACITOR_MIGRATION_KEY,
  LEGACY_CAPACITOR_MIGRATION_VERSION,
  STORAGE_KEY,
} from "@jpa/core";
import {
  decideLegacyCapacitorMigration,
  hasMeaningfulProgress,
} from "./legacyCapacitorMigration";
import { createAsyncStoragePersistence } from "./asyncStoragePersistence";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: async (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: async (key: string, value: string) => {
      map.set(key, value);
    },
    map,
  };
}

const fullLegacy = {
  version: 2,
  lastAt: 1_700_000_000_000,
  lastTab: "practice",
  lastSession: {
    kind: "write",
    script: "hira",
    random: false,
    setId: "basic",
    origin: "practice",
    used: [],
    path: [],
    pathIndex: 0,
    results: {},
    view: "pad",
    done: false,
    title: "Writing",
  },
  lastActivity: {
    kind: "write",
    script: "hira",
    setId: "basic",
    title: "Writing",
    origin: "practice",
  },
  learned: { "hira:a": true, "hira:ka": true },
  weak: { "hira:sa": { wrong: 2, right: 0 } },
  dictRecent: ["水", "火"],
  dictMode: "dict-jp-vi",
  chartFilter: "voiced",
};

describe("hasMeaningfulProgress", () => {
  it("treats emptyStore as empty", () => {
    expect(hasMeaningfulProgress(emptyStore())).toBe(false);
  });

  it("treats partial preference fields as meaningful", () => {
    expect(hasMeaningfulProgress({ ...emptyStore(), dictMode: "tr-vi-jp" })).toBe(true);
    expect(hasMeaningfulProgress({ ...emptyStore(), chartFilter: "voiced" })).toBe(true);
  });
});

describe("decideLegacyCapacitorMigration matrix", () => {
  it("fresh install: no AsyncStorage, no legacy", () => {
    const d = decideLegacyCapacitorMigration({
      markerRaw: null,
      asyncStorageRaw: null,
      legacyProgressRaw: null,
    });
    expect(d.action).toBe("no_legacy");
    expect(d.store).toEqual(emptyStore());
    expect(d.writeProgress).toBe(false);
    expect(d.writeMarker).toBe(true);
  });

  it("migrates full legacy progress fields including JP↔VI dictMode", () => {
    const d = decideLegacyCapacitorMigration({
      markerRaw: null,
      asyncStorageRaw: null,
      legacyProgressRaw: JSON.stringify(fullLegacy),
    });
    expect(d.action).toBe("migrated_from_legacy");
    expect(d.writeProgress).toBe(true);
    expect(d.store.learned).toEqual(fullLegacy.learned);
    expect(d.store.weak).toEqual(fullLegacy.weak);
    expect(d.store.lastSession?.kind).toBe("write");
    expect(d.store.dictRecent).toEqual(["水", "火"]);
    expect(d.store.chartFilter).toBe("voiced");
    expect(d.store.dictMode).toBe("dict-jp-vi");
  });

  it("preserves VI translation modes from legacy", () => {
    for (const mode of ["tr-vi-jp", "tr-jp-vi", "dict-jp-vi"] as const) {
      const d = decideLegacyCapacitorMigration({
        markerRaw: null,
        asyncStorageRaw: null,
        legacyProgressRaw: JSON.stringify({ dictMode: mode, learned: { "hira:a": true } }),
      });
      expect(d.store.dictMode).toBe(mode);
    }
  });

  it("malformed legacy does not crash and does not write progress", () => {
    const d = decideLegacyCapacitorMigration({
      markerRaw: null,
      asyncStorageRaw: null,
      legacyProgressRaw: "{not-json",
    });
    expect(d.action).toBe("malformed_legacy");
    expect(d.store).toEqual(emptyStore());
    expect(d.writeProgress).toBe(false);
    expect(d.writeMarker).toBe(true);
  });

  it("empty legacy object is a no-op migrate", () => {
    const d = decideLegacyCapacitorMigration({
      markerRaw: null,
      asyncStorageRaw: null,
      legacyProgressRaw: "{}",
    });
    expect(d.action).toBe("empty_legacy");
    expect(d.writeProgress).toBe(false);
  });

  it("populated AsyncStorage wins over differing legacy", () => {
    const d = decideLegacyCapacitorMigration({
      markerRaw: null,
      asyncStorageRaw: JSON.stringify({
        learned: { "hira:i": true },
        dictMode: "dict-jp-en",
      }),
      legacyProgressRaw: JSON.stringify(fullLegacy),
    });
    expect(d.action).toBe("kept_expo_progress");
    expect(d.store.learned).toEqual({ "hira:i": true });
    expect(d.store.dictMode).toBe("dict-jp-en");
    expect(d.writeProgress).toBe(false);
    expect(d.writeMarker).toBe(true);
  });

  it("already completed marker skips destructive rerun even with legacy present", () => {
    const d = decideLegacyCapacitorMigration({
      markerRaw: String(LEGACY_CAPACITOR_MIGRATION_VERSION),
      asyncStorageRaw: JSON.stringify({ learned: { "hira:u": true } }),
      legacyProgressRaw: JSON.stringify(fullLegacy),
    });
    expect(d.action).toBe("already_completed");
    expect(d.store.learned).toEqual({ "hira:u": true });
    expect(d.writeProgress).toBe(false);
    expect(d.writeMarker).toBe(false);
  });

  it("partial legacy fields still migrate", () => {
    const d = decideLegacyCapacitorMigration({
      markerRaw: null,
      asyncStorageRaw: null,
      legacyProgressRaw: JSON.stringify({
        learned: { "kata:a": true },
        dictRecent: ["猫"],
      }),
    });
    expect(d.action).toBe("migrated_from_legacy");
    expect(d.store.learned).toEqual({ "kata:a": true });
    expect(d.store.dictRecent).toEqual(["猫"]);
    expect(d.store.dictMode).toBe("dict-jp-en");
  });
});

describe("createAsyncStoragePersistence + legacy migration", () => {
  it("double-run is idempotent and non-destructive", async () => {
    const storage = memoryStorage();
    let legacyReads = 0;
    const readLegacy = async () => {
      legacyReads += 1;
      return JSON.stringify(fullLegacy);
    };

    const first = createAsyncStoragePersistence(storage, { readLegacyProgress: readLegacy });
    await first.hydrate();
    expect(first.lastMigrationAction).toBe("migrated_from_legacy");
    expect(first.load().learned).toEqual(fullLegacy.learned);
    expect(await storage.getItem(LEGACY_CAPACITOR_MIGRATION_KEY)).toBe(
      String(LEGACY_CAPACITOR_MIGRATION_VERSION),
    );

    // Mutate Expo progress after migration
    first.save({ learned: { "hira:a": true, "hira:e": true } });

    const second = createAsyncStoragePersistence(storage, {
      readLegacyProgress: async () => JSON.stringify(fullLegacy),
    });
    await second.hydrate();
    expect(second.lastMigrationAction).toBe("already_completed");
    expect(second.load().learned).toEqual({ "hira:a": true, "hira:e": true });
    expect(legacyReads).toBe(1);
  });

  it("does not overwrite Expo progress when legacy also exists", async () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ learned: { "hira:o": true }, dictMode: "tr-jp-vi" }),
    });
    const p = createAsyncStoragePersistence(storage, {
      readLegacyProgress: async () => JSON.stringify(fullLegacy),
    });
    await p.hydrate();
    expect(p.lastMigrationAction).toBe("kept_expo_progress");
    expect(p.load().learned).toEqual({ "hira:o": true });
    expect(p.load().dictMode).toBe("tr-jp-vi");
  });

  it("survives malformed legacy during hydrate", async () => {
    const storage = memoryStorage();
    const p = createAsyncStoragePersistence(storage, {
      readLegacyProgress: async () => "[[[",
    });
    await p.hydrate();
    expect(p.lastMigrationAction).toBe("malformed_legacy");
    expect(p.load()).toEqual(emptyStore());
    expect(await storage.getItem(LEGACY_CAPACITOR_MIGRATION_KEY)).toBe("1");
  });
});
