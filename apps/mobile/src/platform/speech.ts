import type { SpeechPort } from "@jpa/core";

export type MobileSpeech = SpeechPort & {
  speakCurrent: (letter: { hira: string; ro: string } | null) => void;
  setHintHandler: (fn: (message: string) => void) => void;
};

export const TTS_URLS = (text: string): string[] => [
  `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=ja&q=${encodeURIComponent(text)}`,
  `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ja&q=${encodeURIComponent(text)}`,
];

export type MobileSpeechEngine = {
  speak: (text: string, options: {
    language: string;
    rate: number;
    onError?: () => void;
  }) => void;
  stop: () => void;
};

type AudioPlayer = {
  playUrl: (url: string) => Promise<void>;
  stop: () => void;
};

/**
 * Native SpeechPort core (injectable — no direct expo-speech import here for Vitest).
 *   engine (ja) → Google TTS URL audio → romaji / non-fatal hint
 */
export function createMobileSpeech(deps: {
  engine: MobileSpeechEngine;
  audio?: AudioPlayer | null;
}): MobileSpeech {
  let hint = (_message: string) => {};
  let voiceHintShown = false;
  let held: { hira: string; ro: string } | null = null;
  const audio = deps.audio ?? null;

  const stop = () => {
    try {
      deps.engine.stop();
    } catch {
      /* ignore */
    }
    try {
      audio?.stop();
    } catch {
      /* ignore */
    }
  };

  const speakRomajiFallback = () => {
    const letter = held;
    const ro = letter?.ro || "";
    if (!ro) {
      hint("speak_no_voice");
      return;
    }
    if (!voiceHintShown) {
      voiceHintShown = true;
      hint("speak_romaji");
    }
    try {
      deps.engine.speak(ro, {
        language: "en-US",
        rate: 0.85,
        onError: () => hint("speak_no_device"),
      });
    } catch {
      hint("speak_no_device");
    }
  };

  const speakWithAudio = (text: string, onFail: () => void) => {
    if (!audio) {
      onFail();
      return;
    }
    const urls = TTS_URLS(text);
    let i = 0;
    const tryNext = () => {
      if (i >= urls.length) {
        onFail();
        return;
      }
      const url = urls[i++]!;
      audio.playUrl(url).catch(() => tryNext());
    };
    tryNext();
  };

  const speakJa = (text: string) => {
    if (!text) return;
    stop();
    try {
      deps.engine.speak(text, {
        language: "ja-JP",
        rate: 0.9,
        onError: () => {
          speakWithAudio(text, speakRomajiFallback);
        },
      });
    } catch {
      speakWithAudio(text, speakRomajiFallback);
    }
  };

  return {
    speak: (text: string) => {
      try {
        speakJa(text);
      } catch {
        hint("speak_no_device");
      }
    },
    stop,
    speakCurrent: (letter) => {
      held = letter;
      try {
        if (!letter?.hira) {
          hint("speak_no_voice");
          return;
        }
        speakJa(letter.hira);
      } catch {
        hint("speak_no_device");
      }
    },
    setHintHandler: (fn) => {
      hint = fn;
    },
  };
}
