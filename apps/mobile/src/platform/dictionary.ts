import type {
  DictMode,
  DictionaryPort,
  DictionaryView,
  KanaConverter,
  TranslationPort,
} from "@jpa/dictionary";
import {
  lookupJishoThenJotoba,
  searchDictionary,
  translateMyMemory,
} from "@jpa/dictionary";

export type { DictionaryView, DisplayEntry, DisplaySense } from "@jpa/dictionary";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type MobileDictionaryDeps = {
  fetch: FetchLike;
  converter: KanaConverter | null;
};

/** Native fetch — no CORS; same logical order as web: Jisho → Jotoba. */
export function createMobileDictionary(deps: MobileDictionaryDeps): DictionaryPort & TranslationPort & {
  search: (query: string, mode: DictMode) => Promise<DictionaryView>;
} {
  const lookup: DictionaryPort["lookup"] = (keyword) =>
    lookupJishoThenJotoba(deps.fetch, keyword);

  const translate: TranslationPort["translate"] = (text, from, to) =>
    translateMyMemory(deps.fetch, text, from, to);

  const search = (query: string, mode: DictMode) =>
    searchDictionary(query, mode, deps);

  return { lookup, translate, search };
}
