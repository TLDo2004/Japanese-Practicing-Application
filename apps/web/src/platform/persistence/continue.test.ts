import { describe, expect, it } from "vitest";
import { learnContinueKind, practiceContinueVisible } from "@jpa/practice";
import { STORAGE_KEY } from "@jpa/core";
import { createLocalStoragePersistence } from "./localStorage";
import { restoreLiveFromSnapshot, snapshotIsLive, toSessionSnapshot } from "./sessionSnapshot";
import { learnContinueState, showPracticeContinue } from "../../lib/continue";

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

describe("Learn vs Practice Continue", () => {
  it("Learn stays as a start-hira card when no live session; Practice hides", () => {
    const done = toSessionSnapshot({
      kind: "write",
      script: "hira",
      random: false,
      setId: "a",
      origin: "practice",
      usedKeys: ["a"],
      path: [{ ro: "a", prompt: "hira", key: "a" }],
      pathIndex: 0,
      results: { a: { first: "ok", missed: false } },
      title: "Hiragana",
      done: true,
    });
    expect(learnContinueKind(done)).toBe("start-hira");
    expect(learnContinueState(done)).toBe("start-hira");
    expect(practiceContinueVisible(done)).toBe(false);
    expect(showPracticeContinue(done)).toBe(false);
  });

  it("restores a live write session after a storage reload", () => {
    const storage = memoryStorage();
    const port = createLocalStoragePersistence(storage);
    const snap = toSessionSnapshot({
      kind: "write",
      script: "both",
      random: false,
      setId: "a",
      origin: "practice",
      usedKeys: ["a"],
      path: [{ ro: "a", prompt: "both", key: "a" }],
      pathIndex: 0,
      results: { a: { first: "bad", missed: true } },
      title: "Both at once · あ row",
      done: false,
    });
    port.save({ lastSession: snap, lastTab: "practice" });
    const reloaded = createLocalStoragePersistence({
      getItem: (key) => storage.getItem(key),
      setItem: (key, value) => storage.setItem(key, value),
    }).load();
    expect(snapshotIsLive(reloaded.lastSession)).toBe(true);
    expect(learnContinueKind(reloaded.lastSession)).toBe("live");
    expect(practiceContinueVisible(reloaded.lastSession)).toBe(true);
    const live = restoreLiveFromSnapshot(reloaded.lastSession);
    expect(live?.pathIndex).toBe(0);
    expect(live?.usedKeys).toEqual(["a"]);
    expect(live?.results.a?.missed).toBe(true);
    expect(live?.script).toBe("both");
    expect(Object.keys(live?.results || {})).toEqual(["a"]);
    expect(JSON.parse(storage.map[STORAGE_KEY]).lastTab).toBe("practice");
  });

  it("restores a partial/migrated store then Continue from a later snapshot", () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ lastTab: "learn", chartFilter: "yoon" }),
    });
    const port = createLocalStoragePersistence(storage);
    const loaded = port.load();
    expect(loaded.chartFilter).toBe("yoon");
    expect(loaded.lastSession).toBeNull();
    expect(learnContinueState(loaded.lastSession)).toBe("start-hira");
    const snap = toSessionSnapshot({
      kind: "quiz",
      script: "hira",
      random: false,
      setId: "a",
      origin: "practice",
      usedKeys: ["a", "i"],
      path: [
        { ro: "a", prompt: "hira", key: "a" },
        { ro: "i", prompt: "hira", key: "i" },
      ],
      pathIndex: 1,
      results: { a: { first: "ok", missed: false } },
      title: "Hiragana quiz",
      done: false,
    });
    port.save({ lastSession: snap });
    const live = restoreLiveFromSnapshot(createLocalStoragePersistence(storage).load().lastSession);
    expect(live?.kind).toBe("quiz");
    expect(live?.pathIndex).toBe(1);
    expect(live?.usedKeys).toEqual(["a", "i"]);
    expect(live?.path.map((item) => item.hira)).toEqual(["あ", "い"]);
  });
});
