import * as Speech from "expo-speech";
import { createMobileSpeech, type MobileSpeech } from "./speech";
import { createExpoAudioFallback } from "./audioFallback";

/** Wire expo-speech + expo-audio at the platform boundary. */
export function createDomMobileSpeech(): MobileSpeech {
  return createMobileSpeech({
    engine: {
      speak: (text, options) => {
        Speech.speak(text, {
          language: options.language,
          rate: options.rate,
          onError: options.onError,
        });
      },
      stop: () => {
        Speech.stop();
      },
    },
    audio: createExpoAudioFallback(),
  });
}
