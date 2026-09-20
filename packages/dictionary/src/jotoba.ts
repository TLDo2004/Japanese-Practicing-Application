import type { JishoEntry, JishoLikeResponse } from "./types";

type JotobaReading =
  | string
  | {
      kanji?: string;
      kana?: string;
      furigana?: string;
    };

type JotobaEntry = {
  word?: string;
  reading?: JotobaReading;
  senses?: unknown[];
  translations?: unknown[];
};

function jotobaReading(entry: JotobaEntry): {
  word: string;
  reading: string;
  furigana?: string;
} {
  const reading = entry.reading || {};
  if (typeof reading === "string") {
    return { word: entry.word || reading, reading };
  }
  const kanji = reading.kanji || "";
  const kana = reading.kana || "";
  return { word: kanji || kana, reading: kana || kanji, furigana: reading.furigana || "" };
}

function jotobaPartsOfSpeech(sense: Record<string, unknown>): string[] {
  const raw = sense.pos || sense.parts_of_speech || sense.part_of_speech;
  if (!raw) return [];
  return (Array.isArray(raw) ? raw : [raw]).map((p) => {
    if (typeof p === "string") return p;
    const rec = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    // Jotoba encodes some parts of speech as single-key objects, e.g. { Verb: ... }.
    const key = Object.keys(rec)[0] || "";
    return String(rec.name || rec.type || key || "");
  }).filter(Boolean);
}

function jotobaGlosses(entry: JotobaEntry): JishoEntry["senses"] {
  const senses = entry.senses || entry.translations || [];
  return senses.map((s) => {
    const sense = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
    const glosses = sense.glosses || sense.english_definitions || sense.translations || [];
    const defs = (Array.isArray(glosses) ? glosses : [glosses]).map((g) => {
      if (typeof g === "string") return g;
      const rec = (g && typeof g === "object" ? g : {}) as Record<string, unknown>;
      return String(rec.gloss || rec.text || rec.english || "");
    }).filter(Boolean);
    return { english_definitions: defs, parts_of_speech: jotobaPartsOfSpeech(sense) };
  }).filter((s) => s.english_definitions.length);
}

export function jotobaToJishoLike(data: unknown): JishoLikeResponse {
  const rec = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const words = rec.words || rec.data || [];
  return {
    data: (Array.isArray(words) ? words : []).slice(0, 8).map((entry) => {
      const jp = jotobaReading((entry || {}) as JotobaEntry);
      return {
        japanese: [jp],
        senses: jotobaGlosses((entry || {}) as JotobaEntry),
      };
    }).filter((e: JishoEntry) => e.japanese[0].word || e.japanese[0].reading),
  };
}

export function lookupFallbackOrder(): Array<"jisho" | "jotoba"> {
  return ["jisho", "jotoba"];
}

export function jishoUrl(keyword: string): string {
  return `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(keyword)}`;
}

export function jotobaRequestBody(keyword: string): {
  query: string;
  language: string;
  no_english: boolean;
} {
  return { query: keyword, language: "English", no_english: false };
}

export function mymemoryUrl(text: string, from: string, to: string): string {
  return `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
}

export function translationText(payload: unknown): string {
  const rec = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const responseData = (rec.responseData && typeof rec.responseData === "object"
    ? rec.responseData
    : {}) as Record<string, unknown>;
  return (typeof responseData.translatedText === "string" && responseData.translatedText) || "";
}

export function dictionaryEntryDisplayLimit(): number {
  return 8;
}
