/**
 * Device/runtime recognition entry — may load Skia.
 * Unit tests should import recognizeCore.ts instead.
 */
import type { Alphabet, Drawing, MatchResult } from "@jpa/handwriting";
import { extractInkFromRgba, matchInk, type BinaryInk } from "@jpa/handwriting";
import type { Letter } from "@jpa/kana";
import {
  inkFromLogicalDrawingSoftware,
  recognizeDrawingSoftware,
  recognizeDrawingTimedSoftware,
  templatesForLetters,
  verdictFromMatch,
  type CheckTiming,
  type PadVerdict,
  type RasterBackend,
} from "./recognizeCore";
import { pushDiag, recordCheckDiag } from "./diagnostics";

export {
  getGlyphTemplates,
  templatesForLetters,
  verdictFromMatch,
  inkFromLogicalDrawingSoftware,
  recognizeDrawingSoftware,
  recognizeDrawingTimedSoftware,
} from "./recognizeCore";
export type { PadVerdict, CheckTiming, RasterBackend };

type SkiaTry = {
  rgba: Uint8Array;
  width: number;
  height: number;
  backend: RasterBackend;
  layoutUsed: string;
  fallbackReason?: string;
};

function trySkiaRaster(drawing: Drawing): SkiaTry | null {
  try {
    // Lazy require keeps Vitest away from Skia when tests import recognizeCore only.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { rasterizeDrawingSkia, skiaAvailable } = require("./skiaRaster") as typeof import("./skiaRaster");
    if (!skiaAvailable()) {
      pushDiag("skia-unavailable", {}, "software");
      return null;
    }
    const raster = rasterizeDrawingSkia(drawing);
    return {
      rgba: raster.rgba,
      width: raster.width,
      height: raster.height,
      backend: raster.backend,
      layoutUsed: raster.layoutUsed,
      fallbackReason: raster.fallbackReason,
    };
  } catch (err) {
    pushDiag("skia-require-error", { message: String(err) }, "software");
    return null;
  }
}

export function inkFromLogicalDrawing(drawing: Drawing, preferSkia = true): BinaryInk | null {
  if (preferSkia) {
    const skia = trySkiaRaster(drawing);
    if (skia && skia.backend === "skia") {
      return extractInkFromRgba(skia.rgba, skia.width, skia.height);
    }
  }
  return inkFromLogicalDrawingSoftware(drawing);
}

export function recognizeDrawing(input: {
  drawing: Drawing;
  alphabet: Alphabet;
  expectedRo: string;
  letters: readonly Letter[];
  preferSkia?: boolean;
}): MatchResult {
  if (input.preferSkia === false) return recognizeDrawingSoftware(input);
  const timed = recognizeDrawingTimed(input);
  return timed.result;
}

export function recognizeDrawingTimed(input: {
  drawing: Drawing;
  alphabet: Alphabet;
  expectedRo: string;
  letters: readonly Letter[];
  preferSkia?: boolean;
}): { result: MatchResult; timing: CheckTiming } {
  if (input.preferSkia === false) {
    const soft = recognizeDrawingTimedSoftware(input);
    recordCheckDiag({
      backend: "software",
      timingMs: soft.timing.totalMs,
      result: soft.result,
      drawingStrokeCount: input.drawing.length,
      inkCount: null,
    });
    return soft;
  }

  const t0 = now();
  const skia = trySkiaRaster(input.drawing);
  const t1 = now();

  if (!skia || skia.backend !== "skia") {
    const soft = recognizeDrawingTimedSoftware(input);
    recordCheckDiag({
      backend: "software",
      timingMs: soft.timing.totalMs,
      result: soft.result,
      drawingStrokeCount: input.drawing.length,
      inkCount: null,
    });
    return soft;
  }

  const ink = extractInkFromRgba(skia.rgba, skia.width, skia.height);
  const t2 = now();
  const result = matchInk({
    ink,
    drawing: input.drawing,
    alphabet: input.alphabet,
    expectedRo: input.expectedRo,
    templates: templatesForLetters(input.letters),
  });
  const t3 = now();
  const timing: CheckTiming = {
    rasterMs: t1 - t0,
    extractMs: t2 - t1,
    matchMs: t3 - t2,
    totalMs: t3 - t0,
    backend: "skia",
  };
  recordCheckDiag({
    backend: "skia",
    timingMs: timing.totalMs,
    result,
    drawingStrokeCount: input.drawing.length,
    inkCount: ink?.count ?? 0,
  });
  pushDiag("check-timing", {
    ...timing,
    layoutUsed: skia.layoutUsed,
  }, "skia");
  return { result, timing };
}

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
