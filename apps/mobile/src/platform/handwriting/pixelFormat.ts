/**
 * Normalize Skia (or other) pixel buffers to unpremultiplied RGBA for extractInkFromRgba.
 *
 * Proven layout contract for recognition:
 * - Channel order: R, G, B, A
 * - Alpha: unpremultiplied (opaque ink → A=255, RGB as ink color)
 * - Row order: top → bottom
 * - Stride: width * 4 (tight)
 */
export type PixelLayout = "rgba" | "bgra";

export function normalizeToRgba(input: {
  bytes: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  layout: PixelLayout;
  premultiplied?: boolean;
  rowBytes?: number;
}): Uint8Array {
  const { width, height, layout, premultiplied = false } = input;
  const rowBytes = input.rowBytes ?? width * 4;
  const out = new Uint8Array(width * height * 4);
  const src = input.bytes;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const si = y * rowBytes + x * 4;
      const di = (y * width + x) * 4;
      let r = src[si] ?? 0;
      let g = src[si + 1] ?? 0;
      let b = src[si + 2] ?? 0;
      let a = src[si + 3] ?? 0;
      if (layout === "bgra") {
        const rr = b;
        b = r;
        r = rr;
      }
      if (premultiplied && a > 0 && a < 255) {
        r = Math.min(255, Math.round((r * 255) / a));
        g = Math.min(255, Math.round((g * 255) / a));
        b = Math.min(255, Math.round((b * 255) / a));
      }
      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = b;
      out[di + 3] = a;
    }
  }
  return out;
}

/** Controlled opaque red pixel at (x,y) — used to prove channel order decoding. */
export function encodeOpaquePixel(
  width: number,
  height: number,
  x: number,
  y: number,
  layout: PixelLayout,
): Uint8Array {
  const buf = new Uint8Array(width * height * 4);
  const i = (y * width + x) * 4;
  if (layout === "rgba") {
    buf[i] = 255; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 255;
  } else {
    buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 255; buf[i + 3] = 255;
  }
  return buf;
}
