import { describe, expect, it } from "vitest";
import { MASK_SIZE } from "./constants";
import { shiftedMetrics, shiftedMetricsDense } from "./metrics";
import { matchInk } from "./matchInk";
import { matchInkUnoptimized } from "./matchInk.naive";
import { loadGlyphTemplates, unpackInk, type PackedGlyphFile } from "./templates";
import glyphsJson from "../templates/glyphs.json";
import fixturesJson from "../templates/fixtures.json";
import type { Alphabet, Drawing, MatchResult } from "./types";

const glyphs = glyphsJson as PackedGlyphFile;
const templates = loadGlyphTemplates(glyphs);
const fixtures = (fixturesJson as {
  fixtures: Array<{
    id: string;
    alphabet: Alphabet;
    expectedRo: string;
    drawing: Drawing;
    ink: Parameters<typeof unpackInk>[0] | null;
    legacy: MatchResult;
  }>;
}).fixtures;

function randomMask(seed: number): Uint8Array {
  const out = new Uint8Array(MASK_SIZE * MASK_SIZE);
  let x = seed >>> 0;
  for (let i = 0; i < out.length; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    out[i] = x & 7 ? 0 : 1;
  }
  return out;
}

describe("shiftedMetrics packed ≡ dense", () => {
  it("matches on identical filled masks", () => {
    const mask = new Uint8Array(MASK_SIZE * MASK_SIZE);
    mask.fill(1);
    expect(shiftedMetrics(mask, mask)).toEqual(shiftedMetricsDense(mask, mask));
  });

  it("matches on sparse random masks", () => {
    for (const seed of [1, 7, 99, 12345, 424242]) {
      const user = randomMask(seed);
      const tmpl = randomMask(seed * 17);
      const fast = shiftedMetrics(user, tmpl);
      const dense = shiftedMetricsDense(user, tmpl);
      expect(fast.score).toBe(dense.score);
      expect(fast.recall).toBe(dense.recall);
      expect(fast.precision).toBe(dense.precision);
      expect(fast.iou).toBe(dense.iou);
    }
  });
});

describe("optimized matchInk ≡ unoptimized", () => {
  for (const fixture of fixtures) {
    it(`parity: ${fixture.id}`, () => {
      const input = {
        ink: fixture.ink ? unpackInk(fixture.ink) : null,
        drawing: fixture.drawing,
        alphabet: fixture.alphabet,
        expectedRo: fixture.expectedRo,
        templates,
      };
      const fast = matchInk(input);
      const naive = matchInkUnoptimized(input);
      expect(fast.status).toBe(naive.status);
      if (fast.status === "empty" || naive.status === "empty") return;
      expect(fast.best.ro).toBe(naive.best.ro);
      expect(fast.best.ch).toBe(naive.best.ch);
      expect(fast.expectedScore).toBe(naive.expectedScore);
      expect(fast.best.score).toBe(naive.best.score);
    });
  }
});
