import { matchPeers } from "@jpa/kana";
import type { MatchResult } from "@jpa/handwriting";

export type PadVerdict = {
  status: "" | "ok" | "bad";
  text: string;
  /** Romaji of a confident wrong guess, when available. */
  looksLikeRo?: string;
};

export function verdictFromMatch(
  result: MatchResult,
  expectedRo: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): PadVerdict {
  if (result.status === "empty") return { status: "", text: t("empty_write") };
  if (result.status === "ok") return { status: "ok", text: t("correct") };
  if (result.best && result.best.ro && result.best.ro !== expectedRo) {
    const peers = matchPeers(expectedRo);
    const similar = peers.includes(result.best.ro);
    const enough = similar
      ? result.best.score >= (result.expectedScore || 0) - 0.01
      : result.best.score >= 0.33 && result.best.score >= (result.expectedScore || 0) + 0.05;
    if (enough) {
      return {
        status: "bad",
        text: t("looks_like", { ro: result.best.ro }),
        looksLikeRo: result.best.ro,
      };
    }
  }
  return { status: "bad", text: t("not_quite") };
}
