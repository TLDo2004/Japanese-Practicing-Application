import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ProgressStore } from "@jpa/core";
import { createAsyncStoragePersistence } from "./asyncStoragePersistence";
import { readLegacyCapacitorProgressRaw } from "./legacyWebViewStorage";
import { createMobileDictionary } from "./dictionary";
import { createDomMobileSpeech } from "./speechNative";
import type { MobileSpeech } from "./speech";
import { getWanakanaConverter } from "./converter";

type MobileDictionary = ReturnType<typeof createMobileDictionary>;

type PlatformValue = {
  ready: boolean;
  store: ProgressStore;
  save: (patch: Partial<ProgressStore>) => ProgressStore;
  speech: MobileSpeech;
  dictionary: MobileDictionary;
};

const PlatformContext = createContext<PlatformValue | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const services = useMemo(() => {
    const persistence = createAsyncStoragePersistence(AsyncStorage, {
      readLegacyProgress: () => readLegacyCapacitorProgressRaw(),
    });
    return {
      persistence,
      speech: createDomMobileSpeech(),
      dictionary: createMobileDictionary({
        fetch: (url, init) => fetch(url, init),
        converter: getWanakanaConverter(),
      }),
    };
  }, []);

  const [store, setStore] = useState<ProgressStore>(() => services.persistence.load());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await services.persistence.hydrate();
      if (cancelled) return;
      setStore(services.persistence.load());
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [services]);

  const save = useCallback((patch: Partial<ProgressStore>) => {
    const next = services.persistence.save(patch);
    setStore({ ...next });
    return next;
  }, [services]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === "background" || state === "inactive") {
        const current = services.persistence.load();
        services.persistence.save({ lastAt: current.lastAt });
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [services]);

  const value = useMemo<PlatformValue>(() => ({
    ready,
    store,
    save,
    speech: services.speech,
    dictionary: services.dictionary,
  }), [ready, store, save, services]);

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used within PlatformProvider");
  return ctx;
}
