import { describe, expect, it } from "vitest";
import { LEGACY_CAPACITOR_MIGRATION_KEY, LEGACY_CAPACITOR_MIGRATION_VERSION, LEGACY_LANG_KEY, STORAGE_KEY } from "./keys";
import { DEFAULT_DICT_MODE, emptyStore, migrate, migrateDictMode } from "./migrate";
import { t } from "./i18n";
import {
  bumpWeakEntry,
  countLearned,
  isLearned,
  learnedKey,
  nextRecentSearches,
  recentlyLearned,
} from "./progress";
import { normalizeRomaji } from "./romaji";

describe("progress keys", () => {
  it("keeps legacy storage key names", () => {
    expect(STORAGE_KEY).toBe("jpa-progress-v1");
    expect(LEGACY_LANG_KEY).toBe("jpa-lang");
    expect(LEGACY_CAPACITOR_MIGRATION_KEY).toBe("legacyCapacitorMigrationVersion");
    expect(LEGACY_CAPACITOR_MIGRATION_VERSION).toBe(1);
  });
});

describe("migrate", () => {
  it("treats empty object as a v2 default store", () => {
    expect(migrate({})).toEqual(emptyStore());
  });

  it("treats null/undefined/non-object as empty", () => {
    expect(migrate(null)).toEqual(emptyStore());
    expect(migrate(undefined)).toEqual(emptyStore());
    expect(migrate("nope")).toEqual(emptyStore());
  });

  it("fills missing fields on a partial store", () => {
    const next = migrate({ lastTab: "practice", learned: { "hira:a": true } });
    expect(next.version).toBe(2);
    expect(next.lastTab).toBe("practice");
    expect(next.learned).toEqual({ "hira:a": true });
    expect(next.lastSession).toBeNull();
    expect(next.dictMode).toBe("dict-jp-en");
    expect(next.chartFilter).toBe("basic");
    expect(next.weak).toEqual({});
    expect(next.dictRecent).toEqual([]);
  });

  it("keeps a valid v2 store's session snapshot", () => {
    const raw = {
      version: 2,
      lastAt: 99,
      lastTab: "dict",
      lastSession: {
        kind: "quiz",
        script: "both",
        random: true,
        setId: "basic46",
        origin: "practice",
        used: ["a-hira"],
        path: [{ ro: "a", prompt: "hira", key: "a-hira" }],
        pathIndex: 0,
        results: { "a-hira": { first: "ok", missed: false } },
        view: "quiz",
        done: false,
        title: "Mixed reading",
      },
      lastActivity: { kind: "quiz", script: "both", setId: "basic46", title: "Mixed reading", origin: "practice" },
      learned: { "hira:a": true },
      weak: { "a-hira": { wrong: 1, right: 2 } },
      dictRecent: ["水", 12, "cat"],
      dictMode: "tr-en-jp",
      chartFilter: "yoon",
    };
    const next = migrate(raw);
    expect(next.lastAt).toBe(99);
    expect(next.lastTab).toBe("dict");
    expect(next.lastSession?.kind).toBe("quiz");
    expect(next.dictRecent).toEqual(["水", "cat"]);
    expect(next.dictMode).toBe("tr-en-jp");
    expect(next.chartFilter).toBe("yoon");
    expect(next.version).toBe(2);
  });

  it("maps unknown lastTab to learn, including dictionary", () => {
    expect(migrate({ lastTab: "dictionary" }).lastTab).toBe("learn");
    expect(migrate({ lastTab: "home" }).lastTab).toBe("learn");
  });

  it("drops non-object lastActivity and non-string dictRecent items", () => {
    expect(migrate({ lastActivity: "x" }).lastActivity).toBeNull();
    expect(migrate({ dictRecent: "water" }).dictRecent).toEqual([]);
  });

  it("preserves learning progress and Vietnamese dictionary modes from legacy stores", () => {
    const next = migrate({
      dictMode: "dict-jp-vi",
      learned: { "hira:a": true, "kata:shi": true },
      weak: { "a-hira": { wrong: 3, right: 1 } },
      dictRecent: ["mizu"],
      lastSession: { kind: "write", path: [{ ro: "a", prompt: "hira", key: "a" }] },
    });
    expect(next.dictMode).toBe("dict-jp-vi");
    expect(next.learned).toEqual({ "hira:a": true, "kata:shi": true });
    expect(next.weak).toEqual({ "a-hira": { wrong: 3, right: 1 } });
    expect(next.dictRecent).toEqual(["mizu"]);
    expect(next.lastSession).not.toBeNull();
  });
});

