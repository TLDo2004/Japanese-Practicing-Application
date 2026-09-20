import type { AudioPlayer } from "expo-audio";

/**
 * Google TTS URL playback via expo-audio (preferred over deprecated expo-av).
 * Any failure is non-fatal for SpeechPort callers.
 */
export function createExpoAudioFallback(): {
  playUrl: (url: string) => Promise<void>;
  stop: () => void;
} {
  let current: AudioPlayer | null = null;

  return {
    async playUrl(url: string) {
      const { createAudioPlayer } = await import("expo-audio");
      try {
        current?.remove();
      } catch {
        /* ignore */
      }
      const player = createAudioPlayer({ uri: url });
      current = player;
      player.play();
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => resolve(), 8000);
        try {
          player.addListener("playbackStatusUpdate", (status) => {
            if ("didJustFinish" in status && status.didJustFinish) {
              clearTimeout(timer);
              resolve();
            }
          });
        } catch (err) {
          clearTimeout(timer);
          reject(err);
        }
      });
    },
    stop() {
      try {
        current?.pause();
        current?.remove();
      } catch {
        /* ignore */
      }
      current = null;
    },
  };
}
