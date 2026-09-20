import { countLearned, t, type SessionSnapshot } from "@jpa/core";
import { lettersFor } from "@jpa/kana";
import { isLiveSession, learnContinueKind, practiceContinueVisible } from "@jpa/practice";

export function continueDetail(
  last: SessionSnapshot,
  setLabel: (setId: string) => string,
): { title: string; detail: string; kind: string; seen: number; total: number } {
  const kind = last.kind === "quiz" ? t("kind_reading") : t("kind_writing");
  const scriptName = last.script === "kata"
    ? t("katakana")
    : last.script === "both"
      ? t("script_both")
      : t("hiragana");
  const setName = last.setId ? setLabel(last.setId) : "";
  const total = (last.path && last.path.length) || 0;
  return {
    title: last.title || t("session"),
    detail: [scriptName, setName, kind].filter(Boolean).join(" · "),
    kind,
    seen: Math.min((last.used && last.used.length) || 0, total),
    total,
  };
}

export function scriptProgress(
  script: "hira" | "kata",
  learned: Record<string, boolean>,
): { n: number; total: number; pct: number } {
  const letters = lettersFor("basic46");
  const n = countLearned(learned, script, letters);
  const total = letters.length;
  return { n, total, pct: total ? Math.round((n / total) * 100) : 0 };
}

export function learnContinueState(last: SessionSnapshot | null | undefined): "live" | "start-hira" {
  return learnContinueKind(last);
}

export function showPracticeContinue(last: SessionSnapshot | null | undefined): boolean {
  return practiceContinueVisible(last);
}

export function lastSessionIsLive(last: SessionSnapshot | null | undefined): boolean {
  return isLiveSession(last);
}
