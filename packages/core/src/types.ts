export type LastTab = "learn" | "practice" | "dict";

export type SessionKind = "write" | "quiz";

export type SessionScript = "hira" | "kata" | "both";

export type SessionPathItem = {
  ro: string;
  prompt: string;
  key: string;
};

export type AttemptResult = {
  first: "ok" | "bad" | null;
  missed: boolean;
};

export type SessionSnapshot = {
  kind: string;
  script: string;
  random: boolean;
  setId: string;
  origin: string;
  used: string[];
  path: SessionPathItem[];
  pathIndex: number;
  results: Record<string, AttemptResult>;
  view: string;
  done: boolean;
  title: string;
};

export type LastActivity = {
  kind: string;
  script: string;
  setId: string;
  title: string;
  origin: string;
};

export type WeakEntry = {
  wrong: number;
  right: number;
};

export type ProgressStore = {
  version: 2;
  lastAt: number;
  lastSession: SessionSnapshot | null;
  lastTab: LastTab;
  lastActivity: LastActivity | null;
  learned: Record<string, boolean>;
  weak: Record<string, WeakEntry>;
  dictRecent: string[];
  dictMode: string;
  chartFilter: string;
};

export type PersistencePort = {
  load: () => ProgressStore;
  save: (patch: Partial<ProgressStore>) => ProgressStore;
};

export type SpeechPort = {
  speak: (text: string) => void;
  stop: () => void;
};
