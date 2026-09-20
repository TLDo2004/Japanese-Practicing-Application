import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ProgressStore } from "@jpa/core";
import { createLocalStoragePersistence } from "./persistence/localStorage";
import { createDomSpeech, type BrowserSpeech } from "./speech/browserSpeech";
import { createDomDictionary } from "./dictionary/webDictionary";
import type { createWebDictionary } from "./dictionary/webDictionary";

type WebDictionary = ReturnType<typeof createWebDictionary>;

type PlatformValue = {
  store: ProgressStore;
  save: (patch: Partial<ProgressStore>) => ProgressStore;
  speech: BrowserSpeech;
  dictionary: WebDictionary;
};

const PlatformContext = createContext<PlatformValue | null>(null);

function createBrowserPlatform() {
  const storage = typeof localStorage === "undefined"
    ? { getItem: () => null, setItem: () => {} }
    : localStorage;
  return {
    persistence: createLocalStoragePersistence(storage),
    speech: createDomSpeech(),
    dictionary: createDomDictionary(),
  };
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const platform = useMemo(() => createBrowserPlatform(), []);
  const [store, setStore] = useState<ProgressStore>(() => platform.persistence.load());

  const save = useCallback((patch: Partial<ProgressStore>) => {
    const next = platform.persistence.save(patch);
    setStore(next);
    return next;
  }, [platform]);

  const value = useMemo<PlatformValue>(() => ({
    store,
    save,
    speech: platform.speech,
    dictionary: platform.dictionary,
  }), [store, save, platform]);

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used within PlatformProvider");
  return ctx;
}
