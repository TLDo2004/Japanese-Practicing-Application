import { describe, expect, it } from "vitest";
import { STORAGE_KEY, emptyStore } from "@jpa/core";
import { createLocalStoragePersistence } from "./localStorage";
import { restoreLiveFromSnapshot, snapshotIsLive, toSessionSnapshot } from "./sessionSnapshot";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = { ...initial };
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
    },
    setItem(key: string, value: string) {
      map[key] = value;
    },
    map,
  };
}

describe("localStorage persistence adapter", () => {
  it("migrates a partial store and writes jpa-progress-v1", () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ lastTab: "practice", dictRecent: ["mizu", 1] }),
    });
    const port = createLocalStoragePersistence(storage);
    const loaded = port.load();
    expect(loaded.version).toBe(2);
    expect(loaded.lastTab).toBe("practice");
    expect(loaded.dictRecent).toEqual(["mizu"]);
    expect(loaded.chartFilter).toBe("basic");
    const saved = port.save({ dictMode: "dict-jp-en", lastTab: "dict" });
    expect(saved.dictMode).toBe("dict-jp-en");
    expect(JSON.parse(storage.map[STORAGE_KEY]).lastTab).toBe("dict");
  });

  it("returns emptyStore on malformed JSON", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: "{not-json" });
    expect(createLocalStoragePersistence(storage).load()).toEqual(emptyStore());
  });
});

describe("session snapshot restore", () => {
  it("rebuilds path/used/results and treats done sessions as not live", () => {
    const snap = toSessionSnapshot({
      kind: "quiz",
      script: "hira",
      random: false,
      setId: "a",
      origin: "practice",
      usedKeys: ["a"],
      path: [{ ro: "a", prompt: "hira", key: "a" }],
      pathIndex: 0,
      results: { a: { first: "ok", missed: false } },
      title: "Hiragana · あ row",
      done: false,
    });
    expect(snapshotIsLive(snap)).toBe(true);
    const live = restoreLiveFromSnapshot(snap);
    expect(live?.kind).toBe("quiz");
    expect(live?.setId).toBe("a");
    expect(live?.path[0]?.hira).toBe("あ");
    expect(live?.usedKeys).toEqual(["a"]);
    expect(live?.results.a?.first).toBe("ok");
    expect(snapshotIsLive({ ...snap, done: true })).toBe(false);
  });

  it("returns null for an empty or missing path", () => {
    expect(restoreLiveFromSnapshot(null)).toBeNull();
    expect(restoreLiveFromSnapshot(toSessionSnapshot({
      kind: "write",
      script: "hira",
      random: false,
      setId: "a",
      origin: "practice",
      usedKeys: [],
      path: [],
      pathIndex: 0,
      results: {},
      title: "",
      done: false,
    }))).toBeNull();
  });
});
