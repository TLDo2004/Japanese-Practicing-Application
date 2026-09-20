/**
 * Snapshot of the pre-optimization matchInk hot path.
 * Used only by the deterministic bench to measure Hermes/Node/Chromium before vs after.
 * Not used by production Check.
 *
 * PHASE 9D: shares Proposal 1 conditional acceptance with optimized matchInk
 * so optimized ≡ unoptimized remains true after the intentional semantic change.
 */
import { BY_RO, matchPeers } from "@jpa/kana";
import {
  classifyRejectReason,
  conditionalLowRecallAccept,
} from "./acceptance";
import { BASE_RO, HORIZ_SLANT, MASK_SIZE, VERT_SLANT } from "./constants";
import { dilateUncached } from "./dilate";
import { kataGeometryOk, maskSlant, pickShown } from "./geometry";
import { toMask } from "./mask";
import { kataScore, matchThresholds, shiftedMetricsDense } from "./metrics";
import { analyzeStrokes } from "./strokes";
import type { MatchInkInput } from "./matchInk";
import type { MatchCandidate, MatchMetrics, MatchResult } from "./types";

export function matchInkUnoptimized(input: MatchInkInput): MatchResult {
  const bin = input.ink;
  if (!bin) return { status: "empty", acceptReason: "empty" };
  const drawing = input.drawing || [];
  const userRaw = toMask(bin);
  const list = input.templates[input.alphabet];
  const expectedRo = input.expectedRo;
  const expectedLetter = BY_RO[expectedRo];
  const isCombo = !!(expectedLetter && expectedLetter.hira.length > 1);
  const kata = input.alphabet === "kata";
  const userD = dilateUncached(userRaw, MASK_SIZE, kata ? 1 : 2);
  const byRo: Record<string, MatchMetrics & { ch: string }> = {};
  let expected: MatchMetrics = { score: 0, recall: 0, precision: 0, iou: 0 };
  let globalBest: MatchCandidate = { ro: null, ch: "", score: -1 };
  list.forEach((item) => {
    const tmplD = dilateUncached(item.mask, MASK_SIZE, kata ? 3 : 2);
    const overlap = shiftedMetricsDense(userD, tmplD);
    const precision = kata
      ? shiftedMetricsDense(userRaw, tmplD).precision
      : overlap.precision;
    const m = {
      ...overlap,
      precision,
      score: kata ? kataScore({ ...overlap, precision }) : overlap.score,
    };
    byRo[item.ro] = { ...m, ch: item.ch };
    if (item.ro === expectedRo) expected = m;
    if (m.score > globalBest.score + 1e-6) {
      globalBest = { ro: item.ro, ch: item.ch, score: m.score };
    } else if (item.ro === expectedRo && Math.abs(m.score - globalBest.score) <= 1e-6) {
      globalBest = { ro: item.ro, ch: item.ch, score: m.score };
    }
  });

  const thresholds = matchThresholds({ isCombo, kata });
  const { minScore, minRecall, minPrecision, closeMargin, peerGap } = thresholds;
  const closeToBest = expected.score + closeMargin >= globalBest.score;
  const shapeOk = expected.score >= minScore
    && expected.recall >= minRecall
    && expected.precision >= minPrecision;
  const peers = matchPeers(expectedRo);
  let rival: MatchCandidate | null = null;
  for (const ro of peers) {
    const m = byRo[ro];
    if (!m) continue;
    if (!rival || m.score > rival.score) rival = { ro, ch: m.ch, score: m.score };
  }
  let beatPeers = !rival || expected.score >= rival.score + peerGap;
  if (kata && rival && (HORIZ_SLANT.has(expectedRo) || VERT_SLANT.has(expectedRo)
    || HORIZ_SLANT.has(BASE_RO[expectedRo] || "") || VERT_SLANT.has(BASE_RO[expectedRo] || ""))) {
    const stats = analyzeStrokes(drawing);
    const slant = stats.items.length ? stats.slant : maskSlant(userRaw, MASK_SIZE);
    const rivalRo = rival.ro || "";
    const expectedHoriz = HORIZ_SLANT.has(BASE_RO[expectedRo] || expectedRo);
    const rivalHoriz = HORIZ_SLANT.has(BASE_RO[rivalRo] || rivalRo);
    const rivalVert = VERT_SLANT.has(BASE_RO[rivalRo] || rivalRo);
    if (expectedHoriz && slant >= 0.48 && rivalVert) beatPeers = true;
    if (VERT_SLANT.has(BASE_RO[expectedRo] || expectedRo) && slant <= 0.52 && rivalHoriz) beatPeers = true;
  }

  const isGlobalArgmax = globalBest.ro === expectedRo;
  let geometryOk = true;
  let ok = shapeOk && closeToBest && beatPeers;
  let conditionalOk = false;
  if (ok && kata && !isCombo) {
    geometryOk = kataGeometryOk(expectedRo, userRaw, bin, drawing);
    ok = geometryOk;
  } else if (!ok && kata && !isCombo) {
    geometryOk = kataGeometryOk(expectedRo, userRaw, bin, drawing);
  }

  if (!ok) {
    conditionalOk = conditionalLowRecallAccept({
      expected,
      thresholds: { minScore, minRecall, minPrecision },
      isGlobalArgmax,
      closeToBest,
      beatPeers,
      geometryOk,
    });
    ok = conditionalOk;
  }

  const shown = pickShown(ok, rival, globalBest, expectedRo, expected);
  const acceptReason = classifyRejectReason({
    expected,
    thresholds: { minScore, minRecall, minPrecision },
    isGlobalArgmax,
    closeToBest,
    beatPeers,
    geometryOk,
    shapeOk,
    conditionalOk,
    ok,
  });
  return {
    status: ok ? "ok" : "bad",
    expectedScore: expected.score,
    best: shown,
    globalBest,
    acceptReason,
  };
}
