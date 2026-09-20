/**
 * MyMemory language pairs for translation modes.
 * Dictionary modes (dict-*) use Jisho/Jotoba; JP→VI enriches glosses via MyMemory.
 */
export const TR_LANGPAIR: Record<string, [string, string]> = {
  "tr-en-jp": ["en", "ja"],
  "tr-jp-en": ["ja", "en"],
  "tr-vi-jp": ["vi", "ja"],
  "tr-jp-vi": ["ja", "vi"],
};

/** Modes whose query may be romaji that should convert to kana before JP→* work. */
export const JP_SOURCE_TR_MODES = new Set(["tr-jp-en", "tr-jp-vi"]);
