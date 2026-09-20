import type { MatchMetrics } from "./types";
import { MASK_SIZE } from "./constants";
import { isMatchProfileEnabled, profileAdd, profileNow } from "./matchProfile";

const N = MASK_SIZE;
const MASK24 = 0x00ffffff;
const PACKED_WORDS = N * 2;

type PackedMask = {
  rows: Uint32Array;
  pop: number;
};

const packedCache = new WeakMap<Uint8Array, PackedMask>();

function popcnt32(v: number): number {
  v = v >>> 0;
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

export function packMask56(mask: Uint8Array): PackedMask {
  const cached = packedCache.get(mask);
  if (cached) return cached;
  const rows = new Uint32Array(PACKED_WORDS);
  let pop = 0;
  for (let y = 0; y < N; y++) {
    let w0 = 0;
    let w1 = 0;
    const base = y * N;
    for (let x = 0; x < 32; x++) {
      if (mask[base + x]) {
        w0 |= 1 << x;
        pop++;
      }
    }
    for (let x = 32; x < N; x++) {
      if (mask[base + x]) {
        w1 |= 1 << (x - 32);
        pop++;
      }
    }
    rows[y * 2] = w0 >>> 0;
    rows[y * 2 + 1] = w1 >>> 0;
  }
  const packed = { rows, pop };
  packedCache.set(mask, packed);
  return packed;
}

export function prefetchPackedMask(mask: Uint8Array): void {
  packMask56(mask);
}

/** Original dense loop — test/baseline only. Identical counts to packMask path. */
export function shiftedMetricsDense(user: Uint8Array, tmpl: Uint8Array): MatchMetrics {
  let best: MatchMetrics = { score: 0, recall: 0, precision: 0, iou: 0 };
  const n = MASK_SIZE;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      let tInk = 0;
      let uInk = 0;
      let inter = 0;
      for (let y = 0; y < n; y++) {
        const sy = y - dy;
        for (let x = 0; x < n; x++) {
          const sx = x - dx;
          const u = (sy >= 0 && sx >= 0 && sy < n && sx < n) ? user[sy * n + sx] : 0;
          const t = tmpl[y * n + x];
          if (t) tInk++;
          if (u) uInk++;
          if (u && t) inter++;
        }
      }
      const recall = tInk ? inter / tInk : 0;
      const precision = uInk ? inter / uInk : 0;
      const union = tInk + uInk - inter;
      const iou = union ? inter / union : 0;
      const score = 0.2 * recall + 0.35 * precision + 0.45 * iou;
      if (score > best.score) best = { score, recall, precision, iou };
    }
  }
  return best;
}

function shiftedMetricsPacked(user: Uint8Array, tmpl: Uint8Array): MatchMetrics {
  const u = packMask56(user);
  const t = packMask56(tmpl);
  const tInk = t.pop;
  const uRows = u.rows;
  const tRows = t.rows;
  let bestScore = 0;
  let bestRecall = 0;
  let bestPrecision = 0;
  let bestIou = 0;

  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      let uInk = 0;
      let inter = 0;
      for (let y = 0; y < N; y++) {
        const sy = y - dy;
        let uw0 = 0;
        let uw1 = 0;
        if (sy >= 0 && sy < N) {
          const src0 = uRows[sy * 2]!;
          const src1 = uRows[sy * 2 + 1]!;
          if (dx === 0) {
            uw0 = src0;
            uw1 = src1;
          } else if (dx > 0) {
            if (dx < 32) {
              uw0 = (src0 << dx) >>> 0;
              uw1 = (((src1 << dx) | (src0 >>> (32 - dx))) & MASK24) >>> 0;
            } else if (dx < 56) {
              uw0 = 0;
              uw1 = ((src0 << (dx - 32)) & MASK24) >>> 0;
            }
          } else {
            const s = -dx;
            if (s < 32) {
              uw0 = ((src0 >>> s) | ((src1 & MASK24) << (32 - s))) >>> 0;
              uw1 = ((src1 & MASK24) >>> s) >>> 0;
            } else if (s < 56) {
              uw0 = ((src1 & MASK24) >>> (s - 32)) >>> 0;
              uw1 = 0;
            }
          }
        }
        const tw0 = tRows[y * 2]!;
        const tw1 = tRows[y * 2 + 1]!;
        uInk += popcnt32(uw0) + popcnt32(uw1);
        inter += popcnt32(uw0 & tw0) + popcnt32(uw1 & tw1);
      }
      const recall = tInk ? inter / tInk : 0;
      const precision = uInk ? inter / uInk : 0;
      const union = tInk + uInk - inter;
      const iou = union ? inter / union : 0;
      const score = 0.2 * recall + 0.35 * precision + 0.45 * iou;
      if (score > bestScore) {
        bestScore = score;
        bestRecall = recall;
        bestPrecision = precision;
        bestIou = iou;
      }
    }
  }
  return { score: bestScore, recall: bestRecall, precision: bestPrecision, iou: bestIou };
}

export function shiftedMetrics(user: Uint8Array, tmpl: Uint8Array): MatchMetrics {
  if (!isMatchProfileEnabled()) return shiftedMetricsPacked(user, tmpl);
  const t0 = profileNow();
  const out = shiftedMetricsPacked(user, tmpl);
  profileAdd("shiftedMetricsCalls", 1);
  profileAdd("shiftedMetricsMs", profileNow() - t0);
  return out;
}

export function kataScore(m: Pick<MatchMetrics, "recall" | "precision" | "iou">): number {
  return 0.22 * m.recall + 0.43 * m.precision + 0.35 * m.iou;
}

export function matchThresholds(opts: { isCombo: boolean; kata: boolean }): {
  minScore: number;
  minRecall: number;
  minPrecision: number;
  closeMargin: number;
  peerGap: number;
} {
  const { isCombo, kata } = opts;
  return {
    minScore: isCombo ? 0.28 : (kata ? 0.40 : 0.33),
    minRecall: isCombo ? 0.32 : (kata ? 0.40 : 0.38),
    minPrecision: isCombo ? 0.32 : (kata ? 0.46 : 0.38),
    closeMargin: isCombo ? 0.06 : (kata ? 0.025 : 0.04),
    peerGap: kata ? 0.035 : 0.03,
  };
}
