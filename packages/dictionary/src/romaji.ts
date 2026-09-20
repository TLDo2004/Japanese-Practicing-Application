import type { KanaConverter } from "./types";

export function looksLikeRomaji(s: string): boolean {
  return /^(?:[kstnhmyrwgzdbpjf]?y?[aiueo]|n|shi|chi|tsu|fu)+$/i.test(s);
}

export function maybeRomajiToKana(
  text: string,
  converter: KanaConverter | null,
): { keyword: string; note: string } {
  const compact = text.replace(/\s+/g, "");
  if (!converter || !looksLikeRomaji(compact)) return { keyword: text, note: "" };
  if (/[\u3040-\u30ff\u4e00-\u9faf]/.test(text)) return { keyword: text, note: "" };
  const hira = converter.toHiragana(text);
  if (!hira || hira === text) return { keyword: text, note: "" };
  return { keyword: hira, note: `${text} → ${hira} / ${converter.toKatakana(text)}` };
}

export function toRomaji(text: string, converter: KanaConverter | null): string {
  if (!converter || !text) return "";
  const ro = converter.toRomaji(text);
  return /[\u4e00-\u9faf]/.test(ro) ? "" : ro;
}

/** True when the string is kana (hiragana/katakana/chouon) only — safe to romanize. */
export function isKanaOnly(text: string): boolean {
  return !!text && /^[\u3040-\u309f\u30a0-\u30ff\u30fc\s]+$/.test(text);
}

/**
 * Romanize only when a reliable Japanese reading (kana) is available.
 * Never transliterates arbitrary kanji.
 */
export function reliableRomaji(reading: string, converter: KanaConverter | null): string {
  if (!isKanaOnly(reading)) return "";
  return toRomaji(reading.replace(/\s+/g, ""), converter);
}
