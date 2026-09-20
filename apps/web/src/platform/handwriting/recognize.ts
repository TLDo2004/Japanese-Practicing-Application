import type { Alphabet, Drawing, GlyphTemplateSet, MatchResult } from "@jpa/handwriting";
import { extractInkFromRgba, loadGlyphTemplates, matchInk } from "@jpa/handwriting";
import type { Letter } from "@jpa/kana";
import packedGlyphs from "@jpa/handwriting/templates/glyphs.json" with { type: "json" };

const templates = loadGlyphTemplates(packedGlyphs);

const matchTimes: number[] = [];

export function getGlyphTemplates(): GlyphTemplateSet {
  return templates;
}

export function templatesForLetters(letters: readonly Letter[]): GlyphTemplateSet {
  const ros = new Set(letters.map((l) => l.ro));
  const filtered: GlyphTemplateSet = {
    hira: templates.hira.filter((item) => ros.has(item.ro)),
    kata: templates.kata.filter((item) => ros.has(item.ro)),
  };
  if (!filtered.hira.length && !filtered.kata.length) return templates;
  return filtered;
}

export function inkFromRgba(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
) {
  return extractInkFromRgba(rgba, width, height);
}

export function inkFromCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !canvas.width || !canvas.height) return null;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return extractInkFromRgba(image.data, image.width, image.height);
}

export function recognizeCanvas(input: {
  canvas: HTMLCanvasElement;
  drawing: Drawing;
  alphabet: Alphabet;
  expectedRo: string;
  letters: readonly Letter[];
}): MatchResult {
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const ink = inkFromCanvas(input.canvas);
  const result = matchInk({
    ink,
    drawing: input.drawing,
    alphabet: input.alphabet,
    expectedRo: input.expectedRo,
    templates: templatesForLetters(input.letters),
  });
  const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - started;
  matchTimes.push(elapsed);
  if (typeof window !== "undefined") {
    (window as Window & { __jpaLastMatchMs?: number }).__jpaLastMatchMs = elapsed;
  }
  return result;
}

export function recognitionLatency(): { median: number; worst: number; samples: number } {
  if (!matchTimes.length) return { median: 0, worst: 0, samples: 0 };
  const sorted = [...matchTimes].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { median, worst: sorted[sorted.length - 1], samples: sorted.length };
}
