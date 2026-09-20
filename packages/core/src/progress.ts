import type { WeakEntry } from "./types";

export function learnedKey(script: string, ro: string): string {
  return `${script}:${ro}`;
}

export function countLearned(
  learned: Record<string, boolean>,
  script: string,
  letters: ReadonlyArray<{ ro: string }>,
): number {
  return letters.filter((l) => learned[`${script}:${l.ro}`]).length;
}

export function isLearned(
  learned: Record<string, boolean>,
  script: string,
  ro: string,
): boolean {
  return !!learned[learnedKey(script, ro)];
}

/**
 * Newly learned keys are appended to the store, so key order is the order in
 * which characters were first learned. Nothing records a timestamp, so this is
 * "most recently learned for the first time", newest first.
 */
export function recentlyLearned(
  learned: Record<string, boolean>,
  limit: number,
): Array<{ script: string; ro: string }> {
  const entries: Array<{ script: string; ro: string }> = [];
  Object.keys(learned).forEach((key) => {
    if (!learned[key]) return;
    const split = key.indexOf(":");
    if (split <= 0) return;
    entries.push({ script: key.slice(0, split), ro: key.slice(split + 1) });
  });
  return entries.reverse().slice(0, limit);
}

export function bumpWeakEntry(entry: WeakEntry | undefined, ok: boolean): WeakEntry {
  const next = { ...(entry || { wrong: 0, right: 0 }) };
  if (ok) next.right += 1;
  else next.wrong += 1;
  return next;
}

export function nextRecentSearches(prev: readonly string[], query: string): string[] {
  const q = String(query || "").trim();
  if (!q) return [...prev];
  const rest = prev.filter((item) => item.toLowerCase() !== q.toLowerCase());
  return [q, ...rest].slice(0, 8);
}
