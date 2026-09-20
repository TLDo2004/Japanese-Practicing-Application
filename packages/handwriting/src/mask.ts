import type { BinaryInk, GlyphMask } from "./types";
import { MASK_SIZE } from "./constants";

export function toMask(bin: BinaryInk): GlyphMask {
  const bw = bin.maxX - bin.minX + 1;
  const bh = bin.maxY - bin.minY + 1;
  const scale = (MASK_SIZE - 8) / Math.max(bw, bh);
  const out = new Uint8Array(MASK_SIZE * MASK_SIZE);
  const ox = (MASK_SIZE - bw * scale) / 2;
  const oy = (MASK_SIZE - bh * scale) / 2;
  for (let y = 0; y < MASK_SIZE; y++) {
    for (let x = 0; x < MASK_SIZE; x++) {
      const sx = Math.floor((x - ox) / scale) + bin.minX;
      const sy = Math.floor((y - oy) / scale) + bin.minY;
      if (sx < bin.minX || sy < bin.minY || sx > bin.maxX || sy > bin.maxY) continue;
      if (bin.ink[sy * bin.w + sx]) out[y * MASK_SIZE + x] = 1;
    }
  }
  return out;
}