describe("dictionary mode compatibility", () => {
  it("keeps Japanese↔Vietnamese dictionary and translation modes", () => {
    expect(migrateDictMode("dict-jp-vi")).toBe("dict-jp-vi");
    expect(migrateDictMode("tr-vi-jp")).toBe("tr-vi-jp");
    expect(migrateDictMode("tr-jp-vi")).toBe("tr-jp-vi");
  });

  it("keeps supported modes and falls back for anything else", () => {
    expect(migrateDictMode("dict-jp-en")).toBe("dict-jp-en");
    expect(migrateDictMode("tr-en-jp")).toBe("tr-en-jp");
    expect(migrateDictMode("tr-jp-en")).toBe("tr-jp-en");
    expect(migrateDictMode("nonsense")).toBe(DEFAULT_DICT_MODE);
    expect(migrateDictMode(undefined)).toBe(DEFAULT_DICT_MODE);
    expect(migrateDictMode(42)).toBe(DEFAULT_DICT_MODE);
  });
});

describe("i18n and romaji helpers", () => {
  it("interpolates variables and falls back to the key", () => {
    expect(t("nav_learn")).toBe("Learn");
    expect(t("learned_of", { n: 3, total: 46 })).toBe("3 of 46 learned");
    expect(t("no_such_key")).toBe("no_such_key");
  });

  it("normalizes romaji like legacy util.js", () => {
    expect(normalizeRomaji("  Shi ")).toBe("shi");
    expect(normalizeRomaji(null)).toBe("");
  });
});

describe("progress helpers", () => {
  it("counts learned keys as script:ro", () => {
    expect(learnedKey("hira", "a")).toBe("hira:a");
    expect(countLearned({ "hira:a": true, "kata:a": true }, "hira", [{ ro: "a" }, { ro: "i" }])).toBe(1);
    expect(isLearned({ "hira:a": true }, "hira", "a")).toBe(true);
    expect(isLearned({ "hira:a": true }, "kata", "a")).toBe(false);
  });

  it("lists recently learned characters newest first", () => {
    const learned = { "hira:a": true, "hira:i": true, "kata:shi": true };
    expect(recentlyLearned(learned, 2)).toEqual([
      { script: "kata", ro: "shi" },
      { script: "hira", ro: "i" },
    ]);
    expect(recentlyLearned({ "hira:a": false }, 5)).toEqual([]);
    expect(recentlyLearned({ broken: true }, 5)).toEqual([]);
  });

  it("bumps weak counters and recent searches (max 8, case-insensitive dedupe)", () => {
    expect(bumpWeakEntry(undefined, false)).toEqual({ wrong: 1, right: 0 });
    expect(bumpWeakEntry({ wrong: 1, right: 2 }, true)).toEqual({ wrong: 1, right: 3 });
    expect(nextRecentSearches(["Cat", "dog"], "cat")).toEqual(["cat", "dog"]);
    expect(nextRecentSearches(["1", "2", "3", "4", "5", "6", "7", "8"], "9")).toEqual([
      "9", "1", "2", "3", "4", "5", "6", "7",
    ]);
    expect(nextRecentSearches(["a"], "   ")).toEqual(["a"]);
  });
});
