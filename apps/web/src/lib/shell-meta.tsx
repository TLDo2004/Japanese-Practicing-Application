import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";

export type ShellMeta = {
  title: string;
  progress: string;
};

type ShellMetaValue = {
  meta: ShellMeta | null;
  setMeta: (meta: ShellMeta | null) => void;
};

const ShellMetaContext = createContext<ShellMetaValue | null>(null);

export function ShellMetaProvider({ children }: { children: ReactNode }) {
  const [meta, setMetaState] = useState<ShellMeta | null>(null);
  const setMeta = useCallback((next: ShellMeta | null) => {
    setMetaState(next);
  }, []);
  const value = useMemo(() => ({ meta, setMeta }), [meta, setMeta]);
  return <ShellMetaContext.Provider value={value}>{children}</ShellMetaContext.Provider>;
}

export function useShellMeta(meta: ShellMeta | null) {
  const ctx = useContext(ShellMetaContext);
  if (!ctx) throw new Error("useShellMeta must be used within ShellMetaProvider");
  const { setMeta } = ctx;
  useLayoutEffect(() => {
    setMeta(meta);
  }, [setMeta, meta?.title, meta?.progress]);
}

export function useShellMetaState(): ShellMeta | null {
  const ctx = useContext(ShellMetaContext);
  if (!ctx) throw new Error("useShellMetaState must be used within ShellMetaProvider");
  return ctx.meta;
}
