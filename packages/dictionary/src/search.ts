import { JP_SOURCE_TR_MODES, TR_LANGPAIR } from "./langpair";
import {
  dictionaryEntryDisplayLimit,
  jishoUrl,
  jotobaRequestBody,
  jotobaToJishoLike,
  mymemoryUrl,
  translationText,
} from "./jotoba";
import { maybeRomajiToKana, reliableRomaji } from "./romaji";
import { rubyFromMarkup } from "./ruby";
import type {
  DictMode,
  DictionaryView,
  DisplayEntry,
  JishoLikeResponse,
  KanaConverter,
} from "./types";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type DictionarySearchDeps = {
  fetch: FetchLike;
  converter: KanaConverter | null;
};

async function fetchJson(fetchImpl: FetchLike, url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetchImpl(url, init);
  if (!res.ok) throw new Error("Lookup failed");
  return res.json();
}

export async function lookupJishoThenJotoba(
  fetchImpl: FetchLike,
  keyword: string,
): Promise<JishoLikeResponse> {
  try {
    const data = await fetchJson(fetchImpl, jishoUrl(keyword));
    return data as JishoLikeResponse;
  } catch {
    const raw = await fetchJson(fetchImpl, "https://jotoba.de/api/search/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jotobaRequestBody(keyword)),
    });
    return jotobaToJishoLike(raw);
  }
}

export async function translateMyMemory(
  fetchImpl: FetchLike,
  text: string,
  from: string,
  to: string,
): Promise<string> {
  const payload = await fetchJson(fetchImpl, mymemoryUrl(text, from, to));
  return translationText(payload);
}

/**
 * Resolve a reliable Japanese reading for romanization / TTS context.
 * Never invents kanji readings — returns empty when unknown.
 */
export async function resolveJapaneseReading(
  japaneseText: string,
  deps: DictionarySearchDeps,
): Promise<string> {
  if (!japaneseText) return "";
  if (/^[\u3040-\u309f\u30a0-\u30ff\u30fc\s]+$/.test(japaneseText)) {
    return japaneseText.replace(/\s+/g, "");
  }
  try {
    const data = await lookupJishoThenJotoba(deps.fetch, japaneseText);
    const reading = data.data?.[0]?.japanese?.[0]?.reading || "";
    if (reading && /^[\u3040-\u309f\u30a0-\u30ff\u30fc\s]+$/.test(reading)) {
      return reading.replace(/\s+/g, "");
    }
  } catch {
    /* omit reading when lookup fails */
  }
  return "";
}

function mapEntries(
  entries: JishoLikeResponse["data"],
  converter: KanaConverter | null,
  glossOverride?: Array<string | undefined>,
): DisplayEntry[] {
  return entries.slice(0, dictionaryEntryDisplayLimit()).map((entry, index) => {
    const jp = entry.japanese[0] || {};
    const word = jp.word || jp.reading || "";
    const reading = jp.reading || "";
    const speakText = word || reading;
    const romaji = reliableRomaji(reading, converter);
    const enSenses = (entry.senses || [])
      .slice(0, 4)
      .map((sense) => ({
        pos: (sense.parts_of_speech || [])[0] || "",
        gloss: (sense.english_definitions || []).slice(0, 4).join("; "),
      }))
      .filter((sense) => !!sense.gloss);

    const vi = glossOverride?.[index];
    let senses = enSenses;
    if (vi) {
      senses = [
        { pos: enSenses[0]?.pos || "", gloss: vi },
        ...enSenses.map((s) => ({ ...s, pos: s.pos ? `EN · ${s.pos}` : "EN" })),
      ];
    }

    return {
      word,
      reading,
      ruby: rubyFromMarkup(jp.furigana || "", word, reading),
      romaji,
      senses,
      speakText,
    };
  });
}

/**
 * Shared dictionary / translation search used by web and mobile adapters.
 */
export async function searchDictionary(
  query: string,
  mode: DictMode,
  deps: DictionarySearchDeps,
): Promise<DictionaryView> {
  const pair = TR_LANGPAIR[mode];
  if (pair) {
    let text = query;
    let note = "";
    if (JP_SOURCE_TR_MODES.has(mode)) {
      const converted = maybeRomajiToKana(query, deps.converter);
      text = converted.keyword;
      note = converted.note;
    }
    try {
      const out = await translateMyMemory(deps.fetch, text, pair[0], pair[1]);
      if (!out) {
        return { kind: "none", keyword: text, note: note || (text !== query ? `${query} → ${text}` : "") };
      }

      const towardJapanese = pair[1] === "ja";
      const fromJapanese = pair[0] === "ja";
      const japaneseText = towardJapanese ? out : fromJapanese ? text : "";
      const japaneseReading = japaneseText
        ? await resolveJapaneseReading(japaneseText, deps)
        : "";
      const romaji = reliableRomaji(japaneseReading, deps.converter);
      const speakText = japaneseText;

      return {
        kind: "translation",
        source: text,
        output: out,
        note: note || (text !== query ? `${query} → ${text}` : ""),
        japaneseText,
        japaneseReading,
        romaji,
        speakText,
      };
    } catch {
      return { kind: "error", keyword: text, note: "search_failed" };
    }
  }

  const converted = maybeRomajiToKana(query, deps.converter);
  const keyword = converted.keyword;
  let entries: JishoLikeResponse["data"] = [];
  try {
    const data = await lookupJishoThenJotoba(deps.fetch, keyword);
    entries = (data && data.data) || [];
  } catch {
    return { kind: "error", keyword, note: "search_failed" };
  }
  if (!entries.length) {
    return { kind: "none", keyword, note: converted.note };
  }

  let glossOverride: Array<string | undefined> | undefined;
  if (mode === "dict-jp-vi") {
    glossOverride = await Promise.all(
      entries.slice(0, 5).map(async (entry) => {
        const w = entry.japanese[0]?.word || entry.japanese[0]?.reading || "";
        if (!w) return undefined;
        try {
          return await translateMyMemory(deps.fetch, w, "ja", "vi");
        } catch {
          return undefined;
        }
      }),
    );
  }

  return {
    kind: "entries",
    keyword,
    note: converted.note,
    entries: mapEntries(entries, deps.converter, glossOverride),
  };
}
