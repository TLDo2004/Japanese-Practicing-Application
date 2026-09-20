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
import { getWanakanaConverter } from "./converter";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type WebDictionaryDeps = {
  fetch: FetchLike;
  converter: KanaConverter | null;
};

export type { DictionaryView, DisplayEntry, DisplaySense } from "@jpa/dictionary";

export function createWebDictionary(deps: WebDictionaryDeps): DictionaryPort & TranslationPort & {
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

export function createDomDictionary(): ReturnType<typeof createWebDictionary> {
  return createWebDictionary({
    fetch: (url, init) => fetch(url, init),
    converter: typeof window === "undefined" ? null : browserConverter(),
  });
}

function browserConverter(): KanaConverter | null {
  try {
    return getWanakanaConverter();
  } catch {
    return null;
  }
}
