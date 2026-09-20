import { describe, expect, it } from "vitest";
import { createMobileSpeech } from "./speech";
import { createMobileDictionary } from "./dictionary";

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

const converter = {
  toHiragana: (text: string) => (text === "mizu" ? "みず" : text),
  toKatakana: (text: string) => text,
  toRomaji: (text: string) => (text === "みず" ? "mizu" : text),
};

describe("mobile dictionary adapter", () => {
  it("Jisho success path", async () => {
    const dict = createMobileDictionary({
      converter,
      fetch: async (url) => {
        expect(String(url)).toContain("jisho.org");
        return jsonResponse({
          data: [{ japanese: [{ word: "水", reading: "みず" }], senses: [{ english_definitions: ["water"] }] }],
        });
      },
    });
    const result = await dict.search("mizu", "dict-jp-en");
    expect(result.kind).toBe("entries");
  });

  it("Jisho failure → Jotoba", async () => {
    const dict = createMobileDictionary({
      converter: null,
      fetch: async (url) => {
        if (String(url).includes("jisho.org")) throw new Error("blocked");
        return jsonResponse({
          words: [{
            reading: { kanji: "水", kana: "みず", furigana: "[水|みず]" },
            senses: [{ glosses: ["water"] }],
          }],
        });
      },
    });
    const result = await dict.search("水", "dict-jp-en");
    expect(result.kind).toBe("entries");
  });

  it("keeps English glosses with their part of speech and never calls MyMemory", async () => {
    let myMemory = 0;
    const dict = createMobileDictionary({
      converter: null,
      fetch: async (url) => {
        if (String(url).includes("jisho.org")) {
          return jsonResponse({
            data: [{
              japanese: [{ word: "水", reading: "みず" }],
              senses: [
                { english_definitions: ["water"], parts_of_speech: ["Noun"] },
                { english_definitions: ["fluid"] },
              ],
            }],
          });
        }
        myMemory += 1;
        return jsonResponse({ responseData: { translatedText: "x" } });
      },
    });
    const result = await dict.search("水", "dict-jp-en");
    expect(myMemory).toBe(0);
    if (result.kind !== "entries") throw new Error("expected entries");
    expect(result.entries[0].senses).toEqual([
      { pos: "Noun", gloss: "water" },
      { pos: "", gloss: "fluid" },
    ]);
  });

  it("runs the English→Japanese translation mode through MyMemory", async () => {
    const dict = createMobileDictionary({
      converter,
      fetch: async (url) => {
        expect(String(url)).toContain("langpair=en|ja");
        return jsonResponse({ responseData: { translatedText: "水" } });
      },
    });
    const result = await dict.search("water", "tr-en-jp");
    if (result.kind !== "translation") throw new Error("expected translation");
    expect(result.output).toBe("水");
  });
});

describe("mobile speech adapter", () => {
  it("failures are non-fatal", () => {
    const speech = createMobileSpeech({
      engine: {
        speak: (_text, options) => {
          options.onError?.();
        },
        stop: () => {
          throw new Error("stop fail");
        },
      },
      audio: {
        playUrl: async () => { throw new Error("no audio"); },
        stop: () => { throw new Error("audio stop"); },
      },
    });
    speech.setHintHandler(() => {});
    expect(() => speech.speakCurrent(null)).not.toThrow();
    expect(() => speech.speak("水")).not.toThrow();
    expect(() => speech.stop()).not.toThrow();
    expect(() => speech.speakCurrent({ hira: "あ", ro: "a" })).not.toThrow();
  });
});
