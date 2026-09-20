import type { Drawing, Point } from "./types";
import { RASTER_SPEC } from "./raster-spec";

/** Logical pad for Drawing coordinates and recognition rasters (matches templateCanvas). */
export const LOGICAL_PAD = RASTER_SPEC.templateCanvas;

export type RgbaRaster = {
  width: number;
  height: number;
  /** Unpremultiplied RGBA, row-major, length = width * height * 4 */
  rgba: Uint8Array;
};

/**
 * Deterministic Drawing → RGBA raster matching RASTER_SPEC stroke characteristics.
 * Used as the browser-equivalent reference and as a Node-safe recognition path.
 *
 * Ink: opaque #1a1612 on transparent background (alpha channel drives extractInkFromRgba).
 * Coordinates: Drawing points in LOGICAL_PAD (256) space.
 */
export function rasterizeDrawingRgba(
  drawing: Drawing,
  size: number = LOGICAL_PAD,
): RgbaRaster {
  const width = size;
  const height = size;
  const rgba = new Uint8Array(width * height * 4);
  const radius = Math.max(0.5, RASTER_SPEC.strokeWidth / 2);

  for (const stroke of drawing) {
    if (!stroke.length) continue;
    if (stroke.length === 1) {
      stampDisk(rgba, width, height, stroke[0]!.x, stroke[0]!.y, radius);
      continue;
    }
    for (let i = 1; i < stroke.length; i++) {
      stampSegment(rgba, width, height, stroke[i - 1]!, stroke[i]!, radius);
    }
    // Round caps at ends (segment stamps cover joins approximately).
    stampDisk(rgba, width, height, stroke[0]!.x, stroke[0]!.y, radius);
    stampDisk(rgba, width, height, stroke[stroke.length - 1]!.x, stroke[stroke.length - 1]!.y, radius);
  }

  return { width, height, rgba };
}

function stampSegment(
  rgba: Uint8Array,
  w: number,
  h: number,
  a: Point,
  b: Point,
  radius: number,
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    stampDisk(rgba, w, h, a.x + dx * t, a.y + dy * t, radius);
  }
}

function stampDisk(
  rgba: Uint8Array,
  w: number,
  h: number,
  cx: number,
  cy: number,
  radius: number,
) {
  const r2 = radius * radius;
  const minX = Math.max(0, Math.floor(cx - radius - 1));
  const maxX = Math.min(w - 1, Math.ceil(cx + radius + 1));
  const minY = Math.max(0, Math.floor(cy - radius - 1));
  const maxY = Math.min(h - 1, Math.ceil(cy + radius + 1));
  // RASTER_SPEC.inkCss #1a1612
  const R = 0x1a;
  const G = 0x16;
  const B = 0x12;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const ddx = x + 0.5 - cx;
      const ddy = y + 0.5 - cy;
      if (ddx * ddx + ddy * ddy <= r2) {
        const i = (y * w + x) * 4;
        rgba[i] = R;
        rgba[i + 1] = G;
        rgba[i + 2] = B;
        rgba[i + 3] = 255;
      }
    }
  }
}

/** Scale Drawing from display size into LOGICAL_PAD space. */
export function displayToLogical(
  drawing: Drawing,
  displayWidth: number,
  displayHeight: number,
  logical: number = LOGICAL_PAD,
): Drawing {
  if (displayWidth <= 0 || displayHeight <= 0) return [];
  const sx = logical / displayWidth;
  const sy = logical / displayHeight;
  return drawing.map((stroke) => stroke.map((p) => ({ x: p.x * sx, y: p.y * sy })));
}

/** Scale Drawing from LOGICAL_PAD into display size (for Skia UI). */
export function logicalToDisplay(
  drawing: Drawing,
  displayWidth: number,
  displayHeight: number,
  logical: number = LOGICAL_PAD,
): Drawing {
  if (logical <= 0) return [];
  const sx = displayWidth / logical;
  const sy = displayHeight / logical;
  return drawing.map((stroke) => stroke.map((p) => ({ x: p.x * sx, y: p.y * sy })));
}

export function cloneDrawing(drawing: Drawing): Drawing {
  return drawing.map((stroke) => stroke.map((p) => ({ x: p.x, y: p.y })));
}
