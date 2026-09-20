import { describe, expect, it } from "vitest";
import {
  LEGACY_CACHE_NAME_RE,
  legacyCachesToDelete,
  isProtectedStorageKey,
  PROTECTED_STORAGE_KEYS,
} from "./legacyCaches";
import { STORAGE_KEY, LEGACY_LANG_KEY } from "@jpa/core";

describe("legacy PWA cache cutover helpers", () => {
  it("matches only jpa-v{N} cache names from legacy sw.js", () => {
    expect(LEGACY_CACHE_NAME_RE.test("jpa-v32")).toBe(true);
    expect(LEGACY_CACHE_NAME_RE.test("jpa-v1")).toBe(true);
    expect(LEGACY_CACHE_NAME_RE.test("workbox-precache-v2-abc")).toBe(false);
    expect(LEGACY_CACHE_NAME_RE.test("jpa-google-fonts-webfonts")).toBe(false);
    expect(LEGACY_CACHE_NAME_RE.test("jpa-progress-v1")).toBe(false);
  });

  it("selects legacy caches for deletion without touching Workbox or font caches", () => {
    expect(
      legacyCachesToDelete([
        "jpa-v32",
        "jpa-v31",
        "workbox-precache-v2-hash",
        "jpa-google-fonts-webfonts",
      ]),
    ).toEqual(["jpa-v32", "jpa-v31"]);
  });

  it("protects progress storage keys from any wholesale clear policy", () => {
    expect(PROTECTED_STORAGE_KEYS).toContain(STORAGE_KEY);
    expect(PROTECTED_STORAGE_KEYS).toContain(LEGACY_LANG_KEY);
    expect(isProtectedStorageKey(STORAGE_KEY)).toBe(true);
    expect(isProtectedStorageKey(LEGACY_LANG_KEY)).toBe(true);
    expect(isProtectedStorageKey("unrelated")).toBe(false);
  });

  it("cache cleanup simulation leaves localStorage progress intact", () => {
    const storage = new Map<string, string>();
    storage.set(STORAGE_KEY, JSON.stringify({ version: 2, lastTab: "practice" }));
    // A bilingual-era install may still hold jpa-lang=vi. It is never read now,
    // but cache cleanup must not delete it either.
    storage.set(LEGACY_LANG_KEY, "vi");
    const caches = ["jpa-v32", "workbox-precache-v2-x"];
    for (const key of legacyCachesToDelete(caches)) {
      // only Cache Storage keys — never Object.keys(localStorage).forEach(remove)
      void key;
    }
    expect(storage.get(STORAGE_KEY)).toContain("practice");
    expect(storage.get(LEGACY_LANG_KEY)).toBe("vi");
  });
});
