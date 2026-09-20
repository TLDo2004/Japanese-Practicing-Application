import { describe, expect, it } from "vitest";
import {
  extractInkFromRgba,
  matchInk,
  loadGlyphTemplates,
  rasterizeDrawingRgba,
  type BinaryInk,
  type Drawing,
} from "@jpa/handwriting";
import packedGlyphs from "@jpa/handwriting/templates/glyphs.json";
import drawingFixtures from "./drawingFixtures.json";
import { inkFromLogicalDrawingSoftware, recognizeDrawingSoftware } from "./recognizeCore";

const templates = loadGlyphTemplates(packedGlyphs);

function inkIou(a: BinaryInk, b: BinaryInk): number {
  if (a.w !== b.w || a.h !== b.h) return 0;
  let inter = 0;
  let union = 0;
  for (let i = 0; i < a.ink.length; i++) {
    const av = a.ink[i]!;
    const bv = b.ink[i]!;
    if (av || bv) union++;
    if (av && bv) inter++;
  }
  return union ? inter / union : 1;
}

describe("Drawing fixtures: software reference raster parity", () => {
  it("loads Drawing-based fixtures", () => {
    expect(drawingFixtures.fixtures.length).toBeGreaterThanOrEqual(8);
  });

  for (const fixture of drawingFixtures.fixtures) {
    it(`reference raster + matchInk: ${fixture.id}`, () => {
      const drawing = fixture.drawing as Drawing;
      const refRaster = rasterizeDrawingRgba(drawing);
      const refInk = extractInkFromRgba(refRaster.rgba, refRaster.width, refRaster.height);
      const mobileInk = inkFromLogicalDrawingSoftware(drawing);
      if (!refInk && !mobileInk) {
        expect(fixture.legacyStatus).toBe("empty");
        return;
      }
      expect(refInk).not.toBeNull();
      expect(mobileInk).not.toBeNull();
      const ratio = mobileInk!.count / refInk!.count;
      expect(ratio).toBeGreaterThanOrEqual(0.85);
      expect(ratio).toBeLessThanOrEqual(1.15);
      expect(inkIou(refInk!, mobileInk!)).toBeGreaterThanOrEqual(0.75);

      const refMatch = matchInk({
        ink: refInk,
        drawing,
        alphabet: fixture.alphabet as "hira" | "kata",
        expectedRo: fixture.expectedRo,
        templates,
      });
      const mobileMatch = recognizeDrawingSoftware({
        drawing,
        alphabet: fixture.alphabet as "hira" | "kata",
        expectedRo: fixture.expectedRo,
        letters: [],
      });
      expect(mobileMatch.status).toBe(refMatch.status);
      if (refMatch.status !== "empty" && mobileMatch.status !== "empty") {
        expect(mobileMatch.best.ro).toBe(refMatch.best.ro);
        expect(mobileMatch.expectedScore).toBeCloseTo(refMatch.expectedScore, 8);
      }
    });
  }
});

describe("シ/ツ/ソ/ン Drawing fixtures feed geometry", () => {
  const ids = [
    "kata-shi-horizontal-strokes",
    "kata-tsu-vertical-strokes",
    "kata-so-vertical-strokes",
    "kata-n-horizontal-strokes",
  ];
  for (const id of ids) {
    it(`${id} reaches matchInk with non-empty Drawing`, () => {
      const fixture = drawingFixtures.fixtures.find((f) => f.id === id);
      expect(fixture).toBeTruthy();
      expect(fixture!.drawing.length).toBeGreaterThan(0);
      const result = recognizeDrawingSoftware({
        drawing: fixture!.drawing as Drawing,
        alphabet: "kata",
        expectedRo: fixture!.expectedRo,
        letters: [],
      });
      expect(result.status).not.toBe("empty");
    });
  }
});
