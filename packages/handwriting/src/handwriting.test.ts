import { describe, expect, it } from "vitest";
import { MASK_SIZE } from "./constants";
import { dilate, isInkTooSparse } from "./dilate";
import { inkAspect, kataGeometryOk, pickShown } from "./geometry";
import { kataScore, matchThresholds, shiftedMetrics } from "./metrics";
import { analyzeStrokes, resample } from "./strokes";
import { toMask } from "./mask";
import type { BinaryInk, MatchCandidate } from "./types";

function blockInk(w: number, h: number): BinaryInk {
  const ink = new Uint8Array(w * h);
  ink.fill(1);
  return { ink, w, h, minX: 0, minY: 0, maxX: w - 1, maxY: h - 1, count: w * h };
}

describe("sparse ink and dilation", () => {
  it("rejects ink below the legacy empty threshold", () => {
    expect(isInkTooSparse(89, 100, 100)).toBe(true);
    expect(isInkTooSparse(90, 100, 100)).toBe(false);
    expect(isInkTooSparse(159, 200, 200)).toBe(true);
    expect(isInkTooSparse(160, 200, 200)).toBe(false);
  });

  it("dilates a single pixel with a disk radius", () => {
    const mask = new Uint8Array(9);
    mask[4] = 1;
    const out = dilate(mask, 3, 1);
    expect([...out]).toEqual([0, 1, 0, 1, 1, 1, 0, 1, 0]);
    expect(dilate(mask, 3, 0)).toBe(mask);
  });
});

describe("mask metrics", () => {
  it("fits bbox ink into a 56×56 mask and scores identical templates at 1", () => {
    expect(MASK_SIZE).toBe(56);
    const mask = toMask(blockInk(10, 10));
    expect(mask.length).toBe(56 * 56);
    expect(mask.some(Boolean)).toBe(true);
    const m = shiftedMetrics(mask, mask);
    expect(m.recall).toBeCloseTo(1);
    expect(m.precision).toBeCloseTo(1);
    expect(m.iou).toBeCloseTo(1);
    expect(m.score).toBeCloseTo(1);
    expect(kataScore({ recall: 1, precision: 1, iou: 1 })).toBeCloseTo(1);
  });

  it("uses the legacy hira/kata/yōon thresholds", () => {
    expect(matchThresholds({ isCombo: false, kata: false })).toEqual({
      minScore: 0.33,
      minRecall: 0.38,
      minPrecision: 0.38,
      closeMargin: 0.04,
      peerGap: 0.03,
    });
    expect(matchThresholds({ isCombo: false, kata: true }).minPrecision).toBe(0.46);
    expect(matchThresholds({ isCombo: true, kata: false }).minScore).toBe(0.28);
  });
});

describe("strokes", () => {
  it("resamples a long segment and ignores empty drawings", () => {
    const pts = resample([{ x: 0, y: 0 }, { x: 20, y: 0 }], 5);
    expect(pts.length).toBeGreaterThan(2);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(analyzeStrokes([]).count).toBe(0);
    expect(analyzeStrokes([[{ x: 0, y: 0 }]]).count).toBe(0);
  });
});

describe("geometry helpers", () => {
  it("fails シ-like (shi) geometry on a fully vertical-empty mask", () => {
    const empty = new Uint8Array(MASK_SIZE * MASK_SIZE);
    const bin = blockInk(10, 40);
    expect(kataGeometryOk("shi", empty, bin, [])).toBe(false);
    expect(inkAspect(bin)).toBeLessThan(1);
  });

  it("pickShown prefers a close rival when the guess is wrong", () => {
    const best: MatchCandidate = { ro: "tsu", ch: "ツ", score: 0.5 };
    const rival: MatchCandidate = { ro: "shi", ch: "シ", score: 0.49 };
    const expected = { score: 0.47, recall: 0, precision: 0, iou: 0 };
    expect(pickShown(false, rival, best, "tsu", expected).ro).toBe("shi");
    expect(pickShown(true, rival, best, "tsu", expected).ro).toBe("tsu");
  });
});
