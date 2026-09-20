import { describe, expect, it } from "vitest";
import { LOGICAL_PAD, rasterizeDrawingRgba, extractInkFromRgba, RASTER_SPEC } from "./index";

describe("rasterizeDrawingRgba", () => {
  it("uses LOGICAL_PAD and RASTER_SPEC stroke width", () => {
    expect(LOGICAL_PAD).toBe(RASTER_SPEC.templateCanvas);
    expect(RASTER_SPEC.strokeWidth).toBe(5);
  });

  it("produces extractable ink for a long stroke", () => {
    const { rgba, width, height } = rasterizeDrawingRgba([
      [{ x: 30, y: 128 }, { x: 226, y: 128 }],
    ]);
    expect(width).toBe(256);
    const ink = extractInkFromRgba(rgba, width, height);
    expect(ink).not.toBeNull();
    expect(ink!.count).toBeGreaterThan(50);
  });

  it("leaves transparent background (alpha 0) off-stroke", () => {
    const { rgba } = rasterizeDrawingRgba([[{ x: 10, y: 10 }, { x: 20, y: 10 }]]);
    // corner far from stroke
    const i = (250 * 256 + 250) * 4;
    expect(rgba[i + 3]).toBe(0);
  });
});
