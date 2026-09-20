import type { AttemptResult, DeckItem, PromptScript } from "./types";
import { BY_RO, type Letter } from "@jpa/kana";

export function recordAttempt(
  results: Record<string, AttemptResult>,
  key: string,
  ok: boolean,
): Record<string, AttemptResult> {
  if (!key) return results;
  const prev = results[key] || { first: null, missed: false };
  if (prev.first === null) prev.first = ok ? "ok" : "bad";
  if (!ok) prev.missed = true;
  return { ...results, [key]: prev };
}

export function shouldRecordSessionResult(learnDrill: boolean): boolean {
  return !learnDrill;
}

export function missedLetters(
  results: Record<string, AttemptResult>,
  path: readonly DeckItem[],
  deck: readonly DeckItem[],
  modeScript: PromptScript,
): DeckItem[] {
  return Object.keys(results)
    .filter((k) => results[k].missed)
    .map((k) => {
      const item = path.find((p) => p.key === k) || deck.find((d) => d.key === k);
      if (item) return item;
      const ro = k.replace(/-hira$/, "").replace(/-kata$/, "");
      const letter = BY_RO[ro];
      if (!letter) return null;
      const prompt: PromptScript = k.endsWith("-hira")
        ? "hira"
        : k.endsWith("-kata")
          ? "kata"
          : modeScript;
      return { ...letter, prompt, key: k };
    })
    .filter((item): item is DeckItem => Boolean(item));
}

export function dedupeMissedByRo(missed: readonly DeckItem[]): Letter[] {
  const letters: Letter[] = [];
  const seen = new Set<string>();
  missed.forEach((m) => {
    if (seen.has(m.ro)) return;
    seen.add(m.ro);
    const base = BY_RO[m.ro];
    if (base) letters.push(base);
  });
  return letters;
}

export function summaryCounts(
  results: Record<string, AttemptResult>,
  usedSize: number,
  missedCount: number,
): { total: number; firstOk: number; missed: number } {
  const total = Object.keys(results).length || usedSize;
  const firstOk = Object.values(results).filter((r) => r.first === "ok").length;
  return { total, firstOk, missed: missedCount };
}

export function writingCheckOutcome(
  judged: ReadonlyArray<{ status: string }>,
): "empty" | "ok" | "bad" {
  if (judged.every((r) => r.status === "empty")) return "empty";
  const allOk = judged.filter((r) => r.status !== "empty").every((r) => r.status === "ok");
  return allOk ? "ok" : "bad";
}

export function learnedScriptsForPrompt(
  prompt: PromptScript,
  sessionScript: PromptScript,
): Array<"hira" | "kata"> {
  const script = prompt === "both" ? sessionScript : prompt || sessionScript;
  if (script === "both") return ["hira", "kata"];
  return [script === "kata" ? "kata" : "hira"];
}
