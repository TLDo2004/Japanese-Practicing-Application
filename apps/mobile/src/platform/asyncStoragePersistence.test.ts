import { describe, expect, it } from "vitest";
import { STORAGE_KEY, LEGACY_LANG_KEY, emptyStore, migrate } from "@jpa/core";
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

describe("AsyncStorage persistence adapter", () => {
  it("hydrates jpa-progress-v1 through migrate/default", async () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ version: 2, lastTab: "practice", dictRecent: ["水"] }),
    });
    const p = createAsyncStoragePersistence(storage, {
      readLegacyProgress: async () => null,
    });
    await p.hydrate();
    const store = p.load();
    expect(store.lastTab).toBe("practice");
    expect(store.dictRecent).toEqual(["水"]);
    expect(store.version).toBe(2);
  });

  it("save patches memory and AsyncStorage without inventing a new schema", async () => {
    const storage = memoryStorage();
    const p = createAsyncStoragePersistence(storage, {
      readLegacyProgress: async () => null,
    });
    await p.hydrate();
    p.save({ lastTab: "dict", dictMode: "dict-jp-en" });
    const raw = await storage.getItem(STORAGE_KEY);
    const parsed = migrate(JSON.parse(raw || "{}"));
    expect(parsed.lastTab).toBe("dict");
    expect(parsed.dictMode).toBe("dict-jp-en");
    expect(parsed).toMatchObject({ version: 2, learned: {}, weak: {} });
  });

  it("leaves a bilingual-era jpa-lang value untouched", async () => {
    const storage = memoryStorage({ [LEGACY_LANG_KEY]: "vi" });
    const p = createAsyncStoragePersistence(storage, {
      readLegacyProgress: async () => null,
    });
    await p.hydrate();
    p.save({ lastTab: "learn" });
    expect(await storage.getItem(LEGACY_LANG_KEY)).toBe("vi");
  });

  it("preserves a stored Vietnamese dictionary mode", async () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: 2,
        dictMode: "dict-jp-vi",
        learned: { "hira:a": true },
      }),
    });
    const p = createAsyncStoragePersistence(storage, {
      readLegacyProgress: async () => null,
    });
    await p.hydrate();
    expect(p.load().dictMode).toBe("dict-jp-vi");
    expect(p.load().learned).toEqual({ "hira:a": true });
  });

  it("defaults empty store when missing", async () => {
    const p = createAsyncStoragePersistence(memoryStorage(), {
      readLegacyProgress: async () => null,
    });
    await p.hydrate();
    expect(p.load()).toEqual(expect.objectContaining(emptyStore()));
  });
});
