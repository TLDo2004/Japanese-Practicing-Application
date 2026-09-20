import type { BinaryInk, Drawing, GlyphMask, MatchCandidate, MatchMetrics } from "./types";
import { BASE_RO, HORIZ_SLANT, MASK_SIZE, VERT_SLANT } from "./constants";
import { analyzeStrokes } from "./strokes";

export function maskSlant(mask: GlyphMask, n: number): number {
  let h = 0;
  let v = 0;
  for (let y = 1; y < n - 1; y++) {
    for (let x = 1; x < n - 1; x++) {
      if (!mask[y * n + x]) continue;
      h += mask[y * n + x + 1] + mask[y * n + x - 1];
      v += mask[(y + 1) * n + x] + mask[(y - 1) * n + x];
    }
  }
  return h / (h + v + 1e-6);
}

export function maxRowFill(mask: GlyphMask, n: number, y0: number, y1: number): number {
  let best = 0;
  const a = Math.max(0, Math.floor(y0));
  const b = Math.min(n, Math.ceil(y1));
  for (let y = a; y < b; y++) {
    let c = 0;
    for (let x = 0; x < n; x++) if (mask[y * n + x]) c++;
    best = Math.max(best, c / n);
  }
  return best;
}

export function maxColFill(mask: GlyphMask, n: number, x0: number, x1: number): number {
  let best = 0;
  const a = Math.max(0, Math.floor(x0));
  const b = Math.min(n, Math.ceil(x1));
  for (let x = a; x < b; x++) {
    let c = 0;
    for (let y = 0; y < n; y++) if (mask[y * n + x]) c++;
    best = Math.max(best, c / n);
  }
  return best;
}

export function bandRatio(
  mask: GlyphMask,
  n: number,
  { y0 = 0, y1 = 1, x0 = 0, x1 = 1 }: { y0?: number; y1?: number; x0?: number; x1?: number } = {},
): number {
  const ya = Math.floor(n * y0);
  const yb = Math.ceil(n * y1);
  const xa = Math.floor(n * x0);
  const xb = Math.ceil(n * x1);
  let band = 0;
  let all = 0;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!mask[y * n + x]) continue;
      all++;
      if (y >= ya && y < yb && x >= xa && x < xb) band++;
    }
  }
  return all ? band / all : 0;
}

export function inkAspect(bin: BinaryInk): number {
  const w = bin.maxX - bin.minX + 1;
  const h = bin.maxY - bin.minY + 1;
  return w / (h + 1e-6);
}

