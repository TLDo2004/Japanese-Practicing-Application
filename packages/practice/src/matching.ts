import { normalizeRomaji } from "@jpa/core";
import { ROMAJI_ALIASES } from "@jpa/kana";

export function romajiMatches(input: string, expected: string): boolean {
  const a = normalizeRomaji(input);
  const b = normalizeRomaji(expected);
  if (!a) return false;
  if (a === b) return true;
  const aliases = ROMAJI_ALIASES[b] || [];
  if (aliases.includes(a)) return true;
  for (const [canon, list] of Object.entries(ROMAJI_ALIASES)) {
    if (list.includes(b) && (a === canon || list.includes(a))) return true;
  }
  return false;
}

export function quizHintText(ro: string): string {
  return ro.slice(0, 1) + (ro.length > 1 ? "…" : "");
}
