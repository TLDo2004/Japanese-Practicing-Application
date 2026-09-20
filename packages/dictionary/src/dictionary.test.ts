import { describe, expect, it } from "vitest";
import {
  TR_LANGPAIR,
  dictionaryEntryDisplayLimit,
  jishoUrl,
  jotobaRequestBody,
  jotobaToJishoLike,
  lookupFallbackOrder,
  looksLikeRomaji,
  maybeRomajiToKana,
  mymemoryUrl,
  rubyFor,
  rubyFromMarkup,
  toRomaji,
  reliableRomaji,
  isKanaOnly,
  translationText,
  type KanaConverter,
} from "./index";

const converter: KanaConverter = {
  toHiragana: (text) => (text === "mizu" ? "みず" : text),
  toKatakana: (text) => (text === "mizu" ? "ミズ" : text),
  toRomaji: (text) => (text === "みず" ? "mizu" : text === "漢字" ? "漢字" : text),
};

describe("query normalization", () => {
  it("detects romaji the same way as legacy looksLikeRomaji", () => {
    expect(looksLikeRomaji("mizu")).toBe(true);
    expect(looksLikeRomaji("shi")).toBe(true);
    expect(looksLikeRomaji("water")).toBe(false);
    expect(looksLikeRomaji("tokyo")).toBe(true);
  });

  it("leaves the query unchanged without a converter (no window.wanakana)", () => {
    expect(maybeRomajiToKana("mizu", null)).toEqual({ keyword: "mizu", note: "" });
    expect(toRomaji("みず", null)).toBe("");
  });

  it("converts romaji and builds the note when a converter is injected", () => {
    expect(maybeRomajiToKana("mizu", converter)).toEqual({
      keyword: "みず",
      note: "mizu → みず / ミズ",
    });
    expect(maybeRomajiToKana("みず", converter)).toEqual({ keyword: "みず", note: "" });
    expect(toRomaji("みず", converter)).toBe("mizu");
    expect(toRomaji("漢字", converter)).toBe("");
  });
});

describe("ruby", () => {
  it("splits shared prefix/suffix around kanji", () => {
    expect(rubyFor("食べる", "たべる")).toEqual([
      { kind: "ruby", base: "食", rt: "た" },
      { kind: "text", text: "べる" },
    ]);
    expect(rubyFor("みず", "みず")).toEqual([{ kind: "text", text: "みず" }]);
    expect(rubyFor("", "あ")).toEqual([{ kind: "text", text: "あ" }]);
  });

  it("parses Jotoba | markup into ruby nodes", () => {
    expect(rubyFromMarkup("[漢|かん]字", "漢字", "かんじ")).toEqual([
      { kind: "ruby", base: "漢", rt: "かん" },
      { kind: "text", text: "字" },
    ]);
    expect(rubyFromMarkup("no-bars", "漢字", "かんじ")).toEqual(rubyFor("漢字", "かんじ"));
  });
});

describe("Jotoba mapping and API shapes", () => {
  it("maps object readings and glosses into Jisho-like entries, max 8", () => {
    const mapped = jotobaToJishoLike({
      words: [
        {
          reading: { kanji: "水", kana: "みず", furigana: "[水|みず]" },
          senses: [{ glosses: ["water", { gloss: "fluid" }] }],
        },
        {
          word: "あ",
          reading: "あ",
          translations: [{ english_definitions: ["hiragana a"] }],
        },
        { reading: { kana: "" } },
      ],
    });
    expect(mapped.data).toHaveLength(2);
    expect(mapped.data[0].japanese[0]).toEqual({
      word: "水",
      reading: "みず",
      furigana: "[水|みず]",
    });
    expect(mapped.data[0].senses[0].english_definitions).toEqual(["water", "fluid"]);
    expect(mapped.data[1].japanese[0].word).toBe("あ");
  });

  it("carries parts of speech through when Jotoba supplies them", () => {
    const mapped = jotobaToJishoLike({
      words: [{
        reading: { kana: "みず" },
        senses: [{ glosses: ["water"], pos: ["Noun", { name: "Adverb" }] }],
      }],
    });
    expect(mapped.data[0].senses[0].parts_of_speech).toEqual(["Noun", "Adverb"]);
  });

  it("uses data.words fallback and ignores empty entries", () => {
    expect(jotobaToJishoLike({ data: [{ reading: { kana: "い" } }] }).data[0].japanese[0].reading).toBe("い");
    expect(jotobaToJishoLike({ words: new Array(10).fill({ reading: { kana: "ん" } }) }).data).toHaveLength(8);
  });

  it("preserves lookup URLs, fallback order, and translation extraction", () => {
    expect(lookupFallbackOrder()).toEqual(["jisho", "jotoba"]);
    expect(jishoUrl("水")).toBe("https://jisho.org/api/v1/search/words?keyword=%E6%B0%B4");
    expect(jotobaRequestBody("水")).toEqual({ query: "水", language: "English", no_english: false });
    expect(mymemoryUrl("水", "ja", "en")).toContain("langpair=ja|en");
    expect(translationText({ responseData: { translatedText: "water" } })).toBe("water");
    expect(translationText({})).toBe("");
    expect(dictionaryEntryDisplayLimit()).toBe(8);
  });

  it("offers Japanese/English and Japanese/Vietnamese translation pairs", () => {
    expect(Object.keys(TR_LANGPAIR).sort()).toEqual([
      "tr-en-jp",
      "tr-jp-en",
      "tr-jp-vi",
      "tr-vi-jp",
    ]);
    expect(TR_LANGPAIR["tr-jp-en"]).toEqual(["ja", "en"]);
    expect(TR_LANGPAIR["tr-en-jp"]).toEqual(["en", "ja"]);
    expect(TR_LANGPAIR["tr-vi-jp"]).toEqual(["vi", "ja"]);
    expect(TR_LANGPAIR["tr-jp-vi"]).toEqual(["ja", "vi"]);
  });
});

describe("reliable romaji", () => {
  it("romanizes kana readings and omits kanji without a reading", () => {
    expect(isKanaOnly("たべもの")).toBe(true);
    expect(isKanaOnly("食べ物")).toBe(false);
    expect(reliableRomaji("みず", converter)).toBe("mizu");
    expect(reliableRomaji("食べ物", converter)).toBe("");
  });
});
