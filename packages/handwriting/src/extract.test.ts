import { describe, expect, it } from "vitest";
import { extractInkFromRgba } from "./extract";
import { INK_ALPHA_THRESHOLD } from "./constants";

function rgbaFromInk(w: number, h: number, on: (x: number, y: number) => boolean): Uint8Array {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (on(x, y)) {
        data[i + 3] = INK_ALPHA_THRESHOLD + 1;
      }
    }
  }
  return data;
}

describe("extractInkFromRgba", () => {
  it("returns null for zero-size rasters", () => {
    expect(extractInkFromRgba(new Uint8Array(0), 0, 0)).toBeNull();
    expect(extractInkFromRgba(new Uint8Array(0), 10, 0)).toBeNull();
  });

  it("ignores pixels at the legacy alpha threshold", () => {
    const data = new Uint8Array(4 * 4 * 4);
    for (let i = 0; i < 16; i++) data[i * 4 + 3] = INK_ALPHA_THRESHOLD;
    expect(extractInkFromRgba(data, 4, 4)).toBeNull();
  });

  it("counts only alpha > 24 and applies the empty threshold", () => {
    const emptyish = rgbaFromInk(100, 100, (x, y) => y === 0 && x < 89);
    expect(extractInkFromRgba(emptyish, 100, 100)).toBeNull();
    const enough = rgbaFromInk(100, 100, (x, y) => y === 0 && x < 90);
    const bin = extractInkFromRgba(enough, 100, 100);
    expect(bin).not.toBeNull();
    expect(bin?.count).toBe(90);
    expect(bin?.minX).toBe(0);
    expect(bin?.maxX).toBe(89);
  });
});
