import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, type PointerEvent } from "react";
import type { Drawing } from "@jpa/handwriting";

export type DrawPadHandle = {
  clear: () => void;
  undo: () => boolean;
  hasInk: () => boolean;
  getSnapshot: () => { canvas: HTMLCanvasElement; drawing: Drawing } | null;
};

type Point = { x: number; y: number };

type DrawPadProps = {
  label: string;
  ariaLabel?: string;
  guide: string;
  guideOff: boolean;
  result?: string;
  resultStatus?: "" | "ok" | "bad";
  frameStatus?: "" | "ok" | "bad";
  hidden?: boolean;
  onDrawStart?: () => void;
};

function inkColor(status: DrawPadProps["frameStatus"]): string {
  if (status === "ok") return "#2f6b4f";
  if (status === "bad") return "#c44732";
  return "#1d1c19";
}

export const DrawPad = forwardRef<DrawPadHandle, DrawPadProps>(function DrawPad(
  { label, ariaLabel, guide, guideOff, result, resultStatus, frameStatus, hidden, onDrawStart },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Point[][]>([]);
  const drawingRef = useRef(false);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = inkColor(frameStatus);
    for (const stroke of strokesRef.current) {
      if (!stroke.length) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      if (stroke.length === 1) ctx.lineTo(stroke[0].x + 0.01, stroke[0].y);
      else {
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
      }
      ctx.stroke();
    }
  }, [frameStatus]);

  useEffect(() => {
    paint();
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => paint());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paint, hidden]);

  useImperativeHandle(ref, () => ({
    clear() {
      strokesRef.current = [];
      drawingRef.current = false;
      paint();
    },
    undo() {
      if (!strokesRef.current.length) return false;
      strokesRef.current = strokesRef.current.slice(0, -1);
      paint();
      return true;
    },
    hasInk() {
      return strokesRef.current.some((stroke) => stroke.length > 0);
    },
    getSnapshot() {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      return {
        canvas,
        drawing: strokesRef.current.map((stroke) => stroke.map((point) => ({ x: point.x, y: point.y }))),
      };
    },
  }), [paint]);

  const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  return (
    <div className={`pad${hidden ? " is-hidden" : ""}`}>
      <p className="pad-label">{label}</p>
      <div className={`pad-frame${frameStatus ? ` is-${frameStatus}` : ""}`}>
        <div
          className={`pad-guide${guideOff || !guide ? " is-hidden" : ""}${guide.length > 1 ? " is-combo" : ""}`}
          aria-hidden="true"
        >
          {guide}
        </div>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel || label}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            drawingRef.current = true;
            strokesRef.current = [...strokesRef.current, [pointFromEvent(event)]];
            onDrawStart?.();
            paint();
          }}
          onPointerMove={(event) => {
            if (!drawingRef.current) return;
            const strokes = strokesRef.current;
            const last = strokes[strokes.length - 1];
            if (!last) return;
            last.push(pointFromEvent(event));
            paint();
          }}
          onPointerUp={() => {
            drawingRef.current = false;
          }}
          onPointerCancel={() => {
            drawingRef.current = false;
          }}
        />
      </div>
      <p
        className={`pad-verdict${resultStatus ? ` is-${resultStatus}` : ""}`}
        role="status"
        aria-live="polite"
      >
        {resultStatus === "ok" ? "✓ " : resultStatus === "bad" ? "✗ " : ""}
        {result || ""}
      </p>
    </div>
  );
});
