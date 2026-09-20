import { BY_RO, lettersFor } from "@jpa/kana";
import { buildDeck, isLiveSession, restoreSessionKind, type DeckItem, type PromptScript } from "@jpa/practice";
import type { SessionSnapshot } from "@jpa/core";

export type RestoredSession = {
  kind: "write" | "quiz";
  origin: "learn" | "practice";
  script: PromptScript;
  random: boolean;
  setId: string;
  title: string;
  letters: ReturnType<typeof lettersFor>;
  deck: DeckItem[];
  path: DeckItem[];
  pathIndex: number;
  usedKeys: string[];
  results: SessionSnapshot["results"];
  done: boolean;
};

export function toSessionSnapshot(input: {
  kind: string;
  script: string;
  random: boolean;
  setId: string;
  origin: string;
  usedKeys: string[];
  path: Array<{ ro: string; prompt: string; key: string }>;
  pathIndex: number;
  results: SessionSnapshot["results"];
  title: string;
  done: boolean;
}): SessionSnapshot {
  return {
    kind: input.kind,
    script: input.script,
    random: input.random,
    setId: input.setId,
    origin: input.origin,
    used: input.usedKeys,
    path: input.path.map((item) => ({ ro: item.ro, prompt: item.prompt, key: item.key })),
    pathIndex: input.pathIndex,
    results: input.results,
    view: input.done ? "summary" : input.kind === "quiz" ? "quiz" : "writing",
    done: input.done,
    title: input.title,
  };
}

export function restoreLiveFromSnapshot(last: SessionSnapshot | null | undefined): RestoredSession | null {
  if (!last || !last.path || !last.path.length) return null;
  const kind = restoreSessionKind(last.kind);
  const script: PromptScript = last.script === "kata" || last.script === "both" ? last.script : "hira";
  const setId = last.setId || "full71";
  const letters = lettersFor(setId);
  const deck = buildDeck({ script, letters, random: !!last.random });
  const path: DeckItem[] = [];
  last.path.forEach((item) => {
    const letter = BY_RO[item.ro];
    if (!letter) return;
    const prompt: PromptScript = item.prompt === "kata" || item.prompt === "both" || item.prompt === "hira"
      ? item.prompt
      : script;
    path.push({ ...letter, prompt, key: item.key });
  });
  if (!path.length) return null;
  const pathIndex = Math.min(Math.max(0, last.pathIndex || 0), path.length - 1);
  return {
    kind,
    origin: last.origin === "learn" ? "learn" : "practice",
    script,
    random: !!last.random,
    setId,
    title: last.title || "",
    letters,
    deck,
    path,
    pathIndex,
    usedKeys: Array.isArray(last.used) ? last.used.slice() : [],
    results: last.results || {},
    done: !!last.done,
  };
}

export function snapshotIsLive(last: SessionSnapshot | null | undefined): boolean {
  return isLiveSession(last);
}
