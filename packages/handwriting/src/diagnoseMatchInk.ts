/**
 * Investigation-only detailed diagnostics for matchInk.
 * Mirrors production algorithm; does NOT change production matchInk.
 */
import { BY_RO, matchPeers } from "@jpa/kana";
import { BASE_RO, HORIZ_SLANT, MASK_SIZE, VERT_SLANT } from "./constants";
import { dilate, dilateUncached } from "./dilate";
import {
  bandRatio,
  inkAspect,
  kataGeometryOk,
  maskSlant,
  maxColFill,
  maxRowFill,
  pickShown,
} from "./geometry";
import { toMask } from "./mask";
import { kataScore, matchThresholds, shiftedMetrics } from "./metrics";
import { analyzeStrokes } from "./strokes";
import type {
  Alphabet,
  BinaryInk,
  Drawing,
  GlyphTemplateSet,
  MatchCandidate,
  MatchMetrics,
} from "./types";

export type CandidateDiag = MatchMetrics & {
  ro: string;
  ch: string;
  isPeer: boolean;
  isExpected: boolean;
  isBest: boolean;
  overlapScore: number;
  kataPrecisionFromRaw?: number;
};

export type RejectionReason =
  | "empty"
  | "shape_minScore"
  | "shape_minRecall"
  | "shape_minPrecision"
  | "closeMargin"
  | "peerGap"
  | "kataGeometry"
  | "ok";

export type MatchDiagnosis = {
  alphabet: Alphabet;
  expectedRo: string;
  isCombo: boolean;
  kata: boolean;
  thresholds: ReturnType<typeof matchThresholds>;
  status: "empty" | "ok" | "bad";
  expectedScore: number;
  best: MatchCandidate;
  shown: MatchCandidate;
  rival: MatchCandidate | null;
  peers: string[];
  closeToBest: boolean;
  beatPeers: boolean;
  shapeOk: boolean;
  geometryOk: boolean | null;
  geometryDetail: Record<string, number | boolean | string> | null;
  strokeStats: ReturnType<typeof analyzeStrokes>;
  maskSlant: number;
  reasons: RejectionReason[];
  primaryReason: RejectionReason;
  expected: MatchMetrics;
  topCandidates: CandidateDiag[];
  alignment: {
    userInkCount: number;
    userBBox: { w: number; h: number; aspect: number };
    expectedTmplInk: number;
    bestTmplInk: number;
    expectedIoU: number;
    bestIoU: number;
    scaleHint: string;
  };
  dilationProbe: {
    kataUserRadius: number;
    kataTmplRadius: number;
    hiraUserRadius: number;
    note: string;
    peerScoreGapDilated: number | null;
    peerScoreGapRawOverlap: number | null;
  };
};

function geometryDetailFor(
  ro: string,
  user: Uint8Array,
  bin: BinaryInk,
  strokes: Drawing,
): Record<string, number | boolean | string> {
  const n = MASK_SIZE;
  const base = BASE_RO[ro] || ro;
  const stats = analyzeStrokes(strokes);
  const slant = stats.items.length
    ? 0.65 * stats.slant + 0.35 * stats.shortSlant
    : maskSlant(user, n);
  const detail: Record<string, number | boolean | string> = {
    base,
    slant,
    strokeCount: stats.count,
    turns: stats.turns,
    shortSlant: stats.shortSlant,
    top: bandRatio(user, n, { y0: 0, y1: 0.22 }),
    right: bandRatio(user, n, { x0: 0.68, x1: 1 }),
    left: bandRatio(user, n, { x0: 0, x1: 0.32 }),
    bottom: bandRatio(user, n, { y0: 0.78, y1: 1 }),
    aspect: inkAspect(bin),
    barTop: maxRowFill(user, n, n * 0.06, n * 0.42),
    barMid: maxRowFill(user, n, n * 0.35, n * 0.65),
    colRight: maxColFill(user, n, n * 0.55, n * 0.95),
    colMid: maxColFill(user, n, n * 0.28, n * 0.72),
    horizSlantSet: HORIZ_SLANT.has(base),
    vertSlantSet: VERT_SLANT.has(base),
    kataGeometryOk: kataGeometryOk(ro, user, bin, strokes),
  };

  // Explicit checks mirroring geometry.ts switch for slant peers
  if (base === "n") {
    detail.fail_n_slant = slant < 0.46;
    detail.fail_n_turns = stats.turns > 6;
  }
  if (base === "so") detail.fail_so_slant = slant > 0.54;
  if (base === "shi") {
    detail.fail_shi_slant = slant < 0.45;
    detail.fail_shi_shortSlant = stats.shortSlant < 0.40 && stats.items.length >= 2;
  }
  if (base === "tsu") {
    detail.fail_tsu_slant = slant > 0.55;
    detail.fail_tsu_shortSlant = stats.shortSlant > 0.62 && stats.items.length >= 2;
  }
  if (base === "a") {
    // limits only for stroke/turns when stats.count
    const lim = { turns: 8, strokes: [1, 4] as [number, number] };
    const extra = BASE_RO[ro] ? 2 : 0;
    if (stats.count) {
      detail.fail_a_turns = stats.turns > lim.turns + extra;
      detail.fail_a_strokes = stats.count > lim.strokes[1] + extra;
    }
  }
  return detail;
}

