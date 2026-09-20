export type JishoJapanese = {
  word?: string;
  reading?: string;
  furigana?: string;
};

export type JishoSense = {
  english_definitions: string[];
  parts_of_speech?: string[];
};

export type JishoEntry = {
  japanese: JishoJapanese[];
  senses: JishoSense[];
};

export type JishoLikeResponse = {
  data: JishoEntry[];
};

/**
 * Dictionary / translation modes.
 * UI language stays English; Vietnamese appears only as dictionary content.
 */
export type DictMode =
  | "dict-jp-en"
  | "dict-jp-vi"
  | "tr-en-jp"
  | "tr-jp-en"
  | "tr-vi-jp"
  | "tr-jp-vi";

export type KanaConverter = {
  toHiragana: (text: string) => string;
  toKatakana: (text: string) => string;
  toRomaji: (text: string) => string;
};

export type RubyNode =
  | { kind: "text"; text: string }
  | { kind: "ruby"; base: string; rt: string };

export type RubyRun = RubyNode[];

export type DictionaryPort = {
  lookup: (keyword: string) => Promise<JishoLikeResponse>;
};

export type TranslationPort = {
  translate: (text: string, from: string, to: string) => Promise<string>;
};

export type DisplaySense = {
  pos: string;
  gloss: string;
};

export type DisplayEntry = {
  word: string;
  reading: string;
  ruby: RubyRun;
  romaji: string;
  senses: DisplaySense[];
  /** Japanese text suitable for TTS when present. */
  speakText: string;
};

/**
 * Structured dictionary / translation view for UI rendering.
 * Romaji is only filled when a reliable Japanese reading exists.
 */
export type DictionaryView =
  | {
    kind: "translation";
    source: string;
    output: string;
    note: string;
    japaneseText: string;
    japaneseReading: string;
    romaji: string;
    speakText: string;
  }
  | { kind: "none"; keyword: string; note: string }
  | { kind: "error"; keyword: string; note: string }
  | { kind: "entries"; keyword: string; note: string; entries: DisplayEntry[] };
