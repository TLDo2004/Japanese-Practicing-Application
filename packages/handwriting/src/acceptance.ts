/**
 * PHASE 9D Proposal 1 — conditional low-recall acceptance.
 *
 * Evidence (human corpus + cross-controls, 2026-09-20):
 * - Legitimate argmax+geometry+peer cases rejected only on minRecall:
 *   ア recall≈0.264 prec=1.0; ン-1 recall≈0.278 prec=1.0
 * - Dangerous cross where wrong expected is argmax:
 *   カ→セ recall≈0.239 prec≈0.980; シ→ソ recall≈0.321 prec≈0.988
 * - prec≥0.99 separates positives (1.0) from those FPs (~0.98) with 0 false accepts
 *   in the Phase 9D threshold grid.
 * - recall floor 0.25 sits above セ-class recall (0.239) and below ア (0.264);
 *   NOT set to “just under 0.264”. Absolute floor against weak scribble overlap.
 *
 * Does NOT bypass peerGap (including slant override) or kataGeometryOk.
 * Does NOT lower global minRecall.
 */
import type { MatchMetrics } from "./types";

/** Minimum precision required to enter the conditional path. */
export const CONDITIONAL_LOW_RECALL_MIN_PRECISION = 0.99;

/**
 * Experimental recall floor for the conditional path only.
 * Normal kata minRecall remains 0.40 (hira 0.38).
 */
export const CONDITIONAL_LOW_RECALL_FLOOR = 0.25;

export type AcceptReason =
  | "empty"
  | "accepted_normal"
  | "accepted_conditional_low_recall"
  | "rejected_min_score"
  | "rejected_min_recall"
  | "rejected_min_precision"
  | "rejected_close_margin"
  | "rejected_peer"
  | "rejected_geometry"
  | "rejected_not_argmax"
  | "rejected_conditional_precision"
  | "rejected_conditional_recall_floor";

export type ShapeThresholds = {
  minScore: number;
  minRecall: number;
  minPrecision: number;
};

/**
 * Whether the expected candidate may be accepted despite recall below the
 * normal minRecall, via the high-precision conditional path.
 *
 * Preconditions (caller must ensure):
 * - expectedRo === globalBest.ro (genuine score argmax, not pickShown)
 * - closeToBest && beatPeers already computed with production peer logic
 * - geometryOk is true when kata geometry applies; true when N/A
 */
export function conditionalLowRecallAccept(input: {
  expected: MatchMetrics;
  thresholds: ShapeThresholds;
  isGlobalArgmax: boolean;
  closeToBest: boolean;
  beatPeers: boolean;
  geometryOk: boolean;
}): boolean {
  const { expected, thresholds, isGlobalArgmax, closeToBest, beatPeers, geometryOk } = input;
  if (!isGlobalArgmax) return false;
  if (!closeToBest || !beatPeers || !geometryOk) return false;
  if (expected.score < thresholds.minScore) return false;
  if (expected.precision < thresholds.minPrecision) return false;
  // Only compensates for the recall gate — not other shape failures.
  if (expected.recall >= thresholds.minRecall) return false;
  if (expected.precision < CONDITIONAL_LOW_RECALL_MIN_PRECISION) return false;
  if (expected.recall < CONDITIONAL_LOW_RECALL_FLOOR) return false;
  return true;
}

export function classifyRejectReason(input: {
  expected: MatchMetrics;
  thresholds: ShapeThresholds;
  isGlobalArgmax: boolean;
  closeToBest: boolean;
  beatPeers: boolean;
  geometryOk: boolean;
  shapeOk: boolean;
  conditionalOk: boolean;
  ok: boolean;
}): AcceptReason {
  if (input.ok) {
    return input.conditionalOk && !input.shapeOk
      ? "accepted_conditional_low_recall"
      : "accepted_normal";
  }
  const { expected, thresholds } = input;
  if (expected.score < thresholds.minScore) return "rejected_min_score";
  if (expected.precision < thresholds.minPrecision) return "rejected_min_precision";
  if (expected.recall < thresholds.minRecall) {
    // Distinguish why conditional path also failed when recall was the issue.
    if (!input.isGlobalArgmax) return "rejected_not_argmax";
    if (expected.precision < CONDITIONAL_LOW_RECALL_MIN_PRECISION) {
      return "rejected_conditional_precision";
    }
    if (expected.recall < CONDITIONAL_LOW_RECALL_FLOOR) {
      return "rejected_conditional_recall_floor";
    }
    if (!input.closeToBest) return "rejected_close_margin";
    if (!input.beatPeers) return "rejected_peer";
    if (!input.geometryOk) return "rejected_geometry";
    return "rejected_min_recall";
  }
  if (!input.closeToBest) return "rejected_close_margin";
  if (!input.beatPeers) return "rejected_peer";
  if (!input.geometryOk) return "rejected_geometry";
  return "rejected_min_recall";
}
