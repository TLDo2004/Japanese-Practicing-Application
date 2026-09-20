import { describe, expect, it } from "vitest";
import { verdictFromMatch } from "./verdict";
import type { MatchResult } from "@jpa/handwriting";

const t = (key: string, vars?: Record<string, string | number>) => {
  if (key === "looks_like") return `That looks more like ${vars?.ro}.`;
  if (key === "correct") return "Correct";
  if (key === "empty_write") return "Draw the character first.";
  if (key === "not_quite") return "Not quite — try again.";
  return key;
};

describe("writing verdict reveal fields", () => {
  it("marks correct without exposing looksLikeRo", () => {
    const result = { status: "ok" } as MatchResult;
    expect(verdictFromMatch(result, "ka", t)).toEqual({ status: "ok", text: "Correct" });
  });

  it("attaches looksLikeRo for confident wrong guesses", () => {
    const result = {
      status: "bad",
      expectedScore: 0.2,
      best: { ro: "se", score: 0.8 },
    } as MatchResult;
    const verdict = verdictFromMatch(result, "ka", t);
    expect(verdict.status).toBe("bad");
    expect(verdict.looksLikeRo).toBe("se");
  });
});
