import type { KanaConverter } from "@jpa/dictionary";
import { toHiragana, toKatakana, toRomaji } from "wanakana";

export function getWanakanaConverter(): KanaConverter {
  return {
    toHiragana: (text: string) => toHiragana(text),
    toKatakana: (text: string) => toKatakana(text),
    toRomaji: (text: string) => toRomaji(text),
  };
}
