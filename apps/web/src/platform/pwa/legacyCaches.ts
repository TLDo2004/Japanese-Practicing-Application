/** Legacy cache names used by web/sw.js (e.g. jpa-v32). */
export const LEGACY_CACHE_NAME_RE = /^jpa-v\d+$/;

/** React Workbox font runtime caches (safe to keep across updates). */
export const REACT_FONT_CACHE_NAMES = [
  "jpa-google-fonts-stylesheets",
  "jpa-google-fonts-webfonts",
] as const;

/**
 * Decide which Cache Storage keys to delete when React SW takes ownership.
 * Must never imply clearing localStorage keys jpa-progress-v1 / jpa-lang.
 */
export function legacyCachesToDelete(cacheKeys: readonly string[]): string[] {
  return cacheKeys.filter((key) => LEGACY_CACHE_NAME_RE.test(key));
}

export const PROTECTED_STORAGE_KEYS = ["jpa-progress-v1", "jpa-lang"] as const;

export function isProtectedStorageKey(key: string): boolean {
  return (PROTECTED_STORAGE_KEYS as readonly string[]).includes(key);
}
