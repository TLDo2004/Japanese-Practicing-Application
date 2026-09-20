/**
 * Runtime diagnostics for ANDROID NATIVE VALIDATION.
 * Proves Skia path, pixel layout, alpha, and Check timing on-device.
 * Never silently claim Skia success when software fallback ran.
 */

import type { Drawing, MatchResult } from "@jpa/handwriting";
import { LOGICAL_PAD, RASTER_SPEC, extractInkFromRgba, rasterizeDrawingRgba } from "@jpa/handwriting";
import type { PixelLayout } from "./pixelFormat";
import { normalizeToRgba } from "./pixelFormat";

export type RasterBackend = "skia" | "software";

export type PixelProbeResult = {
  rawLayoutObserved: PixelLayout | "unknown";
  rawSample: number[];
  normalizedSample: number[];
  premultipliedSuspected: boolean;
  transparentCornerAlpha: number;
  opaqueInkAlpha: number;
  note: string;
};

export type HandwritingDiagEvent = {
  at: number;
  kind: string;
  backend?: RasterBackend;
  detail?: Record<string, unknown>;
};

const MAX_EVENTS = 200;
const events: HandwritingDiagEvent[] = [];
let lastBackend: RasterBackend | null = null;
let lastPixelProbe: PixelProbeResult | null = null;
let skiaInitOk: boolean | null = null;
let observedLayout: PixelLayout | null = null;
let observedPremultiplied = false;

export function pushDiag(kind: string, detail?: Record<string, unknown>, backend?: RasterBackend) {
  events.push({ at: Date.now(), kind, detail, backend });
  if (events.length > MAX_EVENTS) events.shift();
  if (backend) lastBackend = backend;
}

export function getHandwritingDiagnostics() {
  return {
    skiaInitOk,
    lastBackend,
    lastPixelProbe,
    observedLayout,
    observedPremultiplied,
    events: events.slice(),
    rasterSpec: {
      size: LOGICAL_PAD,
      strokeWidth: RASTER_SPEC.strokeWidth,
      lineCap: RASTER_SPEC.lineCap,
      lineJoin: RASTER_SPEC.lineJoin,
      inkCss: RASTER_SPEC.inkCss,
      alphaThreshold: RASTER_SPEC.alphaThreshold,
    },
  };
}

export function clearHandwritingDiagnostics() {
  events.length = 0;
  lastBackend = null;
  lastPixelProbe = null;
}

export function getObservedPixelLayout(): {
  layout: PixelLayout | null;
  premultiplied: boolean;
} {
  return { layout: observedLayout, premultiplied: observedPremultiplied };
}

export function setSkiaInitOk(ok: boolean) {
  skiaInitOk = ok;
  pushDiag("skia-init", { ok });
}

/**
 * Controlled channel probe on the SAME snapshot/readPixels path used for recognition.
 * Draws distinguishable R/G/B/A regions; inspects raw bytes before conversion.
 */
export function probeSkiaPixelFormat(): PixelProbeResult | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Skia, PaintStyle } = require("@shopify/react-native-skia") as typeof import("@shopify/react-native-skia");
    const size = 8;
    const surface = Skia.Surface.MakeOffscreen(size, size);
    if (!surface) {
      setSkiaInitOk(false);
      return null;
    }
    setSkiaInitOk(true);
    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color("transparent"));

    const fill = (color: string, x: number, y: number) => {
      const paint = Skia.Paint();
      paint.setStyle(PaintStyle.Fill);
      paint.setColor(Skia.Color(color));
      canvas.drawRect(Skia.XYWHRect(x, y, 1, 1), paint);
    };
    fill("#FF0000", 1, 1);
    fill("#00FF00", 2, 1);
    fill("#0000FF", 3, 1);
    fill("rgba(255,0,0,0.5)", 4, 1);

    const image = surface.makeImageSnapshot();
    const info = image.getImageInfo();
    const raw = image.readPixels(0, 0, info);
    surface.dispose();
    if (!raw) return null;

    const bytes = raw instanceof Uint8Array
      ? raw
      : new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);

    const at = (x: number, y: number) => {
      const i = (y * size + x) * 4;
      return [bytes[i] ?? 0, bytes[i + 1] ?? 0, bytes[i + 2] ?? 0, bytes[i + 3] ?? 0];
    };

    const redRaw = at(1, 1);
    const greenRaw = at(2, 1);
    const blueRaw = at(3, 1);
    const corner = at(0, 0);
    const semi = at(4, 1);

    let layout: PixelLayout | "unknown" = "unknown";
    if (redRaw[0] > 200 && redRaw[2] < 50) layout = "rgba";
    else if (redRaw[2] > 200 && redRaw[0] < 50) layout = "bgra";

    let premultipliedSuspected = false;
    if (semi[3] > 50 && semi[3] < 220) {
      const rChan = layout === "bgra" ? semi[2] : semi[0];
      if (rChan > 90 && rChan < 160) premultipliedSuspected = true;
    }

    if (layout !== "unknown") {
      observedLayout = layout;
      observedPremultiplied = premultipliedSuspected;
    }

    const normalized = layout === "unknown"
      ? new Uint8Array(bytes)
      : normalizeToRgba({
        bytes,
        width: size,
        height: size,
        layout,
        premultiplied: premultipliedSuspected,
      });
    const nAt = (x: number, y: number) => {
      const i = (y * size + x) * 4;
      return [normalized[i] ?? 0, normalized[i + 1] ?? 0, normalized[i + 2] ?? 0, normalized[i + 3] ?? 0];
    };

    const result: PixelProbeResult = {
      rawLayoutObserved: layout,
      rawSample: redRaw,
      normalizedSample: nAt(1, 1),
      premultipliedSuspected,
      transparentCornerAlpha: corner[3] ?? -1,
      opaqueInkAlpha: redRaw[3] ?? -1,
      note: `greenRaw=${greenRaw.join(",")} blueRaw=${blueRaw.join(",")} semiRaw=${semi.join(",")}`,
    };
    lastPixelProbe = result;
    pushDiag("pixel-probe", { ...result });
    return result;
  } catch (err) {
    setSkiaInitOk(false);
    pushDiag("pixel-probe-error", { message: String(err) });
    return null;
  }
}

export function recordCheckDiag(input: {
  backend: RasterBackend;
  timingMs: number;
  result: MatchResult;
  drawingStrokeCount: number;
  inkCount: number | null;
}) {
  pushDiag("check", {
    timingMs: input.timingMs,
    status: input.result.status,
    expectedScore: "expectedScore" in input.result ? input.result.expectedScore : null,
    bestRo: input.result.status === "empty" ? null : input.result.best.ro,
    drawingStrokeCount: input.drawingStrokeCount,
    inkCount: input.inkCount,
  }, input.backend);
}

export function inkCountForDrawing(drawing: Drawing): number {
  const { rgba, width, height } = rasterizeDrawingRgba(drawing, LOGICAL_PAD);
  const ink = extractInkFromRgba(rgba, width, height);
  return ink?.count ?? 0;
}

declare global {
  // eslint-disable-next-line no-var
  var __jpaHwDiag: (() => ReturnType<typeof getHandwritingDiagnostics>) | undefined;
}

export function installGlobalDiagBridge() {
  globalThis.__jpaHwDiag = () => getHandwritingDiagnostics();
}
