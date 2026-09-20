import { describe, expect, it } from "vitest";
import { createWebDictionary } from "./webDictionary";

const converter = {
  toHiragana: (text: string) => (text === "mizu" ? "みず" : text),
  toKatakana: (text: string) => (text === "mizu" ? "ミズ" : text),
  toRomaji: (text: string) => (text === "みず" ? "mizu" : text),
};

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

describe("web dictionary adapter", () => {
  it("converts romaji queries before Jisho", async () => {
    const urls: string[] = [];
    const dict = createWebDictionary({
      converter,
      fetch: async (url) => {
        urls.push(String(url));
        return jsonResponse({ data: [{ japanese: [{ word: "水", reading: "みず" }], senses: [{ english_definitions: ["water"] }] }] });
      },
    });
    const result = await dict.search("mizu", "dict-jp-en");
    expect(urls[0]).toContain(encodeURIComponent("みず"));
    expect(result.kind).toBe("entries");
    if (result.kind === "entries") {
      expect(result.note).toContain("mizu → みず");
      expect(result.entries[0].romaji).toBe("mizu");
      expect(result.entries[0].ruby[0]).toEqual({ kind: "ruby", base: "水", rt: "みず" });
    }
  });

  it("falls back to Jotoba when Jisho fetch fails", async () => {
    const dict = createWebDictionary({
      converter: null,
      fetch: async (url, init) => {
        if (String(url).includes("jisho.org")) throw new Error("blocked");
        expect(init?.method).toBe("POST");
        return jsonResponse({
          words: [{
            reading: { kanji: "水", kana: "みず", furigana: "[水|みず]" },
            senses: [{ glosses: ["water"], pos: ["Noun"] }],
          }],
        });
      },
    });
    const result = await dict.search("水", "dict-jp-en");
    expect(result.kind).toBe("entries");
    if (result.kind === "entries") {
      expect(result.entries[0].word).toBe("水");
      expect(result.entries[0].senses[0]).toEqual({ pos: "Noun", gloss: "water" });
    }
  });

  it("keeps the English gloss and part of speech for each sense", async () => {
    const dict = createWebDictionary({
      converter: null,
      fetch: async () => jsonResponse({
        data: [{
          japanese: [{ word: "水", reading: "みず" }],
          senses: [
            { english_definitions: ["water", "cold water"], parts_of_speech: ["Noun"] },
            { english_definitions: ["fluid"] },
          ],
        }],
      }),
    });
    const result = await dict.search("水", "dict-jp-en");
    if (result.kind !== "entries") throw new Error("expected entries");
    expect(result.entries[0].senses).toEqual([
      { pos: "Noun", gloss: "water; cold water" },
      { pos: "", gloss: "fluid" },
    ]);
  });

  it("reports search_failed when Jisho and Jotoba both fail", async () => {
    const dict = createWebDictionary({
      converter: null,
      fetch: async () => {
        throw new Error("offline");
      },
    });
    const result = await dict.search("水", "dict-jp-en");
    expect(result.kind).toBe("error");
    if (result.kind === "error") expect(result.note).toBe("search_failed");
  });

  it("runs the English→Japanese translation mode through MyMemory", async () => {
    const dict = createWebDictionary({
      converter,
      fetch: async (url) => {
        expect(String(url)).toContain("langpair=en|ja");
        return jsonResponse({ responseData: { translatedText: "みず" } });
      },
    });
    const result = await dict.search("water", "tr-en-jp");
    expect(result.kind).toBe("translation");
    if (result.kind !== "translation") throw new Error("expected translation");
    expect(result.output).toBe("みず");
    expect(result.japaneseText).toBe("みず");
    expect(result.romaji).toBe("mizu");
    expect(result.speakText).toBe("みず");
  });

  it("converts romaji before the Japanese→English translation mode", async () => {
    const dict = createWebDictionary({
      converter,
      fetch: async (url) => {
        expect(String(url)).toContain("langpair=ja|en");
        expect(String(url)).toContain(encodeURIComponent("みず"));
        return jsonResponse({ responseData: { translatedText: "water" } });
      },
    });
    const result = await dict.search("mizu", "tr-jp-en");
    if (result.kind !== "translation") throw new Error("expected translation");
    expect(result.output).toBe("water");
    expect(result.note).toBe("mizu → みず / ミズ");
    expect(result.japaneseText).toBe("みず");
    expect(result.romaji).toBe("mizu");
    expect(result.speakText).toBe("みず");
  });

  it("supports Vietnamese→Japanese and Japanese→Vietnamese translation", async () => {
    const dict = createWebDictionary({
      converter,
      fetch: async (url) => {
        const u = String(url);
        if (u.includes("langpair=vi|ja")) {
          return jsonResponse({ responseData: { translatedText: "みず" } });
        }
        if (u.includes("langpair=ja|vi")) {
          return jsonResponse({ responseData: { translatedText: "nước" } });
        }
        throw new Error(`unexpected ${u}`);
      },
    });
    const viJp = await dict.search("nước", "tr-vi-jp");
    expect(viJp.kind).toBe("translation");
    if (viJp.kind === "translation") {
      expect(viJp.output).toBe("みず");
      expect(viJp.romaji).toBe("mizu");
      expect(viJp.speakText).toBe("みず");
    }
    const jpVi = await dict.search("みず", "tr-jp-vi");
    expect(jpVi.kind).toBe("translation");
    if (jpVi.kind === "translation") {
      expect(jpVi.output).toBe("nước");
      expect(jpVi.speakText).toBe("みず");
    }
  });

  it("enriches Japanese→Vietnamese dictionary glosses via MyMemory", async () => {
    const dict = createWebDictionary({
      converter: null,
      fetch: async (url) => {
        const u = String(url);
        if (u.includes("jisho.org")) {
          return jsonResponse({
            data: [{
              japanese: [{ word: "水", reading: "みず" }],
              senses: [{ english_definitions: ["water"], parts_of_speech: ["Noun"] }],
            }],
          });
        }
        if (u.includes("langpair=ja|vi")) {
          return jsonResponse({ responseData: { translatedText: "nước" } });
        }
        throw new Error(`unexpected ${u}`);
      },
    });
    const result = await dict.search("水", "dict-jp-vi");
    expect(result.kind).toBe("entries");
    if (result.kind === "entries") {
      expect(result.entries[0].senses[0].gloss).toBe("nước");
      expect(result.entries[0].speakText).toBe("水");
    }
  });

  it("omits romaji when Japanese has kanji and no reliable reading", async () => {
    const dict = createWebDictionary({
      converter,
      fetch: async (url) => {
        const u = String(url);
        if (u.includes("langpair=en|ja")) {
          return jsonResponse({ responseData: { translatedText: "漢字" } });
        }
        if (u.includes("jisho.org") || u.includes("jotoba")) {
          throw new Error("no reading");
        }
        throw new Error(u);
      },
    });
    const result = await dict.search("kanji", "tr-en-jp");
    if (result.kind !== "translation") throw new Error("expected translation");
    expect(result.output).toBe("漢字");
    expect(result.romaji).toBe("");
    expect(result.speakText).toBe("漢字");
  });
});