export function kataGeometryOk(ro: string, user: GlyphMask, bin: BinaryInk, strokes: Drawing): boolean {
  const n = MASK_SIZE;
  const base = BASE_RO[ro] || ro;
  const stats = analyzeStrokes(strokes);
  const slant = stats.items.length ? (0.65 * stats.slant + 0.35 * stats.shortSlant) : maskSlant(user, n);
  const top = bandRatio(user, n, { y0: 0, y1: 0.22 });
  const right = bandRatio(user, n, { x0: 0.68, x1: 1 });
  const left = bandRatio(user, n, { x0: 0, x1: 0.32 });
  const bottom = bandRatio(user, n, { y0: 0.78, y1: 1 });
  const aspect = inkAspect(bin);
  const barTop = maxRowFill(user, n, n * 0.06, n * 0.42);
  const barMid = maxRowFill(user, n, n * 0.35, n * 0.65);
  const colRight = maxColFill(user, n, n * 0.55, n * 0.95);
  const colMid = maxColFill(user, n, n * 0.28, n * 0.72);

  const extra = BASE_RO[ro] ? 2 : 0;
  const limits: Record<string, { turns: number; strokes: [number, number] }> = {
    a: { turns: 8, strokes: [1, 4] },
    i: { turns: 5, strokes: [1, 3] },
    u: { turns: 8, strokes: [2, 5] },
    e: { turns: 8, strokes: [2, 5] },
    o: { turns: 9, strokes: [2, 5] },
    ka: { turns: 7, strokes: [1, 4] },
    ki: { turns: 9, strokes: [2, 5] },
    ku: { turns: 6, strokes: [1, 3] },
    ke: { turns: 8, strokes: [2, 5] },
    ko: { turns: 6, strokes: [1, 4] },
    sa: { turns: 8, strokes: [2, 5] },
    shi: { turns: 9, strokes: [2, 5] },
    su: { turns: 7, strokes: [1, 4] },
    se: { turns: 7, strokes: [1, 4] },
    so: { turns: 6, strokes: [1, 3] },
    ta: { turns: 8, strokes: [2, 5] },
    chi: { turns: 8, strokes: [2, 5] },
    tsu: { turns: 9, strokes: [2, 5] },
    te: { turns: 7, strokes: [2, 5] },
    to: { turns: 5, strokes: [1, 3] },
    na: { turns: 7, strokes: [1, 4] },
    ni: { turns: 5, strokes: [1, 4] },
    nu: { turns: 8, strokes: [1, 4] },
    ne: { turns: 11, strokes: [2, 6] },
    no: { turns: 4, strokes: [1, 2] },
    ha: { turns: 6, strokes: [1, 4] },
    hi: { turns: 6, strokes: [1, 3] },
    fu: { turns: 6, strokes: [1, 3] },
    he: { turns: 4, strokes: [1, 2] },
    ho: { turns: 9, strokes: [2, 6] },
    ma: { turns: 8, strokes: [1, 4] },
    mi: { turns: 7, strokes: [2, 5] },
    mu: { turns: 8, strokes: [1, 4] },
    me: { turns: 6, strokes: [1, 3] },
    mo: { turns: 8, strokes: [2, 5] },
    ya: { turns: 7, strokes: [1, 4] },
    yu: { turns: 6, strokes: [1, 4] },
    yo: { turns: 7, strokes: [2, 5] },
    ra: { turns: 6, strokes: [1, 3] },
    ri: { turns: 5, strokes: [1, 3] },
    ru: { turns: 7, strokes: [1, 3] },
    re: { turns: 5, strokes: [1, 3] },
    ro: { turns: 7, strokes: [2, 5] },
    wa: { turns: 7, strokes: [1, 4] },
    wo: { turns: 8, strokes: [2, 5] },
    n: { turns: 6, strokes: [1, 3] },
  };
  const lim = limits[base];
  if (lim && stats.count) {
    if (stats.turns > lim.turns + extra) return false;
    if (stats.count > lim.strokes[1] + extra) return false;
  }

  if (HORIZ_SLANT.has(base) && slant < 0.42) return false;
  if (VERT_SLANT.has(base) && slant > 0.58) return false;

  switch (base) {
    case "n":
      if (slant < 0.46) return false;
      if (stats.turns > 6) return false;
      break;
    case "so":
      if (slant > 0.54) return false;
      break;
    case "shi":
      if (slant < 0.45) return false;
      if (stats.shortSlant < 0.40 && stats.items.length >= 2) return false;
      break;
    case "tsu":
      if (slant > 0.55) return false;
      if (stats.shortSlant > 0.62 && stats.items.length >= 2) return false;
      break;
    case "fu":
      if (top > 0.22) return false;
      if (stats.turns > 6) return false;
      break;
    case "u":
      if (top < 0.08) return false;
      break;
    case "wa":
      if (top > 0.24) return false;
      break;
    case "ra":
      if (bottom < 0.04 && stats.count === 1 && stats.turns < 2) return false;
      break;
    case "ku":
      if (right > 0.34) return false;
      if (stats.turns > 6) return false;
      break;
    case "ke":
      if (right < 0.12) return false;
      break;
    case "sa":
      if (barTop < 0.20) return false;
      if (colRight < 0.22 && colMid < 0.22) return false;
      break;
    case "chi":
      if (barTop < 0.26) return false;
      if (stats.turns > 8) return false;
      break;
    case "te":
      if (barTop < 0.22) return false;
      break;
    case "ki":
      if (barTop < 0.18 || barMid < 0.14) return false;
      break;
    case "e":
      if (barTop < 0.20) return false;
      break;
    case "ni":
      if (aspect < 0.85) return false;
      if (barTop < 0.18) return false;
      if (colMid > 0.55 && barTop < 0.30) return false;
      break;
    case "mi":
    case "yo":
      if (barTop < 0.16) return false;
      break;
    case "no":
    case "he":
      if (stats.turns > 4) return false;
      if (stats.count > 2) return false;
      break;
    case "to":
    case "re":
    case "i":
      if (stats.turns > 5) return false;
      break;
    case "ko":
    case "yu":
      if (right > 0.42) return false;
      break;
    case "ro":
      if (top < 0.08 || bottom < 0.08 || left < 0.08) return false;
      break;
    default:
      break;
  }
  return true;
}

export function pickShown(
  ok: boolean,
  rival: MatchCandidate | null,
  best: MatchCandidate,
  expectedRo: string,
  expected: MatchMetrics,
): MatchCandidate {
  void expectedRo;
  if (ok) return best;
  if (rival && rival.score + 0.02 >= expected.score) return rival;
  return best;
}
