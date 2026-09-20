import type { Point, Stroke } from "./types";

export function resample(points: Point[] | null | undefined, step: number): Point[] {
  if (!points || points.length < 2) return (points || []).slice();
  const out: Point[] = [{ x: points[0].x, y: points[0].y }];
  let prev = points[0];
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const curr = points[i];
    let dx = curr.x - prev.x;
    let dy = curr.y - prev.y;
    let dist = Math.hypot(dx, dy);
    if (!dist) continue;
    while (acc + dist >= step) {
      const t = (step - acc) / dist;
      prev = { x: prev.x + dx * t, y: prev.y + dy * t };
      out.push(prev);
      dx = curr.x - prev.x;
      dy = curr.y - prev.y;
      dist = Math.hypot(dx, dy);
      acc = 0;
    }
    acc += dist;
    prev = curr;
  }
  return out;
}

export type StrokeStats = {
  count: number;
  turns: number;
  slant: number;
  shortSlant: number;
  items: Array<{
    len: number;
    horiz: number;
    start: Point;
    end: Point;
  }>;
};

export function analyzeStrokes(strokes: Stroke[] | null | undefined): StrokeStats {
  const empty: StrokeStats = { count: 0, turns: 0, slant: 0.5, shortSlant: 0.5, items: [] };
  if (!strokes || !strokes.length) return empty;
  const items: StrokeStats["items"] = [];
  let turns = 0;
  let absH = 0;
  let absV = 0;
  strokes.forEach((raw) => {
    const pts = resample(raw, 5);
    if (pts.length < 2) return;
    let len = 0;
    let sH = 0;
    let sV = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      const d = Math.hypot(dx, dy);
      len += d;
      sH += Math.abs(dx);
      sV += Math.abs(dy);
      if (i >= 2) {
        const ax = pts[i - 1].x - pts[i - 2].x;
        const ay = pts[i - 1].y - pts[i - 2].y;
        const cross = ax * dy - ay * dx;
        const dot = ax * dx + ay * dy;
        const ang = Math.atan2(cross, dot);
        if (Math.abs(ang) > 0.85) turns++;
      }
    }
    if (len < 10) return;
    absH += sH;
    absV += sV;
    items.push({
      len,
      horiz: sH / (sH + sV + 1e-6),
      start: pts[0],
      end: pts[pts.length - 1],
    });
  });
  items.sort((a, b) => a.len - b.len);
  const shorts = items.slice(0, Math.min(2, items.length));
  const shortH = shorts.reduce((s, x) => s + x.horiz, 0) / (shorts.length || 1);
  return {
    count: items.length,
    turns,
    slant: absH / (absH + absV + 1e-6),
    shortSlant: shorts.length ? shortH : absH / (absH + absV + 1e-6),
    items,
  };
}
