import type { SpeechPort } from "@jpa/core";

export type BrowserSpeech = SpeechPort & {
  speakCurrent: (letter: { hira: string; ro: string } | null) => void;
  setHintHandler: (fn: (message: string) => void) => void;
};

type SpeechDeps = {
  getVoices: () => SpeechSynthesisVoice[];
  speakUtterance: (utterance: SpeechSynthesisUtterance) => void;
  cancel: () => void;
  speaking: () => boolean;
  resume: () => void;
  hasSynthesis: boolean;
  playAudio: (url: string) => Promise<void>;
  getCurrent?: () => { hira: string; ro: string } | null;
  setTimeoutFn?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  setIntervalFn?: (fn: () => void, ms: number) => ReturnType<typeof setInterval>;
  clearIntervalFn?: (id: ReturnType<typeof setInterval>) => void;
  makeUtterance?: (text: string) => SpeechSynthesisUtterance;
};

function pickJaVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return voices.find((v) => /^ja([-_]|$)/i.test(v.lang))
    || voices.find((v) => /japanese|日本語/i.test(v.name))
    || null;
}

function pickAnyVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return voices.find((v) => /^en([-_]|$)/i.test(v.lang)) || voices[0] || null;
}

export const TTS_URLS = (text: string): string[] => [
  `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=ja&q=${encodeURIComponent(text)}`,
  `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ja&q=${encodeURIComponent(text)}`,
];

export function createBrowserSpeech(deps: SpeechDeps): BrowserSpeech {
  let hint = (_message: string) => {};
  let voiceHintShown = false;
  let held: { hira: string; ro: string } | null = null;
  let resumeTimer: ReturnType<typeof setInterval> | null = null;
  const setTimeoutFn = deps.setTimeoutFn || setTimeout;
  const setIntervalFn = deps.setIntervalFn || setInterval;
  const clearIntervalFn = deps.clearIntervalFn || clearInterval;
  const makeUtterance = deps.makeUtterance || ((text: string) => new SpeechSynthesisUtterance(text));
  const current = () => (deps.getCurrent ? deps.getCurrent() : held);

  const stop = () => {
    if (resumeTimer) {
      clearIntervalFn(resumeTimer);
      resumeTimer = null;
    }
    if (deps.hasSynthesis) {
      try { deps.cancel(); } catch { /* ignore */ }
    }
  };

  const speakRomajiFallback = () => {
    const letter = current();
    const ro = letter ? letter.ro : "";
    if (!ro) {
      hint("speak_no_voice");
      return;
    }
    const voice = pickAnyVoice(deps.getVoices());
    if (!deps.hasSynthesis || !voice) {
      hint("speak_no_device");
      return;
    }
    if (!voiceHintShown) {
      voiceHintShown = true;
      hint("speak_romaji");
    }
    try {
      const u = makeUtterance(ro);
      u.lang = voice.lang || "en-US";
      u.voice = voice;
      u.rate = 0.85;
      setTimeoutFn(() => {
        try { deps.speakUtterance(u); } catch { /* ignore */ }
      }, 60);
    } catch {
      hint("speak_no_device");
    }
  };

  const speakWithAudio = (text: string, onFail: () => void) => {
    const urls = TTS_URLS(text);
    let i = 0;
    const tryNext = () => {
      if (i >= urls.length) {
        onFail();
        return;
      }
      const url = urls[i++];
      deps.playAudio(url).catch(() => tryNext());
    };
    tryNext();
  };

  const speak = (text: string) => {
    try {
      speakUnsafe(text);
    } catch {
      try { speakWithAudio(text, speakRomajiFallback); } catch { /* ignore */ }
    }
  };

  const speakUnsafe = (text: string) => {
    if (!text) return;
    stop();
    const ja = pickJaVoice(deps.getVoices());
    if (deps.hasSynthesis && ja) {
      const u = makeUtterance(text);
      u.lang = ja.lang || "ja-JP";
      u.voice = ja;
      u.rate = 0.85;
      let started = false;
      u.onstart = () => { started = true; };
      u.onerror = () => speakWithAudio(text, speakRomajiFallback);
      setTimeoutFn(() => {
        try {
          deps.speakUtterance(u);
        } catch {
          speakWithAudio(text, speakRomajiFallback);
          return;
        }
        resumeTimer = setIntervalFn(() => {
          if (!deps.speaking()) {
            if (resumeTimer) clearIntervalFn(resumeTimer);
            resumeTimer = null;
            return;
          }
          try { deps.resume(); } catch { /* ignore */ }
        }, 200);
        setTimeoutFn(() => {
          if (!started && !deps.speaking()) {
            speakWithAudio(text, speakRomajiFallback);
          }
        }, 700);
      }, 60);
      return;
    }
    speakWithAudio(text, speakRomajiFallback);
  };

  return {
    speak,
    stop,
    speakCurrent(letter) {
      held = letter;
      if (!letter) return;
      speak(letter.hira);
    },
    setHintHandler(fn) {
      hint = fn;
    },
  };
}

export function createDomSpeech(): BrowserSpeech {
  const hasSynthesis = typeof window !== "undefined" && !!window.speechSynthesis;
  let audio: HTMLAudioElement | null = null;
  const speech = createBrowserSpeech({
    hasSynthesis,
    getVoices: () => (hasSynthesis ? window.speechSynthesis.getVoices() || [] : []),
    speakUtterance: (u) => window.speechSynthesis.speak(u),
    cancel: () => { window.speechSynthesis.cancel(); },
    speaking: () => !!window.speechSynthesis?.speaking,
    resume: () => window.speechSynthesis.resume(),
    playAudio: (url) => {
      if (audio) {
        try { audio.pause(); } catch { /* ignore */ }
      }
      audio = new Audio(url);
      return audio.play();
    },
  });
  if (hasSynthesis) {
    try {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    } catch { /* ignore */ }
  }
  return speech;
}
