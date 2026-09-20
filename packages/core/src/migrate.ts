import type { LastActivity, LastTab, ProgressStore, SessionSnapshot } from "./types";

/**
 * Supported dictionary / translation modes.
 * UI language remains English-only; Vietnamese is dictionary content only.
 */
const SUPPORTED_DICT_MODES = new Set([
  "dict-jp-en",
  "dict-jp-vi",
  "tr-en-jp",
  "tr-jp-en",
  "tr-vi-jp",
  "tr-jp-vi",
]);

export const DEFAULT_DICT_MODE = "dict-jp-en";

export function migrateDictMode(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_DICT_MODE;
  return SUPPORTED_DICT_MODES.has(raw) ? raw : DEFAULT_DICT_MODE;
}

export function emptyStore(): ProgressStore {
  return {
    version: 2,
    lastAt: 0,
    lastSession: null,
    lastTab: "learn",
    lastActivity: null,
    learned: {},
    weak: {},
    dictRecent: [],
    dictMode: DEFAULT_DICT_MODE,
    chartFilter: "basic",
  };
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

export function migrate(raw: unknown): ProgressStore {
  const store = asRecord(raw);
  const next = emptyStore();
  next.lastAt = (store.lastAt as number) || 0;
  next.lastSession = (store.lastSession || null) as SessionSnapshot | null;
  next.lastTab =
    store.lastTab === "practice" || store.lastTab === "dict" || store.lastTab === "learn"
      ? store.lastTab
      : "learn";
  next.lastActivity =
    store.lastActivity && typeof store.lastActivity === "object"
      ? (store.lastActivity as LastActivity)
      : null;
  next.learned =
    store.learned && typeof store.learned === "object"
      ? (store.learned as Record<string, boolean>)
      : {};
  next.weak =
    store.weak && typeof store.weak === "object"
      ? (store.weak as ProgressStore["weak"])
      : {};
  next.dictRecent = Array.isArray(store.dictRecent)
    ? store.dictRecent.filter((s): s is string => typeof s === "string")
    : [];
  next.dictMode = migrateDictMode(store.dictMode);
  next.chartFilter = typeof store.chartFilter === "string" ? store.chartFilter : "basic";
  next.version = 2;
  return next;
}

export function isLastTab(value: unknown): value is LastTab {
  return value === "practice" || value === "dict" || value === "learn";
}
