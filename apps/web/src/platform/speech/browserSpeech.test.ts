import { describe, expect, it, vi } from "vitest";
import { TTS_URLS, createBrowserSpeech } from "./browserSpeech";

function voice(lang: string, name: string): SpeechSynthesisVoice {
  return { lang, name } as SpeechSynthesisVoice;
}

function fakeUtterance(text: string): SpeechSynthesisUtterance {
  return { text, lang: "", rate: 1, voice: null, onstart: null, onerror: null } as SpeechSynthesisUtterance;
}

describe("browser speech adapter", () => {
  it("prefers a Japanese voice at rate 0.85 and speaks current.hira", () => {
    const spoken: SpeechSynthesisUtterance[] = [];
    const speech = createBrowserSpeech({
      hasSynthesis: true,
      getVoices: () => [voice("en-US", "English"), voice("ja-JP", "Japanese")],
      speakUtterance: (u) => spoken.push(u),
      cancel: () => {},
      speaking: () => true,
      resume: () => {},
      playAudio: async () => {},
      getCurrent: () => ({ hira: "あ", ro: "a" }),
      makeUtterance: fakeUtterance,
      setTimeoutFn: (fn) => {
        fn();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      },
      setIntervalFn: () => 0 as unknown as ReturnType<typeof setInterval>,
      clearIntervalFn: () => {},
    });
    speech.speakCurrent({ hira: "あ", ro: "a" });
    expect(spoken).toHaveLength(1);
    expect(spoken[0].text).toBe("あ");
    expect(spoken[0].rate).toBe(0.85);
    expect(spoken[0].lang).toBe("ja-JP");
  });

  it("falls back through Google TTS URLs then romaji when synthesis is missing", async () => {
    const urls: string[] = [];
    const hints: string[] = [];
    const speech = createBrowserSpeech({
      hasSynthesis: false,
      getVoices: () => [],
      speakUtterance: () => {},
      cancel: () => {},
      speaking: () => false,
      resume: () => {},
      getCurrent: () => ({ hira: "あ", ro: "a" }),
      playAudio: async (url) => {
        urls.push(url);
        throw new Error("fail");
      },
    });
    speech.setHintHandler((m) => hints.push(m));
    speech.speak("あ");
    await vi.waitFor(() => expect(hints.length).toBeGreaterThan(0));
    expect(urls).toEqual(TTS_URLS("あ"));
    expect(hints).toContain("speak_no_device");
  });

  it("uses English/any voice for the romaji fallback after TTS failure", async () => {
    const spoken: SpeechSynthesisUtterance[] = [];
    const hints: string[] = [];
    const speech = createBrowserSpeech({
      hasSynthesis: true,
      getVoices: () => [voice("en-US", "English")],
      speakUtterance: (u) => spoken.push(u),
      cancel: () => {},
      speaking: () => false,
      resume: () => {},
      getCurrent: () => ({ hira: "シ", ro: "shi" }),
      playAudio: async () => {
        throw new Error("fail");
      },
      makeUtterance: fakeUtterance,
      setTimeoutFn: (fn) => {
        fn();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      },
      setIntervalFn: () => 0 as unknown as ReturnType<typeof setInterval>,
      clearIntervalFn: () => {},
    });
    speech.setHintHandler((m) => hints.push(m));
    speech.speakCurrent({ hira: "シ", ro: "shi" });
    await vi.waitFor(() => expect(spoken.some((u) => u.text === "shi")).toBe(true));
    expect(hints).toContain("speak_romaji");
  });
});
