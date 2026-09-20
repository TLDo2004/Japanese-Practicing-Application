import { describe, expect, it } from "vitest";
import {
  CONDITIONAL_LOW_RECALL_FLOOR,
  CONDITIONAL_LOW_RECALL_MIN_PRECISION,
  conditionalLowRecallAccept,
} from "./acceptance";

describe("Proposal 1 conditionalLowRecallAccept", () => {
  it("documents evidence-derived constants", () => {
    expect(CONDITIONAL_LOW_RECALL_MIN_PRECISION).toBe(0.99);
    expect(CONDITIONAL_LOW_RECALL_FLOOR).toBe(0.25);
  });

  it("requires argmax, peers, geometry, precision≥0.99, recall∈[floor,minRecall)", () => {
    const base = {
      expected: { score: 0.58, recall: 0.264, precision: 1, iou: 0.26 },
      thresholds: { minScore: 0.4, minRecall: 0.4, minPrecision: 0.46 },
      isGlobalArgmax: true,
      closeToBest: true,
      beatPeers: true,
      geometryOk: true,
    };
    expect(conditionalLowRecallAccept(base)).toBe(true);
    expect(conditionalLowRecallAccept({ ...base, isGlobalArgmax: false })).toBe(false);
    expect(conditionalLowRecallAccept({ ...base, beatPeers: false })).toBe(false);
    expect(conditionalLowRecallAccept({ ...base, geometryOk: false })).toBe(false);
    expect(conditionalLowRecallAccept({
      ...base,
      expected: { ...base.expected, precision: 0.98 },
    })).toBe(false);
    expect(conditionalLowRecallAccept({
      ...base,
      expected: { ...base.expected, recall: 0.24 },
    })).toBe(false);
    expect(conditionalLowRecallAccept({
      ...base,
      expected: { ...base.expected, recall: 0.45 },
    })).toBe(false);
  });
});
