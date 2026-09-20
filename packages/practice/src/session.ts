import type { PromptScript, QuizModeId, WriteModeId } from "./types";

export function writeModeMeta(id: string): { script: PromptScript; random: boolean } {
  const map: Record<WriteModeId, { script: PromptScript; random: boolean }> = {
    hira: { script: "hira", random: false },
    kata: { script: "kata", random: false },
    both: { script: "both", random: false },
    random: { script: "both", random: true },
    lookalikes: { script: "hira", random: false },
  };
  return map[id as WriteModeId] || map.hira;
}

export function quizModeMeta(id: string): { script: PromptScript; random: boolean } {
  const map: Record<QuizModeId, { script: PromptScript; random: boolean }> = {
    hira: { script: "hira", random: false },
    kata: { script: "kata", random: false },
    both: { script: "both", random: true },
  };
  return map[id as QuizModeId] || map.hira;
}

export function resolveLookalikesChoice(setId: string): {
  script: PromptScript;
  random: boolean;
  setId: "lookalikes";
} | null {
  if (!(setId === "lookalikes" || setId.startsWith("lookalikes-"))) return null;
  let script: PromptScript = "hira";
  let random = false;
  if (setId === "lookalikes-kata") script = "kata";
  else if (setId === "lookalikes-both") script = "both";
  else if (setId === "lookalikes-random") {
    script = "both";
    random = true;
  }
  return { script, random, setId: "lookalikes" };
}

export function atFrontier(pathIndex: number, pathLength: number): boolean {
  return pathIndex >= pathLength - 1;
}

export function nextRequiresCheck(opts: {
  learnDrill: boolean;
  atFrontier: boolean;
  checkedCurrent: boolean;
}): boolean {
  if (opts.learnDrill) return false;
  return opts.atFrontier && !opts.checkedCurrent;
}

export function isLiveSession(last: { done?: boolean; path?: unknown[] } | null | undefined): boolean {
  return !!(last && !last.done && last.path && last.path.length);
}

export function practiceContinueVisible(last: { done?: boolean; path?: unknown[] } | null | undefined): boolean {
  return isLiveSession(last);
}

export function learnContinueKind(
  last: { done?: boolean; path?: unknown[] } | null | undefined,
): "live" | "start-hira" {
  return isLiveSession(last) ? "live" : "start-hira";
}

export function restoreSessionKind(kind: string | undefined): "write" | "quiz" {
  return kind === "quiz" ? "quiz" : "write";
}

export function restoreSessionScript(script: string | undefined): string {
  return script || "hira";
}

export function restoreSessionSetId(setId: string | undefined): string {
  return setId || "full71";
}

export function restoreSessionOrigin(originArg: string | undefined, lastOrigin: string | undefined): string {
  return originArg || lastOrigin || "practice";
}
