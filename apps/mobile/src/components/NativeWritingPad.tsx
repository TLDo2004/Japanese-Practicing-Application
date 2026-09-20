import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import type { Drawing, Point, Stroke } from "@jpa/handwriting";
import { LOGICAL_PAD, logicalToDisplay, cloneDrawing } from "@jpa/handwriting";
import { colors, fonts, radius, space } from "../theme";

/**
 * A capture  — pan gestures → logical Drawing (256²)
 * B display  — Skia strokes + separate RN guide Text (never rasterized)
 * C/D/E      — recognize.ts (software/Skia raster → extract → matchInk)
 *
 * Gesture handlers run on the JS thread (runOnJS) so React state updates and
 * coordinate math stay off the UI/worklet runtime.
 */
export type NativeWritingPadHandle = {
  clear: () => void;
  undo: () => boolean;
  getDrawing: () => Drawing | null;
  isEmpty: () => boolean;
  setDrawing: (drawing: Drawing | null) => void;
};

type Props = {
  guideChar?: string;
  guideHidden?: boolean;
  placeholder?: string;
  accessibilityLabel?: string;
  resultStatus?: "" | "ok" | "bad";
  onDrawStart?: () => void;
};

function inkColor(status: Props["resultStatus"]): string {
  if (status === "ok") return colors.positive;
  if (status === "bad") return colors.primary;
  return colors.text;
}

function pointToLogical(x: number, y: number, width: number, height: number): Point {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  return {
    x: (x / w) * LOGICAL_PAD,
    y: (y / h) * LOGICAL_PAD,
  };
}

export const NativeWritingPad = forwardRef<NativeWritingPadHandle, Props>(function NativeWritingPad(
  { guideChar, guideHidden, placeholder, accessibilityLabel, resultStatus, onDrawStart },
  ref,
) {
  const [logical, setLogical] = useState<Drawing>([]);
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [active, setActive] = useState<Stroke | null>(null);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 8 && height > 8) setSize({ w: width, h: height });
  };

  useImperativeHandle(ref, () => ({
    clear() {
      setLogical([]);
      setActive(null);
    },
    undo() {
      if (!logical.length && !active) return false;
      setActive(null);
      setLogical((prev) => prev.slice(0, -1));
      return true;
    },
    getDrawing() {
      const strokes = active ? [...logical, active] : logical;
      if (!strokes.length) return null;
      return cloneDrawing(strokes);
    },
    isEmpty() {
      const strokes = active ? [...logical, active] : logical;
      return !strokes.some((s) => s.length > 0);
    },
    setDrawing(drawing) {
      setActive(null);
      setLogical(drawing ? cloneDrawing(drawing) : []);
    },
  }), [logical, active]);

  const pan = useMemo(() => {
    let finished = false;
    const finish = (prev: Stroke | null) => {
      if (finished) return null;
      finished = true;
      if (prev && prev.length) setLogical((strokes) => [...strokes, prev]);
      return null;
    };
    return Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .onBegin((event) => {
        finished = false;
        const logicalPoint = pointToLogical(event.x, event.y, size.w, size.h);
        setActive([logicalPoint]);
        onDrawStart?.();
      })
      .onUpdate((event) => {
        const logicalPoint = pointToLogical(event.x, event.y, size.w, size.h);
        setActive((prev) => (prev ? [...prev, logicalPoint] : [logicalPoint]));
      })
      .onEnd(() => {
        setActive((prev) => finish(prev));
      })
      .onFinalize(() => {
        setActive((prev) => finish(prev));
      });
  }, [size.w, size.h, onDrawStart]);

  const displayStrokes = useMemo(() => {
    const all = active ? [...logical, active] : logical;
    return logicalToDisplay(all, size.w, size.h);
  }, [logical, active, size.w, size.h]);

  const paths = useMemo(() => {
    return displayStrokes.map((stroke, index) => {
      const path = Skia.Path.Make();
      if (!stroke.length) return { path, key: `p-${index}` };
      path.moveTo(stroke[0]!.x, stroke[0]!.y);
      if (stroke.length === 1) path.lineTo(stroke[0]!.x + 0.01, stroke[0]!.y);
      else for (let i = 1; i < stroke.length; i++) path.lineTo(stroke[i]!.x, stroke[i]!.y);
      return { path, key: `p-${index}` };
    });
  }, [displayStrokes]);

  const color = inkColor(resultStatus);
  const empty = !displayStrokes.some((s) => s.length);

  return (
    <View
      style={[
        styles.pad,
        resultStatus === "ok" ? styles.padOk : resultStatus === "bad" ? styles.padBad : null,
      ]}
      onLayout={onLayout}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel || placeholder || "Writing pad"}
    >
      {/* Faint centre rules, like squared practice paper */}
      <View style={styles.ruleV} pointerEvents="none" />
      <View style={styles.ruleH} pointerEvents="none" />
      {/* Guide is a separate RN layer — never part of recognition raster */}
      {!guideHidden && guideChar ? (
        <Text style={styles.guide} accessibilityElementsHidden importantForAccessibility="no">
          {guideChar}
        </Text>
      ) : null}

      <GestureDetector gesture={pan}>
        <View style={styles.fill} collapsable={false}>
          <Canvas style={styles.fill}>
            {paths.map(({ path, key }) => (
              <Path
                key={key}
                path={path}
                color={color}
                style="stroke"
                strokeWidth={5}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}
          </Canvas>
          {empty && placeholder ? (
            <View style={styles.overlay} pointerEvents="none">
              <Text style={styles.hint}>{placeholder}</Text>
            </View>
          ) : null}
        </View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  pad: {
    minHeight: 280,
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  padOk: { borderColor: colors.positive, borderWidth: 2 },
  padBad: { borderColor: colors.primary, borderWidth: 2 },
  ruleV: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.border,
  },
  ruleH: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  fill: { flex: 1, minHeight: 240 },
  guide: {
    ...StyleSheet.absoluteFill,
    textAlign: "center",
    textAlignVertical: "center",
    fontFamily: fonts.jpMed,
    fontSize: 120,
    color: colors.surfaceSubtle,
    zIndex: 0,
    includeFontPadding: false,
    paddingTop: 40,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    padding: space[4],
    zIndex: 2,
  },
  hint: {
    fontFamily: fonts.bodyMed,
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 14,
  },
});