export function diagnoseMatchInk(input: {
  ink: BinaryInk | null;
  drawing?: Drawing;
  alphabet: Alphabet;
  expectedRo: string;
  templates: GlyphTemplateSet;
  topN?: number;
}): MatchDiagnosis {
  const topN = input.topN ?? 8;
  const bin = input.ink;
  if (!bin) {
    return {
      alphabet: input.alphabet,
      expectedRo: input.expectedRo,
      isCombo: false,
      kata: input.alphabet === "kata",
      thresholds: matchThresholds({ isCombo: false, kata: input.alphabet === "kata" }),
      status: "empty",
      expectedScore: 0,
      best: { ro: null, ch: "", score: -1 },
      shown: { ro: null, ch: "", score: -1 },
      rival: null,
      peers: [],
      closeToBest: false,
      beatPeers: false,
      shapeOk: false,
      geometryOk: null,
      geometryDetail: null,
      strokeStats: analyzeStrokes([]),
      maskSlant: 0.5,
      reasons: ["empty"],
      primaryReason: "empty",
      expected: { score: 0, recall: 0, precision: 0, iou: 0 },
      topCandidates: [],
      alignment: {
        userInkCount: 0,
        userBBox: { w: 0, h: 0, aspect: 0 },
        expectedTmplInk: 0,
        bestTmplInk: 0,
        expectedIoU: 0,
        bestIoU: 0,
        scaleHint: "empty",
      },
      dilationProbe: {
        kataUserRadius: 1,
        kataTmplRadius: 3,
        hiraUserRadius: 2,
        note: "empty",
        peerScoreGapDilated: null,
        peerScoreGapRawOverlap: null,
      },
    };
  }

  const drawing = input.drawing || [];
  const userRaw = toMask(bin);
  const list = input.templates[input.alphabet];
  const expectedRo = input.expectedRo;
  const expectedLetter = BY_RO[expectedRo];
  const isCombo = !!(expectedLetter && expectedLetter.hira.length > 1);
  const kata = input.alphabet === "kata";
  const userD = dilate(userRaw, MASK_SIZE, kata ? 1 : 2);
  const byRo: Record<string, MatchMetrics & { ch: string }> = {};
  let expected: MatchMetrics = { score: 0, recall: 0, precision: 0, iou: 0 };
  let best: MatchCandidate = { ro: null, ch: "", score: -1 };

  for (const item of list) {
    const tmplD = dilate(item.mask, MASK_SIZE, kata ? 3 : 2);
    const overlap = shiftedMetrics(userD, tmplD);
    const precision = kata ? shiftedMetrics(userRaw, tmplD).precision : overlap.precision;
    const m = {
      ...overlap,
      precision,
      score: kata ? kataScore({ ...overlap, precision }) : overlap.score,
    };
    byRo[item.ro] = { ...m, ch: item.ch };
    if (item.ro === expectedRo) expected = m;
    if (m.score > best.score + 1e-6) best = { ro: item.ro, ch: item.ch, score: m.score };
    else if (item.ro === expectedRo && Math.abs(m.score - best.score) <= 1e-6) {
      best = { ro: item.ro, ch: item.ch, score: m.score };
    }
  }

  const thresholds = matchThresholds({ isCombo, kata });
  const { minScore, minRecall, minPrecision, closeMargin, peerGap } = thresholds;
  const closeToBest = expected.score + closeMargin >= best.score;
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
  const stats = analyzeStrokes(drawing);
  const mSlant = maskSlant(userRaw, MASK_SIZE);
  if (kata && rival && (HORIZ_SLANT.has(expectedRo) || VERT_SLANT.has(expectedRo)
    || HORIZ_SLANT.has(BASE_RO[expectedRo] || "") || VERT_SLANT.has(BASE_RO[expectedRo] || ""))) {
    const slant = stats.items.length ? stats.slant : mSlant;
    const rivalRo = rival.ro || "";
    const expectedHoriz = HORIZ_SLANT.has(BASE_RO[expectedRo] || expectedRo);
    const rivalHoriz = HORIZ_SLANT.has(BASE_RO[rivalRo] || rivalRo);
    const rivalVert = VERT_SLANT.has(BASE_RO[rivalRo] || rivalRo);
    if (expectedHoriz && slant >= 0.48 && rivalVert) beatPeers = true;
    if (VERT_SLANT.has(BASE_RO[expectedRo] || expectedRo) && slant <= 0.52 && rivalHoriz) beatPeers = true;
  }

  let ok = shapeOk && closeToBest && beatPeers;
  let geometryOk: boolean | null = null;
  let geometryDetail: Record<string, number | boolean | string> | null = null;
  if (ok && kata && !isCombo) {
    geometryOk = kataGeometryOk(expectedRo, userRaw, bin, drawing);
    geometryDetail = geometryDetailFor(expectedRo, userRaw, bin, drawing);
    ok = geometryOk;
  } else if (kata && !isCombo) {
    geometryDetail = geometryDetailFor(expectedRo, userRaw, bin, drawing);
    geometryOk = Boolean(geometryDetail.kataGeometryOk);
  }

  const shown = pickShown(ok, rival, best, expectedRo, expected);
  const reasons: RejectionReason[] = [];
  if (!shapeOk) {
    if (expected.score < minScore) reasons.push("shape_minScore");
    if (expected.recall < minRecall) reasons.push("shape_minRecall");
    if (expected.precision < minPrecision) reasons.push("shape_minPrecision");
  }
  if (!closeToBest) reasons.push("closeMargin");
  if (!beatPeers) reasons.push("peerGap");
  if (shapeOk && closeToBest && beatPeers && geometryOk === false) reasons.push("kataGeometry");
  if (!reasons.length) reasons.push(ok ? "ok" : "shape_minScore");
  const primaryReason = ok ? "ok" : reasons[0]!;

  const ranked = Object.entries(byRo)
    .map(([ro, m]) => ({
      ro,
      ch: m.ch,
      score: m.score,
      recall: m.recall,
      precision: m.precision,
      iou: m.iou,
      isPeer: peers.includes(ro),
      isExpected: ro === expectedRo,
      isBest: ro === best.ro,
      overlapScore: m.score,
    }))
    .sort((a, b) => b.score - a.score);

  const topCandidates = ranked.slice(0, topN);

  const expectedTmpl = list.find((x) => x.ro === expectedRo);
  const bestTmpl = list.find((x) => x.ro === best.ro);
  const countInk = (mask: Uint8Array) => {
    let c = 0;
    for (let i = 0; i < mask.length; i++) if (mask[i]) c++;
    return c;
  };

  // Dilation peer gap probe for slant set
  let peerScoreGapDilated: number | null = null;
  let peerScoreGapRawOverlap: number | null = null;
  if (rival && expectedTmpl) {
    peerScoreGapDilated = expected.score - rival.score;
    const rivalTmpl = list.find((x) => x.ro === rival.ro);
    if (rivalTmpl) {
      const rawExp = shiftedMetrics(userRaw, dilateUncached(expectedTmpl.mask, MASK_SIZE, 0));
      const rawRiv = shiftedMetrics(userRaw, dilateUncached(rivalTmpl.mask, MASK_SIZE, 0));
      peerScoreGapRawOverlap = rawExp.score - rawRiv.score;
    }
  }

  return {
    alphabet: input.alphabet,
    expectedRo,
    isCombo,
    kata,
    thresholds,
    status: ok ? "ok" : "bad",
    expectedScore: expected.score,
    best,
    shown,
    rival,
    peers,
    closeToBest,
    beatPeers,
    shapeOk,
    geometryOk,
    geometryDetail,
    strokeStats: stats,
    maskSlant: mSlant,
    reasons,
    primaryReason,
    expected,
    topCandidates,
    alignment: {
      userInkCount: countInk(userRaw),
      userBBox: {
        w: bin.maxX - bin.minX + 1,
        h: bin.maxY - bin.minY + 1,
        aspect: inkAspect(bin),
      },
      expectedTmplInk: expectedTmpl ? countInk(expectedTmpl.mask) : 0,
      bestTmplInk: bestTmpl ? countInk(bestTmpl.mask) : 0,
      expectedIoU: expected.iou,
      bestIoU: best.ro && byRo[best.ro] ? byRo[best.ro]!.iou : 0,
      scaleHint:
        `userAspect=${inkAspect(bin).toFixed(3)} userInk=${countInk(userRaw)} `
        + `expTmplInk=${expectedTmpl ? countInk(expectedTmpl.mask) : 0} `
        + `(toMask already bbox-normalizes into ${MASK_SIZE}²; no scale search)`,
    },
    dilationProbe: {
      kataUserRadius: 1,
      kataTmplRadius: 3,
      hiraUserRadius: 2,
      note: "Production: kata dilates user r=1 tmpl r=3; hira both r=2. Precision for kata uses undilated user vs dilated tmpl.",
      peerScoreGapDilated,
      peerScoreGapRawOverlap,
    },
  };
}
