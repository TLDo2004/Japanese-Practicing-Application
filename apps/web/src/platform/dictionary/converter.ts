import type { KanaConverter } from "@jpa/dictionary";
import { toHiragana, toKatakana, toRomaji as wanakanaToRomaji } from "wanakana";

export function getWanakanaConverter(): KanaConverter {
  return {
    toHiragana: (text) => toHiragana(text),
    toKatakana: (text) => toKatakana(text),
    toRomaji: (text) => wanakanaToRomaji(text),
  };
}
