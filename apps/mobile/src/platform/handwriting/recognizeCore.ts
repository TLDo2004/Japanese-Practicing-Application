import type { Alphabet, Drawing, MatchResult } from "@jpa/handwriting";
import {
  extractInkFromRgba,
  loadGlyphTemplates,
  matchInk,
  rasterizeDrawingRgba,
  LOGICAL_PAD,
  type BinaryInk,
} from "@jpa/handwriting";
import type { Letter } from "@jpa/kana";
import packedGlyphs from "@jpa/handwriting/templates/glyphs.json";
import { matchPeers } from "@jpa/kana";

const templates = loadGlyphTemplates(packedGlyphs);

export type PadVerdict = {
  status: "" | "ok" | "bad";
  text: string;
  looksLikeRo?: string;
};

export type RasterBackend = "skia" | "software";

export function getGlyphTemplates() {
  return templates;
}

export function templatesForLetters(letters: readonly Letter[]) {
  const ros = new Set(letters.map((l) => l.ro));
  const filtered = {
    hira: templates.hira.filter((item) => ros.has(item.ro)),
    kata: templates.kata.filter((item) => ros.has(item.ro)),
  };
  if (!filtered.hira.length && !filtered.kata.length) return templates;
  return filtered;
}

/** Pure software recognition raster (Vitest-safe, browser-equivalent). */
export function inkFromLogicalDrawingSoftware(drawing: Drawing): BinaryInk | null {
  const { rgba, width, height } = rasterizeDrawingRgba(drawing, LOGICAL_PAD);
  return extractInkFromRgba(rgba, width, height);
}

export function recognizeDrawingSoftware(input: {
  drawing: Drawing;
  alphabet: Alphabet;
  expectedRo: string;
  letters: readonly Letter[];
}): MatchResult {
  const ink = inkFromLogicalDrawingSoftware(input.drawing);
  return matchInk({
    ink,
    drawing: input.drawing,
    alphabet: input.alphabet,
    expectedRo: input.expectedRo,
    templates: templatesForLetters(input.letters),
  });
}

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

export type CheckTiming = {
  rasterMs: number;
  extractMs: number;
  matchMs: number;
  totalMs: number;
  backend: RasterBackend;
};

export function recognizeDrawingTimedSoftware(input: {
  drawing: Drawing;
  alphabet: Alphabet;
  expectedRo: string;
  letters: readonly Letter[];
}): { result: MatchResult; timing: CheckTiming } {
  const t0 = now();
  const { rgba, width, height } = rasterizeDrawingRgba(input.drawing, LOGICAL_PAD);
  const t1 = now();
  const ink = extractInkFromRgba(rgba, width, height);
  const t2 = now();
  const result = matchInk({
    ink,
    drawing: input.drawing,
    alphabet: input.alphabet,
    expectedRo: input.expectedRo,
    templates: templatesForLetters(input.letters),
  });
  const t3 = now();
  return {
    result,
    timing: {
      rasterMs: t1 - t0,
      extractMs: t2 - t1,
      matchMs: t3 - t2,
      totalMs: t3 - t0,
      backend: "software",
    },
  };
}

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
