/**
 * Human Drawing corpus baseline lock.
 * Phase 9C lock preserved in fixture.phase9cBaseline.
 * fixture.baseline reflects current intentional recognizer behavior (Phase 9D Proposal 1).
 */
import { describe, expect, it } from "vitest";
import packedGlyphs from "@jpa/handwriting/templates/glyphs.json";
import {
  LOGICAL_PAD,
  extractInkFromRgba,
  loadGlyphTemplates,
  matchInk,
  rasterizeDrawingRgba,
  type Drawing,
} from "@jpa/handwriting";
import corpus from "./humanDrawings.corpus.json";

const templates = loadGlyphTemplates(packedGlyphs);

describe("human Drawing corpus baseline", () => {
  it("retains the required human characters with multi-attempt peers", () => {
    const keys = corpus.fixtures.map((f) => `${f.alphabet}:${f.expectedRo}`);
    for (const need of [
      "hira:a",
      "hira:ki",
      "hira:ka",
      "kata:a",
      "kata:ka",
      "kata:shi",
      "kata:tsu",
      "kata:so",
      "kata:n",
    ]) {
      expect(keys).toContain(need);
    }
    expect(keys.filter((k) => k === "kata:shi").length).toBeGreaterThanOrEqual(3);
    expect(keys.filter((k) => k === "kata:tsu").length).toBeGreaterThanOrEqual(3);
    expect(keys.filter((k) => k === "kata:n").length).toBeGreaterThanOrEqual(3);
    expect(keys.filter((k) => k === "kata:so").length).toBeGreaterThanOrEqual(2);
  });

  it("preserves Phase 9C historical baselines separately", () => {
    const a = corpus.fixtures.find((f) => f.id === "human-kata-a-1");
    expect(a?.phase9cBaseline?.status).toBe("bad");
    expect(a?.baseline.status).toBe("ok");
  });

  for (const fixture of corpus.fixtures) {
    it(`baseline lock: ${fixture.id}`, () => {
      const drawing = fixture.drawing as Drawing;
      const { rgba, width, height } = rasterizeDrawingRgba(drawing, LOGICAL_PAD);
      const ink = extractInkFromRgba(rgba, width, height);
      const result = matchInk({
        ink,
        drawing,
        alphabet: fixture.alphabet as "hira" | "kata",
        expectedRo: fixture.expectedRo,
        templates,
      });
      expect(result.status).toBe(fixture.baseline.status);
      if (result.status === "empty") return;
      expect(result.best.ro).toBe(fixture.baseline.best);
      expect(result.expectedScore).toBeCloseTo(fixture.baseline.expectedScore ?? 0, 5);
      if (fixture.baseline.acceptReason) {
        expect(result.acceptReason).toBe(fixture.baseline.acceptReason);
      }
      if (fixture.baseline.globalBest) {
        expect(result.globalBest.ro).toBe(fixture.baseline.globalBest);
      }
    });
  }
});
