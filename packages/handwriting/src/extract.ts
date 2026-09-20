import type { BinaryInk } from "./types";
import { INK_ALPHA_THRESHOLD } from "./constants";
import { isInkTooSparse } from "./dilate";

export function extractInkFromRgba(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): BinaryInk | null {
  const w = width;
  const h = height;
  if (!w || !h) return null;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  const ink = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3] > INK_ALPHA_THRESHOLD) {
        ink[y * w + x] = 1;
        count++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (isInkTooSparse(count, w, h) || maxX < 0) return null;
  return { ink, w, h, minX, minY, maxX, maxY, count };
}
