import { MASK_SIZE } from "./constants";
import { isMatchProfileEnabled, profileAdd, profileNow } from "./matchProfile";

const cache = new WeakMap<Uint8Array, Map<number, Uint8Array>>();

export function dilateUncached(mask: Uint8Array, n: number, radius: number): Uint8Array {
  if (!radius) return mask;
  const out = new Uint8Array(mask.length);
  const r2 = radius * radius;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!mask[y * n + x]) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > r2) continue;
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < n && yy < n) out[yy * n + xx] = 1;
        }
      }
    }
  }
  return out;
}

export function dilate(mask: Uint8Array, n: number, radius: number): Uint8Array {
  if (!radius) return mask;
  const t0 = isMatchProfileEnabled() ? profileNow() : 0;
  let byRadius = cache.get(mask);
  if (!byRadius) {
    byRadius = new Map();
    cache.set(mask, byRadius);
  }
  const key = n * 16 + radius;
  const hit = byRadius.get(key);
  if (hit) {
    if (isMatchProfileEnabled()) {
      profileAdd("dilateCalls", 1);
      profileAdd("dilateCacheHits", 1);
      profileAdd("dilateMs", profileNow() - t0);
    }
    return hit;
  }
  const out = dilateUncached(mask, n, radius);
  byRadius.set(key, out);
  if (isMatchProfileEnabled()) {
    profileAdd("dilateCalls", 1);
    profileAdd("dilateMs", profileNow() - t0);
  }
  return out;
}

export function warmDilateCache(mask: Uint8Array, radius: number): Uint8Array {
  return dilate(mask, MASK_SIZE, radius);
}

export function isInkTooSparse(count: number, w: number, h: number): boolean {
  return count < Math.max(90, w * h * 0.004);
}
