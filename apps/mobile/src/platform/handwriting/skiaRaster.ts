import {
  Skia,
  PaintStyle,
  StrokeCap,
  StrokeJoin,
} from "@shopify/react-native-skia";
import type { Drawing } from "@jpa/handwriting";
import { LOGICAL_PAD, RASTER_SPEC, rasterizeDrawingRgba, type RgbaRaster } from "@jpa/handwriting";
import { getObservedPixelLayout, pushDiag, setSkiaInitOk } from "./diagnostics";
import { normalizeToRgba, type PixelLayout } from "./pixelFormat";

export type SkiaRasterResult = RgbaRaster & {
  backend: "skia" | "software";
  layoutUsed: PixelLayout | "n/a";
  fallbackReason?: string;
};

/**
 * Skia offscreen recognition raster (LOGICAL_PAD × LOGICAL_PAD).
 * Falls back to shared software rasterizer when Skia surface is unavailable.
 * Pixel layout follows observed probe / heuristic — never assumed blindly.
 */
export function rasterizeDrawingSkia(drawing: Drawing): SkiaRasterResult {
  try {
    const surface = Skia.Surface.MakeOffscreen(LOGICAL_PAD, LOGICAL_PAD);
    if (!surface) {
      setSkiaInitOk(false);
      return softwareFallback(drawing, "MakeOffscreen returned null");
    }
    setSkiaInitOk(true);

    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color("transparent"));

    const paint = Skia.Paint();
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(RASTER_SPEC.strokeWidth);
    paint.setStrokeCap(StrokeCap.Round);
    paint.setStrokeJoin(StrokeJoin.Round);
    paint.setAntiAlias(true);
    paint.setColor(Skia.Color(RASTER_SPEC.inkCss));

    for (const stroke of drawing) {
      if (!stroke.length) continue;
      const path = Skia.Path.Make();
      path.moveTo(stroke[0]!.x, stroke[0]!.y);
      if (stroke.length === 1) {
        path.lineTo(stroke[0]!.x + 0.01, stroke[0]!.y);
      } else {
        for (let i = 1; i < stroke.length; i++) {
          path.lineTo(stroke[i]!.x, stroke[i]!.y);
        }
      }
      canvas.drawPath(path, paint);
    }

    const image = surface.makeImageSnapshot();
    const info = image.getImageInfo();
    const raw = image.readPixels(0, 0, info);
    surface.dispose();

    if (!raw) {
      return softwareFallback(drawing, "readPixels returned null");
    }

    const bytes = raw instanceof Uint8Array
      ? raw
      : new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);

    const observed = getObservedPixelLayout();
    const layout: PixelLayout = observed.layout ?? guessLayout(bytes, LOGICAL_PAD);
    const rgba = normalizeToRgba({
      bytes,
      width: LOGICAL_PAD,
      height: LOGICAL_PAD,
      layout,
      premultiplied: observed.premultiplied,
    });

    pushDiag("skia-raster", {
      layout,
      premultiplied: observed.premultiplied,
      byteLength: bytes.length,
      colorType: String(info.colorType ?? ""),
      alphaType: String(info.alphaType ?? ""),
    }, "skia");

    return {
      width: LOGICAL_PAD,
      height: LOGICAL_PAD,
      rgba,
      backend: "skia",
      layoutUsed: layout,
    };
  } catch (err) {
    setSkiaInitOk(false);
    return softwareFallback(drawing, String(err));
  }
}

function softwareFallback(drawing: Drawing, reason: string): SkiaRasterResult {
  pushDiag("skia-fallback", { reason }, "software");
  const soft = rasterizeDrawingRgba(drawing, LOGICAL_PAD);
  return { ...soft, backend: "software", layoutUsed: "n/a", fallbackReason: reason };
}

/**
 * Heuristic when probe has not run: scan first opaque ink pixel.
 * Drawn ink is #1a1612 — in RGBA c0≈0x1a; in BGRA c0≈0x12 and c2≈0x1a.
 */
function guessLayout(bytes: Uint8Array, size: number): PixelLayout {
  for (let i = 0; i < size * size; i++) {
    const o = i * 4;
    const a = bytes[o + 3] ?? 0;
    if (a > 24) {
      const c0 = bytes[o] ?? 0;
      const c2 = bytes[o + 2] ?? 0;
      if (c2 > c0 + 4) return "bgra";
      return "rgba";
    }
  }
  return "bgra";
}

export function skiaAvailable(): boolean {
  try {
    const s = Skia.Surface.MakeOffscreen(4, 4);
    if (!s) return false;
    s.dispose();
    return true;
  } catch {
    return false;
  }
}
